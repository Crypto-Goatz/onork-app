<?php
if (!defined('ABSPATH')) exit;

add_action('wp_footer', function() {
    if (!get_option('oncore_chat_enabled')) return;
    $token = get_option('oncore_token', '');
    if (!$token) return;
    ?>
    <div id="oncore-chat-widget" style="position:fixed;bottom:24px;right:24px;z-index:99999;">
        <button onclick="document.getElementById('oncore-chat-panel').style.display=document.getElementById('oncore-chat-panel').style.display==='none'?'flex':'none'" style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#6EE05A,#00d4ff);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(110,224,90,0.3);">
            <svg width="24" height="24" fill="none" stroke="#0d1117" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </button>
        <div id="oncore-chat-panel" style="display:none;flex-direction:column;position:absolute;bottom:64px;right:0;width:380px;height:500px;background:#0d1117;border:1px solid #30363d;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="padding:12px 16px;border-bottom:1px solid #30363d;display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#6EE05A;box-shadow:0 0 6px #6EE05A;"></div>
                <span style="color:#e6edf3;font-size:14px;font-weight:700;">Jaxx</span>
                <span style="color:#8b949e;font-size:11px;">0nAI Engine</span>
            </div>
            <div id="oncore-chat-messages" style="flex:1;overflow-y:auto;padding:16px;font-size:13px;color:#8b949e;">
                <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:10px 14px;margin-bottom:8px;">Tell me what you need. I can manage your CRM, write content, check analytics, and more.</div>
            </div>
            <div style="padding:12px;border-top:1px solid #30363d;display:flex;gap:8px;">
                <input id="oncore-chat-msg" type="text" placeholder="Ask anything..." style="flex:1;background:#161b22;border:1px solid #30363d;border-radius:8px;color:#e6edf3;padding:8px 12px;font-size:13px;outline:none;" onkeydown="if(event.key==='Enter')oncoreWidgetSend()"/>
                <button onclick="oncoreWidgetSend()" style="background:#6EE05A;color:#0d1117;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;font-size:13px;">Send</button>
            </div>
        </div>
    </div>
    <script>
    async function oncoreWidgetSend() {
        const input = document.getElementById('oncore-chat-msg');
        const messages = document.getElementById('oncore-chat-messages');
        const text = input.value.trim();
        if (!text) return;
        messages.innerHTML += '<div style="background:rgba(110,224,90,0.1);border:1px solid rgba(110,224,90,0.2);border-radius:12px;padding:10px 14px;margin-bottom:8px;color:#e6edf3;text-align:right;">'+text+'</div>';
        input.value = '';
        messages.innerHTML += '<div id="oncore-thinking" style="color:#8b949e;font-size:12px;padding:4px 0;">Thinking...</div>';
        messages.scrollTop = messages.scrollHeight;
        try {
            const res = await fetch('<?php echo esc_url(ONCORE_API_URL); ?>/api/ai/execute', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({command: text})
            });
            const data = await res.json();
            document.getElementById('oncore-thinking')?.remove();
            messages.innerHTML += '<div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:10px 14px;margin-bottom:8px;color:#e6edf3;">'+(data.output||data.message||'Done.')+'</div>';
        } catch(e) {
            document.getElementById('oncore-thinking')?.remove();
            messages.innerHTML += '<div style="color:#f85149;padding:4px 0;font-size:12px;">Error: '+e.message+'</div>';
        }
        messages.scrollTop = messages.scrollHeight;
    }
    </script>
    <?php
});
