<?php
/**
 * Plugin Name: 0nCore
 * Plugin URI: https://0ncore.com
 * Description: AI Command Center for WordPress. Connect your 0n_ token — blog engine, CRM sync, analytics, AI chat, and 1,554 tools.
 * Version: 1.0.0
 * Author: RocketOpp LLC
 * Author URI: https://rocketopp.com
 * License: Proprietary
 * Text Domain: oncore
 * Requires at least: 6.4
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) exit;

define('ONCORE_VERSION', '1.0.0');
define('ONCORE_API_URL', 'https://0ncore.com');
define('ONCORE_SUPABASE_URL', 'https://pwujhhmlrtxjmjzyttwn.supabase.co');
define('ONCORE_SUPABASE_ANON', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3dWpoaG1scnR4am1qenl0dHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MjI0NTcsImV4cCI6MjA4NTk5ODQ1N30.VA_AqMDtjfoQUIOsYR6CdZ5O4Akyggg6PgLw1UOnr3g');
define('ONCORE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ONCORE_PLUGIN_URL', plugin_dir_url(__FILE__));

// Load includes
require_once ONCORE_PLUGIN_DIR . 'includes/settings.php';
require_once ONCORE_PLUGIN_DIR . 'includes/rest-api.php';
require_once ONCORE_PLUGIN_DIR . 'includes/design-sync.php';
require_once ONCORE_PLUGIN_DIR . 'includes/ai-chat.php';
require_once ONCORE_PLUGIN_DIR . 'includes/blog-engine.php';
require_once ONCORE_PLUGIN_DIR . 'includes/crm-sync.php';
require_once ONCORE_PLUGIN_DIR . 'includes/analytics.php';

// Token verification
function oncore_verify_token($token) {
    if (!$token || !str_starts_with($token, '0n_')) return null;

    $response = wp_remote_post(ONCORE_API_URL . '/api/auth/verify-token', [
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode(['token' => $token]),
        'timeout' => 10,
    ]);

    if (is_wp_error($response)) return null;
    $body = json_decode(wp_remote_retrieve_body($response), true);
    return $body['profile'] ?? null;
}

// API call helper
function oncore_api($path, $method = 'GET', $body = null) {
    $token = get_option('oncore_token', '');
    $args = [
        'method' => $method,
        'headers' => [
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $token,
        ],
        'timeout' => 15,
    ];
    if ($body) $args['body'] = json_encode($body);

    $response = wp_remote_request(ONCORE_API_URL . $path, $args);
    if (is_wp_error($response)) return ['error' => $response->get_error_message()];
    return json_decode(wp_remote_retrieve_body($response), true);
}

// Activation hook
register_activation_hook(__FILE__, function() {
    add_option('oncore_token', '');
    add_option('oncore_profile', []);
    add_option('oncore_connected', false);
    add_option('oncore_chat_enabled', true);
    add_option('oncore_analytics_enabled', true);
    add_option('oncore_crm_sync_enabled', true);
});
