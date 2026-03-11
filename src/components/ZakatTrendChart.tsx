import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ZakatTrendChartProps {
  data: any[];
}

type ViewMode = 'harian' | 'mingguan';

export default function ZakatTrendChart({ data }: ZakatTrendChartProps) {
  const [mode, setMode] = useState<ViewMode>('harian');

  const chartData = useMemo(() => {
    const grouped: Record<string, { fitrah: number; mal: number; infaq: number; fidyah: number }> = {};

    for (const t of data) {
      const tanggal = t.tanggal as string;
      if (!tanggal) continue;

      let key: string;
      if (mode === 'harian') {
        key = tanggal;
      } else {
        const d = new Date(tanggal);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        key = monday.toISOString().split('T')[0];
      }

      if (!grouped[key]) grouped[key] = { fitrah: 0, mal: 0, infaq: 0, fidyah: 0 };

      for (const d of (t.detail_zakat || [])) {
        const uang = Number(d.jumlah_uang) || 0;
        const jenis = (d.jenis_zakat || '').toLowerCase();
        if (jenis.includes('fitrah')) grouped[key].fitrah += uang;
        else if (jenis.includes('mal')) grouped[key].mal += uang;
        else if (jenis.includes('infaq') || jenis.includes('shodaqoh')) grouped[key].infaq += uang;
        else if (jenis.includes('fidyah')) grouped[key].fidyah += uang;
      }
    }

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        tanggal: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        ...vals,
      }));
  }, [data, mode]);

  const fmtTooltip = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            Tren Zakat
          </CardTitle>
          <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="harian" className="text-xs px-3 h-7">Harian</TabsTrigger>
              <TabsTrigger value="mingguan" className="text-xs px-3 h-7">Mingguan</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pb-4">
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Belum ada data</p>
        ) : (
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="tanggal"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}rb` : v}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [fmtTooltip(value), name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                    fontSize: '12px',
                  }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
                <Bar dataKey="fitrah" name="Fitrah" fill="hsl(var(--chart-1, 142 71% 45%))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="mal" name="Mal" fill="hsl(var(--chart-2, 221 83% 53%))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="infaq" name="Infaq" fill="hsl(var(--chart-3, 38 92% 50%))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fidyah" name="Fidyah" fill="hsl(var(--chart-4, 270 70% 60%))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
