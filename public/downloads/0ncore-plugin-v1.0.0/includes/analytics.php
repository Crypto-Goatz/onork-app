<?php
if (!defined('ABSPATH')) exit;

add_action('wp_head', function() {
    if (!get_option('oncore_analytics_enabled')) return;
    $token = get_option('oncore_token', '');
    if (!$token) return;
    ?>
    <script>
    (function() {
        var t = '<?php echo esc_js($token); ?>';
        var p = window.location.pathname;
        var r = document.referrer;
        fetch('<?php echo esc_url(ONCORE_API_URL); ?>/api/analytics/events', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                site_id: t,
                visitor_id: localStorage.getItem('oncore_vid') || (function(){var v='v_'+Math.random().toString(36).slice(2);localStorage.setItem('oncore_vid',v);return v;})(),
                session_id: sessionStorage.getItem('oncore_sid') || (function(){var s='s_'+Math.random().toString(36).slice(2);sessionStorage.setItem('oncore_sid',s);return s;})(),
                event_type: 'page_view',
                page_path: p,
                page_title: document.title,
                referrer: r,
                source: new URLSearchParams(window.location.search).get('utm_source') || '',
                medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
                campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
                device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : /tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop'
            })
        }).catch(function(){});
    })();
    </script>
    <?php
}, 1);
