const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

function terbilangHelper(n: number): string {
  if (n < 12) return satuan[n];
  if (n < 20) return satuan[n - 10] + ' belas';
  if (n < 100) return satuan[Math.floor(n / 10)] + ' puluh' + (n % 10 ? ' ' + satuan[n % 10] : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + terbilangHelper(n % 100) : '');
  if (n < 1000) return satuan[Math.floor(n / 100)] + ' ratus' + (n % 100 ? ' ' + terbilangHelper(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + terbilangHelper(n % 1000) : '');
  if (n < 1000000) return terbilangHelper(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilangHelper(n % 1000) : '');
  if (n < 1000000000) return terbilangHelper(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 ? ' ' + terbilangHelper(n % 1000000) : '');
  if (n < 1000000000000) return terbilangHelper(Math.floor(n / 1000000000)) + ' miliar' + (n % 1000000000 ? ' ' + terbilangHelper(n % 1000000000) : '');
  return terbilangHelper(Math.floor(n / 1000000000000)) + ' triliun' + (n % 1000000000000 ? ' ' + terbilangHelper(n % 1000000000000) : '');
}

export function terbilang(n: number): string {
  if (n === 0) return 'nol rupiah';
  const result = terbilangHelper(Math.floor(Math.abs(n)));
  return result.charAt(0).toUpperCase() + result.slice(1) + ' rupiah';
}
