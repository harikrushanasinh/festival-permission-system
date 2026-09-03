-- Live tracking (B19/B20/B21). live_processions holds current-state summary for fast
-- reads (control room map); live_locations is the GPS history trail. Redis (B17) caches
-- the hot "current position" for socket fan-out — Postgres is the durable log, not the
-- realtime path.

CREATE TYPE live_status AS ENUM ('NOT_STARTED', 'LIVE', 'GPS_WARNING', 'GPS_LOST', 'COMPLETED');
CREATE TYPE deviation_status AS ENUM ('NORMAL', 'WARNING', 'DEVIATION');

CREATE TABLE live_processions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status               live_status NOT NULL DEFAULT 'NOT_STARTED',
  deviation_status      deviation_status NOT NULL DEFAULT 'NORMAL',
  started_at            TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  last_latitude           DOUBLE PRECISION,
  last_longitude           DOUBLE PRECISION,
  last_location             GEOGRAPHY(Point, 4326),
  last_update_at             TIMESTAMPTZ
);

CREATE INDEX idx_live_processions_status ON live_processions(status);
CREATE INDEX idx_live_processions_location ON live_processions USING GIST (last_location);

CREATE TABLE live_locations (
  id                   BIGSERIAL PRIMARY KEY,
  live_procession_id   UUID NOT NULL REFERENCES live_processions(id) ON DELETE CASCADE,
  latitude              DOUBLE PRECISION NOT NULL,
  longitude              DOUBLE PRECISION NOT NULL,
  location                GEOGRAPHY(Point, 4326) NOT NULL,
  speed                    DOUBLE PRECISION,   -- m/s, from device GPS
  heading                   DOUBLE PRECISION,  -- degrees 0-360
  accuracy                   DOUBLE PRECISION, -- meters
  distance_from_route_m       NUMERIC(10, 2),  -- computed against approved route_versions.path (B20)
  recorded_at                   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_live_locations_procession ON live_locations(live_procession_id, recorded_at);
CREATE INDEX idx_live_locations_location ON live_locations USING GIST (location);
