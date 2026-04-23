<?php
require_once __DIR__ . '/../models/Cycle.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/CycleService.php';
require_once __DIR__ . '/../utils/Response.php';

class CycleController
{

    public function saveCycle($data)
    {
        if (empty($data['user_id']) || empty($data['last_period_date']) || empty($data['cycle_length'])) {
            Response::error('Faltan datos requeridos');
        }

        $success = Cycle::create(
            $data['user_id'],
            $data['last_period_date'],
            (int) $data['cycle_length']
        );

        if ($success) {
            Response::success(['message' => 'Ciclo guardado correctamente']);
        } else {
            Response::error('Error al guardar el ciclo', 500);
        }
    }

    public function getCalendar()
    {
        $userId = $_GET['user_id'] ?? null;

        if (empty($userId)) {
            Response::error('user_id requerido');
        }

        $user = User::findById($userId);
        if (!$user) {
            Response::error('Usuario no encontrado', 404);
        }

        $calendarData = [
            'my_predictions' => [],
            'partner_predictions' => [],
            'my_history' => Cycle::getAllHistorical($userId),
            'partner_history' => []
        ];

        // 👤 Usuario
        $myLastCycle = Cycle::getLatestByUserId($userId);
        if ($myLastCycle) {
            $calendarData['my_predictions'] = CycleService::predictNextCycles(
                $myLastCycle['last_period_date'],
                (int) $myLastCycle['cycle_length']
            );
        }

        // ❤️ Pareja
        if (!empty($user['partner_id'])) {
            $calendarData['partner_history'] = Cycle::getAllHistorical($user['partner_id']);

            $partnerLastCycle = Cycle::getLatestByUserId($user['partner_id']);
            if ($partnerLastCycle) {
                $calendarData['partner_predictions'] = CycleService::predictNextCycles(
                    $partnerLastCycle['last_period_date'],
                    (int) $partnerLastCycle['cycle_length']
                );
            }
        }

        Response::success($calendarData);
    }
}