<?php
require_once __DIR__ . '/../utils/Response.php';

class HomeController {
    public function index() {
        $this->serve('index.html');
    }

    public function login() {
        $this->serve('login.html');
    }

    private function serve($page) {
        $path = __DIR__ . '/../public/' . $page;
        if (file_exists($path)) {
            readfile($path);
        } else {
            echo "Error: $page no encontrado en " . htmlspecialchars($path);
        }
    }
}
