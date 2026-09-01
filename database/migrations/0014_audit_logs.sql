-- Audit logs (B24) — who / what / when / IP / entity / old-new value. Append-only.

CREATE TABLE audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,   -- e.g. "APPLICATION_APPROVED"
  entity_type   VARCHAR(100) NOT NULL,   -- e.g. "application"
  entity_id     UUID,
  ip_address    INET,
  old_value     JSONB,
  new_value     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
