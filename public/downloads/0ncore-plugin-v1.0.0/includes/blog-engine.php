<?php
if (!defined('ABSPATH')) exit;

add_action('wp_ajax_oncore_generate_blog', function() {
    check_ajax_referer('oncore_blog');

    $topic = sanitize_text_field($_POST['topic'] ?? '');
    if (!$topic) wp_send_json_error('Topic required');

    $result = oncore_api('/api/ai/execute', 'POST', [
        'command' => "Write a complete blog post about: {$topic}. Return JSON with title and content (HTML)."
    ]);

    if (isset($result['error'])) wp_send_json_error($result['error']);

    $output = $result['output'] ?? $result['message'] ?? '';

    // Try to parse as JSON
    $parsed = json_decode($output, true);
    $title = $parsed['title'] ?? "Blog: {$topic}";
    $content = $parsed['content'] ?? $output;

    $post_id = wp_insert_post([
        'post_title' => $title,
        'post_content' => wp_kses_post($content),
        'post_status' => 'publish',
        'post_type' => 'post',
        'post_author' => get_current_user_id(),
    ]);

    if (is_wp_error($post_id)) wp_send_json_error($post_id->get_error_message());

    wp_send_json_success([
        'post_id' => $post_id,
        'title' => $title,
        'url' => get_permalink($post_id),
    ]);
});
