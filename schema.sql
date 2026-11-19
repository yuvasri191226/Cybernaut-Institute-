-- ============================================================
-- AI-Powered College Announcement Monitoring System
-- Cybernaut Institute of Technology
-- MySQL 8.0+ | InnoDB | utf8mb4 / utf8mb4_unicode_ci
-- File: database/schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS college_announcements_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_announcements_db;

-- Drop child tables first, then parent tables (reverse dependency order)
DROP VIEW IF EXISTS vw_admin_dashboard_stats;
DROP TRIGGER IF EXISTS trg_before_announcement_update;

DROP TABLE IF EXISTS scraping_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS read_status;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS ai_qa_logs;
DROP TABLE IF EXISTS ai_insights;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS announcement_versions;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
  user_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  register_number   VARCHAR(50) NULL,
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('student','admin') NOT NULL DEFAULT 'student',
  department        ENUM('IT','CSE','ECE','Mechanical','Civil','EEE','All') NOT NULL DEFAULT 'All',
  academic_year     ENUM('First Year','Second Year','Third Year','Fourth Year','All') NOT NULL DEFAULT 'All',
  preferred_language ENUM('English','Tamil') NOT NULL DEFAULT 'English',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login        DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_register_number (register_number),
  KEY idx_users_role_department (role, department, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. announcements
-- ============================================================
CREATE TABLE announcements (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(500) NOT NULL,
  description         LONGTEXT NOT NULL,
  category            ENUM('Examination','Events','Academic','Placement','General','Other') NOT NULL DEFAULT 'General',
  department          VARCHAR(100) NOT NULL DEFAULT 'All Departments',
  target_year         VARCHAR(100) NOT NULL DEFAULT 'All Years',
  announcement_type   VARCHAR(100) NULL DEFAULT 'Circular',
  published_date      DATETIME NULL,
  deadline_date       DATETIME NULL,
  updated_date        DATETIME NULL,
  is_updated          BOOLEAN NOT NULL DEFAULT FALSE,
  update_count        INT UNSIGNED NOT NULL DEFAULT 0,
  is_important        BOOLEAN NOT NULL DEFAULT FALSE,
  source_website      VARCHAR(255) NOT NULL,
  source_url          VARCHAR(768) NOT NULL,
  content_hash        VARCHAR(64) NOT NULL,
  verification_status ENUM('Needs Review','Verified','Rejected') NOT NULL DEFAULT 'Needs Review',
  verified_by         INT UNSIGNED NULL,
  verified_at         DATETIME NULL,
  verification_note   TEXT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_announcements_source_url (source_url),
  KEY idx_announcements_content_hash (content_hash),
  KEY idx_announcements_category (category),
  KEY idx_announcements_department_year (department, target_year),
  KEY idx_announcements_published_date (published_date),
  KEY idx_announcements_deadline_date (deadline_date),
  KEY idx_announcements_verification (verification_status),
  CONSTRAINT fk_announcements_verified_by
    FOREIGN KEY (verified_by) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FULLTEXT KEY idx_announcement_search (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Combined filter index for search/filter/sort queries
CREATE INDEX idx_filter_combo
  ON announcements (verification_status, category, department, target_year, published_date);

CREATE INDEX idx_important_updated
  ON announcements (is_important, is_updated, published_date);

-- ============================================================
-- 3. announcement_versions
-- ============================================================
CREATE TABLE announcement_versions (
  version_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_id      INT UNSIGNED NOT NULL,
  previous_title       VARCHAR(500) NOT NULL,
  previous_description LONGTEXT NOT NULL,
  changed_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version_id),
  KEY idx_versions_announcement (announcement_id, changed_at),
  CONSTRAINT fk_versions_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. attachments
-- ============================================================
CREATE TABLE attachments (
  attachment_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_id  INT UNSIGNED NOT NULL,
  file_name        VARCHAR(255) NOT NULL,
  file_url         VARCHAR(768) NOT NULL,
  file_type        VARCHAR(50) NULL DEFAULT 'PDF',
  extracted_text   LONGTEXT NULL,
  extraction_status ENUM('Pending','Completed','Failed','No Text') NOT NULL DEFAULT 'Pending',
  extracted_at     DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  UNIQUE KEY uq_attachments_file_url (file_url),
  KEY idx_attachments_announcement_status (announcement_id, extraction_status),
  CONSTRAINT fk_attachments_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. ai_insights
-- ============================================================
CREATE TABLE ai_insights (
  insight_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_id        INT UNSIGNED NOT NULL,
  english_summary        TEXT NULL,
  tamil_summary          TEXT NULL,
  tamil_translation      LONGTEXT NULL,
  ai_suggested_category  VARCHAR(50) NULL,
  ai_confidence_score    DECIMAL(5,2) NULL,
  generated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (insight_id),
  UNIQUE KEY uq_ai_insights_announcement (announcement_id),
  CONSTRAINT fk_ai_insights_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_ai_confidence CHECK (ai_confidence_score IS NULL OR ai_confidence_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. ai_qa_logs
-- ============================================================
CREATE TABLE ai_qa_logs (
  qa_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  announcement_id  INT UNSIGNED NULL,
  question_text    TEXT NOT NULL,
  input_mode       ENUM('text','voice') NOT NULL DEFAULT 'text',
  ai_response      LONGTEXT NOT NULL,
  asked_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (qa_id),
  KEY idx_qa_user_date (user_id, asked_at),
  KEY idx_qa_announcement (announcement_id),
  CONSTRAINT fk_qa_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_qa_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. bookmarks
-- ============================================================
CREATE TABLE bookmarks (
  bookmark_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  announcement_id  INT UNSIGNED NOT NULL,
  saved_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bookmark_id),
  UNIQUE KEY unique_user_bookmark (user_id, announcement_id),
  KEY idx_bookmarks_announcement (announcement_id),
  CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bookmarks_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. read_status
-- ============================================================
CREATE TABLE read_status (
  status_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  announcement_id   INT UNSIGNED NOT NULL,
  is_read           BOOLEAN NOT NULL DEFAULT TRUE,
  read_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_id),
  UNIQUE KEY unique_user_read (user_id, announcement_id),
  KEY idx_read_status_announcement (announcement_id),
  CONSTRAINT fk_read_status_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_read_status_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. notifications
-- ============================================================
CREATE TABLE notifications (
  notification_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  announcement_id   INT UNSIGNED NULL,
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  notification_type ENUM('New Announcement','Important','Updated','Examination','Event','System') NOT NULL DEFAULT 'New Announcement',
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_user_notifications (user_id, is_read, created_at),
  KEY idx_notifications_announcement (announcement_id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. scraping_logs
-- ============================================================
CREATE TABLE scraping_logs (
  log_id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_name        VARCHAR(255) NOT NULL,
  scrape_started_at  DATETIME NOT NULL,
  scrape_ended_at    DATETIME NULL,
  status             ENUM('Running','Success','Partial','Failed') NOT NULL DEFAULT 'Running',
  discovered_count   INT UNSIGNED NOT NULL DEFAULT 0,
  new_count          INT UNSIGNED NOT NULL DEFAULT 0,
  updated_count      INT UNSIGNED NOT NULL DEFAULT 0,
  failed_count       INT UNSIGNED NOT NULL DEFAULT 0,
  error_message      TEXT NULL,
  PRIMARY KEY (log_id),
  KEY idx_scraping_status_started (status, scrape_started_at),
  KEY idx_scraping_source (source_name, scrape_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Trigger: announcement update history
-- ============================================================
DELIMITER $$

CREATE TRIGGER trg_before_announcement_update
BEFORE UPDATE ON announcements
FOR EACH ROW
BEGIN
  IF NOT (OLD.title <=> NEW.title) OR NOT (OLD.description <=> NEW.description) THEN
    INSERT INTO announcement_versions
      (announcement_id, previous_title, previous_description, changed_at)
    VALUES
      (OLD.id, OLD.title, OLD.description, NOW());

    SET NEW.is_updated = TRUE;
    SET NEW.update_count = OLD.update_count + 1;
    SET NEW.updated_date = NOW();
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- View: Admin dashboard statistics
-- ============================================================
CREATE OR REPLACE VIEW vw_admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM announcements) AS total_announcements,
  (SELECT COUNT(*) FROM announcements WHERE verification_status = 'Verified') AS verified_announcements,
  (SELECT COUNT(*) FROM announcements WHERE verification_status = 'Needs Review') AS pending_announcements,
  (SELECT COUNT(*) FROM announcements WHERE verification_status = 'Rejected') AS rejected_announcements,
  (SELECT COUNT(*) FROM announcements WHERE is_important = TRUE) AS important_announcements,
  (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE) AS total_registered_students,
  (SELECT COUNT(*) FROM scraping_logs) AS total_scraping_runs,
  (SELECT MAX(scrape_ended_at) FROM scraping_logs WHERE status = 'Success') AS last_successful_scrape;