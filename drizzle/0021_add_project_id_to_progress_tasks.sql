-- drizzle/0021_add_project_id_to_progress_tasks.sql
-- Scope progress tasks to a specific project so each project's Tasks tab
-- renders only its own list instead of a shared global one.
ALTER TABLE progress_tasks ADD COLUMN project_id TEXT;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_progress_tasks_project ON progress_tasks(project_id);
