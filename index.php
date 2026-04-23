<?php
// Configuración de cabeceras para CORS y JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Manejar API
if (strpos($requestUri, '/api/') !== false) {
    $data = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $json = file_get_contents('php://input');
        if (!empty($json)) {
            $data = json_decode($json, true);
        }
    }

    require_once 'controllers/AuthController.php';
    require_once 'controllers/CycleController.php';
    require_once 'controllers/GameController.php';
    require_once 'controllers/EventController.php';
    require_once 'controllers/DareController.php';
    require_once 'utils/Response.php';

    $endpoint = substr($requestUri, strpos($requestUri, '/api/'));

    switch ($endpoint) {
        case '/api/register': (new AuthController())->register($data); break;
        case '/api/login': (new AuthController())->login($data); break;
        case '/api/connect-partner': (new AuthController())->connectPartner($data); break;
        case '/api/me': (new AuthController())->me($_GET); break;
        case '/api/set-anniversary': (new AuthController())->setAnniversary($data); break;
        case '/api/update-profile': (new AuthController())->updateProfile($data); break;
        case '/api/delete-account': (new AuthController())->deleteAccount($data); break;
        case '/api/save-cycle': (new CycleController())->saveCycle($data); break;
        case '/api/get-calendar': (new CycleController())->getCalendar($_GET); break;
        case '/api/get-questions': (new GameController())->getQuestions(); break;
        case '/api/game/sync': (new GameController())->syncState($data); break;
        case '/api/dare/sync': (new DareController())->syncState($data); break;
        case '/api/save-event': (new EventController())->saveEvent($data); break;
        case '/api/get-events': (new EventController())->getEvents($_GET); break;
        case '/api/get-timeline': (new EventController())->getTimeline($_GET); break;
        case '/api/toggle-period': (new EventController())->togglePeriod($data); break;
        default: Response::error('Endpoint no encontrado: ' . $endpoint, 404); break;
    }
    exit;
}

// 2. Manejar rutas virtuales (SPA)
if ($requestUri === '/' || $requestUri === '/login' || $requestUri === '/register') {
    $page = ($requestUri === '/' ) ? 'index.html' : 'login.html';
    readfile(__DIR__ . '/public/' . $page);
    exit;
}

// 3. Manejar archivos estáticos
$file = __DIR__ . '/public' . $requestUri;
if (strpos($requestUri, '/public/') === 0) {
    $file = __DIR__ . $requestUri;
}

if (is_file($file)) {
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $mimeTypes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'ico' => 'image/x-icon',
        'html' => 'text/html',
        'svg' => 'image/svg+xml'
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    readfile($file);
    exit;
}

// 4. Fallback a index.html si no se encuentra nada
if (file_exists(__DIR__ . '/public/index.html')) {
    readfile(__DIR__ . '/public/index.html');
} else {
    http_response_code(404);
    echo "<h1>404 Not Found</h1>";
}
