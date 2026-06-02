<?php
/**
 * VIP Zapier MCP LinkedIn Action Router Fix
 *
 * Problem fixed:
 * VIP may incorrectly send "execute_zapier_write_action" as the Zapier action name.
 * That causes this error:
 *
 * Action 'execute_zapier_write_action' not found
 *
 * Why:
 * "execute_zapier_write_action" is an MCP executor/tool name in some client contexts.
 * It is NOT the actual LinkedIn Zapier app action key.
 *
 * Correct pattern:
 * - Executor/tool: write action executor
 * - App: LinkedIn
 * - Action: actual LinkedIn action key, such as a configured create-post/share action
 *
 * This helper blocks executor names from being treated as app action keys and centralizes
 * social-channel action routing.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('VIP_Zapier_MCP_Action_Router_Fix')) {
    final class VIP_Zapier_MCP_Action_Router_Fix {

        /**
         * Executor names should never be sent as Zapier app action keys.
         */
        private static $reserved_executor_names = array(
            'execute_zapier_write_action',
            'execute_zapier_read_action',
        );

        /**
         * Default social publish action configuration.
         *
         * IMPORTANT:
         * Replace the LinkedIn action key below with the exact action key from your Zapier MCP
         * enabled actions list.
         *
         * Examples may look like:
         * - linkedin_create_share_update
         * - linkedin_create_company_update
         * - linkedin_create_post
         *
         * The exact key depends on what Zapier exposes for your connected LinkedIn account.
         */
        private static $channels = array(
            'facebook' => array(
                'app'      => 'Facebook Pages',
                'executor' => 'write',
                'action'   => 'facebook_pages_create_page_post',
            ),
            'linkedin' => array(
                'app'      => 'LinkedIn',
                'executor' => 'write',
                'action'   => 'REPLACE_WITH_EXACT_LINKEDIN_ACTION_KEY',
            ),
        );

        /**
         * Get normalized action config for a social channel.
         *
         * @param string $channel Channel slug, such as facebook or linkedin.
         * @param array  $override Optional override config.
         * @return array
         */
        public static function get_channel_action_config($channel, array $override = array()) {
            $channel = sanitize_key($channel);

            $config = self::$channels[$channel] ?? array();

            if (!empty($override)) {
                $config = array_merge($config, $override);
            }

            $config = self::normalize_config($config);

            return $config;
        }

        /**
         * Validate and normalize a Zapier action config.
         *
         * @param array $config
         * @return array
         */
        public static function normalize_config(array $config) {
            $app      = isset($config['app']) ? sanitize_text_field((string) $config['app']) : '';
            $executor = isset($config['executor']) ? sanitize_key((string) $config['executor']) : 'write';
            $action   = isset($config['action']) ? sanitize_text_field((string) $config['action']) : '';

            if ('read' !== $executor) {
                $executor = 'write';
            }

            if (in_array($action, self::$reserved_executor_names, true)) {
                return array(
                    'success' => false,
                    'error'   => sprintf(
                        'Invalid Zapier action key "%s". This is an executor name, not an app action. Use the actual LinkedIn action key from enabled Zapier actions.',
                        $action
                    ),
                    'app'      => $app,
                    'executor' => $executor,
                    'action'   => $action,
                );
            }

            if (empty($app)) {
                return array(
                    'success' => false,
                    'error'   => 'Missing Zapier app name.',
                    'app'      => $app,
                    'executor' => $executor,
                    'action'   => $action,
                );
            }

            if (empty($action) || 'REPLACE_WITH_EXACT_LINKEDIN_ACTION_KEY' === $action) {
                return array(
                    'success' => false,
                    'error'   => 'Missing actual Zapier app action key. List enabled Zapier actions and save the real LinkedIn create-post action key.',
                    'app'      => $app,
                    'executor' => $executor,
                    'action'   => $action,
                );
            }

            return array(
                'success'  => true,
                'app'      => $app,
                'executor' => $executor,
                'action'   => $action,
            );
        }

        /**
         * Build the payload VIP should send to its Zapier MCP execution layer.
         *
         * @param string $channel facebook|linkedin
         * @param string $message Social post body.
         * @param array  $params Structured params for the Zapier app action.
         * @param array  $override Optional override config, commonly pulled from WP options.
         * @return array
         */
        public static function build_publish_payload($channel, $message, array $params = array(), array $override = array()) {
            $config = self::get_channel_action_config($channel, $override);

            if (empty($config['success'])) {
                return array(
                    'success' => false,
                    'error'   => $config['error'] ?? 'Invalid Zapier MCP action config.',
                    'config'  => $config,
                );
            }

            $params['message'] = (string) $message;

            return array(
                'success'      => true,
                'executor'     => $config['executor'], // write/read
                'app'          => $config['app'],
                'action'       => $config['action'],   // actual app action key
                'instructions' => self::build_instructions($channel),
                'params'       => $params,
                'output'       => 'Return the created post id, url if available, execution id, and confirmation status.',
            );
        }

        /**
         * Build consistent instructions for social publishing.
         *
         * @param string $channel
         * @return string
         */
        private static function build_instructions($channel) {
            $channel = sanitize_key($channel);

            if ('linkedin' === $channel) {
                return 'Create a LinkedIn post using the structured params provided with this tool call. Use params.message as the LinkedIn post body. Do not use execute_zapier_write_action as the LinkedIn app action key.';
            }

            if ('facebook' === $channel) {
                return 'Create a Facebook Page post using the structured params provided with this tool call. Use params.message as the Facebook post body.';
            }

            return 'Create the social post using the structured params provided with this tool call.';
        }
    }
}
