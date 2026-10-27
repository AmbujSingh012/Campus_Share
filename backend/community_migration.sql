-- CampusShare community feature migration
-- Run only once after verifying the database backup.

ALTER TABLE users
  ADD COLUMN username VARCHAR(30) NULL,
  ADD COLUMN bio VARCHAR(500) NULL,
  ADD COLUMN department VARCHAR(120) NULL,
  ADD COLUMN study_year TINYINT UNSIGNED NULL;

CREATE UNIQUE INDEX uq_users_username ON users (username);

CREATE TABLE connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  college_id INT NOT NULL,

  user_low INT GENERATED ALWAYS AS (
    LEAST(requester_id, recipient_id)
  ) STORED,

  user_high INT GENERATED ALWAYS AS (
    GREATEST(requester_id, recipient_id)
  ) STORED,

  status ENUM('pending', 'accepted', 'rejected')
    NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_connection_pair (user_low, user_high),
  KEY idx_connections_recipient (recipient_id, status),
  KEY idx_connections_requester (requester_id, status),

  CONSTRAINT chk_connection_different_users
    CHECK (requester_id <> recipient_id),

  CONSTRAINT fk_connections_requester
    FOREIGN KEY (requester_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_connections_recipient
    FOREIGN KEY (recipient_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_connections_college
    FOREIGN KEY (college_id) REFERENCES colleges(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_id BIGINT UNSIGNED NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_messages_conversation (connection_id, created_at),
  KEY idx_messages_sender (sender_id),

  CONSTRAINT fk_messages_connection
    FOREIGN KEY (connection_id) REFERENCES connections(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
