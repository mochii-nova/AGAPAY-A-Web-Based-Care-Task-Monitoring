-- 1. Tasks: the admin's instructions get their own column (the caregiver keeps `note`)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS instructions TEXT NULL AFTER note;

-- Move the old admin text over, one time only
UPDATE tasks SET instructions = note, note = NULL
WHERE instructions IS NULL AND note IS NOT NULL;

-- 3. Two new kinds of notification for admins
ALTER TABLE notifications
  MODIFY COLUMN type ENUM('task','overdue','handover','schedule','message','signup','contact') NOT NULL;

-- 3C. Remember which shifts already got the "Handover not submitted" alert
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS missing_handover_notified_at DATETIME NULL;