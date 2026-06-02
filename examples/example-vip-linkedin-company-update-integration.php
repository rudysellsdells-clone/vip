<?php
/**
 * Example VIP LinkedIn Company/Page publishing integration.
 *
 * Adapt function names to your VIP plugin.
 */

require_once plugin_dir_path(__FILE__) . '../includes/zapier-mcp-linkedin-company-update-fix.php';

function vip_publish_to_linkedin_page_example($message) {
    /*
     * Ensure the correct LinkedIn Page action key is saved.
     * You can move this to plugin activation or admin settings save instead.
     */
    update_option('vip_zapier_linkedin_action_key', 'create_company_update');

    $payload = VIP_Zapier_MCP_LinkedIn_Company_Update_Fix::build_linkedin_page_publish_payload(
        $message,
        array()
    );

    if (empty($payload['success'])) {
        return array(
            'success' => false,
            'message' => $payload['message'],
        );
    }

    /*
     * Replace this placeholder with your existing VIP Zapier MCP client.
     *
     * Correct call shape:
     *
     * app: LinkedIn
     * action: create_company_update
     * params: structured fields, including message
     */
    $zapier_response = vip_existing_zapier_mcp_execute_write_action(
        $payload['app'],
        $payload['action'],
        $payload['instructions'],
        $payload['params'],
        $payload['output']
    );

    $normalized = VIP_Zapier_MCP_LinkedIn_Company_Update_Fix::normalize_publish_response($zapier_response);

    if (!empty($normalized['success'])) {
        return array(
            'success'      => true,
            'message'      => $normalized['message'],
            'post_id'      => $normalized['post_id'],
            'post_url'     => $normalized['post_url'],
            'execution_id' => $normalized['execution_id'],
            'feedback_url' => $normalized['feedback_url'],
            'raw'          => $zapier_response,
        );
    }

    return array(
        'success' => false,
        'message' => 'LinkedIn publish was submitted but did not return a confirmation id.',
        'raw'     => $zapier_response,
    );
}
