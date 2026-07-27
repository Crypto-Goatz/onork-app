<?php
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function() {
    // Design sync endpoint — receives theme.json updates from 0nCore
    register_rest_route('oncore/v1', '/design', [
        'methods' => 'POST',
        'callback' => 'oncore_update_design',
        'permission_callback' => 'oncore_verify_api_request',
    ]);

    // Page generator — creates pages from 0nCore
    register_rest_route('oncore/v1', '/pages', [
        'methods' => 'POST',
        'callback' => 'oncore_create_page',
        'permission_callback' => 'oncore_verify_api_request',
    ]);

    // Health check
    register_rest_route('oncore/v1', '/health', [
        'methods' => 'GET',
        'callback' => function() {
            return ['status' => 'ok', 'version' => ONCORE_VERSION, 'connected' => (bool)get_option('oncore_connected')];
        },
        'permission_callback' => '__return_true',
    ]);
});

function oncore_verify_api_request($request) {
    $token = $request->get_header('X-Oncore-Token');
    if (!$token) $token = $request->get_param('token');
    $stored = get_option('oncore_token', '');
    return $token && $token === $stored;
}
