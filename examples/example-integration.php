<?php
/**
 * Example integration only.
 *
 * Do not drop this file into production as-is unless you adapt variable names
 * to your existing VIP publishing function.
 */

require_once plugin_dir_path(__FILE__) . '../includes/zapier-mcp-response-fix.php';

function vip_publish_to_facebook_page_example($message) {
    try {
        /*
         * Replace this placeholder with your existing Zapier MCP call.
         * Example variable name:
         * $zapier_response = $this->zapier_mcp->execute_action(...);
         */
        $zapier_response = vip_existing_zapier_mcp_call($message);

        /*
         * NEW FIX:
         * Treat Zapier MCP responses with results.id as a successful publish.
         */
        $normalized = VIP_Zapier_MCP_Response_Fix::normalize($zapier_response);

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

        /*
         * Keep your existing non-success handling below this point.
         */
        return array(
            'success' => false,
            'message' => 'Facebook publish did not return a confirmation id.',
            'raw'     => $zapier_response,
        );

    } catch (Exception $e) {
        /*
         * NEW FIX:
         * Some VIP/Zapier wrappers may throw an exception even though the nested
         * Zapier MCP response contains a successful Facebook post id.
         */
        $normalized = VIP_Zapier_MCP_Response_Fix::normalize($e->getMessage());

        if (!empty($normalized['success'])) {
            return array(
                'success'      => true,
                'message'      => $normalized['message'],
                'post_id'      => $normalized['post_id'],
                'post_url'     => $normalized['post_url'],
                'execution_id' => $normalized['execution_id'],
                'feedback_url' => $normalized['feedback_url'],
            );
        }

        return array(
            'success' => false,
            'message' => $e->getMessage(),
        );
    }
}
