-- Add pr_number, pr_status, jira_url columns to progress_tasks
-- Drop unused tags and branch columns

ALTER TABLE progress_tasks ADD COLUMN pr_number INTEGER;
ALTER TABLE progress_tasks ADD COLUMN pr_status TEXT;
ALTER TABLE progress_tasks ADD COLUMN jira_url TEXT;
ALTER TABLE progress_tasks DROP COLUMN tags;
ALTER TABLE progress_tasks DROP COLUMN branch;
