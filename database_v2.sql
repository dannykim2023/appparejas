USE appParejas_db;

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    type ENUM('period', 'intimacy', 'symptom', 'note') NOT NULL,
    value TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ignorará el error si ya existe en MySQL 8 o posterior, u otra manera segura es vía código (pero por ahora este script es la base)
ALTER TABLE users ADD COLUMN IF NOT EXISTS anniversary_date DATE DEFAULT NULL;
