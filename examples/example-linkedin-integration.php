<?php
/**
 * Example LinkedIn integration only.
 *
 * This shows the intended pattern. Adapt the function names and MCP caller
 * to your actual VIP plugin.
 */

require_once plugin_dir_path(__FILE__) . '../includes/zapier-mcp-action-router-fix.php';

function vip_publish_to_linkedin_example($message) {
    /*
     * Store this option in your VIP settings once you know the exact LinkedIn action key.
     *
     * IMPORTANT:
     * This must NOT be "execute_zapier_write_action".
     */
    $linkedin_action_key = get_option('vip_zapier_linkedin_action_key');

    $payload = VIP_Zapier_MCP_Action_Router_Fix::build_publish_payload(
        'linkedin',
        $message,
        array(),
        array(
            'action' => $linkedin_action_key,
        )
    );

    if (empty($payload['success'])) {
        return array(
            'success' => false,
            'message' => $payload['error'] ?? 'Invalid LinkedIn Zapier MCP action configuration.',
            'payload' => $payload,
        );
    }

    /*
     * Replace this placeholder with your VIP Zapier MCP client call.
     *
     * The important part:
     * - The executor is write.
     * - The app is LinkedIn.
     * - The action is the real LinkedIn action key.
     */
    $zapier_response = vip_existing_zapier_mcp_execute_write_action(
        $payload['app'],
        $payload['action'],
        $payload['instructions'],
        $payload['params'],
        $payload['output']
    );

    return array(
        'success' => true,
        'message' => 'LinkedIn publish request submitted.',
        'raw'     => $zapier_response,
    );
}
