# Product guide

## Who uses it

| Role | Who | What they can do |
| --- | --- | --- |
| **Platform administrator** (`system_admin`) | The company running Wasel Edu | Create and activate schools, record subscription payments, see platform health. Not tied to a school. |
| **Director** (`principal`) | Head of a school | Everything for their school: team, classes, students, parents, fees, report cards, announcements, analytics, activity log, logo, referral. |
| **Secretary** (`secretary`) | Administration staff | Same as the director except inviting/managing secretaries and nurses, changing the logo, and the automatic-reminder setting. |
| **Teacher** (`teacher`) | Teaching staff | Only the classes and **subjects** they are assigned: grades, attendance, homework, lessons, remarks, meeting slots, messages. |
| **School nurse** (`nurse`) | Infirmary | Health sheets only (read and edit). Every other area is refused by the server. |
| **Parent** (`parent`) | Parent or guardian | Only their own children: grades, attendance, homework, schedule, report cards, meetings, health sheet, fees and receipts, messages. |

A person can hold the web workspace of one role at a time; the app shows a role
picker when an account has several.

## Getting a school started

1. **Sign-up.** A director registers the school (optionally with another school's *referral code*). The school is created inactive with the three Algerian trimesters and a standard list of subjects.
2. **Activation.** The platform administrator activates it. A school with no subscription gets a **free first trimester**: until the end of the current trimester, or the next one if fewer than 30 days remain. If it was referred, both schools receive **2 extra months** (once).
3. **Setup checklist** on the director's home page: school logo, trimesters, classes, subjects, students (all placed in a class), teachers (invited and activated), subjects assigned to each class, parents connected (at least half of the students).
4. **Importing.** Students from a CSV/Excel template (`prenom;nom;classe`); teachers from a CSV (`prenom;nom;email`) — each gets a one-time activation code to print.
5. **Connecting parents.** Printable cards with each student's ID and 6-digit PIN, or a QR code the director generates; a parent installs the app, chooses *Code or QR* and creates a password.

## Features by area

### Teaching
- **Grades**, always out of 20 for averages. Subjects have **coefficients** per class. A grade enters as *pending* and counts only once the administration approves it. Teachers can correct or delete their grades until approved; every change is audited.
- **Attendance**: present / absent / late, taken per class and day. Parents are notified of absences; a parent can submit a justification, which counts only after the administration accepts it. Past records can be corrected (parents are told).
- **Homework, exams and lesson diary** per class and subject.
- **Remarks**: praise, information or warning, visible to the child's parents.
- **Schedule**: weekly timetable and exam planning. The Algerian school week is Sunday to Thursday.
- **Subject scoping**: a teacher of one subject cannot see or enter another subject's grades, even in the same class. Reassigning a subject removes the previous teacher's access.

### Report cards
- Preview and **publish** a class's report cards for a trimester. Each publication is a saved snapshot, so later grade edits never change an issued card; re-publishing replaces it. Parents are notified.
- Rank, class average, attendance counts and a **distinction** (*Tableau d'honneur / لوحة الشرف* from 12, *Encouragements / تشجيع* from 14, *Félicitations / تهنئة* from 16, on the general average; a school can override the thresholds).
- The printed card carries the school logo and a **QR code** to a public page showing what the school published (school, student, class, term, average, rank, distinction, date — never subject grades or absences). Re-publishing keeps the same code; withdrawing the card invalidates it.

### Fees
- The director or secretary bills a class or the whole school (no double billing for the same label), collects payments (cash, bank transfer, CCP/BaridiMob, cheque) and prints **receipts**. Payments can be cancelled with a reason; amounts are exact to the cent.
- **Reminders**: per family or all overdue; the same fee is not reminded twice within 3 days. Optional **automatic reminders** (director setting): one message up to 3 days before the due date, then weekly while overdue, at most 4, only between 08:00 and 20:00 Algeria time.
- Parents see balance, due dates and every receipt, and are notified of each payment. Online payment is **not** part of the product: money is received at the school office.

### Communication
- **Announcements and calendar**: whole school or selected classes, five categories (announcement, event, holiday, exam period, meeting), read receipts.
- **Class chat** (real time) and **direct messages** between permitted people only; blocking and reporting; parents cannot message other parents.
- **Parent–teacher meetings**: teachers open slots; parents book one (one upcoming meeting per teacher per child).
- **Notifications**: in the app's list, plus push to phones through Firebase when configured (even if the app is closed).

### Health and safety
- **Health and emergency sheet** per student (contacts in calling order, allergies, conditions, medication, blood group, doctor, instructions, and a short *teacher alert*). Created only with the parent's recorded consent (given in the app, or attested by the school from a signed paper form). Parents can withdraw consent, which erases the sheet.
- Visibility: the full sheet to administration, the school nurse and the child's parents; **teachers see only the short alert**. Every staff view is audited; fields are encrypted in the database.
- The **infirmary** workspace lists students with their alerts so the nurse can find and open a sheet quickly.

### Management and insight
- **Student file** and **teacher history** (30-day activity) for the director.
- **Early warning**: students at risk are flagged when the trimester average is below 10/20, has dropped by 2 points or more against the previous trimester, or when there are 3+ unjustified absences or 5+ late arrivals in 30 days.
- **Monthly report**: attendance, notifications to parents, active parents and teachers, grades, homework, lessons, messages, announcements, report cards, meetings and fees collected, next to the previous month, plus attendance by class; printable. On the 1st of each month the director is notified that last month's report is ready.
- **Activity log** with filters and CSV export; **device and session control** (users sign out other devices; administrators sign out a person).

### Accounts and sessions
- Staff are invited with a one-time code valid 72 hours; the administration can reset access, deactivate a person, or sign them out everywhere.
- Parents can change their password, sign out other devices, and delete their account (personal data is removed, academic history is kept anonymised).
- Terms are versioned: when the privacy terms change, everyone accepts them again.

## Public demo
When enabled on the server, the login page offers **“Discover without an account”** as director, teacher or parent in a fictional school. It is read-only, shows a banner, and is rebuilt every night so its dates stay current. Visitors share one account and are not tracked.

## Languages and formats
Arabic (right-to-left), French and English. Dates and amounts follow the language; money is shown in DA (دج). Times use Algeria time (UTC+1, no daylight saving).

## What the product deliberately does not do
- Online payment, and sending codes by email or SMS (codes are handed over by the school).
- Grades or attendance for teachers across subjects they do not teach.
- Selling or profiling data; data is used for school purposes only (see the privacy policy).
