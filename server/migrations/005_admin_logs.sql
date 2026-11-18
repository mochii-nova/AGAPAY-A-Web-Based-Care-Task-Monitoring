-- =====================================================================
--  AGAPAY migration 005: admin activity log (who did what)
--
--  One row per change an administrator makes (approve / reject a sign-up,
--  add / edit / delete residents, rooms, beds, shifts, tasks, staff...).
--  admin_name is copied in, so the log still says who it was even if
--  that admin's account is deleted later.
--
--  Run ONCE in phpMyAdmin: click the agapay database -> SQL -> paste -> Go.
-- =====================================================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT NULL,                 -- NULL if that admin's account was deleted later
  admin_name  VARCHAR(130) NOT NULL,    -- name at the time of the action
  action      VARCHAR(30)  NOT NULL,    -- approve, reject, create, update, delete, ...
  target_type VARCHAR(20)  NOT NULL,    -- staff, resident, room, bed, shift, task, contact
  target_id   INT NULL,                 -- id of the changed row (no link: it may be deleted)
  details     VARCHAR(500) NULL,        -- e.g. "Rejected Jessa Morales (CGV-2026-031): Incomplete requirements."
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_logs_created (created_at),
  INDEX idx_admin_logs_target (target_type, target_id),
  CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);
