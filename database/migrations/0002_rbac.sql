-- RBAC: roles, permissions, role_permissions, user_roles (B03)
-- Note: users.role (enum) remains the fast-path primary role for guards/JWT.
-- These tables back finer-grained permission checks (e.g. APPLICATION_APPROVE)
-- and allow a user to hold more than one role in future without a migration.

CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50) UNIQUE NOT NULL,   -- SUPER_ADMIN, POLICE_ADMIN, POLICE_OFFICER, ORGANIZER, PUBLIC
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(100) UNIQUE NOT NULL,  -- APPLICATION_VIEW, APPLICATION_APPROVE, ROUTE_APPROVE, LIVE_VIEW, ...
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id   UUID NOT NULL,   -- FK added in 0003_users.sql after users table exists
  role_id   UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
