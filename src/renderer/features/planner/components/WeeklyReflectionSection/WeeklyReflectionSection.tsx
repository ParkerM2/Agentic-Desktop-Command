/**
 * WeeklyReflectionSection — Editable weekly reflection card
 */

import { MessageSquare } from 'lucide-react';

import { Button, Card, CardContent, Textarea } from '@ui';

import { useWeeklyReflectionSection } from './useWeeklyReflectionSection';

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
  const {
    isEditing,
    setIsEditing,
    reflectionText,
    setReflectionText,
    updateReflection,
    handleStartEdit,
    handleSave,
  } = useWeeklyReflectionSection(weekStart, reflection);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">Weekly Reflection</h2>
          {isEditing ? null : (
            <Button
              className="text-muted-foreground hover:text-primary h-auto gap-1 p-0 text-xs"
              size="sm"
              variant="ghost"
              onClick={handleStartEdit}
            >
              <MessageSquare className="h-3 w-3" />
              {reflection ? 'Edit' : 'Add'}
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Reflect on your week. What went well? What could be improved?"
              resize="none"
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={updateReflection.isPending}
                size="sm"
                onClick={handleSave}
              >
                {updateReflection.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <ReflectionDisplay text={reflection} />
        )}
      </CardContent>
    </Card>
  );
}
