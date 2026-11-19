/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.16-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: college_announcements_db
-- ------------------------------------------------------
-- Server version	10.11.16-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_insights`
--

DROP TABLE IF EXISTS `ai_insights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_insights` (
  `insight_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `announcement_id` int(10) unsigned NOT NULL,
  `english_summary` text DEFAULT NULL,
  `tamil_summary` text DEFAULT NULL,
  `tamil_translation` longtext DEFAULT NULL,
  `ai_suggested_category` varchar(50) DEFAULT NULL,
  `ai_confidence_score` decimal(5,2) DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`insight_id`),
  UNIQUE KEY `uq_ai_insights_announcement` (`announcement_id`),
  CONSTRAINT `fk_ai_insights_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_ai_confidence` CHECK (`ai_confidence_score` is null or `ai_confidence_score` between 0 and 100)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_insights`
--

LOCK TABLES `ai_insights` WRITE;
/*!40000 ALTER TABLE `ai_insights` DISABLE KEYS */;
INSERT INTO `ai_insights` VALUES
(1,1,'The End Semester Examination timetable is available. Students should check exam dates and download hall tickets from 24 November 2026.','இரண்டாம் பருவ இறுதித் தேர்வு அட்டவணை வெளியிடப்பட்டுள்ளது. மாணவர்கள் தேர்வு தேதிகளை சரிபார்த்து, நவம்பர் 24 அன்று அனுமதிச் சீட்டைப் பதிவிறக்க வேண்டும்.','இரண்டாம் பருவ இறுதித் தேர்வு அட்டவணை வெளியிடப்பட்டுள்ளது. மாணவர்கள் தேர்வு தேதிகளை சரிபார்த்து, நவம்பர் 24 அன்று அனுமதிச் சீட்டைப் பதிவிறக்க வேண்டும்.','Examination',98.50,'2026-11-18 11:16:25'),
(2,2,'Infosys is conducting a placement drive for final-year CSE, IT, and ECE students. Resumes must be submitted before 22 November 2026.','இன்ஃபோசிஸ் நான்காம் ஆண்டு CSE, IT மற்றும் ECE மாணவர்களுக்கான வேலைவாய்ப்பு நிகழ்ச்சியை நடத்துகிறது. நவம்பர் 22 க்கு முன் தனியுரை சமர்ப்பிக்க வேண்டும்.','இன்ஃபோசிஸ் நான்காம் ஆண்டு CSE, IT மற்றும் ECE மாணவர்களுக்கான வேலைவாய்ப்பு நிகழ்ச்சியை நடத்துகிறது. நவம்பர் 22 க்கு முன் தனியுரை சமர்ப்பிக்க வேண்டும்.','Placement',96.00,'2026-11-18 11:16:25'),
(4,4,'The IT department has revised its Internal Assessment II timetable for Second and Third Year students.','IT துறையின் இரண்டாம் மற்றும் மூன்றாம் ஆண்டு மாணவர்களுக்கான உள்ளக மதிப்பீடு II அட்டவணை திருத்தப்பட்டுள்ளது.','IT துறையின் இரண்டாம் மற்றும் மூன்றாம் ஆண்டு மாணவர்களுக்கான உள்ளக மதிப்பீடு II அட்டவணை திருத்தப்பட்டுள்ளது.','Academic',97.00,'2026-11-18 11:16:25'),
(5,5,'Library books must be returned before the examination period. Students with overdue books may not receive hall tickets.','தேர்வுக் காலத்திற்கு முன் நூலக நூல்களை திருப்பித் தர வேண்டும். நிழற்கடன் உள்ள மாணவர்களுக்கு அனுமதிச் சீட்டு வழங்கப்படாமல் இருக்கலாம்.','தேர்வுக் காலத்திற்கு முன் நூலக நூல்களை திருப்பித் தர வேண்டும். நிழற்கடன் உள்ள மாணவர்களுக்கு அனுமதிச் சீட்டு வழங்கப்படாமல் இருக்கலாம்.','General',91.75,'2026-11-18 11:16:25'),
(6,6,'Merit scholarship applications are open. Students must upload academic, income, and bank details before 30 November 2026.','திறமை அடிப்படையிலான உதவித்தொகை விண்ணப்பங்கள் திறக்கப்பட்டுள்ளன. நவம்பர் 30 க்கு முன் ஆவணங்களை பதிவேற்ற வேண்டும்.','திறமை அடிப்படையிலான உதவித்தொகை விண்ணப்பங்கள் திறக்கப்பட்டுள்ளன. நவம்பர் 30 க்கு முன் ஆவணங்களை பதிவேற்ற வேண்டும்.','Academic',89.50,'2026-11-18 11:16:25');
/*!40000 ALTER TABLE `ai_insights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_qa_logs`
--

DROP TABLE IF EXISTS `ai_qa_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_qa_logs` (
  `qa_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `announcement_id` int(10) unsigned DEFAULT NULL,
  `question_text` text NOT NULL,
  `input_mode` enum('text','voice') NOT NULL DEFAULT 'text',
  `ai_response` longtext NOT NULL,
  `asked_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`qa_id`),
  KEY `idx_qa_user_date` (`user_id`,`asked_at`),
  KEY `idx_qa_announcement` (`announcement_id`),
  CONSTRAINT `fk_qa_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_qa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_qa_logs`
--

LOCK TABLES `ai_qa_logs` WRITE;
/*!40000 ALTER TABLE `ai_qa_logs` DISABLE KEYS */;
INSERT INTO `ai_qa_logs` VALUES
(1,3,1,'When can I download my examination hall ticket?','text','You can download your hall ticket from 24 November 2026 through the Examination Cell portal.','2026-11-18 11:16:25'),
(2,4,1,'எனது தேர்வு அனுமதிச் சீட்டை எப்போது பதிவிறக்கலாம்?','voice','நவம்பர் 24, 2026 முதல் தேர்வுத் துறை இணையதளத்தில் உங்கள் அனுமதிச் சீட்டைப் பதிவிறக்கலாம்.','2026-11-18 11:16:25'),
(3,3,2,'Which departments are eligible for the Infosys drive?','text','Final-year CSE, IT, and ECE students are eligible for the Infosys placement drive.','2026-11-18 11:16:25');
/*!40000 ALTER TABLE `ai_qa_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcement_versions`
--

DROP TABLE IF EXISTS `announcement_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement_versions` (
  `version_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `announcement_id` int(10) unsigned NOT NULL,
  `previous_title` varchar(500) NOT NULL,
  `previous_description` longtext NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`version_id`),
  KEY `idx_versions_announcement` (`announcement_id`,`changed_at`),
  CONSTRAINT `fk_versions_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcement_versions`
--

LOCK TABLES `announcement_versions` WRITE;
/*!40000 ALTER TABLE `announcement_versions` DISABLE KEYS */;
INSERT INTO `announcement_versions` VALUES
(1,4,'Internal Assessment Schedule - IT Department','The Internal Assessment II schedule for the Information Technology department has been released. Students should check the subject-wise timetable.','2026-11-16 03:45:00'),
(2,1,'End Semester Examination Timetable - November 2026','The End Semester Examination timetable for all undergraduate programmes has been published. Students must verify their examination dates, timings, and examination centres through the Examination Cell portal. Hall tickets will be available from 24 November 2026.','2026-11-18 11:48:50'),
(3,1,'End Semester Examination Timetable - November 2026','Updated examination instructions: students must carry their college ID and hall ticket.','2026-11-18 11:49:38');
/*!40000 ALTER TABLE `announcement_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `description` longtext NOT NULL,
  `category` enum('Examination','Events','Academic','Placement','General','Other') NOT NULL DEFAULT 'General',
  `department` varchar(100) NOT NULL DEFAULT 'All Departments',
  `target_year` varchar(100) NOT NULL DEFAULT 'All Years',
  `announcement_type` varchar(100) DEFAULT 'Circular',
  `published_date` datetime DEFAULT NULL,
  `deadline_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  `is_updated` tinyint(1) NOT NULL DEFAULT 0,
  `update_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_important` tinyint(1) NOT NULL DEFAULT 0,
  `source_website` varchar(255) NOT NULL,
  `source_url` varchar(768) NOT NULL,
  `content_hash` varchar(64) NOT NULL,
  `verification_status` enum('Needs Review','Verified','Rejected') NOT NULL DEFAULT 'Needs Review',
  `verified_by` int(10) unsigned DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verification_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_announcements_source_url` (`source_url`),
  KEY `idx_announcements_content_hash` (`content_hash`),
  KEY `idx_announcements_category` (`category`),
  KEY `idx_announcements_department_year` (`department`,`target_year`),
  KEY `idx_announcements_published_date` (`published_date`),
  KEY `idx_announcements_deadline_date` (`deadline_date`),
  KEY `idx_announcements_verification` (`verification_status`),
  KEY `fk_announcements_verified_by` (`verified_by`),
  KEY `idx_filter_combo` (`verification_status`,`category`,`department`,`target_year`,`published_date`),
  KEY `idx_important_updated` (`is_important`,`is_updated`,`published_date`),
  FULLTEXT KEY `idx_announcement_search` (`title`,`description`),
  CONSTRAINT `fk_announcements_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES
(1,'End Semester Examination Timetable - November 2026','Updated examination instructions for students.','Examination','All Departments','All Years','Exam Timetable','2026-11-15 09:00:00','2026-11-24 17:00:00','2026-11-18 17:19:38',1,2,1,'Cybernaut Examination Cell','https://exam.cybernaut.edu.in/notices/end-sem-nov-2026','a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00','Verified',1,'2026-11-15 10:30:00','Verified against the official Examination Cell notice.','2026-11-18 11:16:25','2026-11-18 11:49:38'),
(2,'Campus Placement Drive - Infosys','Infosys will conduct a campus placement drive for final-year CSE, IT, and ECE students. Eligible students must complete pre-placement training and submit their updated resumes through the Training and Placement portal before the registration deadline.','Placement','CSE, IT, ECE','Fourth Year','Drive','2026-11-12 10:00:00','2026-11-22 23:59:00',NULL,0,0,1,'Cybernaut Training and Placement Cell','https://placement.cybernaut.edu.in/notices/infosys-drive-2026','b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011','Verified',2,'2026-11-12 12:00:00','Eligibility criteria confirmed with the Training and Placement Cell.','2026-11-18 11:16:25','2026-11-18 11:16:25'),
(4,'Revised Internal Assessment Schedule - IT Department','The Internal Assessment II schedule for the Information Technology department has been revised. The revised schedule is applicable to Second Year and Third Year students. Students should check the updated subject-wise timetable and attend the assessments as per the revised dates.','Academic','IT','Second Year, Third Year','Circular','2026-11-08 11:00:00',NULL,'2026-11-16 09:15:00',1,1,0,'Cybernaut IT Department','https://it.cybernaut.edu.in/notices/revised-ia2-schedule','d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0033','Verified',1,'2026-11-16 10:00:00','Revised timetable confirmed by the Head of Department.','2026-11-18 11:16:25','2026-11-18 11:16:25'),
(5,'Library Book Return Deadline','All borrowed library books must be returned before the semester examination period. Students with overdue books will not be permitted to collect their examination hall tickets until the pending books are returned or renewed according to library rules.','General','All Departments','All Years','Circular','2026-11-05 14:00:00','2026-11-28 16:30:00',NULL,0,0,0,'Cybernaut Central Library','https://library.cybernaut.edu.in/notices/book-return-deadline','e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0044','Needs Review',NULL,NULL,NULL,'2026-11-18 11:16:25','2026-11-18 11:16:25'),
(6,'Scholarship Application for Merit Students','Merit-based scholarship applications are now open for eligible students. Applicants must upload their previous semester marksheet, income certificate, and bank account details through the scholarship portal. Incomplete applications will not be considered.','Academic','All Departments','All Years','Circular','2026-11-06 09:30:00','2026-11-30 17:00:00',NULL,0,0,1,'Cybernaut Scholarships Office','https://scholarships.cybernaut.edu.in/notices/merit-scholarship-2026','f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0055','Rejected',2,'2026-11-07 15:00:00','Rejected because the official scholarship portal link was unavailable during verification.','2026-11-18 11:16:25','2026-11-18 11:16:25');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_before_announcement_update
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `attachments`
--

DROP TABLE IF EXISTS `attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attachments` (
  `attachment_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `announcement_id` int(10) unsigned NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_url` varchar(768) NOT NULL,
  `file_type` varchar(50) DEFAULT 'PDF',
  `extracted_text` longtext DEFAULT NULL,
  `extraction_status` enum('Pending','Completed','Failed','No Text') NOT NULL DEFAULT 'Pending',
  `extracted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`attachment_id`),
  UNIQUE KEY `uq_attachments_file_url` (`file_url`),
  KEY `idx_attachments_announcement_status` (`announcement_id`,`extraction_status`),
  CONSTRAINT `fk_attachments_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attachments`
--

LOCK TABLES `attachments` WRITE;
/*!40000 ALTER TABLE `attachments` DISABLE KEYS */;
INSERT INTO `attachments` VALUES
(1,1,'end_sem_exam_timetable_nov_2026.pdf','https://exam.cybernaut.edu.in/files/end_sem_exam_timetable_nov_2026.pdf','PDF','End Semester Examination Timetable. Hall tickets available from 24 November 2026.','Completed','2026-11-15 10:20:00','2026-11-18 11:16:25'),
(2,2,'infosys_placement_drive_2026.pdf','https://placement.cybernaut.edu.in/files/infosys_placement_drive_2026.pdf','PDF','Infosys campus placement drive. Eligible branches: CSE, IT, ECE. Resume submission deadline: 22 November 2026.','Completed','2026-11-12 11:45:00','2026-11-18 11:16:25'),
(4,4,'revised_ia2_schedule_it.pdf','https://it.cybernaut.edu.in/files/revised_ia2_schedule_it.pdf','PDF','Revised Internal Assessment II timetable for IT Second Year and Third Year students.','Completed','2026-11-16 09:50:00','2026-11-18 11:16:25');
/*!40000 ALTER TABLE `attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookmarks`
--

DROP TABLE IF EXISTS `bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookmarks` (
  `bookmark_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `announcement_id` int(10) unsigned NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`bookmark_id`),
  UNIQUE KEY `unique_user_bookmark` (`user_id`,`announcement_id`),
  KEY `idx_bookmarks_announcement` (`announcement_id`),
  CONSTRAINT `fk_bookmarks_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookmarks`
--

LOCK TABLES `bookmarks` WRITE;
/*!40000 ALTER TABLE `bookmarks` DISABLE KEYS */;
INSERT INTO `bookmarks` VALUES
(1,3,1,'2026-11-18 11:16:25'),
(2,3,2,'2026-11-18 11:16:25'),
(3,4,1,'2026-11-18 11:16:25'),
(4,4,4,'2026-11-18 11:16:25');
/*!40000 ALTER TABLE `bookmarks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `announcement_id` int(10) unsigned DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `notification_type` enum('New Announcement','Important','Updated','Examination','Event','System') NOT NULL DEFAULT 'New Announcement',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_notifications` (`user_id`,`is_read`,`created_at`),
  KEY `idx_notifications_announcement` (`announcement_id`),
  CONSTRAINT `fk_notifications_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES
(1,3,1,'Examination timetable published','The End Semester Examination timetable for November 2026 has been published.','Examination',0,'2026-11-18 11:16:26'),
(2,3,2,'New placement drive','Infosys placement drive registration is now open for eligible final-year students.','New Announcement',0,'2026-11-18 11:16:26'),
(3,4,1,'Important examination update','Check the End Semester Examination timetable and hall-ticket availability date.','Important',0,'2026-11-18 11:16:26'),
(4,4,4,'IT assessment schedule updated','The Internal Assessment II timetable for IT students has been revised.','Updated',0,'2026-11-18 11:16:26');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `read_status`
--

DROP TABLE IF EXISTS `read_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `read_status` (
  `status_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `announcement_id` int(10) unsigned NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 1,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `unique_user_read` (`user_id`,`announcement_id`),
  KEY `idx_read_status_announcement` (`announcement_id`),
  CONSTRAINT `fk_read_status_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_read_status_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `read_status`
--

LOCK TABLES `read_status` WRITE;
/*!40000 ALTER TABLE `read_status` DISABLE KEYS */;
INSERT INTO `read_status` VALUES
(1,3,1,1,'2026-11-15 05:30:00'),
(2,3,2,1,'2026-11-12 07:30:00'),
(3,4,1,1,'2026-11-15 07:00:00'),
(4,4,4,0,'2026-11-16 04:00:00');
/*!40000 ALTER TABLE `read_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scraping_logs`
--

DROP TABLE IF EXISTS `scraping_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `scraping_logs` (
  `log_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `source_name` varchar(255) NOT NULL,
  `scrape_started_at` datetime NOT NULL,
  `scrape_ended_at` datetime DEFAULT NULL,
  `status` enum('Running','Success','Partial','Failed') NOT NULL DEFAULT 'Running',
  `discovered_count` int(10) unsigned NOT NULL DEFAULT 0,
  `new_count` int(10) unsigned NOT NULL DEFAULT 0,
  `updated_count` int(10) unsigned NOT NULL DEFAULT 0,
  `failed_count` int(10) unsigned NOT NULL DEFAULT 0,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_scraping_status_started` (`status`,`scrape_started_at`),
  KEY `idx_scraping_source` (`source_name`,`scrape_started_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scraping_logs`
--

LOCK TABLES `scraping_logs` WRITE;
/*!40000 ALTER TABLE `scraping_logs` DISABLE KEYS */;
INSERT INTO `scraping_logs` VALUES
(1,'Cybernaut Official Portal','2026-11-15 08:00:00','2026-11-15 08:03:24','Success',12,5,1,0,NULL),
(2,'Cybernaut Examination Cell','2026-11-15 08:05:00','2026-11-15 08:07:41','Success',8,3,0,0,NULL),
(3,'Cybernaut Training and Placement Cell','2026-11-16 07:30:00','2026-11-16 07:32:12','Partial',10,2,1,1,'One attachment download failed due to a temporary server timeout.'),
(4,'Cybernaut Student Affairs','2026-11-17 06:00:00',NULL,'Running',0,0,0,0,NULL);
/*!40000 ALTER TABLE `scraping_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `register_number` varchar(50) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('student','admin') NOT NULL DEFAULT 'student',
  `department` enum('IT','CSE','ECE','Mechanical','Civil','EEE','All') NOT NULL DEFAULT 'All',
  `academic_year` enum('First Year','Second Year','Third Year','Fourth Year','All') NOT NULL DEFAULT 'All',
  `preferred_language` enum('English','Tamil') NOT NULL DEFAULT 'English',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_register_number` (`register_number`),
  KEY `idx_users_role_department` (`role`,`department`,`academic_year`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,NULL,'Dr. R. Meenakshi','admin.it@cybernaut.edu.in','REPLACE_WITH_VALID_WERKZEUG_HASH_1','admin','IT','All','English',1,NULL,'2026-11-18 11:16:25','2026-11-18 11:16:25'),
(2,NULL,'Dr. S. Karthikeyan','admin.cse@cybernaut.edu.in','REPLACE_WITH_VALID_WERKZEUG_HASH_2','admin','CSE','All','English',1,NULL,'2026-11-18 11:16:25','2026-11-18 11:16:25'),
(3,'CITCSE2023001','Arun Kumar','arun.kumar@cybernaut.edu.in','REPLACE_WITH_VALID_WERKZEUG_HASH_3','student','CSE','Third Year','English',1,NULL,'2026-11-18 11:16:25','2026-11-18 11:16:25'),
(4,'CITIT2023002','Priya Lakshmi','priya.lakshmi@cybernaut.edu.in','REPLACE_WITH_VALID_WERKZEUG_HASH_4','student','IT','Third Year','Tamil',1,NULL,'2026-11-18 11:16:25','2026-11-18 11:16:25');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary table structure for view `vw_admin_dashboard_stats`
--

DROP TABLE IF EXISTS `vw_admin_dashboard_stats`;
/*!50001 DROP VIEW IF EXISTS `vw_admin_dashboard_stats`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vw_admin_dashboard_stats` AS SELECT
 1 AS `total_announcements`,
  1 AS `verified_announcements`,
  1 AS `pending_announcements`,
  1 AS `rejected_announcements`,
  1 AS `important_announcements`,
  1 AS `total_registered_students`,
  1 AS `total_scraping_runs`,
  1 AS `last_successful_scrape` */;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_admin_dashboard_stats`
--

/*!50001 DROP VIEW IF EXISTS `vw_admin_dashboard_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_admin_dashboard_stats` AS select (select count(0) from `announcements`) AS `total_announcements`,(select count(0) from `announcements` where `announcements`.`verification_status` = 'Verified') AS `verified_announcements`,(select count(0) from `announcements` where `announcements`.`verification_status` = 'Needs Review') AS `pending_announcements`,(select count(0) from `announcements` where `announcements`.`verification_status` = 'Rejected') AS `rejected_announcements`,(select count(0) from `announcements` where `announcements`.`is_important` = 1) AS `important_announcements`,(select count(0) from `users` where `users`.`role` = 'student' and `users`.`is_active` = 1) AS `total_registered_students`,(select count(0) from `scraping_logs`) AS `total_scraping_runs`,(select max(`scraping_logs`.`scrape_ended_at`) from `scraping_logs` where `scraping_logs`.`status` = 'Success') AS `last_successful_scrape` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-18 17:42:38
