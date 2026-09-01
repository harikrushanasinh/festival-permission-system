-- Users (B02) — matches backend/src/modules/users/user.entity.ts
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'POLICE_ADMIN', 'POLICE_OFFICER', 'ORGANIZER', 'PUBLIC');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(150) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  mobile              VARCHAR(20) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  role                user_role NOT NULL DEFAULT 'ORGANIZER',
  status              user_status NOT NULL DEFAULT 'PENDING',
  address             TEXT,
  city                VARCHAR(100),
  area                VARCHAR(100),
  organization_name   VARCHAR(200),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
