-- Issued permission / QR (B15) — created once an application reaches APPROVED.
-- Named "permits" (not "permissions") to avoid clashing with the RBAC permissions table.

CREATE TABLE permits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  permission_number     VARCHAR(50) UNIQUE NOT NULL,
  qr_token              VARCHAR(100) UNIQUE NOT NULL,   -- opaque token, resolved via /public/verify/{token}
  approved_route_version_id UUID NOT NULL REFERENCES route_versions(id),
  approved_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by             UUID REFERENCES users(id)
);

CREATE INDEX idx_permits_qr_token ON permits(qr_token);
