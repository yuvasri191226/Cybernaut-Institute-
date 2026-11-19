ER Diagram and Table Dictionary
Project

AI-Powered College Announcement Monitoring System
Cybernaut Institute of Technology
Entity-Relationship Diagram

text
users (1) ──────────────< bookmarks >────────────── (1) announcements
users (1) ──────────────< read_status >───────────── (1) announcements
users (1) ──────────────< notifications >──────────── (0..1) announcements
users (1) ──────────────< ai_qa_logs >─────────────── (0..1) announcements
users (1) ────────────── verifies ────────────────── (0..n) announcements

announcements (1) ────< announcement_versions
announcements (1) ────< attachments
announcements (1) ────(1) ai_insights

Relationship Rules
Relationship	Cardinality	Foreign Key	Delete Behaviour
User bookmarks announcement	Many-to-many through bookmarks	bookmarks.user_id, bookmarks.announcement_id	Cascade
User marks announcement read/unread	Many-to-many through read_status	read_status.user_id, read_status.announcement_id	Cascade
User receives notification	One-to-many	notifications.user_id	Cascade
Announcement has notification	One-to-many	notifications.announcement_id	Cascade
User asks AI question	One-to-many	ai_qa_logs.user_id	Cascade
Announcement has AI Q&A record	One-to-many	ai_qa_logs.announcement_id	Set NULL
Announcement has version history	One-to-many	announcement_versions.announcement_id	Cascade
Announcement has attachment	One-to-many	attachments.announcement_id	Cascade
Announcement has one AI insight	One-to-one	ai_insights.announcement_id	Cascade
Admin verifies announcement	One-to-many	announcements.verified_by	Set NULL
Table Dictionary
1. users
Column	Type	Constraint / Default	Purpose
user_id	INT UNSIGNED	PK, AUTO_INCREMENT	Unique user identifier
register_number	VARCHAR(50)	UNIQUE, NULL	Student register number; NULL for admins
full_name	VARCHAR(150)	NOT NULL	User full name
email	VARCHAR(150)	NOT NULL, UNIQUE	Login email
password_hash	VARCHAR(255)	NOT NULL	Werkzeug/Bcrypt password hash
role	ENUM	student, admin; default student	Role-based access
department	ENUM	Default All	Student/admin department
academic_year	ENUM	Default All	Student academic year
preferred_language	ENUM	English or Tamil; default English	UI and AI language preference
is_active	BOOLEAN	Default TRUE	Account activation status
last_login	DATETIME	NULL	Last successful login
created_at	TIMESTAMP	Current timestamp	Record creation time
updated_at	TIMESTAMP	Auto-update	Record modification time
2. announcements
Column	Type	Constraint / Default	Purpose
id	INT UNSIGNED	PK, AUTO_INCREMENT	Announcement ID
title	VARCHAR(500)	NOT NULL	Announcement heading
description	LONGTEXT	NOT NULL	Full announcement content
category	ENUM	Default General	Examination, Events, Academic, Placement, General, Other
department	VARCHAR(100)	Default All Departments	Target department
target_year	VARCHAR(100)	Default All Years	Target academic year
announcement_type	VARCHAR(100)	Default Circular	Notice type
published_date	DATETIME	NULL	Original publication date; leave NULL if unknown
deadline_date	DATETIME	NULL	Application/action deadline
updated_date	DATETIME	NULL	Latest content-update timestamp
is_updated	BOOLEAN	Default FALSE	Whether content changed after initial scrape
update_count	INT UNSIGNED	Default 0	Number of content updates
is_important	BOOLEAN	Default FALSE	Priority flag
source_website	VARCHAR(255)	NOT NULL	Source portal name
source_url	VARCHAR(768)	NOT NULL, UNIQUE	Source URL; prevents duplicate scraping
content_hash	VARCHAR(64)	NOT NULL	SHA-256 of title + description
verification_status	ENUM	Default Needs Review	Admin verification state
verified_by	INT UNSIGNED	FK to users.user_id, NULL	Verifying admin
verified_at	DATETIME	NULL	Verification time
verification_note	TEXT	NULL	Admin verification remarks
created_at	TIMESTAMP	Current timestamp	Record creation time
updated_at	TIMESTAMP	Auto-update	Record modification time
3. announcement_versions

Stores the previous title and description whenever an announcement is changed.
Column	Type	Purpose
version_id	INT UNSIGNED PK	Version record ID
announcement_id	INT UNSIGNED FK	Parent announcement
previous_title	VARCHAR(500)	Title before update
previous_description	LONGTEXT	Description before update
changed_at	TIMESTAMP	Update timestamp
4. attachments
Column	Type	Purpose
attachment_id	INT UNSIGNED PK	Attachment ID
announcement_id	INT UNSIGNED FK	Parent announcement
file_name	VARCHAR(255)	Original file name
file_url	VARCHAR(768)	Download/source URL
file_type	VARCHAR(50)	File type, usually PDF
extracted_text	LONGTEXT	Text extracted by Member 7
extraction_status	ENUM	Pending, Completed, Failed, No Text
extracted_at	DATETIME	Extraction completion time
created_at	TIMESTAMP	Record creation time
5. ai_insights
Column	Type	Purpose
insight_id	INT UNSIGNED PK	AI insight ID
announcement_id	INT UNSIGNED FK, UNIQUE	One insight per announcement
english_summary	TEXT	English summary
tamil_summary	TEXT	Tamil summary
tamil_translation	LONGTEXT	Full Tamil translation
ai_suggested_category	VARCHAR(50)	AI classification
ai_confidence_score	DECIMAL(5,2)	Confidence percentage, 0-100
generated_at	TIMESTAMP	Last AI generation time
6. ai_qa_logs
Column	Type	Purpose
qa_id	INT UNSIGNED PK	Q&A record ID
user_id	INT UNSIGNED FK	Asking user
announcement_id	INT UNSIGNED FK, NULL	Related announcement, if any
question_text	TEXT	Student question
input_mode	ENUM	text or voice
ai_response	LONGTEXT	AI-generated response
asked_at	TIMESTAMP	Question timestamp
7. bookmarks
Column	Type	Purpose
bookmark_id	INT UNSIGNED PK	Bookmark ID
user_id	INT UNSIGNED FK	Student who saved the announcement
announcement_id	INT UNSIGNED FK	Saved announcement
saved_at	TIMESTAMP	Bookmark creation time

Unique constraint: unique_user_bookmark(user_id, announcement_id).
8. read_status
Column	Type	Purpose
status_id	INT UNSIGNED PK	Read-status record ID
user_id	INT UNSIGNED FK	Student
announcement_id	INT UNSIGNED FK	Announcement
is_read	BOOLEAN	TRUE means read
read_at	TIMESTAMP	Time marked as read

Unique constraint: unique_user_read(user_id, announcement_id).
9. notifications
Column	Type	Purpose
notification_id	INT UNSIGNED PK	Notification ID
user_id	INT UNSIGNED FK	Recipient
announcement_id	INT UNSIGNED FK, NULL	Related announcement
title	VARCHAR(255)	Notification heading
message	TEXT	Notification body
notification_type	ENUM	Notification category
is_read	BOOLEAN	Read status
created_at	TIMESTAMP	Notification creation time
10. scraping_logs
Column	Type	Purpose
Column	Type	Purpose
log_id	INT UNSIGNED PK	Scrape-run ID
source_name	VARCHAR(255)	Scraped portal/source
scrape_started_at	DATETIME	Run start time
scrape_ended_at	DATETIME	Run end time
status	ENUM	Running, Success, Partial, Failed
discovered_count	INT UNSIGNED	Notices found
new_count	INT UNSIGNED	New announcements inserted
updated_count	INT UNSIGNED	Existing announcements updated
failed_count	INT UNSIGNED	Failed items
error_message	TEXT	Error details
Integration Notes

    Member 3 should query announcements using MATCH ... AGAINST for keyword search, idx_filter_combo for filters, and idx_important_updated for priority sorting.

    Member 4 should use source_url to detect duplicates and content_hash to identify changed content. On a title/description change, the trigger automatically creates a version record and increments update_count.

    Member 5 should write AI output to ai_insights, Q&A interactions to ai_qa_logs, and authentication data to users.

    Member 7 should store extracted PDF text in attachments.extracted_text and update extraction_status and extracted_at.