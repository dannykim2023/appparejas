<?php
require_once __DIR__ . '/config/database.php';

try {
    $db = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/database_v2.sql');
    $db->exec($sql);
    echo "¡Migración exitosa!";
} catch (Exception $e) {
    echo "Fallo de migración: " . $e->getMessage();
}
