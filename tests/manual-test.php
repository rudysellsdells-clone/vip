<?php
/**
 * Quick local/manual test.
 * This is optional and should not be loaded by WordPress in production.
 */

require_once __DIR__ . '/../includes/zapier-mcp-response-fix.php';

$sample = array(
    'raw' => array(
        'result' => array(
            'content' => array(
                array(
                    'type' => 'text',
                    'text' => '{"results":{"id":"30489698262_1777565287102827","url":null,"status":null,"message":null},"feedbackUrl":"https://mcp.zapier.com/example","execution":{"id":"ca2e40c8-9fce-4c08-80c3-f8a4cfed65fb"}}'
                )
            )
        )
    )
);

$result = VIP_Zapier_MCP_Response_Fix::normalize($sample);

print_r($result);
