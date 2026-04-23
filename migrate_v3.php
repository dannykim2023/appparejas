<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = Database::getConnection();
    // Use IF NOT EXISTS equivalent for MariaDB gracefully
    try { $db->exec("ALTER TABLE users ADD COLUMN gender VARCHAR(10) NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN birth_date DATE NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN anniversary_date DATE NULL"); } catch(Exception $e){}
    try { $db->exec("ALTER TABLE users ADD COLUMN preferences TEXT NULL"); } catch(Exception $e){}
    echo "V3 done";
} catch (Exception $e) { echo $e->getMessage(); }
