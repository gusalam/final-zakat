import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

const COLORS = [
  'hsl(142, 71%, 45%)',
  'hsl(221, 83%, 53%)',
  'hsl(38, 92%, 50%)',
  'hsl(270, 70%, 60%)',
  'hsl(0, 72%, 51%)',
  'hsl(180, 60%, 45%)',
  'hsl(320, 70%, 55%)',
  'hsl(60, 80%, 45%)',
];

interface MustahikPieChartProps {
  data: any[];
}

export default function MustahikPieChart({ data }: MustahikPieChartProps) {
  const chartData = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const m of data) {
      const k = m.kategori || 'Tidak Dikategorikan';
      summary[k] = (summary[k] || 0) + 1;
    }
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  }, [data]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  const renderLabel = ({ name, percent }: any) =>
    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary shrink-0" />
          Distribusi per Kategori Mustahik
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 pb-4">
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Belum ada data</p>
        ) : (
          <div className="h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  label={renderLabel}
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} orang (${((value / total) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
