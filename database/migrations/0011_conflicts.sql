-- Route conflicts (B16/F19) — overlapping date/time/route-proximity between two applications.

CREATE TYPE conflict_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE conflict_resolution AS ENUM ('UNRESOLVED', 'ALLOWED', 'TIME_CHANGED', 'ROUTE_CHANGED', 'REJECTED');

CREATE TABLE route_conflicts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  conflicting_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  overlap_meters        NUMERIC(10, 2),
  severity               conflict_severity NOT NULL,
  resolution              conflict_resolution NOT NULL DEFAULT 'UNRESOLVED',
  resolved_by             UUID REFERENCES users(id),
  resolved_at              TIMESTAMPTZ,
  detected_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_conflict_distinct CHECK (application_id <> conflicting_application_id)
);

CREATE INDEX idx_conflicts_application ON route_conflicts(application_id);
CREATE INDEX idx_conflicts_other ON route_conflicts(conflicting_application_id);
