import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const webPort = Number(process.env.WEB_BROWSER_TEST_PORT || '4185');
const debugPort = Number(process.env.BROWSER_TEST_DEBUG_PORT || '9225');
const webOrigin = `http://127.0.0.1:${webPort}`;
const apiOrigin = 'http://api.wasel.test';
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

const students = [
  { id: 'student-1', full_name: 'Amina Benali', student_id: 'ST-001' },
  { id: 'student-2', full_name: 'Yacine Merabet', student_id: 'ST-002' },
  { id: 'student-3', full_name: 'Lina Haddad', student_id: 'ST-003' },
];
const classes = [
  { id: 'class-1', name: '2AM-A', subject: 'Mathematics', members: students },
  { id: 'class-2', name: '3AP-B', subject: 'Mathematics', members: students.slice(0, 2) },
];
const pendingAttendances = Array.from({ length: 10 }, (_, index) => ({
  id: `pending-${index + 1}`,
  class_id: index % 2 === 0 ? 'class-1' : 'class-2',
  class_name: index % 2 === 0 ? '2AM-A' : '3AP-B',
  student_id: `student-${index + 1}`,
  student_name: `Student ${String(index + 1).padStart(2, '0')}`,
  status: index % 2 === 0 ? 'absent' : 'late',
  date: `2026-11-${String(index + 1).padStart(2, '0')}`,
  note: index % 2 === 0 ? 'Absence reported to parents.' : 'Late by 10 minutes.',
  is_justified: false,
  justification_text: null,
  justification_attachment_url: null,
}));
const parentGrades = [{
  id: 'parent-grade-1',
  class_id: 'class-1',
  student_id: 'student-1',
  student_name: 'Amina Benali',
  course_id: 'course-math',
  subject: 'Mathematics',
  score: 15,
  max_score: 20,
  coefficient: 3,
  normalized_score: 15,
  is_approved: true,
  date: '2026-11-10',
  comment: 'Good progress',
}];
const mockState = {
  attendancePosts: [],
  gradePosts: [],
  homeworkPosts: [],
  homeworkPatches: [],
  homeworkDeletes: [],
  examPosts: [],
  grades: [{ ...parentGrades[0], id: 'grade-1', is_approved: false, score: 12, normalized_score: 12 }],
  homework: [{
    id: 'homework-1',
    class_id: 'class-1',
    kind: 'homework',
    course_id: 'course-math',
    subject: 'Mathematics',
    lesson_content: 'Review the lesson',
    homework_content: 'Existing homework',
    due_date: '2026-11-20T12:00:00Z',
    created_by: 'teacher-1',
  }],
  exams: [],
  attendanceDelay: 0,
  gradeDelay: 0,
  homeworkDelay: 0,
  examDelay: 0,
  failNextGrade: false,
  failNextHomework: false,
  failNextExam: false,
};

function browserCandidates() {
  return [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/microsoft-edge',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
}

function findBrowser() {
  const executable = browserCandidates().find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error('No Edge or Chromium executable found. Set EDGE_PATH to run browser workflow tests.');
  }
  return executable;
}

async function waitForFetch(url, options = {}, attempts = 80) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`Unexpected response ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }
    await delay(125);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function startVite() {
  const child = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'],
    {
      cwd: webRoot,
      env: { ...process.env, VITE_API_BASE_URL: apiOrigin },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  return { child, output: () => output };
}

function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 0;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });
  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(`Browser connection closed during ${request.method}`));
    }
    pending.clear();
  });

  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', () => reject(new Error('Could not connect to the browser debugging socket')), { once: true });
    }),
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Browser command timed out: ${method}`));
        }, 15000);
        pending.set(id, { resolve, reject, timer, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) {
      const current = listeners.get(method) ?? [];
      current.push(listener);
      listeners.set(method, current);
    },
    close() {
      socket.close();
    },
  };
}

function mockResponse(path, method, body) {
  if (path === '/users/me') {
    return { id: 'teacher-1', full_name: 'Browser Teacher', email: 'teacher@example.test', school_id: 'school-1', roles: ['principal', 'teacher', 'parent'] };
  }
  if (path === '/classes/') return classes;
  if (path === '/users/students/me') return [students[0]];
  if (path === '/admin/analytics/insights') {
    return {
      semester: { id: 'semester-1', name: 'Trimester 1' },
      previous_semester: null,
      semesters: [{ id: 'semester-1', name: 'Trimester 1' }],
      attendance_weeks: [{ week_start: '2026-11-09', records: 10, absences: 1, lates: 1, absence_rate: 10, late_rate: 10 }],
      class_attendance: [],
      at_risk: [],
      pending_grade_approvals: 1,
      unjustified_absences_30d: 1,
    };
  }
  if (path === '/admin/analytics/overview') {
    return {
      school_avg: 13.4,
      absence_rate: 4.2,
      adoption_rate: 80,
      class_performance: [{ class_name: '2AM-A', average_score: 13.4 }],
      subject_performance: [{ subject: 'Mathematics', average_score: 13.4 }],
      top_students: [],
      struggling_students: [{ student_id: 'student-2', student_name: 'Yacine Merabet', class_name: '2AM-A', average_score: 8.5 }],
    };
  }
  if (path === '/admin/attendance/pending') return pendingAttendances;
  if (path === '/admin/referral') return { code: 'BROWSER-TEST', reward_months: 2, schools: [] };
  if (path === '/finance/my-fees') return { total_billed: 0, total_paid: 0, total_remaining: 0, invoices: [] };
  if (path === '/finance/ledger') {
    return {
      school_name: 'Browser Test School',
      auto_reminders: false,
      summary: { billed: 0, collected: 0, outstanding: 0, overdue: 0, collected_this_month: 0, collection_rate: null, overdue_students: 0, overdue_invoices: 0 },
      by_class: [],
      invoices: [],
    };
  }

  const studentsMatch = path.match(/^\/classes\/([^/]+)\/students$/);
  if (studentsMatch) return classes.find((item) => item.id === studentsMatch[1])?.members ?? [];
  const coursesMatch = path.match(/^\/classes\/([^/]+)\/courses$/);
  if (coursesMatch) {
    return [{
      class_id: coursesMatch[1],
      course_id: 'course-math',
      teacher_id: 'teacher-1',
      coefficient: 3,
      course_name: 'Mathematics',
      teacher_name: 'Browser Teacher',
    }];
  }
  const parentGradesMatch = path.match(/^\/classes\/([^/]+)\/grades\/student\/([^/]+)$/);
  if (parentGradesMatch) return parentGrades;
  const parentAttendanceMatch = path.match(/^\/classes\/([^/]+)\/attendance\/student\/([^/]+)$/);
  if (parentAttendanceMatch) {
    return [
      { id: 'attendance-1', status: 'present', date: '2026-11-09', note: null, justification_text: null },
      { id: 'attendance-2', status: 'absent', date: '2026-11-10', note: 'Medical appointment', justification_text: 'Approved' },
    ];
  }
  const gradesMatch = path.match(/^\/classes\/([^/]+)\/grades\/$/);
  if (gradesMatch) {
    if (method === 'POST') {
      if (mockState.failNextGrade) {
        mockState.failNextGrade = false;
        return { status: 500, data: { detail: 'Grade service unavailable' } };
      }
      const grade = {
        ...body,
        id: `grade-${mockState.grades.length + 1}`,
        class_id: gradesMatch[1],
        student_name: students.find((student) => student.id === body.student_id)?.full_name ?? 'Student',
        is_approved: false,
        normalized_score: (body.score / body.max_score) * 20,
        date: '2026-11-13',
      };
      mockState.gradePosts.push(body);
      mockState.grades.unshift(grade);
      return { status: 201, data: grade };
    }
    return mockState.grades.filter((grade) => grade.class_id === gradesMatch[1]);
  }
  const attendanceMatch = path.match(/^\/classes\/([^/]+)\/attendance\/$/);
  if (attendanceMatch && method === 'POST') {
    mockState.attendancePosts.push(body);
    return { status: 201, data: { ...body, id: `attendance-${mockState.attendancePosts.length}`, date: '2026-11-13' } };
  }
  if (/^\/classes\/[^/]+\/health-alerts$/.test(path)) return [];
  const homeworkMatch = path.match(/^\/classes\/([^/]+)\/homework\/$/);
  if (homeworkMatch) {
    if (method === 'POST') {
      if (mockState.failNextHomework) {
        mockState.failNextHomework = false;
        return { status: 500, data: { detail: 'Homework service unavailable' } };
      }
      const item = {
        ...body,
        id: `homework-${mockState.homework.length + 1}`,
        class_id: homeworkMatch[1],
        created_by: 'teacher-1',
      };
      mockState.homeworkPosts.push(body);
      mockState.homework.unshift(item);
      return { status: 201, data: item };
    }
    return mockState.homework.filter((item) => item.class_id === homeworkMatch[1]);
  }
  const homeworkItemMatch = path.match(/^\/classes\/([^/]+)\/homework\/([^/]+)$/);
  if (homeworkItemMatch) {
    const index = mockState.homework.findIndex((item) => item.id === homeworkItemMatch[2]);
    if (method === 'PATCH') {
      mockState.homeworkPatches.push(body);
      mockState.homework[index] = { ...mockState.homework[index], ...body };
      return mockState.homework[index];
    }
    if (method === 'DELETE') {
      mockState.homeworkDeletes.push(homeworkItemMatch[2]);
      mockState.homework.splice(index, 1);
      return { data: { status: 'deleted' } };
    }
  }
  const examsMatch = path.match(/^\/schedule\/class\/([^/]+)\/exams$/);
  if (examsMatch) return mockState.exams.filter((exam) => exam.class_id === examsMatch[1]);
  if (path === '/schedule/exams' && method === 'POST') {
    if (mockState.failNextExam) {
      mockState.failNextExam = false;
      return { status: 500, data: { detail: 'Exam service unavailable' } };
    }
    const exam = { ...body, id: `exam-${mockState.exams.length + 1}` };
    mockState.examPosts.push(body);
    mockState.exams.unshift(exam);
    return { status: 201, data: exam };
  }
  if (/^\/schedule\/class\/[^/]+$/.test(path)) return [];
  return [];
}

let vite;
let browser;
let cdp;
let profileDir;
let viteOutput = '';
const browserExceptions = [];
const mockErrors = [];

try {
  profileDir = await mkdtemp(join(tmpdir(), 'wasel-browser-test-'));
  vite = startVite();
  viteOutput = vite.output();
  await waitForFetch(`${webOrigin}/`);
  viteOutput = vite.output();

  browser = spawn(findBrowser(), [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,900',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  const pages = await (await waitForFetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const page = pages.find((target) => target.type === 'page');
  assert.ok(page?.webSocketDebuggerUrl, 'A browser page target is available');
  cdp = connectCdp(page.webSocketDebuggerUrl);
  await cdp.ready;
  cdp.on('Runtime.exceptionThrown', (event) => browserExceptions.push(event.exceptionDetails));
  cdp.on('Fetch.requestPaused', (event) => {
    void (async () => {
      const { requestId, request } = event;
      const headers = [
        { name: 'Access-Control-Allow-Origin', value: webOrigin },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type,x-workspace-role' },
        { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
        { name: 'Content-Type', value: 'application/json; charset=utf-8' },
      ];
      if (request.method === 'OPTIONS') {
        await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: headers });
        return;
      }
      let body = {};
      if (request.postData) body = JSON.parse(request.postData);
      const path = new URL(request.url).pathname;
      const response = mockResponse(path, request.method, body);
      if (path.endsWith('/attendance/') && mockState.attendanceDelay) await delay(mockState.attendanceDelay);
      if (path.endsWith('/grades/') && request.method === 'POST' && mockState.gradeDelay) await delay(mockState.gradeDelay);
      if (path.endsWith('/homework/') && request.method === 'POST' && mockState.homeworkDelay) await delay(mockState.homeworkDelay);
      if (path === '/schedule/exams' && request.method === 'POST' && mockState.examDelay) await delay(mockState.examDelay);
      const status = response.status ?? 200;
      const data = Object.hasOwn(response, 'data') ? response.data : response;
      await cdp.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: status,
        responseHeaders: headers,
        body: Buffer.from(JSON.stringify(data)).toString('base64'),
      });
    })().catch(async (error) => {
      mockErrors.push(error);
      try {
        await cdp.send('Fetch.fulfillRequest', {
          requestId: event.requestId,
          responseCode: 500,
          body: Buffer.from(JSON.stringify({ detail: 'Mock API failure' })).toString('base64'),
        });
      } catch {}
    });
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${apiOrigin}/*`, requestStage: 'Request' }] });
  const tokenPayload = Buffer.from(JSON.stringify({ user_roles: ['principal', 'teacher', 'parent'] })).toString('base64url');
  const token = `header.${tokenPayload}.signature`;
  const user = JSON.stringify({ name: 'Browser Teacher', school_id: 'school-1', roles: ['principal', 'teacher', 'parent'] });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      if (location.origin !== ${JSON.stringify(webOrigin)}) return;
      if (localStorage.getItem('browser_test_initialized')) return;
      localStorage.setItem('browser_test_initialized', 'true');
      localStorage.setItem('access_token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(user)});
      localStorage.setItem('active_workspace_role', 'teacher');
      localStorage.setItem('educonnect_locale', 'en');
    })();`,
  });

  async function evaluate(expression) {
    const response = await cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed');
    }
    return response.result.value;
  }

  async function waitFor(expression, description, timeout = 12000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(100);
    }
    const body = await evaluate('document.body?.innerText?.slice(0, 3000)');
    throw new Error(`Timed out waiting for ${description}. Page text: ${body}`);
  }

  const selectorExists = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
  const visibleSelector = (selector) => `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    return element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  })()`;

  async function click(selector) {
    await waitFor(visibleSelector(selector), `${selector} to be visible`);
    await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      element.scrollIntoView({ block: 'center' });
      element.click();
    })()`);
  }

  async function clickText(selector, text, exact = true) {
    const expression = `(() => {
      const expected = ${JSON.stringify(text)};
      return [...document.querySelectorAll(${JSON.stringify(selector)})].find((element) => {
        const content = element.textContent.replace(/\\s+/g, ' ').trim();
        return element.getClientRects().length > 0 && (${exact ? 'content === expected' : 'content.includes(expected)'});
      });
    })()`;
    await waitFor(expression, `${text} inside ${selector}`);
    await evaluate(`(() => {
      const element = ${expression};
      element.scrollIntoView({ block: 'center' });
      element.click();
    })()`);
  }

  async function setValue(selector, value) {
    await waitFor(visibleSelector(selector), `${selector} to be editable`);
    await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
  }

  async function navigateRole(role, path, readySelector) {
    if (await evaluate(`location.origin === ${JSON.stringify(webOrigin)}`)) {
      await evaluate(`localStorage.setItem('active_workspace_role', ${JSON.stringify(role)})`);
    }
    await cdp.send('Page.navigate', { url: `${webOrigin}${path}` });
    await waitFor(visibleSelector(readySelector), `${role} dashboard`);
  }

  async function setViewport(width, height, mobile) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 });
  }

  await setViewport(393, 852, true);
  await navigateRole('teacher', '/teacher/dashboard', '.teacher-page');
  await waitFor(selectorExists('.teacher-attendance-table tbody tr'), 'teacher attendance rows');
  assert.equal(await evaluate(`document.querySelectorAll('.teacher-attendance-table tbody tr').length`), 3);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-mobile-class-selector')).display`), 'block');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-desktop-class-selector')).display`), 'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-page .dashboard-tabs')).flexDirection`), 'row');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-attendance-actionbar')).position`), 'sticky');
  assert.ok(await evaluate(`document.querySelector('.teacher-attendance-table .attendance-btn').getBoundingClientRect().height >= 44`));

  await click('.hamburger-btn');
  await waitFor(selectorExists('.premium-sidebar.sidebar-open'), 'mobile drawer to open');
  assert.equal(await evaluate('document.body.style.overflow'), 'hidden');
  assert.equal(await evaluate(`document.activeElement.hasAttribute('data-sidebar-close')`), true);
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await waitFor(`!document.querySelector('.premium-sidebar.sidebar-open')`, 'mobile drawer to close with Escape');
  assert.notEqual(await evaluate('document.body.style.overflow'), 'hidden');
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.hamburger-btn')`), true);
  console.log('mobile teacher layout and drawer passed');

  await clickText('.teacher-attendance-actions .btn-primary', 'Save attendance');
  await waitFor(`document.body.innerText.includes('Please mark attendance for every student.')`, 'incomplete attendance feedback');
  assert.equal(mockState.attendancePosts.length, 0);
  await clickText('.teacher-attendance-actions .btn-secondary', 'Mark all present');
  assert.equal(await evaluate(`document.querySelectorAll('.teacher-attendance-table .attendance-btn--present[aria-pressed="true"]').length`), 3);
  await clickText('.teacher-attendance-table tbody tr:nth-child(2) .attendance-btn', 'Absent');
  assert.equal(await evaluate(`document.querySelector('.teacher-attendance-table tbody tr:nth-child(2) .attendance-btn--absent').getAttribute('aria-pressed')`), 'true');
  mockState.attendanceDelay = 300;
  await clickText('.teacher-attendance-actions .btn-primary', 'Save attendance');
  await waitFor(`document.querySelector('.teacher-attendance-actions .btn-primary').disabled`, 'attendance saving state');
  await waitFor(`document.body.innerText.includes('Attendance saved successfully.')`, 'attendance success feedback');
  assert.equal(mockState.attendancePosts.length, 3);
  assert.equal(mockState.attendancePosts.find((post) => post.student_id === 'student-2')?.status, 'absent');
  assert.deepEqual(
    mockState.attendancePosts.map((post) => post.student_id).sort(),
    students.map((student) => student.id).sort(),
  );
  await clickText('.teacher-attendance-table tbody tr:nth-child(3) .attendance-btn', 'Absent');
  assert.equal(await evaluate(`document.body.innerText.includes('Attendance saved successfully.')`), false);
  console.log('mobile attendance completion and save feedback passed');

  await clickText('.teacher-page .dashboard-action-card', 'Pending grades', false);
  await waitFor(visibleSelector('.teacher-grade-form'), 'grade entry after overview shortcut');
  await waitFor(`document.querySelector('#grade-student').value === 'student-1'`, 'default grade student');
  assert.equal(await evaluate(`document.querySelector('#grade-score').inputMode`), 'decimal');
  await setValue('#grade-score', '15.5');
  await setValue('#grade-comment', 'Browser regression grade');
  await clickText('.teacher-grade-form button[type="submit"]', 'Add grade');
  await waitFor(`document.body.innerText.includes('Grade added. It is waiting for administration approval.')`, 'grade success feedback');
  assert.equal(mockState.gradePosts.length, 1);
  assert.equal(mockState.gradePosts[0].score, 15.5);
  assert.equal(mockState.gradePosts[0].max_score, 20);
  assert.equal(mockState.gradePosts[0].subject, 'Mathematics');

  mockState.failNextGrade = true;
  await setValue('#grade-score', '16');
  await clickText('.teacher-grade-form button[type="submit"]', 'Add grade');
  await waitFor(`document.querySelector('.teacher-grade-form .teacher-save-feedback--error')`, 'persistent grade error');
  assert.equal(await evaluate(`document.querySelector('.teacher-grade-form .teacher-save-feedback--error').innerText.includes('Grade service unavailable')`), true);
  await setValue('#grade-score', '17');
  assert.equal(await evaluate(`Boolean(document.querySelector('.teacher-grade-form .teacher-save-feedback--error'))`), false);
  await clickText('.teacher-grade-form button[type="submit"]', 'Add grade');
  await waitFor(`document.body.innerText.includes('Grade added. It is waiting for administration approval.')`, 'grade retry success');
  assert.equal(mockState.gradePosts.length, 2);
  console.log('grade entry, API payloads, errors, and retry passed');

  await clickText('.teacher-page .dashboard-tabs [role="tab"]', 'Homework and exams');
  await waitFor(visibleSelector('.teacher-homework-form'), 'homework entry');
  assert.equal(await evaluate(`document.querySelectorAll('.teacher-homework-kind-option').length`), 3);
  assert.equal(await evaluate(`document.querySelector('.teacher-homework-kind-option').getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-homework-form .teacher-form-actions')).position`), 'sticky');
  await clickText('.teacher-homework-kind-option', 'Assignment');
  assert.equal(await evaluate(`document.querySelector('.teacher-homework-kind-option--active').innerText`), 'Assignment');
  await setValue('#homework-preparation', 'Review fractions');
  await setValue('#homework-content', 'Complete exercises 1 to 4');
  mockState.homeworkDelay = 300;
  await clickText('.teacher-homework-form button[type="submit"]', 'Publish announcement');
  await waitFor(`document.querySelector('.teacher-homework-form button[type="submit"]').disabled`, 'homework publishing state');
  await waitFor(`document.body.innerText.includes('Announcement published and sent to parents.')`, 'homework success feedback');
  assert.equal(mockState.homeworkPosts.length, 1);
  assert.equal(mockState.homeworkPosts[0].kind, 'assignment');
  assert.equal(mockState.homeworkPosts[0].course_id, 'course-math');
  assert.equal(mockState.homeworkPosts[0].lesson_content, 'Review fractions');
  assert.equal(mockState.homeworkPosts[0].homework_content, 'Complete exercises 1 to 4');
  assert.equal(await evaluate(`document.querySelector('#homework-content').value`), '');

  await setValue('#homework-content', 'Second assignment');
  mockState.failNextHomework = true;
  await clickText('.teacher-homework-form button[type="submit"]', 'Publish announcement');
  await waitFor(`document.querySelector('.teacher-homework-form .teacher-save-feedback--error')`, 'homework error feedback');
  assert.equal(await evaluate(`document.querySelector('.teacher-homework-form .teacher-save-feedback--error').innerText.includes('Homework service unavailable')`), true);
  await setValue('#homework-content', 'Second assignment retry');
  assert.equal(await evaluate(`Boolean(document.querySelector('.teacher-homework-form .teacher-save-feedback--error'))`), false);
  await clickText('.teacher-homework-form button[type="submit"]', 'Publish announcement');
  await waitFor(`document.body.innerText.includes('Announcement published and sent to parents.')`, 'homework retry success');
  assert.equal(mockState.homeworkPosts.length, 2);

  await waitFor(visibleSelector('.teacher-homework-list .homework-announcement-card:first-child .btn-secondary'), 'homework edit action');
  assert.ok(await evaluate(`document.querySelector('.teacher-homework-list .homework-announcement-card:first-child .btn-secondary').getBoundingClientRect().height >= 44`));
  await clickText('.teacher-homework-list .homework-announcement-card:first-child .btn-secondary', 'Edit');
  await setValue('.teacher-homework-list .homework-announcement-card:first-child .inline-edit-form textarea', 'Edited assignment');
  await clickText('.teacher-homework-list .homework-announcement-card:first-child button[type="submit"]', 'Save');
  await waitFor(`document.querySelector('.teacher-homework-list .homework-announcement-card:first-child').innerText.includes('Edited assignment')`, 'homework edit result');
  assert.equal(mockState.homeworkPatches[0].homework_content, 'Edited assignment');
  await evaluate('window.confirm = () => true');
  await clickText('.teacher-homework-list .homework-announcement-card:first-child .btn-danger', 'Delete');
  await waitFor(`!document.body.innerText.includes('Edited assignment')`, 'homework delete result');
  assert.equal(mockState.homeworkDeletes.length, 1);
  console.log('homework publishing, editing, deletion, errors, and retry passed');

  await clickText('.teacher-page .dashboard-tabs [role="tab"]', 'Schedule');
  await waitFor(visibleSelector('.teacher-exam-form'), 'exam entry');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.teacher-exam-form .teacher-form-actions')).position`), 'sticky');
  await setValue('#exam-end-time', '07:00');
  await clickText('.teacher-exam-form button[type="submit"]', 'Add exam to schedule');
  await waitFor(`document.body.innerText.includes('End time must be after start time.')`, 'exam time validation');
  assert.equal(mockState.examPosts.length, 0);
  await setValue('#exam-end-time', '10:00');
  await setValue('#exam-room', 'Lab 2');
  await setValue('#exam-description', 'Chapters 1 and 2');
  mockState.examDelay = 300;
  await clickText('.teacher-exam-form button[type="submit"]', 'Add exam to schedule');
  await waitFor(`document.querySelector('.teacher-exam-form button[type="submit"]').disabled`, 'exam publishing state');
  await waitFor(`document.body.innerText.includes('Exam added to the schedule and sent to parents.')`, 'exam success feedback');
  assert.equal(mockState.examPosts.length, 1);
  assert.equal(mockState.examPosts[0].class_id, 'class-1');
  assert.equal(mockState.examPosts[0].course_id, 'course-math');
  assert.equal(mockState.examPosts[0].room, 'Lab 2');
  assert.equal(mockState.examPosts[0].description, 'Chapters 1 and 2');

  await setValue('#exam-description', 'Second exam');
  mockState.failNextExam = true;
  await clickText('.teacher-exam-form button[type="submit"]', 'Add exam to schedule');
  await waitFor(`document.querySelector('.teacher-exam-form .teacher-save-feedback--error')`, 'exam error feedback');
  assert.equal(await evaluate(`document.querySelector('.teacher-exam-form .teacher-save-feedback--error').innerText.includes('Exam service unavailable')`), true);
  await setValue('#exam-description', 'Second exam retry');
  assert.equal(await evaluate(`Boolean(document.querySelector('.teacher-exam-form .teacher-save-feedback--error'))`), false);
  await clickText('.teacher-exam-form button[type="submit"]', 'Add exam to schedule');
  await waitFor(`document.body.innerText.includes('Exam added to the schedule and sent to parents.')`, 'exam retry success');
  assert.equal(mockState.examPosts.length, 2);
  console.log('exam validation, scheduling, errors, and retry passed');

  await navigateRole('parent', '/parent/dashboard', '.parent-page');
  await waitFor(selectorExists('.parent-page .dashboard-action-card'), 'parent overview shortcuts');
  assert.equal(await evaluate(`document.querySelectorAll('.parent-primary-nav [role="tab"]').length`), 5);
  await click('.parent-page .dashboard-action-card');
  await waitFor(`document.body.innerText.includes('Progress curve')`, 'parent grades shortcut');
  for (const section of ['Schoolwork', 'Attendance & school life', 'Documents & finance', 'Communication']) {
    await clickText('.parent-primary-nav [role="tab"]', section);
    await waitFor(`document.querySelector('.parent-primary-nav [aria-selected="true"]').textContent.trim() === ${JSON.stringify(section)}`, `${section} parent section`);
    assert.equal(await evaluate(`document.querySelectorAll('.parent-secondary-tabs [role="tab"]').length > 0`), true);
  }
  await clickText('.parent-primary-nav [role="tab"]', 'Overview');
  console.log('parent primary navigation and overview shortcut passed');

  await setViewport(1280, 900, false);
  await navigateRole('principal', '/director', '.director-page');
  await waitFor(`document.querySelectorAll('.pending-attendance-row').length === 8`, 'initial director attendance batch');
  assert.equal(await evaluate(`document.body.innerText.includes('Show more (2 remaining)')`), true);
  await click('.director-page .dashboard-action-card');
  assert.equal(await evaluate(`document.activeElement.id`), 'director-pending-attendance');
  await clickText('.pending-attendance-more .btn', 'Show more (2 remaining)');
  await waitFor(`document.querySelectorAll('.pending-attendance-row').length === 10`, 'expanded director attendance batch');
  await setValue('.pending-attendance-search input', 'Student 10');
  await waitFor(`document.querySelectorAll('.pending-attendance-row').length === 1`, 'director attendance search');
  assert.equal(await evaluate(`document.querySelector('.pending-attendance-row').innerText.includes('Student 10')`), true);
  await setValue('.pending-attendance-search input', '');
  await setValue('.pending-attendance-status select', 'late');
  await waitFor(`document.querySelectorAll('.pending-attendance-row').length === 5`, 'director attendance status filter');
  assert.equal(await evaluate(`[...document.querySelectorAll('.pending-attendance-row')].every((row) => row.innerText.includes('Late'))`), true);
  await setValue('.pending-attendance-search input', 'No matching student');
  await waitFor(`document.body.innerText.includes('No records match this search.')`, 'director empty search result');
  console.log('director shortcuts, filtering, and batch expansion passed');

  assert.deepEqual(mockErrors, []);
  assert.deepEqual(browserExceptions, []);
  console.log('browser workflow regression tests passed');
} catch (error) {
  console.error('browser workflow regression tests failed');
  if (viteOutput) console.error(`Vite output:\n${viteOutput}`);
  if (mockErrors.length > 0) console.error('Mock API errors:', mockErrors);
  if (browserExceptions.length > 0) console.error('Browser exceptions:', browserExceptions);
  console.error(error);
  process.exitCode = 1;
} finally {
  if (cdp) {
    try {
      await Promise.race([cdp.send('Browser.close'), delay(2000)]);
    } catch {}
    cdp.close();
  }
  if (browser && browser.exitCode === null) {
    const exited = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    await Promise.race([exited, delay(2000)]);
  }
  vite?.child.kill();
  if (profileDir) {
    try {
      await rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (error) {
      console.warn(`Could not remove temporary browser profile ${profileDir}:`, error);
      process.exitCode = 1;
    }
  }
}
