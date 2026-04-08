import { cva } from 'class-variance-authority';

import { cn } from '@renderer/shared/lib/utils';

import { Card, CardContent } from './card';

import type { VariantProps } from 'class-variance-authority';

// ─── Variants (ALL Tailwind lives here) ─────────────────

const metricCardVariants = cva('', {
  variants: {
    variant: {
      default: '',
      compact: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const metricCardIconVariants = cva(
  'flex items-center justify-center rounded-md bg-muted text-muted-foreground flex-shrink-0',
  {
    variants: {
      variant: {
        default: 'h-10 w-10',
        compact: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const metricCardValueVariants = cva('font-semibold tabular-nums text-foreground', {
  variants: {
    variant: {
      default: 'text-2xl',
      compact: 'text-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

// ─── Types ───────────────────────────────────────────────

type TrendDirection = 'up' | 'down' | 'neutral';

interface MetricCardTrend {
  value: string;
  direction: TrendDirection;
}

// ─── Trend color helper ──────────────────────────────────

function getTrendColor(direction: TrendDirection): string {
  if (direction === 'up') return 'text-success';
  if (direction === 'down') return 'text-destructive';
  return 'text-muted-foreground';
}

// ─── Component (React 19 — no forwardRef) ───────────────

interface MetricCardProps
  extends Omit<React.ComponentProps<'div'>, 'children'>,
    VariantProps<typeof metricCardVariants> {
  /** Icon component displayed in the card */
  icon?: React.ComponentType<{ className?: string }>;
  /** Metric label / title */
  label: string;
  /** Primary metric value */
  value: string;
  /** Optional supporting text below the value */
  subtitle?: string;
  /** Optional trend indicator */
  trend?: MetricCardTrend;
}

function MetricCard({
  className,
  variant,
  icon,
  label,
  value,
  subtitle,
  trend,
  ...props
}: MetricCardProps) {
  const IconEl = icon;
  const trendColor = trend === undefined ? '' : getTrendColor(trend.direction);
  const contentPadding = variant === 'compact' ? 'p-4' : 'p-6';
  const iconSize = variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <Card className={cn(metricCardVariants({ variant, className }))} data-slot="metric-card" {...props}>
      <CardContent className={contentPadding}>
        <div className="flex items-start gap-3">
          {IconEl === undefined ? null : (
            <div className={cn(metricCardIconVariants({ variant }))}>
              <IconEl className={cn(iconSize)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className={cn(metricCardValueVariants({ variant }))}>{value}</p>
            {subtitle === undefined ? null : (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend === undefined ? null : (
              <p className={cn('mt-1 text-xs font-medium', trendColor)}>{trend.value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { MetricCard, metricCardVariants };
export type { MetricCardProps, MetricCardTrend, TrendDirection };
