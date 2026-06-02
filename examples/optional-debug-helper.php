<?php
/**
 * Optional admin/debug helper.
 *
 * This file is an example only. It shows what to log when LinkedIn publishing fails.
 */

function vip_debug_linkedin_zapier_action_config($config) {
    if (!is_array($config)) {
        error_log('VIP LinkedIn Zapier config is not an array.');
        return;
    }

    $action = isset($config['action']) ? $config['action'] : '';

    if ('execute_zapier_write_action' === $action || 'execute_zapier_read_action' === $action) {
        error_log('VIP LinkedIn Zapier action config error: executor name was used as action key. Set the actual LinkedIn create-post action key.');
    }

    error_log('VIP LinkedIn Zapier action config: ' . wp_json_encode($config));
}
