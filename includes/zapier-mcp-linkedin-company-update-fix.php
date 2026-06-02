<?php
/**
 * VIP Zapier MCP LinkedIn Company Update Fix
 *
 * Fix:
 * LinkedIn Page publishing should use the actual Zapier MCP LinkedIn action key:
 *
 * create_company_update
 *
 * Do NOT use:
 *
 * execute_zapier_write_action
 *
 * as the LinkedIn app action. That is an executor/tool layer name, not a LinkedIn action key.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('VIP_Zapier_MCP_LinkedIn_Company_Update_Fix')) {
    final class VIP_Zapier_MCP_LinkedIn_Company_Update_Fix {

        const LINKEDIN_PAGE_ACTION_KEY = 'create_company_update';
        const LINKEDIN_GENERAL_SHARE_ACTION_KEY = 'share';

        /**
         * Reserved MCP executor names that should never be used as app action keys.
         *
         * @var array
         */
        private static $reserved_executor_names = array(
            'execute_zapier_write_action',
            'execute_zapier_read_action',
        );

        /**
         * Return the action key VIP should use for LinkedIn Page publishing.
         *
         * @return string
         */
        public static function get_linkedin_page_action_key() {
            $saved = get_option('vip_zapier_linkedin_action_key', '');

            if (!empty($saved) && !in_array($saved, self::$reserved_executor_names, true)) {
                return sanitize_text_field($saved);
            }

            return self::LINKEDIN_PAGE_ACTION_KEY;
        }

        /**
         * Validate a LinkedIn action key before sending it to Zapier MCP.
         *
         * @param string $action_key
         * @return array
         */
        public static function validate_linkedin_action_key($action_key) {
            $action_key = sanitize_text_field((string) $action_key);

            if (empty($action_key)) {
                return array(
                    'success' => false,
                    'message' => 'Missing LinkedIn Zapier MCP action key. Use create_company_update for LinkedIn Page publishing.',
                );
            }

            if (in_array($action_key, self::$reserved_executor_names, true)) {
                return array(
                    'success' => false,
                    'message' => 'Invalid LinkedIn Zapier MCP action key. execute_zapier_write_action is the executor name, not the LinkedIn action. Use create_company_update for LinkedIn Page publishing.',
                );
            }

            return array(
                'success' => true,
                'action'  => $action_key,
            );
        }

        /**
         * Build a normalized LinkedIn Page publish payload for the VIP Zapier MCP layer.
         *
         * Your MCP execution layer should use:
         *
         * Executor: write
         * App: LinkedIn
         * Action: create_company_update
         *
         * @param string $message LinkedIn post body.
         * @param array  $params Additional LinkedIn/Zapier params, such as company/page id if required by your configured action.
         * @return array
         */
        public static function build_linkedin_page_publish_payload($message, array $params = array()) {
            $action_key = self::get_linkedin_page_action_key();
            $validation = self::validate_linkedin_action_key($action_key);

            if (empty($validation['success'])) {
                return array(
                    'success' => false,
                    'message' => $validation['message'],
                );
            }

            $params['message'] = (string) $message;

            return array(
                'success'      => true,
                'executor'     => 'write',
                'app'          => 'LinkedIn',
                'action'       => $validation['action'],
                'params'       => $params,
                'instructions' => 'Create a LinkedIn Company/Page update using the structured params provided with this tool call. Use params.message as the LinkedIn post body. Do not use execute_zapier_write_action as the LinkedIn action key.',
                'output'       => 'Return the created LinkedIn update id, url if available, execution id, and confirmation status.',
            );
        }

        /**
         * Normalize a successful LinkedIn Zapier MCP response.
         *
         * This mirrors the Facebook success-parser idea:
         * If Zapier returns results.id, treat it as success even when url/status/message are null.
         *
         * @param mixed $response
         * @return array
         */
        public static function normalize_publish_response($response) {
            if (is_object($response)) {
                $response = json_decode(wp_json_encode($response), true);
            }

            if (is_string($response)) {
                $decoded = json_decode($response, true);
                if (is_array($decoded)) {
                    $response = $decoded;
                }
            }

            $hit = self::find_results_id($response);

            if (!empty($hit['id'])) {
                return array(
                    'success'      => true,
                    'message'      => 'Published successfully to LinkedIn.',
                    'post_id'      => sanitize_text_field((string) $hit['id']),
                    'post_url'     => !empty($hit['url']) ? esc_url_raw((string) $hit['url']) : null,
                    'execution_id' => !empty($hit['execution_id']) ? sanitize_text_field((string) $hit['execution_id']) : null,
                    'feedback_url' => !empty($hit['feedback_url']) ? esc_url_raw((string) $hit['feedback_url']) : null,
                );
            }

            return array(
                'success' => false,
                'message' => 'LinkedIn publish did not return a confirmation id.',
            );
        }

        /**
         * Recursively locate results.id inside Zapier MCP responses.
         *
         * @param mixed $data
         * @return array|null
         */
        private static function find_results_id($data) {
            if (is_object($data)) {
                $data = json_decode(wp_json_encode($data), true);
            }

            if (is_string($data)) {
                $decoded = json_decode($data, true);
                if (is_array($decoded)) {
                    return self::find_results_id($decoded);
                }
                return null;
            }

            if (!is_array($data)) {
                return null;
            }

            if (!empty($data['results']) && is_array($data['results']) && !empty($data['results']['id'])) {
                return array(
                    'id'           => $data['results']['id'],
                    'url'          => $data['results']['url'] ?? null,
                    'execution_id' => $data['execution']['id'] ?? null,
                    'feedback_url' => $data['feedbackUrl'] ?? null,
                );
            }

            if (!empty($data['content']) && is_array($data['content'])) {
                foreach ($data['content'] as $content_item) {
                    if (!empty($content_item['text']) && is_string($content_item['text'])) {
                        $decoded_text = json_decode($content_item['text'], true);

                        if (is_array($decoded_text)) {
                            $hit = self::find_results_id($decoded_text);
                            if (!empty($hit['id'])) {
                                return $hit;
                            }
                        }
                    }
                }
            }

            foreach ($data as $value) {
                $hit = self::find_results_id($value);
                if (!empty($hit['id'])) {
                    return $hit;
                }
            }

            return null;
        }
    }
}
