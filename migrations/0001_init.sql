-- AFA Videos: grunnskjema for bestillinger, vurderinger og kontakthenvendelser.
-- Tidsstempler lagres som ISO 8601 i UTC.

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ref           TEXT    NOT NULL UNIQUE,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status        TEXT    NOT NULL DEFAULT 'ny'
                CHECK (status IN ('ny', 'kontaktet', 'avtalt', 'ferdig', 'avslatt')),
  package       TEXT    NOT NULL,
  business_name TEXT    NOT NULL,
  industry      TEXT    NOT NULL,
  area          TEXT    NOT NULL,
  area_other    TEXT,
  employees     TEXT    NOT NULL,
  web           TEXT,
  wishes        TEXT    NOT NULL DEFAULT '[]', -- JSON-liste
  message       TEXT,
  start_when    TEXT,
  time_window   TEXT,
  contact_name  TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT,
  contact_pref  TEXT    NOT NULL,
  consent_at    TEXT    NOT NULL,
  note          TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text            TEXT    NOT NULL,
  name            TEXT,
  company         TEXT,
  consent_publish INTEGER NOT NULL DEFAULT 0 CHECK (consent_publish IN (0, 1)),
  status          TEXT    NOT NULL DEFAULT 'venter'
                  CHECK (status IN ('venter', 'godkjent', 'skjult')),
  approved_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status, approved_at DESC);

CREATE TABLE IF NOT EXISTS contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status     TEXT    NOT NULL DEFAULT 'ny' CHECK (status IN ('ny', 'besvart', 'arkivert')),
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  phone      TEXT,
  message    TEXT    NOT NULL,
  note       TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts (created_at DESC);

-- Enkel rate-begrensning. Nøkkelen er en hash av IP-adressen, aldri selve adressen.
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT    PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits (reset_at);
