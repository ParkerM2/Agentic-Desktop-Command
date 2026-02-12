/**
 * DashboardPage — Main dashboard layout composing all widgets
 */

import { useDashboardEvents } from '../hooks/useDashboardEvents';

import { ActiveAgents } from './ActiveAgents';
import { DailyStats } from './DailyStats';
import { GreetingHeader } from './GreetingHeader';
import { QuickCapture } from './QuickCapture';
import { RecentProjects } from './RecentProjects';
import { TodayView } from './TodayView';

export function DashboardPage() {
  useDashboardEvents();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        {/* Greeting */}
        <GreetingHeader />

        {/* Row 1: Today + Recent Projects */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <TodayView />
          </div>
          <div className="md:col-span-3">
            <RecentProjects />
          </div>
        </div>

        {/* Row 2: Active Agents + Quick Capture & Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ActiveAgents />
          <div className="space-y-4">
            <QuickCapture />
            <DailyStats />
          </div>
        </div>
      </div>
    </div>
  );
}
