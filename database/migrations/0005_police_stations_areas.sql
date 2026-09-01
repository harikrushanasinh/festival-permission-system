-- Police Stations (B06) and Areas/Jurisdictions (B07) — PostGIS-backed.

CREATE TABLE police_stations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  code          VARCHAR(50) UNIQUE NOT NULL,
  address       TEXT,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  location      GEOGRAPHY(Point, 4326) NOT NULL,  -- derived from lat/lng, used for distance queries
  contact       VARCHAR(50),
  status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE / INACTIVE
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_police_stations_location ON police_stations USING GIST (location);

-- Areas map to a jurisdiction polygon owned by exactly one primary police station,
-- e.g. "Area B -> Station B" in the spec. A route intersecting an area's polygon
-- pulls in that area's station as a suggestion (B11).
CREATE TABLE areas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               VARCHAR(150) NOT NULL,
  code               VARCHAR(50) UNIQUE NOT NULL,
  city               VARCHAR(100),
  police_station_id  UUID NOT NULL REFERENCES police_stations(id),
  boundary           GEOGRAPHY(Polygon, 4326) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_areas_boundary ON areas USING GIST (boundary);
CREATE INDEX idx_areas_police_station ON areas(police_station_id);

-- Police officers (B25 Super Admin > Police Officers), attached to a station.
CREATE TABLE police_officers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  police_station_id  UUID NOT NULL REFERENCES police_stations(id) ON DELETE CASCADE,
  designation        VARCHAR(100),
  badge_number       VARCHAR(50),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_police_officers_station ON police_officers(police_station_id);
