ALTER TABLE messages
  ADD COLUMN attachment_url VARCHAR(2048) NULL,
  ADD COLUMN attachment_name VARCHAR(255) NULL,
  ADD COLUMN attachment_type VARCHAR(100) NULL,
  ADD COLUMN attachment_size INT UNSIGNED NULL;