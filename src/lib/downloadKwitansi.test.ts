import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadKwitansiPdf } from './downloadKwitansi';
import type { KwitansiData } from '@/components/KwitansiZakat';

global.Image = class {
  onload: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  src = '';
  crossOrigin = '';
  constructor() { setTimeout(() => { if (this.onload) this.onload(); }, 0); }
} as any;

vi.mock('jspdf', () => {
  const mockDoc = {
    setDrawColor: vi.fn().mockReturnThis(),
    setLineWidth: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    setFillColor: vi.fn().mockReturnThis(),
    addImage: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    line: vi.fn().mockReturnThis(),
    getTextWidth: vi.fn(() => 40),
    splitTextToSize: vi.fn((text: string) => [text]),
    output: vi.fn(() => new Blob(['mock-pdf'], { type: 'application/pdf' })),
  };
  return { default: vi.fn(() => mockDoc) };
});

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/assets/logo-masjid.webp', () => ({ default: 'data:image/webp;base64,mock-logo' }));

describe('downloadKwitansiPdf', () => {
  const mockData: KwitansiData = {
    nomor: 123,
    nama_muzakki: 'Ahmad Budi',
    alamat_muzakki: 'Jl. Test No. 1',
    details: [
      { jenis_zakat: 'Zakat Fitrah', jumlah_uang: 50000, jumlah_beras: 2.5, jumlah_jiwa: 4 },
      { jenis_zakat: 'Infaq', jumlah_uang: 100000, jumlah_beras: 0, jumlah_jiwa: 0 },
    ],
    tanggal: '2024-04-15',
    penerima: 'Panitia Zakat',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    const mockAnchor = document.createElement('a');
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);
    vi.spyOn(mockAnchor, 'click').mockImplementation(() => {});
  });

  it('should successfully generate and download PDF', async () => {
    await downloadKwitansiPdf(mockData);
    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalled();
  });

  it('should handle minimal data', async () => {
    const minimalData: KwitansiData = {
      nomor: 456,
      nama_muzakki: 'Test User',
      details: [{ jenis_zakat: 'Zakat Fitrah', jumlah_uang: 25000, jumlah_beras: 0, jumlah_jiwa: 1 }],
      tanggal: '2024-04-15',
      penerima: 'Admin',
    };
    await downloadKwitansiPdf(minimalData);
    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalled();
  });

  it('should handle multiple payment types', async () => {
    const data: KwitansiData = {
      nomor: 789,
      nama_muzakki: 'Multiple Types',
      details: [
        { jenis_zakat: 'Zakat Fitrah', jumlah_uang: 50000, jumlah_beras: 2.5, jumlah_jiwa: 4 },
        { jenis_zakat: 'Zakat Mal', jumlah_uang: 200000, jumlah_beras: 0, jumlah_jiwa: 0 },
        { jenis_zakat: 'Infaq', jumlah_uang: 100000, jumlah_beras: 0, jumlah_jiwa: 0 },
        { jenis_zakat: 'Fidyah', jumlah_uang: 30000, jumlah_beras: 1.5, jumlah_jiwa: 0 },
      ],
      tanggal: '2024-04-15',
      penerima: 'Panitia',
    };
    await downloadKwitansiPdf(data);
    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalled();
  });

  it('should handle download errors gracefully', async () => {
    global.URL.createObjectURL = vi.fn(() => { throw new Error('fail'); });
    const { saveAs } = await import('file-saver');
    await downloadKwitansiPdf(mockData);
    expect(saveAs).toHaveBeenCalled();
  });
});
