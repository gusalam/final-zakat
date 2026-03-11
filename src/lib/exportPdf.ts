import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  filename: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportPdf({ title, subtitle, headers, rows, filename, orientation = 'portrait' }: ExportPdfOptions) {
  try {
    const doc = new jsPDF({ orientation });

    doc.setFontSize(16);
    doc.text(title, 14, 20);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, 14, 28);
      doc.setTextColor(0);
    }

    const startY = subtitle ? 34 : 28;

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [39, 103, 73], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('PDF berhasil diunduh ✓');
  } catch (error) {
    console.error('Export PDF error:', error);
    toast.error('Gagal mengunduh PDF. Silakan coba lagi.');
  }
}
