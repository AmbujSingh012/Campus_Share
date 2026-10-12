CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    actor_id INT NOT NULL,
    college_id INT NOT NULL,
    notification_type VARCHAR(20) NOT NULL,
    entity_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL DEFAULT NULL,

    UNIQUE KEY unique_recipient_post (
        recipient_id,
        notification_type,
        entity_id
    ),
    INDEX idx_notifications_recipient_unread (
        recipient_id,
        read_at,
        created_at
    ),

    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor
        FOREIGN KEY (actor_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_college
        FOREIGN KEY (college_id) REFERENCES colleges(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
