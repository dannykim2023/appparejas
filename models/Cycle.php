<?php
require_once __DIR__ . '/../config/database.php';

class Cycle {
    public static function create($userId, $lastPeriodDate, $cycleLength) {
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO cycles (user_id, last_period_date, cycle_length) VALUES (:user_id, :last_date, :length)");
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':last_date', $lastPeriodDate);
        $stmt->bindParam(':length', $cycleLength);
        
        return $stmt->execute();
    }
    
    public static function getLatestByUserId($userId) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM cycles WHERE user_id = :user_id ORDER BY last_period_date DESC LIMIT 1");
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        return $stmt->fetch();
    }

    public static function getAllHistorical($userId) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM cycles WHERE user_id = :user_id ORDER BY last_period_date DESC");
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function deleteByDate($userId, $date) {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM cycles WHERE user_id = :uid AND last_period_date = :date");
        return $stmt->execute(['uid' => $userId, 'date' => $date]);
    }
}
