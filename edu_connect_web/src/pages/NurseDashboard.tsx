import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, HeartPulse, Search } from 'lucide-react';
import { Modal } from '../components/DirectorRecordsPanels';
import HealthRecordForm from '../components/HealthRecordForm';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';

interface InfirmaryStudent {
  student_id: string;
  student_name: string;
  student_code: string | null;
  classes: Array<{ id: string; name: string }>;
  has_record: boolean;
  alert: string | null;
}

/** The school nurse's space: find a student, read or fill in their health sheet. */
export default function NurseDashboard() {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const studentsQuery = useQuery<InfirmaryStudent[]>({
    queryKey: ['infirmary-students'],
    queryFn: async () => (await api.get('/infirmary/students')).data,
  });
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const classes = useMemo(() => {
    const seen = new Map<string, string>();
    students.forEach((student) => student.classes.forEach((cls) => seen.set(cls.id, cls.name)));
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [students]);
  const needle = search.trim().toLowerCase();
  const visible = students.filter((student) =>
    (!classId || student.classes.some((cls) => cls.id === classId))
    && (!onlyAlerts || Boolean(student.alert))
    && (!needle || student.student_name.toLowerCase().includes(needle) || (student.student_code ?? '').toLowerCase().includes(needle)),
  );
  const opened = students.find((student) => student.student_id === openId);
  const withRecord = students.filter((student) => student.has_record).length;

  return (
    <div className="animate-fade-in">
      <header className="dashboard-header">
        <div className="badge dashboard-eyebrow">
          <HeartPulse size={14} /> {t('role.nurse')}
        </div>
        <h1>{t('infirmary.title')}</h1>
        <p>{t('infirmary.copy', { count: withRecord, total: students.length })}</p>
      </header>

      <section className="glass-card dashboard-card-pad">
        <div className="fees-filters">
          <div className="student-filter-bar">
            <Search size={17} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('fees.search')} aria-label={t('fees.search')} />
          </div>
          <select className="form-input" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('codes.class')}>
            <option value="">{t('codes.allClasses')}</option>
            {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} />
            {t('infirmary.onlyAlerts')}
          </label>
        </div>

        {studentsQuery.isLoading && <p className="dashboard-section-copy">{t('common.loading')}</p>}
        {!studentsQuery.isLoading && (
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th scope="col">{t('fees.student')}</th>
                  <th scope="col">{t('codes.class')}</th>
                  <th scope="col">{t('infirmary.alert')}</th>
                  <th scope="col">{t('director.students.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((student) => (
                  <tr key={student.student_id}>
                    <td>
                      <strong>{student.student_name}</strong>
                      <div className="table-cell-muted">{student.student_code ?? ''}</div>
                    </td>
                    <td>{student.classes.map((cls) => cls.name).join(', ') || '—'}</td>
                    <td>
                      {student.alert ? (
                        <span className="infirmary-alert"><AlertTriangle size={14} aria-hidden="true" /> {student.alert}</span>
                      ) : student.has_record ? t('infirmary.recordNoAlert') : <span className="table-cell-muted">{t('infirmary.noRecord')}</span>}
                    </td>
                    <td>
                      <button type="button" className="btn btn-secondary btn-compact" onClick={() => setOpenId(student.student_id)}>
                        <HeartPulse size={14} /> {student.has_record ? t('infirmary.open') : t('infirmary.create')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!studentsQuery.isLoading && visible.length === 0 && <p className="dashboard-section-copy">{t('fees.noMatch')}</p>}
        <p className="report-card-muted">{t('infirmary.audit')}</p>
      </section>

      {opened && (
        <Modal title={opened.student_name} onClose={() => { setOpenId(null); void studentsQuery.refetch(); }}>
          <HealthRecordForm key={opened.student_id} studentId={opened.student_id} mode="school" />
        </Modal>
      )}
    </div>
  );
}
