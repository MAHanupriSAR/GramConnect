create database gramconnect;
use gramconnect;

CREATE TABLE villagers (
    villager_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    mobile_number CHAR(10) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    aadhaar_number CHAR(12) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    terms_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE villagers
DROP COLUMN address,
ADD COLUMN latitude DECIMAL(10, 8) NOT NULL,
ADD COLUMN longitude DECIMAL(11, 8) NOT NULL;

CREATE TABLE institutions (
    institution_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                     -- Institution name
    address VARCHAR(255) NOT NULL,                  -- Institution address
    point_of_contact VARCHAR(100) NOT NULL,         -- Name of point of contact person
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- When the record was created
);
ALTER TABLE institutions
DROP COLUMN address,
ADD COLUMN latitude DECIMAL(10,8),
ADD COLUMN longitude DECIMAL(11,8);

CREATE TABLE pendingRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,      -- Unique ID for each request
    villager_id INT NOT NULL,                       
    problem_description TEXT NOT NULL,              -- Description of the issue
    problem_photo VARCHAR(255),                     
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When request was created
    
    -- Foreign key constraint
    CONSTRAINT fk_villager
        FOREIGN KEY (villager_id) 
        REFERENCES villagers(villager_id)
        ON DELETE CASCADE
);

ALTER TABLE pendingRequests CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE pendingRequests MODIFY problem_description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE pendingRequests 
ADD COLUMN tags VARCHAR(255) AFTER problem_photo,
ADD COLUMN ai_tags VARCHAR(255);