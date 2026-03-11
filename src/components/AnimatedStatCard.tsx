import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCountUp } from '@/hooks/useAnimationLoop';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  isCurrency?: boolean;
  icon: LucideIcon;
  color?: string;
  loopInterval?: number;
}

export default function AnimatedStatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  isCurrency = false,
  icon: Icon,
  color = 'text-primary',
  loopInterval = 30000,
}: AnimatedStatCardProps) {
  const animatedValue = useCountUp(value, 1500, loopInterval);

  const display = isCurrency
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(animatedValue)
    : `${prefix}${animatedValue.toLocaleString('id-ID')}${suffix}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5 min-h-[100px] sm:min-h-[110px]">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${color}`} />
          <span className="text-sm sm:text-base text-muted-foreground leading-tight break-words">{label}</span>
        </div>
        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tabular-nums" style={{ lineHeight: '1.3' }}>
          {display}
        </p>
      </CardContent>
    </Card>
  );
}
