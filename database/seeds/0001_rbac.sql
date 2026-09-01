-- Default roles + permission catalogue (B03)

INSERT INTO roles (code, name, description) VALUES
  ('SUPER_ADMIN',    'Super Admin',    'Full system access'),
  ('POLICE_ADMIN',   'Police Admin',   'Manages officers, stations, and approvals for their jurisdiction'),
  ('POLICE_OFFICER', 'Police Officer', 'Reviews and approves/rejects applications for their station'),
  ('ORGANIZER',      'Organizer',      'Submits and tracks procession applications'),
  ('PUBLIC',         'Public',         'Read-only public portal access')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description) VALUES
  ('APPLICATION_VIEW',    'View application details'),
  ('APPLICATION_CREATE',  'Create a new application'),
  ('APPLICATION_APPROVE', 'Approve an application on behalf of a police station'),
  ('APPLICATION_REJECT',  'Reject an application'),
  ('ROUTE_VIEW',          'View route geometry and points'),
  ('ROUTE_APPROVE',       'Approve a route version'),
  ('LIVE_VIEW',           'View live procession tracking'),
  ('REPORT_VIEW',         'View reports and analytics'),
  ('AUDIT_VIEW',          'View audit logs'),
  ('MASTER_DATA_MANAGE',  'Manage festivals, event types, stations, areas')
ON CONFLICT (code) DO NOTHING;

-- Super Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- Police Admin: everything except master data management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'POLICE_ADMIN' AND p.code <> 'MASTER_DATA_MANAGE'
ON CONFLICT DO NOTHING;

-- Police Officer: review/approve + view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'POLICE_OFFICER'
  AND p.code IN ('APPLICATION_VIEW', 'APPLICATION_APPROVE', 'APPLICATION_REJECT', 'ROUTE_VIEW', 'ROUTE_APPROVE', 'LIVE_VIEW')
ON CONFLICT DO NOTHING;

-- Organizer: create/view own + live view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ORGANIZER' AND p.code IN ('APPLICATION_VIEW', 'APPLICATION_CREATE', 'ROUTE_VIEW', 'LIVE_VIEW')
ON CONFLICT DO NOTHING;

-- Public: live view only (public portal)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PUBLIC' AND p.code = 'LIVE_VIEW'
ON CONFLICT DO NOTHING;
