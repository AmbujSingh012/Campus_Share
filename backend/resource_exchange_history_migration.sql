-- CampusShare resource exchange history
-- Local migration draft: review before running against any database.

CREATE TABLE resource_exchange_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  resource_id INT NOT NULL,
  owner_id INT NOT NULL,
  borrower_id INT NOT NULL,
  college_id INT NOT NULL,
  borrow_method ENUM('direct', 'razorpay') NOT NULL,
  borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  returned_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_exchange_pair (college_id, owner_id, borrower_id, returned_at),
  KEY idx_exchange_resource (resource_id, returned_at),
  KEY idx_exchange_borrower (borrower_id, returned_at),

  CONSTRAINT fk_exchange_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_exchange_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_exchange_borrower
    FOREIGN KEY (borrower_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_exchange_college
    FOREIGN KEY (college_id) REFERENCES colleges(id)
    ON DELETE CASCADE,

  CONSTRAINT chk_exchange_different_users
    CHECK (owner_id <> borrower_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
