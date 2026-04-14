-- Add UUID id column to tables that currently use natural keys as primary keys
-- Tables: briefings, changelog_entries, oauth_tokens, settings_kv

-- briefings
ALTER TABLE briefings ADD COLUMN id TEXT;
--> statement-breakpoint
UPDATE briefings SET id = (
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  '4' || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(substr('89ab', abs(random()) % 4 + 1, 1)) || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(hex(randomblob(6)))
) WHERE id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_briefings_id ON briefings(id);
--> statement-breakpoint
-- changelog_entries
ALTER TABLE changelog_entries ADD COLUMN id TEXT;
--> statement-breakpoint
UPDATE changelog_entries SET id = (
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  '4' || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(substr('89ab', abs(random()) % 4 + 1, 1)) || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(hex(randomblob(6)))
) WHERE id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_changelog_entries_id ON changelog_entries(id);
--> statement-breakpoint
-- oauth_tokens
ALTER TABLE oauth_tokens ADD COLUMN id TEXT;
--> statement-breakpoint
UPDATE oauth_tokens SET id = (
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  '4' || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(substr('89ab', abs(random()) % 4 + 1, 1)) || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(hex(randomblob(6)))
) WHERE id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_oauth_tokens_id ON oauth_tokens(id);
--> statement-breakpoint
-- settings_kv
ALTER TABLE settings_kv ADD COLUMN id TEXT;
--> statement-breakpoint
UPDATE settings_kv SET id = (
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-' ||
  '4' || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(substr('89ab', abs(random()) % 4 + 1, 1)) || lower(substr(hex(randomblob(2)), 2)) || '-' ||
  lower(hex(randomblob(6)))
) WHERE id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX idx_settings_kv_id ON settings_kv(id);
