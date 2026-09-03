-- Documents (B13) — storage-agnostic metadata; actual bytes live in S3/R2/local (storage.service).

CREATE TYPE document_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id     UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_code   VARCHAR(50) NOT NULL,   -- matches document_requirements.code
  original_filename  VARCHAR(255) NOT NULL,
  storage_key        VARCHAR(500) NOT NULL,  -- path/key in the configured storage driver
  mime_type          VARCHAR(100),
  size_bytes         BIGINT,
  verification_status document_verification_status NOT NULL DEFAULT 'PENDING',
  verification_note  TEXT,
  uploaded_by        UUID REFERENCES users(id),
  uploaded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_application ON documents(application_id);
