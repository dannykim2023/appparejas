<?php

class Database {
    private static $connection = null;
    
    // Configura aquí tus credenciales de MySQL si es necesario
    private static $host = '127.0.0.1';
    private static $db_name = 'appParejas_db';
    private static $username = 'root';
    private static $password = ''; // Por defecto asumo sin clave en entorno local

    public static function getConnection() {
        if (self::$connection === null) {
            try {
                self::$connection = new PDO(
                    "mysql:host=" . self::$host . ";dbname=" . self::$db_name . ";charset=utf8",
                    self::$username,
                    self::$password
                );
                self::$connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch(PDOException $exception) {
                echo "Error de conexión: " . $exception->getMessage();
                exit;
            }
        }
        return self::$connection;
    }
}
