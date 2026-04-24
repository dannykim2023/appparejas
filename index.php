<?php
/**
 * SincroParejas - Router Principal
 * Este archivo centraliza todas las peticiones y sirve como punto de entrada.
 */

// Iniciar sesión para autenticación
session_start();

// Verificar autenticación y forzar estado por cookie globalmente
if (empty($_COOKIE['user_id']) && isset($_SESSION['user_id'])) {
    unset($_SESSION['user_id']);
    session_destroy();
}
$isLoggedIn = !empty($_COOKIE['user_id']);

// 1. Configuración de cabeceras
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Obtener la ruta limpia
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 3. Manejar ARCHIVOS ESTÁTICOS primero
$publicDir = __DIR__ . DIRECTORY_SEPARATOR . 'public';

// Si la URL empieza con /assets o /public, intentamos servir el archivo físico
if (strpos($requestUri, '/assets/') === 0 || strpos($requestUri, '/public/') === 0) {
    // Si viene como /assets/..., buscamos en public/assets/...
    // Si viene como /public/assets/..., buscamos en public/assets/...
    $cleanUri = str_replace('/public/', '/', $requestUri);
    $filePath = $publicDir . str_replace('/', DIRECTORY_SEPARATOR, $cleanUri);

    if (is_file($filePath)) {
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'png'  => 'image/png',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'ico'  => 'image/x-icon',
            'svg'  => 'image/svg+xml',
            'webp' => 'image/webp',
            'json' => 'application/json'
        ];
        
        if (isset($mimeTypes[$ext])) {
            header('Content-Type: ' . $mimeTypes[$ext]);
        }
        
        // Cache headers para producción
        header('Cache-Control: public, max-age=3600');
        
        readfile($filePath);
        exit;
    }
}


// 4. Carga de dependencias y controladores
require_once 'utils/Response.php';
require_once 'controllers/AuthController.php';
require_once 'controllers/CycleController.php';
require_once 'controllers/GameController.php';
require_once 'controllers/EventController.php';
require_once 'controllers/DareController.php';
require_once 'controllers/HomeController.php';

// 5. Enrutamiento de API
if (strpos($requestUri, '/api/') !== false) {
    $data = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $json = file_get_contents('php://input');
        if (!empty($json)) {
            $data = json_decode($json, true);
        }
    }

    $endpoint = substr($requestUri, strpos($requestUri, '/api/'));

    // Endpoints públicos
    $publicEndpoints = ['/api/login', '/api/register', '/api/logout', '/api/check-email'];
    
    if (!in_array($endpoint, $publicEndpoints) && !$isLoggedIn) {
        Response::error('No autorizado. Por favor inicia sesión.', 401);
    }

    // Si está logueado, forzar el user_id de la sesión/cookie para seguridad en endpoints sensibles
    $userIdFromSession = $_SESSION['user_id'] ?? $_COOKIE['user_id'] ?? null;
    if ($userIdFromSession) {
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $_GET['user_id'] = $userIdFromSession;
        } else {
            $data['user_id'] = $userIdFromSession;
        }
    }

    switch ($endpoint) {
        case '/api/check-email': (new AuthController())->checkEmail($data); break;
        case '/api/register': (new AuthController())->register($data); break;
        case '/api/login': (new AuthController())->login($data); break;
        case '/api/logout': 
            session_destroy(); 
            setcookie('user_id', '', time() - 3600, '/');
            setcookie('user_name', '', time() - 3600, '/');
            Response::success(['status' => 'logged_out']);
            break;
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

// 6. Enrutamiento de Vistas (HomeController)
$home = new HomeController();

switch ($requestUri) {
    case '/':
    case '/index.html':
        if (!$isLoggedIn) {
            $home->login();
        } else {
            $home->index();
        }
        break;
    case '/login':
    case '/register':
    case '/login.html':
        if ($isLoggedIn && ($requestUri === '/login' || $requestUri === '/register' || $requestUri === '/login.html')) {
            header('Location: /');
            exit;
        }
        $home->login();
        break;
    default:
        if (!$isLoggedIn) {
            $home->login();
        } else {
            $home->index();
        }
        break;
}
