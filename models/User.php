<?php
require_once __DIR__ . '/../config/database.php';

class User {
    public static function create($name, $email, $password, $gender = null, $birth_date = null, $preferences = null) {
        $db = Database::getConnection();
        
        $code = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 6);
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
        $stmt = $db->prepare("INSERT INTO users (name, email, password, unique_code, gender, birth_date, preferences) VALUES (:name, :email, :pass, :code, :gen, :birth, :pref)");
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':pass', $hashedPassword);
        $stmt->bindParam(':code', $code);
        $stmt->bindParam(':gen', $gender);
        $stmt->bindParam(':birth', $birth_date);
        
        $prefStr = $preferences ? json_encode($preferences) : null;
        $stmt->bindParam(':pref', $prefStr);
        
        if($stmt->execute()) {
            return self::findById($db->lastInsertId());
        }
        return false;
    }
    
    public static function findById($id) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        return self::formatUser($stmt->fetch());
    }
    
    public static function findByCode($code) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE unique_code = :code");
        $stmt->bindParam(':code', $code);
        $stmt->execute();
        return self::formatUser($stmt->fetch());
    }

    public static function findByEmail($email) {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        return self::formatUser($stmt->fetch());
    }

    private static function formatUser($user) {
        if ($user && !empty($user['preferences'])) {
            if (is_string($user['preferences'])) {
                $user['preferences'] = json_decode($user['preferences'], true);
            }
        }
        return $user;
    }

    public static function authenticate($email, $password) {
        $user = self::findByEmail($email);
        if ($user && password_verify($password, $user['password'])) {
            return $user;
        }
        return false;
    }
    
    public static function getPartnerInfo($userId) {
        $me = self::findById($userId);
        if(!$me || !$me['partner_id']) return null;
        return self::findById($me['partner_id']);
    }

    public static function connectPartner($userId, $partnerCode) {
        $db = Database::getConnection();
        
        $partner = self::findByCode($partnerCode);
        if(!$partner) return false;
        
        if($partner['id'] == $userId) return false; 
        
        $partnerId = $partner['id'];
        
        $stmt = $db->prepare("UPDATE users SET partner_id = :partner_id WHERE id = :id");
        $stmt->bindParam(':partner_id', $partnerId);
        $stmt->bindParam(':id', $userId);
        $stmt->execute();
        
        $stmt2 = $db->prepare("UPDATE users SET partner_id = :my_id WHERE id = :partner_id");
        $stmt2->bindParam(':my_id', $userId);
        $stmt2->bindParam(':partner_id', $partnerId);
        $stmt2->execute();
        
        return $partner;
    }

    public static function updateProfile($userId, $name, $gender, $birthDate, $preferences) {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET name = :n, gender = :g, birth_date = :b, preferences = :p WHERE id = :id");
        $prefStr = $preferences ? json_encode($preferences) : null;
        return $stmt->execute([
            'n' => $name,
            'g' => $gender,
            'b' => $birthDate,
            'p' => $prefStr,
            'id' => $userId
        ]);
    }

    public static function deleteAccount($userId) {
        $db = Database::getConnection();
        // Borrados manuales críticos por seguridad
        try { $db->exec("DELETE FROM events WHERE user_id = $userId"); } catch(Exception $e){}
        try { $db->exec("DELETE FROM cycles WHERE user_id = $userId"); } catch(Exception $e){}
        try { $db->exec("UPDATE users SET partner_id = NULL WHERE partner_id = $userId"); } catch(Exception $e){}
        
        $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
        return $stmt->execute(['id' => $userId]);
    }

    public static function setAnniversary($userId, $date) {
        $db = Database::getConnection();
        $me = self::findById($userId);
        if(!$me) return false;
        
        $stmt = $db->prepare("UPDATE users SET anniversary_date = :dt WHERE id = :uid OR id = :pid");
        return $stmt->execute(['dt' => $date, 'uid' => $userId, 'pid' => $me['partner_id']]);
    }
}
