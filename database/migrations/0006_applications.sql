-- Applications (B08) and status history (B09) — history is append-only, never deleted.

CREATE TYPE application_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED',
  'RESUBMITTED', 'APPROVED', 'REJECTED', 'LIVE', 'COMPLETED'
);

CREATE TABLE applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no   VARCHAR(50) UNIQUE,   -- assigned on submit, e.g. GAN-2026-00001 (F13)
  organizer_id     UUID NOT NULL REFERENCES users(id),
  festival_id      UUID NOT NULL REFERENCES festivals(id),
  event_type_id    UUID NOT NULL REFERENCES event_types(id),

  mandal_name           VARCHAR(200) NOT NULL,
  event_name             VARCHAR(200) NOT NULL,
  event_date             DATE NOT NULL,
  start_time              TIME NOT NULL,
  end_time                 TIME NOT NULL,
  expected_crowd          INTEGER NOT NULL CHECK (expected_crowd > 0),
  vehicle_count            INTEGER NOT NULL DEFAULT 0,
  vehicle_type             VARCHAR(150),
  has_sound_system         BOOLEAN NOT NULL DEFAULT false,
  has_dj                   BOOLEAN NOT NULL DEFAULT false,
  has_dhol                 BOOLEAN NOT NULL DEFAULT false,
  has_generator             BOOLEAN NOT NULL DEFAULT false,
  special_requirements      TEXT,
  description               TEXT,

  status            application_status NOT NULL DEFAULT 'DRAFT',
  active_route_id   UUID,  -- FK added in 0007 after routes table exists (points at the current version)

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_application_time CHECK (start_time < end_time)
);

CREATE INDEX idx_applications_organizer ON applications(organizer_id);
CREATE INDEX idx_applications_festival ON applications(festival_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_event_date ON applications(event_date);

CREATE TABLE application_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status     application_status,
  to_status       application_status NOT NULL,
  reason          TEXT,               -- required for CHANGES_REQUESTED / REJECTED, enforced in service layer
  changed_by      UUID REFERENCES users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_application ON application_status_history(application_id);
