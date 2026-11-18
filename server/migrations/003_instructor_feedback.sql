-- =====================================================================
--  AGAPAY migration 003: instructor feedback
--    1. Sign-ups can be REJECTED (with a reason), separate from deactivated
--    2. Rooms (Private / Ward) and beds; residents point to a room and bed
--    3. users: no more `name` column; first / middle / last name instead
--
--  Run ONCE in phpMyAdmin: click the agapay database -> SQL -> paste -> Go.
--  It keeps all existing data (names are split, rooms are created from
--  the room numbers your residents already have).
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. Rejected sign-ups
-- ---------------------------------------------------------------------
ALTER TABLE users
  MODIFY COLUMN status ENUM('pending','active','inactive','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255) NULL AFTER status;

-- ---------------------------------------------------------------------
--  2. Rooms and beds
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,                    -- e.g. 101, 201
  room_type   ENUM('private','ward') NOT NULL DEFAULT 'private',  -- private = 1 resident, ward = several (by bed)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  room_id  INT NOT NULL,
  bed_code VARCHAR(10) NOT NULL,                              -- e.g. B1, B2
  UNIQUE (room_id, bed_code),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS room_id INT NULL AFTER name,
  ADD COLUMN IF NOT EXISTS bed_id  INT NULL UNIQUE AFTER room_id;   -- UNIQUE: one resident per bed

-- Make a room for every room number already in use.
-- A room shared by 2 or more residents becomes a Ward, the rest are Private.
INSERT IGNORE INTO rooms (room_number, room_type)
SELECT room, IF(COUNT(*) > 1, 'ward', 'private') FROM residents GROUP BY room;

UPDATE residents r JOIN rooms rm ON rm.room_number = r.room SET r.room_id = rm.id;

-- Wards get one bed per resident already in them (B1, B2, ...), and each resident gets a bed
INSERT IGNORE INTO beds (room_id, bed_code)
SELECT r.room_id, CONCAT('B', ROW_NUMBER() OVER (PARTITION BY r.room_id ORDER BY r.id))
FROM residents r JOIN rooms rm ON rm.id = r.room_id AND rm.room_type = 'ward';

UPDATE residents r
JOIN (SELECT r2.id AS resident_id, r2.room_id, ROW_NUMBER() OVER (PARTITION BY r2.room_id ORDER BY r2.id) AS n
      FROM residents r2 JOIN rooms rm ON rm.id = r2.room_id AND rm.room_type = 'ward') x ON x.resident_id = r.id
JOIN beds b ON b.room_id = x.room_id AND b.bed_code = CONCAT('B', x.n)
SET r.bed_id = b.id;

-- Every resident has a room now: make it required, link the tables, drop the old text column
ALTER TABLE residents
  MODIFY COLUMN room_id INT NOT NULL,
  ADD CONSTRAINT fk_residents_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  ADD CONSTRAINT fk_residents_bed  FOREIGN KEY (bed_id)  REFERENCES beds(id) ON DELETE SET NULL,
  DROP COLUMN room;

-- ---------------------------------------------------------------------
--  3. Names: first / middle / last instead of `name`
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(40) NULL AFTER first_name;

-- Accounts made before first/last name existed: split the old full name
-- (last word = last name, the rest = first name)
UPDATE users
SET last_name  = SUBSTRING_INDEX(TRIM(name), ' ', -1),
    first_name = IF(LOCATE(' ', TRIM(name)) = 0, TRIM(name),
                    TRIM(LEFT(TRIM(name), CHAR_LENGTH(TRIM(name)) - CHAR_LENGTH(SUBSTRING_INDEX(TRIM(name), ' ', -1)))))
WHERE first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '';

-- One-word names: the first name stays, last name becomes empty text
UPDATE users SET last_name = '' WHERE last_name = first_name AND LOCATE(' ', TRIM(name)) = 0;

ALTER TABLE users
  MODIFY COLUMN first_name VARCHAR(40) NOT NULL,
  MODIFY COLUMN last_name  VARCHAR(40) NOT NULL,
  DROP COLUMN name;