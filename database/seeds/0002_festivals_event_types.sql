-- Default festivals + event types (F06/B04/B05) — Super Admin can add more later.

INSERT INTO event_types (code, name) VALUES
  ('AAGMAN', 'Aagman'),
  ('VISARJAN', 'Visarjan')
ON CONFLICT (code) DO NOTHING;

INSERT INTO festivals (code, name, display_order) VALUES
  ('GANPATI', 'Ganpati', 1),
  ('DASHAMA', 'Dashama', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO festival_event_types (festival_id, event_type_id)
SELECT f.id, et.id FROM festivals f, event_types et
WHERE f.code IN ('GANPATI', 'DASHAMA') AND et.code IN ('AAGMAN', 'VISARJAN')
ON CONFLICT DO NOTHING;

-- Default document requirements, applied to both Aagman and Visarjan (F12/B13)
INSERT INTO document_requirements (event_type_id, code, label, is_mandatory, display_order)
SELECT et.id, req.code, req.label, req.is_mandatory, req.display_order
FROM event_types et
CROSS JOIN (VALUES
  ('ORGANIZER_ID',       'Organizer ID Proof',    true,  1),
  ('PERMISSION_LETTER',  'Permission Letter',      true,  2),
  ('ROUTE_DOCUMENT',     'Route Document',          true,  3),
  ('VEHICLE_DETAILS',    'Vehicle Details',          false, 4),
  ('OTHER',              'Other Supporting Document', false, 5)
) AS req(code, label, is_mandatory, display_order)
WHERE et.code IN ('AAGMAN', 'VISARJAN');
