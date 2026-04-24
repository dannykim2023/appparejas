<?php
$requestUri = '/assets/js/app.js';
$file = __DIR__ . '/public' . $requestUri;
echo "Testing path: " . $file . "\n";
echo "Exists: " . (file_exists($file) ? 'YES' : 'NO') . "\n";
echo "Is file: " . (is_file($file) ? 'YES' : 'NO') . "\n";

$dir = __DIR__ . '/public/assets/js';
echo "Listing $dir:\n";
if (is_dir($dir)) {
    print_r(scandir($dir));
} else {
    echo "Directory not found!\n";
}
