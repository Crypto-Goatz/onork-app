<?php
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function() {
    add_menu_page('0nCore', '0nCore', 'manage_options', 'oncore', 'oncore_settings_page', 'dashicons-rest-api', 30);
    add_submenu_page('oncore', 'AI Chat', 'AI Chat', 'manage_options', 'oncore-chat', 'oncore_chat_page');
    add_submenu_page('oncore', 'Blog Engine', 'Blog Engine', 'manage_options', 'oncore-blog', 'oncore_blog_page');
});

add_action('admin_init', function() {
    register_setting('oncore_settings', 'oncore_token');
    register_setting('oncore_settings', 'oncore_chat_enabled');
    register_setting('oncore_settings', 'oncore_analytics_enabled');
    register_setting('oncore_settings', 'oncore_crm_sync_enabled');
});

function oncore_settings_page() {
    $token = get_option('oncore_token', '');
    $profile = get_option('oncore_profile', []);
    $connected = get_option('oncore_connected', false);

    // Verify token on save
    if (isset($_POST['oncore_token']) && check_admin_referer('oncore_settings-options')) {
        $new_token = sanitize_text_field($_POST['oncore_token']);
        if ($new_token && str_starts_with($new_token, '0n_')) {
            $verified = oncore_verify_token($new_token);
            if ($verified) {
                update_option('oncore_token', $new_token);
                update_option('oncore_profile', $verified);
                update_option('oncore_connected', true);
                $token = $new_token;
                $profile = $verified;
                $connected = true;
            }
        }
    }

    ?>
    <div class="wrap">
        <h1 style="display:flex;align-items:center;gap:8px;">
            <span style="color:#6EE05A;font-weight:800;">0n</span>Core Settings
        </h1>

        <?php if ($connected && $profile): ?>
        <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin:20px 0;color:#e6edf3;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#6EE05A;box-shadow:0 0 8px #6EE05A;"></div>
                <strong style="color:#6EE05A;">Connected</strong>
            </div>
            <p style="margin:4px 0;color:#8b949e;">Email: <strong style="color:#e6edf3;"><?php echo esc_html($profile['email'] ?? ''); ?></strong></p>
            <p style="margin:4px 0;color:#8b949e;">Business: <strong style="color:#e6edf3;"><?php echo esc_html($profile['business_name'] ?? ''); ?></strong></p>
            <p style="margin:4px 0;color:#8b949e;">Tier: <strong style="color:#e6edf3;"><?php echo esc_html($profile['plan'] ?? 'free'); ?></strong></p>
            <p style="margin:4px 0;color:#8b949e;">Tools: <strong style="color:#6EE05A;">1,554</strong> across <strong style="color:#00d4ff;">96 services</strong></p>
        </div>
        <?php endif; ?>

        <form method="post" action="options.php">
            <?php settings_fields('oncore_settings'); ?>
            <table class="form-table">
                <tr>
                    <th>0n Token</th>
                    <td>
                        <input type="text" name="oncore_token" value="<?php echo esc_attr($token); ?>" class="regular-text" placeholder="0n_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                        <p class="description">Find your token at <a href="https://0ncore.com/dashboard/downloads" target="_blank">0ncore.com/dashboard/downloads</a></p>
                    </td>
                </tr>
                <tr>
                    <th>AI Chat Widget</th>
                    <td><label><input type="checkbox" name="oncore_chat_enabled" value="1" <?php checked(get_option('oncore_chat_enabled'), 1); ?> /> Show AI chat widget on all pages</label></td>
                </tr>
                <tr>
                    <th>Analytics</th>
                    <td><label><input type="checkbox" name="oncore_analytics_enabled" value="1" <?php checked(get_option('oncore_analytics_enabled'), 1); ?> /> Enable visitor tracking</label></td>
                </tr>
                <tr>
                    <th>CRM Sync</th>
                    <td><label><input type="checkbox" name="oncore_crm_sync_enabled" value="1" <?php checked(get_option('oncore_crm_sync_enabled'), 1); ?> /> Sync form submissions to CRM contacts</label></td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
    </div>
    <?php
}

function oncore_chat_page() {
    ?>
    <div class="wrap">
        <h1>0nCore AI Chat</h1>
        <div style="background:#0d1117;border-radius:12px;padding:24px;min-height:500px;color:#e6edf3;">
            <div id="oncore-admin-chat" style="width:100%;height:500px;">
                <p style="color:#8b949e;">Chat with Jaxx — describe what you want and the AI executes it.</p>
                <textarea id="oncore-chat-input" style="width:100%;height:80px;background:#161b22;border:1px solid #30363d;border-radius:8px;color:#e6edf3;padding:12px;font-size:14px;resize:none;" placeholder="Write a blog post about AI automation..."></textarea>
                <button onclick="oncoreSendChat()" style="margin-top:8px;background:#6EE05A;color:#0d1117;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;">Run It</button>
                <div id="oncore-chat-result" style="margin-top:16px;padding:16px;background:#161b22;border:1px solid #30363d;border-radius:8px;min-height:100px;white-space:pre-wrap;font-size:13px;color:#8b949e;"></div>
            </div>
        </div>
        <script>
        async function oncoreSendChat() {
            const input = document.getElementById('oncore-chat-input');
            const result = document.getElementById('oncore-chat-result');
            result.textContent = 'Processing...';
            try {
                const res = await fetch('<?php echo esc_url(ONCORE_API_URL); ?>/api/ai/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: input.value })
                });
                const data = await res.json();
                result.textContent = data.output || data.message || JSON.stringify(data, null, 2);
            } catch (err) {
                result.textContent = 'Error: ' + err.message;
            }
        }
        </script>
    </div>
    <?php
}

function oncore_blog_page() {
    ?>
    <div class="wrap">
        <h1>0nCore Blog Engine</h1>
        <p>Generate AI-powered blog posts and publish directly to WordPress.</p>
        <div style="background:#0d1117;border-radius:12px;padding:24px;color:#e6edf3;">
            <label style="display:block;margin-bottom:8px;color:#8b949e;font-size:13px;">Topic</label>
            <input type="text" id="oncore-blog-topic" style="width:100%;background:#161b22;border:1px solid #30363d;border-radius:8px;color:#e6edf3;padding:12px;font-size:14px;" placeholder="AI automation for small businesses" />
            <button onclick="oncoreGenerateBlog()" style="margin-top:12px;background:#6EE05A;color:#0d1117;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;">Generate Blog Post</button>
            <div id="oncore-blog-result" style="margin-top:16px;padding:16px;background:#161b22;border:1px solid #30363d;border-radius:8px;min-height:100px;white-space:pre-wrap;font-size:13px;color:#8b949e;"></div>
        </div>
        <script>
        async function oncoreGenerateBlog() {
            const topic = document.getElementById('oncore-blog-topic').value;
            const result = document.getElementById('oncore-blog-result');
            result.textContent = 'Generating...';
            try {
                const res = await fetch(ajaxurl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=oncore_generate_blog&topic=' + encodeURIComponent(topic) + '&_wpnonce=<?php echo wp_create_nonce("oncore_blog"); ?>'
                });
                const data = await res.json();
                if (data.success) {
                    result.innerHTML = '<strong style="color:#6EE05A;">Published!</strong><br><br>Title: ' + data.data.title + '<br>URL: <a href="' + data.data.url + '" target="_blank" style="color:#00d4ff;">' + data.data.url + '</a>';
                } else {
                    result.textContent = 'Error: ' + (data.data || 'Generation failed');
                }
            } catch (err) {
                result.textContent = 'Error: ' + err.message;
            }
        }
        </script>
    </div>
    <?php
}
