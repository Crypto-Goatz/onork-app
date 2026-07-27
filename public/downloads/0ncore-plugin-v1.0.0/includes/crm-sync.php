<?php
if (!defined('ABSPATH')) exit;

// Sync Contact Form 7 submissions
add_action('wpcf7_submit', function($form, $result) {
    if (!get_option('oncore_crm_sync_enabled')) return;
    if ($result['status'] !== 'mail_sent') return;

    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    $data = $submission->get_posted_data();

    oncore_api('/api/ai/execute', 'POST', [
        'command' => 'Create a CRM contact: ' . json_encode([
            'name' => $data['your-name'] ?? '',
            'email' => $data['your-email'] ?? '',
            'phone' => $data['your-phone'] ?? '',
            'message' => $data['your-message'] ?? '',
            'source' => 'wordpress-form',
        ])
    ]);
}, 10, 2);

// Sync WPForms submissions
add_action('wpforms_process_complete', function($fields, $entry, $form_data, $entry_id) {
    if (!get_option('oncore_crm_sync_enabled')) return;

    $contact_data = [];
    foreach ($fields as $field) {
        $contact_data[strtolower($field['name'] ?? $field['id'])] = $field['value'] ?? '';
    }

    oncore_api('/api/ai/execute', 'POST', [
        'command' => 'Create a CRM contact from form submission: ' . json_encode($contact_data)
    ]);
}, 10, 4);

// Sync native WordPress registration
add_action('user_register', function($user_id) {
    if (!get_option('oncore_crm_sync_enabled')) return;
    $user = get_userdata($user_id);
    if (!$user) return;

    oncore_api('/api/ai/execute', 'POST', [
        'command' => "Create a CRM contact: name={$user->display_name}, email={$user->user_email}, source=wordpress-registration"
    ]);
});
