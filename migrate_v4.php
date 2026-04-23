<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = Database::getConnection();
    // Añadir columnas para login
    try { $db->exec("ALTER TABLE users ADD COLUMN email VARCHAR(150) NULL UNIQUE"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL"); } catch(Exception $e){}
    echo "V4 (Login system) migration done";
} catch (Exception $e) { echo $e->getMessage(); }
