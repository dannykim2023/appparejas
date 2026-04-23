<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/Response.php';

class AuthController {
    public function register($data) {
        if(empty($data['name']) || empty($data['email']) || empty($data['password'])) {
            Response::error('Nombre, email y contraseña son requeridos');
        }

        // Verificar si el email ya existe
        if (User::findByEmail($data['email'])) {
            Response::error('Este correo electrónico ya está registrado', 400);
        }
        
        $gender = $data['gender'] ?? null;
        $birth = $data['birth'] ?? null;
        $pref = $data['preferences'] ?? null;

        $user = User::create($data['name'], $data['email'], $data['password'], $gender, $birth, $pref);
        if($user) {
            Response::success($user);
        } else {
            Response::error('Error al crear usuario', 500);
        }
    }

    public function login($data) {
        if(empty($data['email']) || empty($data['password'])) {
            Response::error('Email y contraseña son requeridos');
        }

        $user = User::authenticate($data['email'], $data['password']);
        if($user) {
            // No enviar la contraseña al frontend
            unset($user['password']);
            Response::success($user);
        } else {
            Response::error('Credenciales inválidas', 401);
        }
    }
    
    public function connectPartner($data) {
        if(empty($data['user_id']) || empty($data['partner_code'])) {
            Response::error('Faltan datos requeridos');
        }
        
        $partner = User::connectPartner($data['user_id'], $data['partner_code']);
        if($partner) {
            Response::success(['partner' => $partner]);
        } else {
            Response::error('Código inválido o error al conectar', 400);
        }
    }

    public function me($data) {
        $userId = $data['user_id'] ?? null;
        if(!$userId) Response::error('Falta user id');

        $user = User::findById($userId);
        if(!$user) Response::error('No user', 404);
        
        $partner = User::getPartnerInfo($user['id']);
        $partnerId = $partner ? $partner['id'] : null;
        
        require_once __DIR__ . '/GameController.php';
        require_once __DIR__ . '/DareController.php';
        
        $qStatus = GameController::getGameStatus($userId, $partnerId);
        $dStatus = DareController::getGameStatus($userId, $partnerId);
        
        $gameStatus = null;
        $gameType = null;
        
        if ($qStatus && $qStatus['waiting'] && (string)$qStatus['waiting_by'] !== (string)$userId) {
            $gameStatus = $qStatus;
            $gameType = 'questions';
        } else if ($dStatus && $dStatus['waiting'] && (string)$dStatus['waiting_by'] !== (string)$userId) {
            $gameStatus = $dStatus;
            $gameType = 'dares';
        } else {
            // Default/Fallback
            $gameStatus = $qStatus;
            $gameType = 'questions';
        }
        
        Response::success([
            'user' => $user, 
            'partner' => $partner,
            'game_status' => $gameStatus,
            'game_type' => $gameType
        ]);
    }

    public function setAnniversary($data) {
        $userId = $data['user_id'] ?? null;
        $date = $data['date'] ?? null;
        if(!$userId || !$date) Response::error('Falta data');

        $success = User::setAnniversary($userId, $date);
        if($success) {
            Response::success(['status' => 'ok']);
        } else {
            Response::error('Fallo al guardar', 500);
        }
    }

    public function updateProfile($data) {
        $userId = $data['user_id'] ?? null;
        if(!$userId) Response::error('Falta id');

        $success = User::updateProfile(
            $userId, 
            $data['name'], 
            $data['gender'], 
            $data['birth'], 
            $data['preferences'] ?? []
        );

        if($success) {
            Response::success(['status' => 'ok']);
        } else {
            Response::error('No se pudo actualizar', 500);
        }
    }

    public function deleteAccount($data) {
        $userId = $data['user_id'] ?? null;
        if(!$userId) Response::error('Falta id');
        
        $success = User::deleteAccount($userId);
        if($success) {
            Response::success(['status' => 'ok']);
        } else {
            Response::error('No se pudo borrar', 500);
        }
    }
}
