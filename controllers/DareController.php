<?php
require_once __DIR__ . '/../utils/Response.php';

class DareController {
    private function getChallengesByLevel() {
        $challenges = json_decode(file_get_contents(__DIR__ . '/../data/challenges.json'), true);
        $grouped = [1 => [], 2 => [], 3 => []];
        foreach ($challenges as $c) $grouped[(int)($c['level'] ?? 1)][] = $c;
        return $grouped;
    }

    private function generateOrder() {
        $g    = $this->getChallengesByLevel();
        $pick = function($arr, $n) {
            shuffle($arr);
            $items = [];
            for ($i = 0; $i < $n && isset($arr[$i]); $i++) {
                $items[] = [
                    'id'   => $arr[$i]['id'],
                    'type' => $arr[$i]['type']
                ];
            }
            return $items;
        };
        return array_merge($pick($g[1], 7), $pick($g[2], 7), $pick($g[3], 6));
    }

    public function syncState($data) {
        $userId    = $data['user_id']    ?? null;
        $partnerId = $data['partner_id'] ?? null;
        if (!$userId) Response::error('user_id requerido');

        $file  = __DIR__ . '/../data/dares.json';
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
                $games[$sid]['waiting']    = true;
                $games[$sid]['waiting_by'] = $userId;
                $games[$sid]['started']    = false;
                break;

            case 'accept':
                if ($games[$sid]['waiting'] ?? false) {
                    $order = $this->generateOrder();
                    $games[$sid]['started']       = true;
                    $games[$sid]['started_by']    = $games[$sid]['waiting_by'];
                    $games[$sid]['waiting']       = false;
                    $games[$sid]['current_index'] = 0;
                    $games[$sid]['order']         = $order;
                    $games[$sid]['p1_done']       = false;
                    $games[$sid]['p2_done']       = false;
                    $games[$sid]['turn']          = $games[$sid]['waiting_by'];
                    $games[$sid]['current_type']  = $order[0]['type'];
                }
                break;

            case 'restart':
                $games[$sid] = $this->defaultState($userId);
                break;

            case 'done':
                $p1 = (int)$userId < (int)($partnerId ?: 0);
                if ($p1 || !$partnerId) $games[$sid]['p1_done'] = true;
                else                    $games[$sid]['p2_done'] = true;

                $both = !$partnerId || ($games[$sid]['p1_done'] && $games[$sid]['p2_done']);
                if ($both) {
                    $newIndex = $games[$sid]['current_index'] + 1;
                    $games[$sid]['current_index'] = $newIndex;
                    $games[$sid]['p1_done']      = false;
                    $games[$sid]['p2_done']      = false;
                    $games[$sid]['turn']         = ($games[$sid]['turn'] == $userId) ? $partnerId : $userId;
                    
                    if (isset($games[$sid]['order'][$newIndex])) {
                        $games[$sid]['current_type'] = $games[$sid]['order'][$newIndex]['type'];
                    }
                }
                break;
        }

        file_put_contents($file, json_encode($games, JSON_PRETTY_PRINT));

        // Resolve current challenge text
        $curr = $games[$sid]['order'][$games[$sid]['current_index']] ?? null;
        $cId   = $curr['id'] ?? null;
        $cType = $curr['type'] ?? $games[$sid]['current_type'] ?? 'truth';
        $cText = null; 
        $cLevel = 1;

        if ($cId) {
            $all = json_decode(file_get_contents(__DIR__ . '/../data/challenges.json'), true);
            foreach ($all as $c) {
                if ((int)$c['id'] === (int)$cId && $c['type'] === $cType) {
                    $cText = $c['text']; 
                    $cLevel = (int)($c['level'] ?? 1); 
                    break;
                }
            }
        }

        $state = $games[$sid];
        $state['challenge_text']  = $cText;
        $state['challenge_level'] = $cLevel;
        $state['challenge_type']  = $cType;
        Response::success($state);
    }

    private function defaultState($userId) {
        return [
            'current_index' => 0,
            'p1_done'       => false,
            'p2_done'       => false,
            'started'       => false,
            'started_by'    => null,
            'waiting'       => false,
            'waiting_by'    => null,
            'turn'          => $userId,
            'order'         => [],
            'current_type'  => null,
        ];
    }

    public static function getGameStatus($userId, $partnerId) {
        $file  = __DIR__ . '/../data/dares.json';
        if (!file_exists($file)) return null;
        $games = json_decode(file_get_contents($file), true) ?: [];
        
        $sid = $partnerId
            ? min($userId, $partnerId) . '_' . max($userId, $partnerId)
            : 'solo_' . $userId;
            
        return $games[$sid] ?? null;
    }
}
