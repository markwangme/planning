CREATE TABLE IF NOT EXISTS aps_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aps_event_log (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_event_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aps_event_log_created_at
  ON aps_event_log(created_at);
