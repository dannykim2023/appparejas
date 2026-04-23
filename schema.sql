CREATE DATABASE IF NOT EXISTS appParejas_db;
USE appParejas_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unique_code VARCHAR(6) NOT NULL UNIQUE,
    partner_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    last_period_date DATE NOT NULL,
    cycle_length INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL
);

-- Insertar preguntas iniciales para el minijuego
INSERT INTO questions (question_text) VALUES 
('¿Cuál es tu recuerdo favorito de nosotros?'),
('¿Qué cosa pequeña hago que te hace feliz?'),
('¿A dónde te gustaría que fuera nuestro próximo viaje juntos?'),
('Si pudieras describir nuestra relación en una palabra, ¿cuál sería?'),
('¿Cuál consideras que es nuestro mayor logro como pareja?'),
('¿Qué canción te recuerda a mí?'),
('¿Qué es lo que más te hace reír de nosotros?'),
('Si tuviéramos un día entero para hacer lo que quisiéramos sin límite de presupuesto, ¿qué haríamos?'),
('¿Cuál es un sueño loco que tienes y no me habías contado?'),
('¿Qué aspecto de mí te gustaría tener tú?');
