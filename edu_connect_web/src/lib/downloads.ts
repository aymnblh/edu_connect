import { api } from './api';

/** Excel-ready CSV of the columns the student import understands. */
export async function downloadStudentTemplate() {
  const res = await api.get('/admin/import/students/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modele_import_eleves.csv';
  link.click();
  URL.revokeObjectURL(url);
}
