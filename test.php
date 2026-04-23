<?php
$_GET['user_id'] = 3;
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/models/Cycle.php';
require_once __DIR__ . '/models/Event.php';
require_once __DIR__ . '/controllers/CycleController.php';

(new CycleController())->getCalendar();
