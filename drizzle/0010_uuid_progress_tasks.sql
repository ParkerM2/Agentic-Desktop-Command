ALTER TABLE progress_tasks ADD COLUMN id TEXT;
--> statement-breakpoint
UPDATE progress_tasks SET id = (
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  '4' || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(substr('89ab', abs(random()) % 4 + 1, 1)) || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(hex(randomblob(6)))
) WHERE id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_progress_tasks_id ON progress_tasks(id);
