import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPKR } from './calculations';

export function exportToExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, string | number>[] }[],
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToPdf(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string,
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [columns],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export function money(n: number) {
  return formatPKR(n);
}
