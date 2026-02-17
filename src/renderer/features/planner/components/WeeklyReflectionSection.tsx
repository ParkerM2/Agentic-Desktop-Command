/**
 * WeeklyReflectionSection — Editable weekly reflection card
 */

import { useState } from 'react';

import { MessageSquare } from 'lucide-react';

import { useUpdateWeeklyReflection } from '../api/useWeeklyReview';

interface WeeklyReflectionSectionProps {
  weekStart: string;
  reflection?: string;
}

function ReflectionDisplay({ text }: { text?: string }) {
  if (text) {
    return <p className="text-muted-foreground text-sm">{text}</p>;
  }
  return (
    <p className="text-muted-foreground text-xs italic">
      No weekly reflection yet. Take a moment to review your week.
    </p>
  );
}

export function WeeklyReflectionSection({ weekStart, reflection }: WeeklyReflectionSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const updateReflection = useUpdateWeeklyReflection();

  function handleStartEdit() {
    setReflectionText(reflection ?? '');
    setIsEditing(true);
  }

  function handleSave() {
    updateReflection.mutate({ startDate: weekStart, reflection: reflectionText });
    setIsEditing(false);
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Weekly Reflection</h2>
        {isEditing ? null : (
          <button
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs transition-colors"
            onClick={handleStartEdit}
          >
            <MessageSquare className="h-3 w-3" />
            {reflection ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
            placeholder="Reflect on your week. What went well? What could be improved?"
            rows={4}
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-xs transition-colors"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-xs font-medium transition-colors"
              disabled={updateReflection.isPending}
              onClick={handleSave}
            >
              {updateReflection.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <ReflectionDisplay text={reflection} />
      )}
    </div>
  );
}
