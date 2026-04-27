CREATE TABLE op_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hlc TEXT NOT NULL,
  origin_peer_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  pk TEXT NOT NULL,
  op_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX op_log_dedup ON op_log(origin_peer_id, hlc);
--> statement-breakpoint
CREATE TABLE row_meta (
  table_name TEXT NOT NULL,
  pk TEXT NOT NULL,
  column_name TEXT NOT NULL,
  hlc TEXT NOT NULL,
  origin_peer_id TEXT NOT NULL,
  PRIMARY KEY (table_name, pk, column_name)
);
--> statement-breakpoint
CREATE INDEX row_meta_by_row ON row_meta(table_name, pk);
