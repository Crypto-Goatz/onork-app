/**
 * 0nCore Form Widget — Embed Script
 * Usage: <script src="https://0ncore.com/embed/form-widget.js" data-form-id="UUID" async></script>
 *
 * Fetches form config from 0nCore, renders the form, submits to /api/forms/submit
 */
(function() {
  'use strict';

  var ONCORE_URL = 'https://0ncore.com';
  var script = document.currentScript;
  if (!script) return;

  var formId = script.getAttribute('data-form-id');
  var theme = script.getAttribute('data-theme') || 'dark';
  if (!formId) { console.error('[0nCore] Missing data-form-id'); return; }

  // Fetch form config
  fetch(ONCORE_URL + '/api/forms/' + formId + '/embed')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.form) { console.error('[0nCore] Form not found'); return; }
      renderForm(data.form);
    })
    .catch(function(err) { console.error('[0nCore] Load error:', err); });

  function renderForm(form) {
    var container = document.createElement('div');
    container.id = 'oncore-form-' + formId;
    container.style.cssText = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:480px;margin:0 auto;';

    var isDark = theme === 'dark';
    var bg = isDark ? '#161b22' : '#ffffff';
    var text = isDark ? '#f0f4f8' : '#1a1a2e';
    var muted = isDark ? '#6b7280' : '#9ca3af';
    var border = isDark ? '#30363d' : '#e5e7eb';
    var primary = form.settings?.primaryColor || '#6EE05A';
    var radius = '8px';

    var html = '<div style="background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:24px;">';

    // Title
    if (form.name) {
      html += '<h3 style="margin:0 0 4px;font-size:18px;font-weight:700;color:' + text + ';">' + escapeHtml(form.name) + '</h3>';
    }
    if (form.settings?.description) {
      html += '<p style="margin:0 0 16px;font-size:13px;color:' + muted + ';">' + escapeHtml(form.settings.description) + '</p>';
    }

    html += '<form id="oncore-form-inner-' + formId + '" style="display:flex;flex-direction:column;gap:12px;">';

    // Render fields
    form.fields.forEach(function(field) {
      html += '<div>';
      html += '<label style="display:block;font-size:12px;font-weight:600;color:' + text + ';margin-bottom:4px;">' + escapeHtml(field.label) + (field.required ? ' *' : '') + '</label>';

      if (field.type === 'textarea') {
        html += '<textarea name="' + escapeHtml(field.name) + '" placeholder="' + escapeHtml(field.placeholder || '') + '"' + (field.required ? ' required' : '') + ' rows="3" style="width:100%;padding:8px 12px;border:1px solid ' + border + ';border-radius:' + radius + ';background:transparent;color:' + text + ';font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;"></textarea>';
      } else if (field.type === 'select' && field.options) {
        html += '<select name="' + escapeHtml(field.name) + '"' + (field.required ? ' required' : '') + ' style="width:100%;padding:8px 12px;border:1px solid ' + border + ';border-radius:' + radius + ';background:' + bg + ';color:' + text + ';font-size:14px;outline:none;box-sizing:border-box;">';
        html += '<option value="">' + escapeHtml(field.placeholder || 'Select...') + '</option>';
        field.options.forEach(function(opt) {
          html += '<option value="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</option>';
        });
        html += '</select>';
      } else {
        html += '<input type="' + (field.type || 'text') + '" name="' + escapeHtml(field.name) + '" placeholder="' + escapeHtml(field.placeholder || '') + '"' + (field.required ? ' required' : '') + ' style="width:100%;padding:8px 12px;border:1px solid ' + border + ';border-radius:' + radius + ';background:transparent;color:' + text + ';font-size:14px;outline:none;box-sizing:border-box;" />';
      }
      html += '</div>';
    });

    // Submit button
    var btnText = form.settings?.submitText || 'Submit';
    html += '<button type="submit" style="width:100%;padding:10px;border:none;border-radius:' + radius + ';background:' + primary + ';color:#0d1117;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px;">' + escapeHtml(btnText) + '</button>';

    html += '</form>';

    // Success message (hidden initially)
    html += '<div id="oncore-success-' + formId + '" style="display:none;text-align:center;padding:20px 0;">';
    html += '<div style="font-size:24px;margin-bottom:8px;">✓</div>';
    html += '<div style="font-size:16px;font-weight:600;color:' + text + ';">' + escapeHtml(form.settings?.successMessage || 'Thank you!') + '</div>';
    html += '<div style="font-size:12px;color:' + muted + ';margin-top:4px;">We\'ll be in touch soon.</div>';
    html += '</div>';

    // Branding
    if (form.settings?.showBranding !== false) {
      html += '<div style="text-align:center;margin-top:12px;"><a href="https://0ncore.com" target="_blank" rel="noopener" style="font-size:10px;color:' + muted + ';text-decoration:none;opacity:0.6;">Powered by 0nCore</a></div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Insert after script tag
    script.parentNode.insertBefore(container, script.nextSibling);

    // Handle submit
    var formEl = document.getElementById('oncore-form-inner-' + formId);
    formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = formEl.querySelector('button[type="submit"]');
      btn.textContent = 'Sending...';
      btn.disabled = true;

      var fields = {};
      var formData = new FormData(formEl);
      formData.forEach(function(value, key) { fields[key] = value; });

      fetch(ONCORE_URL + '/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: formId,
          fields: fields,
          meta: {
            page: window.location.href,
            referrer: document.referrer,
          },
        }),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          formEl.style.display = 'none';
          document.getElementById('oncore-success-' + formId).style.display = 'block';
        } else {
          btn.textContent = 'Error — Try Again';
          btn.disabled = false;
        }
      })
      .catch(function() {
        btn.textContent = 'Error — Try Again';
        btn.disabled = false;
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
