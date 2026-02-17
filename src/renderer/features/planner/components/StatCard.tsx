/**
 * StatCard — Displays a single metric in the weekly review stats grid
 */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <div className="mt-2">
        <span className="text-foreground text-2xl font-bold">{value}</span>
        {subtext ? <span className="text-muted-foreground ml-1 text-sm">{subtext}</span> : null}
      </div>
    </div>
  );
}
