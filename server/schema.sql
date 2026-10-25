-- =====================================================================
--  AGAPAY database: full schema (fresh install)
--
--  For a NEW database: create `agapay` in phpMyAdmin, open it, then
--  import this file.
--  For the database you ALREADY have (with data in it): import
--  migrations/001_backend_requests.sql instead. It adds only what's new.
--
--  Written for MariaDB (the database XAMPP ships with).
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
--  Staff accounts (caregivers and admins)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  name                   VARCHAR(80)  NOT NULL,              -- full name, shown everywhere
  first_name             VARCHAR(40)  NULL,
  last_name              VARCHAR(40)  NULL,
  username               VARCHAR(30)  NOT NULL UNIQUE,       -- the Employee ID, e.g. CGV-2026-017
  password               VARCHAR(255) NOT NULL,              -- bcrypt hash, never the real password
  role                   ENUM('caregiver','admin') NOT NULL DEFAULT 'caregiver',
  status                 ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending',
  email                  VARCHAR(120) NULL UNIQUE,
  phone                  VARCHAR(20)  NULL,
  photo_url              VARCHAR(255) NULL,
  emergency_name         VARCHAR(80)  NULL,
  emergency_relationship VARCHAR(40)  NULL,
  emergency_phone        VARCHAR(20)  NULL,
  assigned_shift         ENUM('Morning','Afternoon','Night') NULL,  -- set by admin
  date_hired             DATE         NULL,                         -- set by admin
  title                  VARCHAR(60)  NULL,                         -- e.g. "Head of Care"
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
--  Residents and which caregivers look after them
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS residents (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  resident_code          VARCHAR(20) NOT NULL UNIQUE,   -- e.g. RP-2020-001
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
--  Care tasks
--  `done` is kept in step with `status` so older code keeps working.
--  `resident` (a name) is kept until the frontend switches to resident_id.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  resident            VARCHAR(80)  NOT NULL,
  resident_id         INT          NULL,
  task                VARCHAR(120) NOT NULL,
  category            ENUM('hygiene','mobility','meal','medical','rest','recreation') NULL,
  due_at              DATETIME     NOT NULL,
  assigned_to         INT          NULL,
  status              ENUM('pending','completed','skipped') NOT NULL DEFAULT 'pending',
  skip_reason         VARCHAR(200) NULL,
  note                TEXT         NULL,
  done                BOOLEAN      NOT NULL DEFAULT FALSE,
  done_at             DATETIME     NULL,
  completed_by        INT          NULL,
  created_by          INT          NULL,
  overdue_notified_at DATETIME     NULL,     -- so each task only alerts once
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_due (due_at),
  INDEX idx_assigned (assigned_to, due_at),
  FOREIGN KEY (resident_id)  REFERENCES residents(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to)  REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (created_by)   REFERENCES users(id)     ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
--  Work roster: one shift per caregiver per day
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
--  Shift handovers
--  `notes` stays for old handovers (and as a plain-text copy of new ones).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS handovers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  shift           ENUM('Morning','Afternoon','Night') NOT NULL,
  notes           TEXT NOT NULL,
  author_id       INT  NOT NULL,
  acknowledged_by INT  NULL,          -- the FIRST person who read it
  acknowledged_at DATETIME NULL,
  status          ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',
  submitted_at    DATETIME NULL,
  shift_date      DATE NULL,
  summary         TEXT NULL,
  other_notes     TEXT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_author_status (author_id, status),
  FOREIGN KEY (author_id)       REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

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

-- Read receipts: everyone who has read a handover, not just one person
CREATE TABLE IF NOT EXISTS handover_reads (
  handover_id INT NOT NULL,
  user_id     INT NOT NULL,
  read_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (handover_id, user_id),
  FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
--  The bell list. Every push also creates a row here.
--  No resident health details in title or body.
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

-- ---------------------------------------------------------------------
--  Caregiver <-> admin messages (MESSAGES-FOR-AERON.md)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
--  Browsers that turned notifications on (WEB-PUSH-FOR-AERON.md)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  endpoint    VARCHAR(500) NOT NULL UNIQUE,
  p256dh      VARCHAR(255) NOT NULL,
  auth        VARCHAR(255) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
--  Website contact form (no login)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80)  NOT NULL,
  email      VARCHAR(120) NOT NULL,
  message    TEXT         NOT NULL,
  ip         VARCHAR(45)  NULL,
  handled_at DATETIME     NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
