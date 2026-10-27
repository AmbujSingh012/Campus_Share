-- CampusShare profile photo migration
-- Back up the database before running this migration.

ALTER TABLE users
ADD COLUMN profile_picture VARCHAR(2048) NULL;
