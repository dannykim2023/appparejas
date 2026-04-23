<?php
require_once __DIR__ . '/../models/Event.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Cycle.php';
require_once __DIR__ . '/../utils/Response.php';

class EventController {
    public function saveEvent($data) {
        if(empty($data['user_id']) || empty($data['date']) || empty($data['type'])) {
            Response::error('Faltan datos requeridos (user_id, date, type)');
        }
        
        if(!in_array($data['type'], ['period', 'intimacy', 'symptom', 'note'])) {
            Response::error('Tipo de evento no válido');
        }

        $value = $data['value'] ?? null;
        $success = Event::create($data['user_id'], $data['date'], $data['type'], $value);
        
        if($success) {
            // ⭐ MAGIA DE RECALCULO AUTOMÁTICO:
            // Si el usuario toca la gota de sangre (period), creamos automáticamente
            // un ancla en la tabla cycles para que toooodo su calendario se recalcule y se sincronice
            if($data['type'] === 'period') {
                $latest = Cycle::getLatestByUserId($data['user_id']);
                $length = $latest ? $latest['cycle_length'] : 28; // fallback a 28 días
                Cycle::create($data['user_id'], $data['date'], $length);
            }
            Response::success(['message' => 'Evento guardado correctamente']);
        } else {
            Response::error('Error al guardar el evento', 500);
        }
    }
    
    public function getEvents($data) {
        $userId = $_GET['user_id'] ?? null;
        $month = $_GET['month'] ?? date('Y-m'); 
        
        if(empty($userId)) Response::error('user_id requerido');
        
        $user = User::findById($userId);
        if(!$user) Response::error('Usuario no encontrado', 404);
        
        $events = Event::getEventsForUsers($userId, $user['partner_id'], $month);
        Response::success($events);
    }

    public function getTimeline($data) {
        $userId = $_GET['user_id'] ?? null;
        if(empty($userId)) Response::error('user_id requerido');
        
        $user = User::findById($userId);
        if(!$user) Response::error('Usuario no encontrado', 404);

        $events = Event::getAllHistorical($userId, $user['partner_id']);
        Response::success($events);
    }

    public function togglePeriod($data) {
        if(empty($data['user_id']) || empty($data['date'])) {
            Response::error('Faltan datos');
        }
        $userId = $data['user_id'];
        $date = $data['date'];
        
        $hasPeriod = Event::hasPeriodEvent($userId, $date);
        
        if($hasPeriod) {
            Event::deletePeriod($userId, $date);
            // Si eliminamos la fecha exacta que marcaba el inicio del ciclo, eliminamos el ciclo
            Cycle::deleteByDate($userId, $date); 
            Response::success(['newState' => false]);
        } else {
            Event::create($userId, $date, 'period', null);
            
            $latest = Cycle::getLatestByUserId($userId);
            
            if (!$latest) {
                Cycle::create($userId, $date, 28);
            } else {
                $daysDiff = (strtotime($date) - strtotime($latest['last_period_date'])) / 86400;
                
                // Si la fecha tapeada es > 15 días desde el último ciclo, creamos ciclo NUEVO
                if ($daysDiff > 15) {
                    Cycle::create($userId, $date, (int)$latest['cycle_length']);
                }
                // Si la fecha tapeada es hasta 10 días ANTES del ciclo más reciente (se le adelantó), ajustamos el inicio de ese ciclo
                else if ($daysDiff < 0 && $daysDiff > -10) {
                    Cycle::deleteByDate($userId, $latest['last_period_date']);
                    Cycle::create($userId, $date, (int)$latest['cycle_length']);
                }
            }

            Response::success(['newState' => true]);
        }
    }
}
