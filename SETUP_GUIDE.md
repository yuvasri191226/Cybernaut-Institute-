Database Setup Guide
Requirements

    MySQL 8.0 or later

    MySQL Workbench, phpMyAdmin, or MySQL Command-Line Client

    Database character set: utf8mb4

    Database collation: utf8mb4_unicode_ci

    Storage engine: InnoDB

The schema uses utf8mb4_unicode_ci so Tamil text, special symbols, and emojis can be stored without corruption. FULLTEXT search is supported on InnoDB text columns.
Files
File	Purpose
database/schema.sql	Creates the database, 10 tables, indexes, view, and trigger
database/seed.sql	Inserts realistic Cybernaut Institute sample data
database/ER_DIAGRAM.md	ER diagram and complete table dictionary
database/SETUP_GUIDE.md	Import instructions
Important: Password Hashes

The seed file contains placeholder password hashes. Before deployment, generate real Werkzeug password hashes in the Flask backend and replace the placeholders.

python
from werkzeug.security import generate_password_hash

print(generate_password_hash("Admin@123"))
print(generate_password_hash("Student@123"))

Then update every REPLACE_WITH_VALID_WERKZEUG_HASH_* value in database/seed.sql.

Never insert plain-text passwords into the database.
Method 1: MySQL Command Line

    Open a terminal in the project root.

    Run:

bash
mysql -u root -p < database/schema.sql

    Then run:

bash
mysql -u root -p < database/seed.sql

If MySQL is not in PATH, use the full path, for example:

bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database/schema.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database/seed.sql

Method 2: MySQL Workbench

    Open MySQL Workbench and connect to your local MySQL server.

    Open database/schema.sql.

    Click the lightning icon to execute the entire script.

    Open database/seed.sql.

    Execute the seed script.

    Refresh the schemas panel; select college_announcements_db.

Method 3: phpMyAdmin

    Open phpMyAdmin.

    Select the Import tab.

    Choose database/schema.sql.

    Set Format to SQL.

    Click Import.

    Repeat the process for database/seed.sql.

Verification Queries

sql
USE college_announcements_db;

SHOW TABLES;

SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_announcements FROM announcements;
SELECT COUNT(*) AS total_attachments FROM attachments;
SELECT COUNT(*) AS total_ai_insights FROM ai_insights;

SELECT * FROM vw_admin_dashboard_stats;

SELECT id, title, is_updated, update_count
FROM announcements
WHERE is_updated = TRUE;

SELECT previous_title, changed_at
FROM announcement_versions
WHERE announcement_id = 4;

Test the Update Trigger

sql
USE college_announcements_db;

UPDATE announcements
SET description = 'Updated examination instructions: students must carry their college ID and hall ticket.'
WHERE id = 1;

SELECT id, is_updated, update_count, updated_date
FROM announcements
WHERE id = 1;

SELECT previous_title, previous_description, changed_at
FROM announcement_versions
WHERE announcement_id = 1;

The trigger inserts the old title and description into announcement_versions, marks the announcement as updated, and increments update_count.
Test Full-Text Search

sql
USE college_announcements_db;

SELECT id, title, category, department
FROM announcements
WHERE MATCH(title, description)
AGAINST('examination timetable' IN NATURAL LANGUAGE MODE);

Flask Connection Example

python
from flask_sqlalchemy import SQLAlchemy

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "mysql+pymysql://root:your_password@localhost:3306/"
    "college_announcements_db?charset=utf8mb4"
)

Ensure the MySQL user has privileges on college_announcements_db:

sql
CREATE USER IF NOT EXISTS 'cit_app'@'localhost' IDENTIFIED BY 'StrongAppPassword';
GRANT SELECT, INSERT, UPDATE, DELETE ON college_announcements_db.* TO 'cit_app'@'localhost';
FLUSH PRIVILEGES;

Do not use the MySQL root account in the Flask application for production.