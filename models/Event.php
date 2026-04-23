<?php
require_once __DIR__ . '/../config/database.php';

class Event {
    public static function create($userId, $date, $type, $value = null) {
        $db = Database::getConnection();
        // Check if intimacy/period exists locally on the exact same date to prevent duplicates if preferred, 
        // For 'intimacy' multiple per day is possible but let's keep it simple.
        $stmt = $db->prepare("INSERT INTO events (user_id, date, type, value) VALUES (:user_id, :date, :type, :value)");
        $stmt->bindParam(':user_id', $userId);
        $stmt->bindParam(':date', $date);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':value', $value);
        return $stmt->execute();
    }
    
    public static function getEventsForUsers($userId, $partnerId, $monthPrefix) {
        $db = Database::getConnection();
        $like = $monthPrefix . '%';
        
        $sql = "SELECT e.*, u.name as user_name 
                FROM events e 
                JOIN users u ON e.user_id = u.id 
                WHERE (e.user_id = :uid";
                
        if ($partnerId) {
            $sql .= " OR e.user_id = :pid";
        }
        $sql .= ") AND e.date LIKE :month ORDER BY e.date ASC, e.created_at ASC";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':uid', $userId);
        if ($partnerId) {
            $stmt->bindParam(':pid', $partnerId);
        }
        $stmt->bindParam(':month', $like);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    public static function getAllHistorical($userId, $partnerId) {
        $db = Database::getConnection();
        
        $sql = "SELECT e.*, u.name as user_name 
                FROM events e 
                JOIN users u ON e.user_id = u.id 
                WHERE (e.user_id = :uid";
        if ($partnerId) {
            $sql .= " OR e.user_id = :pid";
        }
        $sql .= ") ORDER BY e.date DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':uid', $userId);
        if ($partnerId) {
            $stmt->bindParam(':pid', $partnerId);
        }
        $stmt->execute();
        
        return $stmt->fetchAll();
    }

    public static function hasPeriodEvent($userId, $date) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT id FROM events WHERE user_id = :uid AND date = :date AND type = 'period'");
        $stmt->execute(['uid' => $userId, 'date' => $date]);
        return $stmt->fetchColumn() > 0;
    }

    public static function deletePeriod($userId, $date) {
        $db = Database::getConnection();
        $stmt = $db->prepare("DELETE FROM events WHERE user_id = :uid AND date = :date AND type = 'period'");
        return $stmt->execute(['uid' => $userId, 'date' => $date]);
    }
}
