-- Notifications (B22) — in-app is stored here; push/email/SMS delivery is handled by
-- the notifications service and only needs a durable record of what was sent + read state.

CREATE TYPE notification_channel AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS');

CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_code     VARCHAR(50) NOT NULL,  -- APPLICATION_SUBMITTED, ROUTE_CONFLICT, GPS_LOST, ...
  title          VARCHAR(200) NOT NULL,
  body           TEXT,
  channel        notification_channel NOT NULL DEFAULT 'IN_APP',
  related_application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  is_read        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
