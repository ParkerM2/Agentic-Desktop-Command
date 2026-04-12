/**
 * IdeaCard — Displays a single idea with category, tags, title, description, and vote controls.
 */

import { ChevronDown, ChevronUp, Pencil, Tag, Trash2 } from 'lucide-react';

import type { Idea, IdeaCategory } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';
import { cn } from '@renderer/shared/lib/utils';

import { Badge, Button, Card, CardContent } from '@ui';

const CATEGORY_CONFIG: Record<IdeaCategory, { label: string; colorClass: string }> = {
  feature: { label: 'Feature', colorClass: 'text-primary' },
  improvement: { label: 'Improvement', colorClass: 'text-info' },
  bug: { label: 'Bug', colorClass: 'text-warning' },
  performance: { label: 'Performance', colorClass: 'text-muted-foreground' },
};

interface IdeaCardProps {
  idea: Idea;
  onDelete: (id: string) => void;
  onEdit: (idea: Idea) => void;
  onVote: (id: string, delta: number) => void;
}

export function IdeaCard({ idea, onDelete, onEdit, onVote }: IdeaCardProps) {
  const catConfig = CATEGORY_CONFIG[idea.category];
  const hasTags = (idea.tags.length) > 0;

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Category header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className={cn('h-3.5 w-3.5', catConfig.colorClass)} />
            <span className={cn('text-xs font-medium', catConfig.colorClass)}>
              {catConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              aria-label={`Edit ${idea.title}`}
              className="text-muted-foreground hover:text-primary h-6 w-6 p-1"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => onEdit(idea)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              aria-label={`Delete ${idea.title}`}
              className="text-muted-foreground hover:text-destructive h-6 w-6 p-1"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => onDelete(idea.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="mb-1 text-sm font-medium">{idea.title}</h3>
        <p className="text-muted-foreground mb-2 flex-1 text-xs leading-relaxed">
          {idea.description}
        </p>

        {/* Tags */}
        {hasTags ? (
          <div className="mb-3 flex flex-wrap gap-1">
            {idea.tags.map((tag) => (
              <Badge key={tag} className="text-xs" variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Votes */}
        <div className="flex items-center gap-2">
          <Button
            className="text-muted-foreground hover:text-primary h-6 w-6 p-1"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onVote(idea.id, 1)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{idea.votes}</span>
          <Button
            className="text-muted-foreground hover:text-destructive h-6 w-6 p-1"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onVote(idea.id, -1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground bg-muted/50 ml-auto rounded-full px-2 py-0.5 text-xs capitalize">
            {idea.status}
          </span>
          <RelativeTime value={idea.createdAt} />
        </div>
      </CardContent>
    </Card>
  );
}
