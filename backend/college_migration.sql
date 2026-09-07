CREATE TABLE colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email_domain VARCHAR(255) NOT NULL UNIQUE
);

ALTER TABLE users
ADD COLUMN college_id INT NULL,
ADD CONSTRAINT fk_users_college
FOREIGN KEY (college_id) REFERENCES colleges(id);

ALTER TABLE resources
ADD COLUMN college_id INT NULL,
ADD CONSTRAINT fk_resources_college
FOREIGN KEY (college_id) REFERENCES colleges(id);

ALTER TABLE tasks
ADD COLUMN college_id INT NULL,
ADD CONSTRAINT fk_tasks_college
FOREIGN KEY (college_id) REFERENCES colleges(id);

INSERT INTO colleges (name, email_domain) VALUES
('IIT Delhi', 'iitd.ac.in'),
('IIT Bombay', 'iitb.ac.in'),
('NIT Delhi', 'nitdelhi.ac.in');
