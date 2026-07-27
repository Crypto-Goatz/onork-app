<?php
if (!defined('ABSPATH')) exit;

function oncore_update_design($request) {
    $params = $request->get_json_params();
    $colors = $params['colors'] ?? null;
    $fonts = $params['fonts'] ?? null;

    if (!$colors && !$fonts) {
        return new WP_Error('no_data', 'No design data provided', ['status' => 400]);
    }

    // Update global styles via the WordPress API
    $global_styles = wp_get_global_styles();

    if ($colors) {
        // Update theme.json color palette dynamically
        // This writes to the user's global styles (database, not file)
        $custom_css = ':root {';
        foreach ($colors as $key => $value) {
            $custom_css .= " --wp--preset--color--{$key}: {$value};";
        }
        $custom_css .= ' }';

        update_option('oncore_custom_css', $custom_css);
    }

    return ['success' => true, 'updated' => array_keys($params)];
}

// Inject custom CSS from design sync
add_action('wp_head', function() {
    $css = get_option('oncore_custom_css', '');
    if ($css) echo "<style>{$css}</style>\n";
}, 999);
