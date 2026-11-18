-- =====================================================================
--  AGAPAY migration 004: keep handovers when a staff account is deleted
--
--  Before: deleting a caregiver also deleted every handover they wrote.
--  After:  their handovers stay, shown as written by "Former staff".
--
--  Run ONCE in phpMyAdmin: click the agapay database -> SQL -> paste -> Go.
-- =====================================================================

-- Find the name of the old link (handovers.author_id -> users.id) and remove it
SET @fk := (SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'handovers'
              AND COLUMN_NAME = 'author_id' AND REFERENCED_TABLE_NAME = 'users' LIMIT 1);
SET @sql := CONCAT('ALTER TABLE handovers DROP FOREIGN KEY `', @fk, '`');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Author may now be empty (deleted account); the handover itself is kept
ALTER TABLE handovers
  MODIFY COLUMN author_id INT NULL,
  ADD CONSTRAINT fk_handovers_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
