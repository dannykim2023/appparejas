<?php

class Response {
    public static function send($success, $data = [], $error = null, $httpCode = 200) {
        http_response_code($httpCode);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => $success,
            'data' => $data,
            'error' => $error
        ]);
        exit;
    }

    public static function success($data = []) {
        self::send(true, $data, null, 200);
    }

    public static function error($message, $httpCode = 400) {
        self::send(false, null, $message, $httpCode);
    }
}
