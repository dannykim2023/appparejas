<?php
require_once __DIR__ . '/../utils/Env.php';

// Cargar .env si existe en la raíz
Env::load(__DIR__ . '/../.env');

class Database {
    private static $connection = null;
    
    public static function getConnection() {
        if (self::$connection === null) {
            
            // Leer desde .env o variables de entorno del servidor (cPanel/Hostinger)
            $host = $_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? '127.0.0.1';
            $db_name = $_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? 'appParejas_db';
            $username = $_ENV['DB_USER'] ?? $_SERVER['DB_USER'] ?? 'root';
            $password = $_ENV['DB_PASS'] ?? $_SERVER['DB_PASS'] ?? '';
            try {
                self::$connection = new PDO(
                    "mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8",
                    $username,
                    $password
                );
                self::$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch(PDOException $exception) {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'error' => 'Fallo al conectar a la Base de Datos. Revisa config/database.php. Detalle: ' . $exception->getMessage()
                ]);
                exit;
            }
        }
        return self::$connection;
    }
}
