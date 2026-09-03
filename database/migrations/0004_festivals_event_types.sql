-- Festivals & Event Types (B04, B05) — configurable from Super Admin, not hardcoded.

CREATE TABLE festivals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) UNIQUE NOT NULL,   -- e.g. GANPATI, DASHAMA
  name          VARCHAR(150) NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) UNIQUE NOT NULL,   -- AAGMAN, VISARJAN, and future types
  name          VARCHAR(150) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which event types are valid for which festival (Ganpati -> Aagman/Visarjan, etc.)
CREATE TABLE festival_event_types (
  festival_id    UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  event_type_id  UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  PRIMARY KEY (festival_id, event_type_id)
);

-- Per-event-type required document config (F12/B13 - "required documents depend on event type")
CREATE TABLE document_requirements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id  UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  code           VARCHAR(50) NOT NULL,   -- ORGANIZER_ID, PERMISSION_LETTER, ROUTE_DOCUMENT, VEHICLE_DETAILS, OTHER
  label          VARCHAR(150) NOT NULL,
  is_mandatory   BOOLEAN NOT NULL DEFAULT true,
  display_order  INTEGER NOT NULL DEFAULT 0
);
