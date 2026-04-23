<?php
require_once __DIR__ . '/../utils/Response.php';

class GameController {
    public function getQuestions() {
        $json = file_get_contents(__DIR__ . '/../data/questions.json');
        if ($json) {
            $questions = json_decode($json, true);
            if ($questions && count($questions) > 0) Response::success($questions);
        }
        Response::error('No hay preguntas disponibles', 404);
    }

    private function getQuestionsByLevel() {
        $questions = json_decode(file_get_contents(__DIR__ . '/../data/questions.json'), true);
        $grouped   = [1 => [], 2 => [], 3 => []];
        foreach ($questions as $q) $grouped[(int)($q['level'] ?? 1)][] = $q;
        return $grouped;
    }

    private function generateOrder() {
        $g = $this->getQuestionsByLevel();
        $pick = function($arr, $n) {
            shuffle($arr);
            $ids = [];
            for ($i = 0; $i < $n && isset($arr[$i]); $i++) $ids[] = $arr[$i]['id'];
            return $ids;
        };
        return array_merge($pick($g[1], 7), $pick($g[2], 7), $pick($g[3], 6));
    }

    public function syncState($data) {
        $userId    = $data['user_id']    ?? null;
        $partnerId = $data['partner_id'] ?? null;
        if (!$userId) Response::error('user_id requerido');

        $file  = __DIR__ . '/../data/games.json';
        $games = file_exists($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];

        $sid = $partnerId
            ? min($userId, $partnerId) . '_' . max($userId, $partnerId)
            : 'solo_' . $userId;

        if (!isset($games[$sid])) {
            $games[$sid] = $this->defaultState($userId);
        }

        $action = $data['action'] ?? null;

        switch ($action) {
            case 'propose':
                // User A proposes — wait for partner to accept
                $games[$sid]['waiting']    = true;
                $games[$sid]['waiting_by'] = $userId;
                $games[$sid]['started']    = false;
                break;

            case 'accept':
                // Partner accepted — start the game
                if ($games[$sid]['waiting'] ?? false) {
                    $games[$sid]['started']         = true;
                    $games[$sid]['started_by']      = $games[$sid]['waiting_by'];
                    $games[$sid]['waiting']         = false;
                    $games[$sid]['current_question_index'] = 0;
                    $games[$sid]['questions_order'] = $this->generateOrder();
                    $games[$sid]['p1_ready']        = false;
                    $games[$sid]['p2_ready']        = false;
                    $games[$sid]['turn']            = $games[$sid]['waiting_by'];
                }
                break;

            case 'restart':
                $games[$sid] = $this->defaultState($userId);
                break;

            case 'ready':
                $p1 = (int)$userId < (int)($partnerId ?: 0);
                if ($p1 || !$partnerId) $games[$sid]['p1_ready'] = true;
                else                    $games[$sid]['p2_ready'] = true;

                $both = !$partnerId || ($games[$sid]['p1_ready'] && $games[$sid]['p2_ready']);
                if ($both) {
                    $games[$sid]['current_question_index']++;
                    $games[$sid]['p1_ready'] = false;
                    $games[$sid]['p2_ready'] = false;
                    $games[$sid]['turn']     = ($games[$sid]['turn'] == $userId) ? $partnerId : $userId;
                }
                break;
        }

        file_put_contents($file, json_encode($games, JSON_PRETTY_PRINT));

        $qId = $games[$sid]['questions_order'][$games[$sid]['current_question_index']] ?? null;
        $qText = null; $qLevel = 1;
        if ($qId) {
            foreach (json_decode(file_get_contents(__DIR__ . '/../data/questions.json'), true) as $q) {
                if ((int)$q['id'] === (int)$qId) { $qText = $q['question_text']; $qLevel = (int)($q['level'] ?? 1); break; }
            }
        }

        $state = $games[$sid];
        $state['question_text'] = $qText;
        $state['level']         = $qLevel;
        Response::success($state);
    }

    private function defaultState($userId) {
        return [
            'current_question_index' => 0,
            'p1_ready'       => false,
            'p2_ready'       => false,
            'started'        => false,
            'started_by'     => null,
            'waiting'        => false,
            'waiting_by'     => null,
            'turn'           => $userId,
            'questions_order'=> []
        ];
    }

    public static function getGameStatus($userId, $partnerId) {
        $file  = __DIR__ . '/../data/games.json';
        if (!file_exists($file)) return null;
        $games = json_decode(file_get_contents($file), true) ?: [];
        
        $sid = $partnerId
            ? min($userId, $partnerId) . '_' . max($userId, $partnerId)
            : 'solo_' . $userId;
            
        return $games[$sid] ?? null;
    }
}
