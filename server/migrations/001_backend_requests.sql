-- =====================================================================
--  AGAPAY migration 001: everything in the backend request list
--
--  Run this ONCE on the database you already have (phpMyAdmin → agapay →
--  Import). It keeps all your users, tasks and handovers.
--  It is safe to run again: everything uses IF NOT EXISTS.
--  (For a brand-new database, import ../schema.sql instead.)
--
--  Needs MariaDB 10.5+ (XAMPP 8.x has it).
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
--  1.2 + 2.1  users: approval status and profile details
-- ---------------------------------------------------------------------
-- Added with DEFAULT 'active' so the accounts you already have stay usable,
-- then the default switches to 'pending' for new sign-ups.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status ENUM('pending','active','inactive') NOT NULL DEFAULT 'active';
ALTER TABLE users
  MODIFY COLUMN status ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name             VARCHAR(40)  NULL AFTER name,
  ADD COLUMN IF NOT EXISTS last_name              VARCHAR(40)  NULL AFTER first_name,
  ADD COLUMN IF NOT EXISTS email                  VARCHAR(120) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS phone                  VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS photo_url              VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS emergency_name         VARCHAR(80)  NULL,
  ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(40)  NULL,
  ADD COLUMN IF NOT EXISTS emergency_phone        VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS assigned_shift         ENUM('Morning','Afternoon','Night') NULL,
  ADD COLUMN IF NOT EXISTS date_hired             DATE NULL,
  ADD COLUMN IF NOT EXISTS title                  VARCHAR(60)  NULL,
  ADD COLUMN IF NOT EXISTS created_at             DATETIME DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------
--  4.1  residents
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  resident_code          VARCHAR(20) NOT NULL UNIQUE,
  name                   VARCHAR(80) NOT NULL,
  room                   VARCHAR(10) NOT NULL,
  birth_date             DATE NULL,
  gender                 ENUM('Female','Male') NULL,
  care_needs             SET('hygiene','mobility','meal','medical','rest','recreation') NULL,
  care_note              TEXT NULL,
  emergency_name         VARCHAR(80) NULL,
  emergency_relationship VARCHAR(40) NULL,
  emergency_phone        VARCHAR(20) NULL,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resident_assignments (
  resident_id INT NOT NULL,
  user_id     INT NOT NULL,
  PRIMARY KEY (resident_id, user_id),
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
--  3  tasks
-- ---------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to         INT NULL,
  ADD COLUMN IF NOT EXISTS resident_id         INT NULL AFTER resident,
  ADD COLUMN IF NOT EXISTS category            ENUM('hygiene','mobility','meal','medical','rest','recreation') NULL,
  ADD COLUMN IF NOT EXISTS status              ENUM('pending','completed','skipped') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS skip_reason         VARCHAR(200) NULL,
  ADD COLUMN IF NOT EXISTS note                TEXT NULL,
  ADD COLUMN IF NOT EXISTS overdue_notified_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS created_at          DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY IF NOT EXISTS (assigned_to) REFERENCES users(id)     ON DELETE SET NULL,
  ADD CONSTRAINT fk_tasks_resident_id FOREIGN KEY IF NOT EXISTS (resident_id) REFERENCES residents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assigned ON tasks (assigned_to, due_at);

-- Tasks already marked done become 'completed'
UPDATE tasks SET status = 'completed' WHERE done = TRUE AND status = 'pending';

-- Old tasks that are already late shouldn't all send an "overdue" pop-up the
-- first time the server starts
UPDATE tasks SET overdue_notified_at = NOW()
WHERE done = FALSE AND due_at < NOW() AND overdue_notified_at IS NULL;

-- ---------------------------------------------------------------------
--  4.2  shifts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  shift_date DATE NOT NULL,
  shift      ENUM('Morning','Afternoon','Night') NOT NULL,
  UNIQUE (user_id, shift_date),
  INDEX idx_date (shift_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
--  5  handovers
-- ---------------------------------------------------------------------
ALTER TABLE handovers
  ADD COLUMN IF NOT EXISTS status       ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS submitted_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS shift_date   DATE NULL,
  ADD COLUMN IF NOT EXISTS summary      TEXT NULL,
  ADD COLUMN IF NOT EXISTS other_notes  TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_author_status ON handovers (author_id, status);

-- Fill the new columns for handovers you already have
UPDATE handovers SET submitted_at = created_at WHERE status = 'submitted' AND submitted_at IS NULL;
UPDATE handovers SET shift_date = DATE(created_at) WHERE shift_date IS NULL;

CREATE TABLE IF NOT EXISTS handover_resident_updates (
  handover_id INT NOT NULL,
  resident_id INT NOT NULL,
  status      ENUM('normal','watch','urgent') NOT NULL DEFAULT 'normal',
  note        TEXT NULL,
  PRIMARY KEY (handover_id, resident_id),
  FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS handover_carried_tasks (
  handover_id INT NOT NULL,
  task_id     INT NOT NULL,
  note        TEXT NULL,
  PRIMARY KEY (handover_id, task_id),
  FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id)     REFERENCES tasks(id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS handover_reads (
  handover_id INT NOT NULL,
  user_id     INT NOT NULL,
  read_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (handover_id, user_id),
  FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
);

-- The old single "acknowledged by" becomes the first read receipt
INSERT IGNORE INTO handover_reads (handover_id, user_id, read_at)
SELECT id, acknowledged_by, COALESCE(acknowledged_at, NOW()) FROM handovers WHERE acknowledged_by IS NOT NULL;

-- ---------------------------------------------------------------------
--  6.1 notifications, 6.2 messages, 6.3 push, 6.4 contact form
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('task','overdue','handover','schedule','message') NOT NULL,
  title      VARCHAR(120) NOT NULL,
  body       VARCHAR(200) NULL,
  link       VARCHAR(200) NULL,
  read_at    DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sender_id     INT NOT NULL,
  recipient_id  INT NOT NULL,
  body          TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at       DATETIME NULL,
  FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pair (sender_id, recipient_id, created_at),
  INDEX idx_unread (recipient_id, read_at)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  endpoint    VARCHAR(500) NOT NULL UNIQUE,
  p256dh      VARCHAR(255) NOT NULL,
  auth        VARCHAR(255) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80)  NOT NULL,
  email      VARCHAR(120) NOT NULL,
  message    TEXT         NOT NULL,
  ip         VARCHAR(45)  NULL,
  handled_at DATETIME     NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
