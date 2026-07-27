<?php
// Included but endpoint registered in rest-api.php
function oncore_create_page($request) {
    $params = $request->get_json_params();
    $title = sanitize_text_field($params['title'] ?? '');
    $content = wp_kses_post($params['content'] ?? '');
    $slug = sanitize_title($params['slug'] ?? $title);
    $status = $params['status'] ?? 'publish';
    $template = $params['template'] ?? '';

    if (!$title) return new WP_Error('no_title', 'Title required', ['status' => 400]);

    $post_id = wp_insert_post([
        'post_title' => $title,
        'post_content' => $content,
        'post_name' => $slug,
        'post_status' => $status,
        'post_type' => 'page',
        'post_author' => 1,
        'page_template' => $template,
    ]);

    if (is_wp_error($post_id)) return $post_id;

    return ['success' => true, 'post_id' => $post_id, 'url' => get_permalink($post_id)];
}
