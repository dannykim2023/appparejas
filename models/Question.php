<?php
require_once __DIR__ . '/../config/database.php';

class Question {
    public static function getRandom() {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM questions ORDER BY RAND() LIMIT 1");
        $stmt->execute();
        return $stmt->fetch();
    }
}
