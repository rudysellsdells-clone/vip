# VIP Zapier MCP Facebook Success Fix

## What this fixes

VIP is currently treating this kind of Zapier MCP response as an error:

```json
{
  "results": {
    "id": "30489698262_1777565287102827",
    "url": null,
    "status": null,
    "message": null
  }
}
```

But this is actually a successful Facebook Page post. The `results.id` value is the Facebook post ID.

This patch adds a safe parser that treats `results.id` as success, even when `url`, `status`, and `message` are null.

## Files

- `includes/zapier-mcp-response-fix.php`  
  Drop-in PHP helper for normalizing Zapier MCP responses.

- `examples/example-integration.php`  
  Example showing where to use the helper in your existing VIP publish handler.

## Install

1. Copy this file into your VIP plugin:

```text
includes/zapier-mcp-response-fix.php
```

2. Add this to your main plugin file or the class file that handles publishing:

```php
require_once plugin_dir_path(__FILE__) . 'includes/zapier-mcp-response-fix.php';
```

3. Immediately after your Zapier MCP call, add:

```php
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
```

4. If your code catches an exception and currently returns the message as a VIP error, add this before returning failure:

```php
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
```

## Expected result

Instead of showing:

```text
ZapierMCP asked for more information instead of confirming execution
```

VIP should show something like:

```text
Published successfully to Facebook.
Post ID: 30489698262_1777565287102827
```

If Zapier does not return a post URL, the helper will derive one from the Facebook object ID:

```text
https://www.facebook.com/30489698262/posts/1777565287102827
```

## Notes

This is not a Facebook permission fix. Your test confirmed the post actually published. This is strictly a VIP response-handling fix.
