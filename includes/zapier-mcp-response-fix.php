<?php
/**
 * VIP Zapier MCP Response Fix
 *
 * Purpose:
 * Treat successful Zapier MCP app executions as success when the response contains results.id,
 * even when url/status/message are null.
 *
 * Install:
 * 1. Place this file in your VIP plugin, recommended:
 *    includes/zapier-mcp-response-fix.php
 *
 * 2. Require it from the main plugin file or the class that handles publishing:
 *    require_once plugin_dir_path(__FILE__) . 'includes/zapier-mcp-response-fix.php';
 *
 * 3. Immediately after the Zapier MCP call, normalize the response:
 *
 *    $normalized = VIP_Zapier_MCP_Response_Fix::normalize($zapier_response);
 *
 *    if (!empty($normalized['success'])) {
 *        return array(
 *            'success'      => true,
 *            'message'      => $normalized['message'],
 *            'post_id'      => $normalized['post_id'],
 *            'post_url'     => $normalized['post_url'],
 *            'execution_id' => $normalized['execution_id'],
 *            'feedback_url' => $normalized['feedback_url'],
 *            'raw'          => $zapier_response,
 *        );
 *    }
 *
 * 4. If your current code catches an exception and turns it into a VIP error, run the exception
 *    message through this same normalizer before returning the error:
 *
 *    $normalized = VIP_Zapier_MCP_Response_Fix::normalize($e->getMessage());
 *
 *    if (!empty($normalized['success'])) {
 *        return array(
 *            'success'      => true,
 *            'message'      => $normalized['message'],
 *            'post_id'      => $normalized['post_id'],
 *            'post_url'     => $normalized['post_url'],
 *            'execution_id' => $normalized['execution_id'],
 *            'feedback_url' => $normalized['feedback_url'],
 *        );
 *    }
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('VIP_Zapier_MCP_Response_Fix')) {
    final class VIP_Zapier_MCP_Response_Fix {

        /**
         * Normalize a Zapier MCP response, nested raw response, or exception/error message.
         *
         * @param mixed $response Zapier response array/object/string or VIP error string.
         * @return array
         */
        public static function normalize($response) {
            $candidates = array();

            if (is_object($response)) {
                $response = json_decode(wp_json_encode($response), true);
            }

            if (is_array($response)) {
                $candidates[] = $response;
            }

            if (is_string($response)) {
                $decoded = json_decode($response, true);

                if (is_array($decoded)) {
                    $candidates[] = $decoded;
                }

                foreach (self::extract_json_candidates($response) as $candidate) {
                    if (is_array($candidate)) {
                        $candidates[] = $candidate;
                    }
                }
            }

            foreach ($candidates as $candidate) {
                $hit = self::find_success_payload($candidate);

                if (!empty($hit['post_id'])) {
                    return self::build_success_result($hit);
                }
            }

            return array(
                'success'      => false,
                'message'      => 'Zapier MCP response did not contain a publish confirmation id.',
                'post_id'      => null,
                'post_url'     => null,
                'execution_id' => null,
                'feedback_url' => null,
            );
        }

        /**
         * Recursively search the decoded response for a successful Zapier MCP payload.
         *
         * The important success marker is:
         * results.id
         *
         * @param mixed $data
         * @return array|null
         */
        private static function find_success_payload($data) {
            if (is_object($data)) {
                $data = json_decode(wp_json_encode($data), true);
            }

            if (!is_array($data)) {
                if (is_string($data)) {
                    $decoded = json_decode($data, true);
                    if (is_array($decoded)) {
                        return self::find_success_payload($decoded);
                    }
                }

                return null;
            }

            if (
                isset($data['results']) &&
                is_array($data['results']) &&
                !empty($data['results']['id'])
            ) {
                return array(
                    'post_id'      => sanitize_text_field((string) $data['results']['id']),
                    'post_url'     => self::derive_facebook_post_url((string) $data['results']['id'], $data['results']['url'] ?? null),
                    'execution_id' => !empty($data['execution']['id']) ? sanitize_text_field((string) $data['execution']['id']) : null,
                    'feedback_url' => !empty($data['feedbackUrl']) ? esc_url_raw((string) $data['feedbackUrl']) : null,
                    'raw_success'  => $data,
                );
            }

            /*
             * Zapier MCP commonly returns:
             * raw.result.content[0].text = "{\"results\":{\"id\":\"...\"}, ... }"
             */
            if (!empty($data['content']) && is_array($data['content'])) {
                foreach ($data['content'] as $content_item) {
                    if (!empty($content_item['text']) && is_string($content_item['text'])) {
                        $decoded_text = json_decode($content_item['text'], true);

                        if (is_array($decoded_text)) {
                            $hit = self::find_success_payload($decoded_text);

                            if (!empty($hit['post_id'])) {
                                return $hit;
                            }
                        }
                    }
                }
            }

            foreach ($data as $value) {
                if (is_array($value) || is_object($value)) {
                    $hit = self::find_success_payload($value);

                    if (!empty($hit['post_id'])) {
                        return $hit;
                    }
                } elseif (is_string($value) && false !== strpos($value, 'results')) {
                    $decoded_value = json_decode($value, true);

                    if (is_array($decoded_value)) {
                        $hit = self::find_success_payload($decoded_value);

                        if (!empty($hit['post_id'])) {
                            return $hit;
                        }
                    }

                    foreach (self::extract_json_candidates($value) as $candidate) {
                        $hit = self::find_success_payload($candidate);

                        if (!empty($hit['post_id'])) {
                            return $hit;
                        }
                    }
                }
            }

            return null;
        }

        /**
         * Build the normalized success response.
         *
         * @param array $hit
         * @return array
         */
        private static function build_success_result(array $hit) {
            return array(
                'success'      => true,
                'message'      => 'Published successfully to Facebook.',
                'post_id'      => $hit['post_id'] ?? null,
                'post_url'     => $hit['post_url'] ?? null,
                'execution_id' => $hit['execution_id'] ?? null,
                'feedback_url' => $hit['feedback_url'] ?? null,
            );
        }

        /**
         * Derive a Facebook post URL from PAGE_ID_POST_ID when Zapier/Facebook returns null URL.
         *
         * Example:
         * 30489698262_1777565287102827
         * becomes:
         * https://www.facebook.com/30489698262/posts/1777565287102827
         *
         * @param string      $facebook_object_id
         * @param string|null $provided_url
         * @return string|null
         */
        private static function derive_facebook_post_url($facebook_object_id, $provided_url = null) {
            if (!empty($provided_url)) {
                return esc_url_raw((string) $provided_url);
            }

            if (false === strpos($facebook_object_id, '_')) {
                return null;
            }

            $parts = explode('_', $facebook_object_id, 2);

            if (2 !== count($parts) || empty($parts[0]) || empty($parts[1])) {
                return null;
            }

            $page_id = preg_replace('/[^0-9]/', '', $parts[0]);
            $post_id = preg_replace('/[^0-9]/', '', $parts[1]);

            if (empty($page_id) || empty($post_id)) {
                return null;
            }

            return esc_url_raw('https://www.facebook.com/' . $page_id . '/posts/' . $post_id);
        }

        /**
         * Extract possible JSON objects from an error/exception string.
         *
         * This is intentionally conservative. It looks for balanced JSON object blocks and tries to decode them.
         *
         * @param string $text
         * @return array
         */
        private static function extract_json_candidates($text) {
            $candidates = array();
            $length = strlen($text);
            $start = null;
            $depth = 0;
            $in_string = false;
            $escape = false;

            for ($i = 0; $i < $length; $i++) {
                $char = $text[$i];

                if ($escape) {
                    $escape = false;
                    continue;
                }

                if ('\\' === $char) {
                    $escape = true;
                    continue;
                }

                if ('"' === $char) {
                    $in_string = !$in_string;
                    continue;
                }

                if ($in_string) {
                    continue;
                }

                if ('{' === $char) {
                    if (0 === $depth) {
                        $start = $i;
                    }

                    $depth++;
                } elseif ('}' === $char && $depth > 0) {
                    $depth--;

                    if (0 === $depth && null !== $start) {
                        $json = substr($text, $start, $i - $start + 1);
                        $decoded = json_decode($json, true);

                        if (is_array($decoded)) {
                            $candidates[] = $decoded;
                        }

                        $start = null;
                    }
                }
            }

            return $candidates;
        }
    }
}
