-- ============================================================
-- File: database/seed.sql
-- Run AFTER database/schema.sql
-- ============================================================

USE college_announcements_db;

-- IMPORTANT:
-- Replace the placeholder password hashes below with hashes produced by
-- Member 5's Flask authentication module before deploying the application.
-- Example:
--   from werkzeug.security import generate_password_hash
--   generate_password_hash('Admin@123', method='scrypt')
-- Do NOT store plain-text passwords.

INSERT INTO users
(user_id, register_number, full_name, email, password_hash, role, department, academic_year, preferred_language)
VALUES
(1, NULL, 'Dr. R. Meenakshi', 'admin.it@cybernaut.edu.in', 'pbkdf2:sha256:1000000$R0VPV8XItUxLNBmq$2fd3bc88d94aae0c2f16d9341225477dca1b89ab9a292dacd8839a6fb053277c', 'admin', 'IT', 'All', 'English'),
(2, NULL, 'Dr. S. Karthikeyan', 'admin.cse@cybernaut.edu.in', 'pbkdf2:sha256:1000000$RxXE2QbkVopyhUkb$91c68a97015ff7283102cc29318fc8d0536e3f311104ae832d1090e4a34c9766', 'admin', 'CSE', 'All', 'English'),
(3, 'CITCSE2023001', 'Arun Kumar', 'arun.kumar@cybernaut.edu.in', 'pbkdf2:sha256:1000000$OJV5X3t7iZFUD4n3$bdaac382a206371136fc3a19acbe51bd17fa1e04a1d7e1c2d1b4ac81ff51a35b', 'student', 'CSE', 'Third Year', 'English'),
(4, 'CITIT2023002', 'Priya Lakshmi', 'priya.lakshmi@cybernaut.edu.in', 'pbkdf2:sha256:1000000$V20BEIxPsrMKVgIa$3cf919534324a326e6ba1763daae032a1a39068679ddc3ccb5a87d51b12cc2f6', 'student', 'IT', 'Third Year', 'Tamil'),
(5, 'CITECE2023003', 'Vignesh Raja', 'vignesh.raja@cybernaut.edu.in', 'pbkdf2:sha256:1000000$KjC1hY1eQTC0jrW9$5f7bc925f10317ed1197045ed219932283ee4005a5b21a9c1c6735e5bce84cc5', 'student', 'ECE', 'Second Year', 'English');

INSERT INTO announcements
(id, title, description, category, department, target_year, announcement_type, published_date, deadline_date, updated_date, is_updated, update_count, is_important, source_website, source_url, content_hash, verification_status, verified_by, verified_at, verification_note)
VALUES
(1, 'End Semester Examination Timetable - November 2026',
 'The End Semester Examination timetable for all undergraduate programmes has been published. Students must verify their examination dates, timings, and examination centres through the Examination Cell portal. Hall tickets will be available from 24 November 2026.',
 'Examination', 'All Departments', 'All Years', 'Exam Timetable', '2026-11-15 09:00:00', '2026-11-24 17:00:00', NULL, FALSE, 0, TRUE,
 'Cybernaut Examination Cell', 'https://exam.cybernaut.edu.in/notices/end-sem-nov-2026',
 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00', 'Verified', 1, '2026-11-15 10:30:00', 'Verified against the official Examination Cell notice.'),

(2, 'Campus Placement Drive - Infosys',
 'Infosys will conduct a campus placement drive for final-year CSE, IT, and ECE students. Eligible students must complete pre-placement training and submit their updated resumes through the Training and Placement portal before the registration deadline.',
 'Placement', 'CSE, IT, ECE', 'Fourth Year', 'Drive', '2026-11-12 10:00:00', '2026-11-22 23:59:00', NULL, FALSE, 0, TRUE,
 'Cybernaut Training and Placement Cell', 'https://placement.cybernaut.edu.in/notices/infosys-drive-2026',
 'b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011', 'Verified', 2, '2026-11-12 12:00:00', 'Eligibility criteria confirmed with the Training and Placement Cell.'),

(3, 'National Technology Day Hackathon 2026',
 'Students from all departments are invited to participate in the National Technology Day Hackathon. Teams may comprise two to four members. Registration closes on 25 November 2026, and selected teams will present their prototypes on 30 November 2026.',
 'Events', 'All Departments', 'All Years', 'Workshop', '2026-11-10 08:30:00', '2026-11-25 18:00:00', NULL, FALSE, 0, FALSE,
 'Cybernaut Student Affairs', 'https://studentaffairs.cybernaut.edu.in/notices/tech-day-hackathon-2026',
 'c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0022', 'Needs Review', NULL, NULL, NULL),

(4, 'Revised Internal Assessment Schedule - IT Department',
 'The Internal Assessment II schedule for the Information Technology department has been revised. The revised schedule is applicable to Second Year and Third Year students. Students should check the updated subject-wise timetable and attend the assessments as per the revised dates.',
 'Academic', 'IT', 'Second Year, Third Year', 'Circular', '2026-11-08 11:00:00', NULL, '2026-11-16 09:15:00', TRUE, 1, FALSE,
 'Cybernaut IT Department', 'https://it.cybernaut.edu.in/notices/revised-ia2-schedule',
 'd4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0033', 'Verified', 1, '2026-11-16 10:00:00', 'Revised timetable confirmed by the Head of Department.'),

(5, 'Library Book Return Deadline',
 'All borrowed library books must be returned before the semester examination period. Students with overdue books will not be permitted to collect their examination hall tickets until the pending books are returned or renewed according to library rules.',
 'General', 'All Departments', 'All Years', 'Circular', '2026-11-05 14:00:00', '2026-11-28 16:30:00', NULL, FALSE, 0, FALSE,
 'Cybernaut Central Library', 'https://library.cybernaut.edu.in/notices/book-return-deadline',
 'e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0044', 'Needs Review', NULL, NULL, NULL),

(6, 'Scholarship Application for Merit Students',
 'Merit-based scholarship applications are now open for eligible students. Applicants must upload their previous semester marksheet, income certificate, and bank account details through the scholarship portal. Incomplete applications will not be considered.',
 'Academic', 'All Departments', 'All Years', 'Circular', '2026-11-06 09:30:00', '2026-11-30 17:00:00', NULL, FALSE, 0, TRUE,
 'Cybernaut Scholarships Office', 'https://scholarships.cybernaut.edu.in/notices/merit-scholarship-2026',
 'f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0055', 'Rejected', 2, '2026-11-07 15:00:00', 'Rejected because the official scholarship portal link was unavailable during verification.');

INSERT INTO announcement_versions
(announcement_id, previous_title, previous_description, changed_at)
VALUES
(4, 'Internal Assessment Schedule - IT Department',
 'The Internal Assessment II schedule for the Information Technology department has been released. Students should check the subject-wise timetable.', '2026-11-16 09:15:00');

INSERT INTO attachments
(attachment_id, announcement_id, file_name, file_url, file_type, extracted_text, extraction_status, extracted_at)
VALUES
(1, 1, 'end_sem_exam_timetable_nov_2026.pdf', 'https://exam.cybernaut.edu.in/files/end_sem_exam_timetable_nov_2026.pdf', 'PDF',
 'End Semester Examination Timetable. Hall tickets available from 24 November 2026.', 'Completed', '2026-11-15 10:20:00'),
(2, 2, 'infosys_placement_drive_2026.pdf', 'https://placement.cybernaut.edu.in/files/infosys_placement_drive_2026.pdf', 'PDF',
 'Infosys campus placement drive. Eligible branches: CSE, IT, ECE. Resume submission deadline: 22 November 2026.', 'Completed', '2026-11-12 11:45:00'),
(3, 3, 'tech_day_hackathon_guidelines.pdf', 'https://studentaffairs.cybernaut.edu.in/files/tech_day_hackathon_guidelines.pdf', 'PDF',
 NULL, 'Pending', NULL),
(4, 4, 'revised_ia2_schedule_it.pdf', 'https://it.cybernaut.edu.in/files/revised_ia2_schedule_it.pdf', 'PDF',
 'Revised Internal Assessment II timetable for IT Second Year and Third Year students.', 'Completed', '2026-11-16 09:50:00');

INSERT INTO ai_insights
(announcement_id, english_summary, tamil_summary, tamil_translation, ai_suggested_category, ai_confidence_score)
VALUES
(1, 'The End Semester Examination timetable is available. Students should check exam dates and download hall tickets from 24 November 2026.',
 'இரண்டாம் பருவ இறுதித் தேர்வு அட்டவணை வெளியிடப்பட்டுள்ளது. மாணவர்கள் தேர்வு தேதிகளை சரிபார்த்து, நவம்பர் 24 அன்று அனுமதிச் சீட்டைப் பதிவிறக்க வேண்டும்.',
 'இரண்டாம் பருவ இறுதித் தேர்வு அட்டவணை வெளியிடப்பட்டுள்ளது. மாணவர்கள் தேர்வு தேதிகளை சரிபார்த்து, நவம்பர் 24 அன்று அனுமதிச் சீட்டைப் பதிவிறக்க வேண்டும்.',
 'Examination', 98.50),
(2, 'Infosys is conducting a placement drive for final-year CSE, IT, and ECE students. Resumes must be submitted before 22 November 2026.',
 'இன்ஃபோசிஸ் நான்காம் ஆண்டு CSE, IT மற்றும் ECE மாணவர்களுக்கான வேலைவாய்ப்பு நிகழ்ச்சியை நடத்துகிறது. நவம்பர் 22 க்கு முன் தனியுரை சமர்ப்பிக்க வேண்டும்.',
 'இன்ஃபோசிஸ் நான்காம் ஆண்டு CSE, IT மற்றும் ECE மாணவர்களுக்கான வேலைவாய்ப்பு நிகழ்ச்சியை நடத்துகிறது. நவம்பர் 22 க்கு முன் தனியுரை சமர்ப்பிக்க வேண்டும்.',
 'Placement', 96.00),
(3, 'A National Technology Day hackathon is open to students from all departments. Teams must register before 25 November 2026.',
 'தேசிய தொழில்நுட்ப தின ஹேக்கத்தானில் அனைத்துத் துறை மாணவர்களும் பங்கேற்கலாம். நவம்பர் 25 க்கு முன் பதிவு செய்ய வேண்டும்.',
 'தேசிய தொழில்நுட்ப தின ஹேக்கத்தானில் அனைத்துத் துறை மாணவர்களும் பங்கேற்கலாம். நவம்பர் 25 க்கு முன் பதிவு செய்ய வேண்டும்.',
 'Events', 94.25),
(4, 'The IT department has revised its Internal Assessment II timetable for Second and Third Year students.',
 'IT துறையின் இரண்டாம் மற்றும் மூன்றாம் ஆண்டு மாணவர்களுக்கான உள்ளக மதிப்பீடு II அட்டவணை திருத்தப்பட்டுள்ளது.',
 'IT துறையின் இரண்டாம் மற்றும் மூன்றாம் ஆண்டு மாணவர்களுக்கான உள்ளக மதிப்பீடு II அட்டவணை திருத்தப்பட்டுள்ளது.',
 'Academic', 97.00),
(5, 'Library books must be returned before the examination period. Students with overdue books may not receive hall tickets.',
 'தேர்வுக் காலத்திற்கு முன் நூலக நூல்களை திருப்பித் தர வேண்டும். நிழற்கடன் உள்ள மாணவர்களுக்கு அனுமதிச் சீட்டு வழங்கப்படாமல் இருக்கலாம்.',
 'தேர்வுக் காலத்திற்கு முன் நூலக நூல்களை திருப்பித் தர வேண்டும். நிழற்கடன் உள்ள மாணவர்களுக்கு அனுமதிச் சீட்டு வழங்கப்படாமல் இருக்கலாம்.',
 'General', 91.75),
(6, 'Merit scholarship applications are open. Students must upload academic, income, and bank details before 30 November 2026.',
 'திறமை அடிப்படையிலான உதவித்தொகை விண்ணப்பங்கள் திறக்கப்பட்டுள்ளன. நவம்பர் 30 க்கு முன் ஆவணங்களை பதிவேற்ற வேண்டும்.',
 'திறமை அடிப்படையிலான உதவித்தொகை விண்ணப்பங்கள் திறக்கப்பட்டுள்ளன. நவம்பர் 30 க்கு முன் ஆவணங்களை பதிவேற்ற வேண்டும்.',
 'Academic', 89.50);

INSERT INTO ai_qa_logs
(user_id, announcement_id, question_text, input_mode, ai_response)
VALUES
(3, 1, 'When can I download my examination hall ticket?', 'text',
 'You can download your hall ticket from 24 November 2026 through the Examination Cell portal.'),
(4, 1, 'எனது தேர்வு அனுமதிச் சீட்டை எப்போது பதிவிறக்கலாம்?', 'voice',
 'நவம்பர் 24, 2026 முதல் தேர்வுத் துறை இணையதளத்தில் உங்கள் அனுமதிச் சீட்டைப் பதிவிறக்கலாம்.'),
(3, 2, 'Which departments are eligible for the Infosys drive?', 'text',
 'Final-year CSE, IT, and ECE students are eligible for the Infosys placement drive.');

INSERT INTO bookmarks (user_id, announcement_id)
VALUES
(3, 1),
(3, 2),
(4, 1),
(4, 4),
(5, 2);

INSERT INTO read_status (user_id, announcement_id, is_read, read_at)
VALUES
(3, 1, TRUE, '2026-11-15 11:00:00'),
(3, 2, TRUE, '2026-11-12 13:00:00'),
(4, 1, TRUE, '2026-11-15 12:30:00'),
(4, 4, FALSE, '2026-11-16 09:30:00');

INSERT INTO notifications
(user_id, announcement_id, title, message, notification_type, is_read)
VALUES
(3, 1, 'Examination timetable published', 'The End Semester Examination timetable for November 2026 has been published.', 'Examination', FALSE),
(3, 2, 'New placement drive', 'Infosys placement drive registration is now open for eligible final-year students.', 'New Announcement', FALSE),
(4, 1, 'Important examination update', 'Check the End Semester Examination timetable and hall-ticket availability date.', 'Important', FALSE),
(4, 4, 'IT assessment schedule updated', 'The Internal Assessment II timetable for IT students has been revised.', 'Updated', FALSE),
(5, 2, 'Placement opportunity', 'Infosys placement drive is open to eligible ECE final-year students.', 'New Announcement', TRUE);

INSERT INTO scraping_logs
(source_name, scrape_started_at, scrape_ended_at, status, discovered_count, new_count, updated_count, failed_count, error_message)
VALUES
('Cybernaut Official Portal', '2026-11-15 08:00:00', '2026-11-15 08:03:24', 'Success', 12, 5, 1, 0, NULL),
('Cybernaut Examination Cell', '2026-11-15 08:05:00', '2026-11-15 08:07:41', 'Success', 8, 3, 0, 0, NULL),
('Cybernaut Training and Placement Cell', '2026-11-16 07:30:00', '2026-11-16 07:32:12', 'Partial', 10, 2, 1, 1, 'One attachment download failed due to a temporary server timeout.'),
('Cybernaut Student Affairs', '2026-11-17 06:00:00', NULL, 'Running', 0, 0, 0, 0, NULL);