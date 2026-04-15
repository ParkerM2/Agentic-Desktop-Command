/**
 * StatsOverview — Summary fitness statistics cards
 */

import { Activity, Dumbbell, Flame, Timer, Trophy } from 'lucide-react';

import { MetricCard } from '@ui';

import { useFitnessStats } from '../api/useFitness';

// ── Component ────────────────────────────────────────────────

export function StatsOverview() {
  const { data: stats } = useFitnessStats();

  if (!stats) return null;

  const cards = [
    {
      label: 'Total Workouts',
      value: String(stats.totalWorkouts),
      icon: Dumbbell,
    },
    {
      label: 'This Week',
      value: String(stats.workoutsThisWeek),
      icon: Activity,
    },
    {
      label: 'Current Streak',
      value: `${String(stats.currentStreak)} days`,
      icon: Flame,
    },
    {
      label: 'Longest Streak',
      value: `${String(stats.longestStreak)} days`,
      icon: Trophy,
    },
    {
      label: 'Avg Duration',
      value: `${String(stats.averageWorkoutDuration)} min`,
      icon: Timer,
    },
    {
      label: 'Total Volume',
      value:
        stats.totalVolume > 1000
          ? `${String(Math.round(stats.totalVolume / 1000))}k`
          : String(stats.totalVolume),
      icon: Dumbbell,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <MetricCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          variant="compact"
        />
      ))}
      {stats.favoriteExercise ? (
        <div className="bg-card border-border col-span-full rounded-lg border p-4">
          <span className="text-muted-foreground text-xs font-medium">Favorite Exercise</span>
          <p className="text-foreground mt-1 text-lg font-semibold capitalize">
            {stats.favoriteExercise}
          </p>
        </div>
      ) : null}
    </div>
  );
}
