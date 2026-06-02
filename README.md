# VIP Zapier MCP LinkedIn Action Router Fix

## Error being fixed

```text
Action 'execute_zapier_write_action' not found
```

## What it means

This is not the same as the Facebook issue.

For Facebook, the post published and VIP misread the success response.

For LinkedIn, VIP is trying to use:

```text
execute_zapier_write_action
```

as though it were the LinkedIn action name.

That is the wrong layer.

## Correct structure

Think of it like this:

```text
Executor/tool: execute_zapier_write_action
App: LinkedIn
Action: the real LinkedIn create-post action key
```

VIP should not send `execute_zapier_write_action` as the app action.

It needs to send the actual LinkedIn action key, for example something like:

```text
linkedin_create_share_update
linkedin_create_company_update
linkedin_create_post
```

The exact action key depends on what Zapier exposes in your MCP server.

## Files

```text
includes/zapier-mcp-action-router-fix.php
examples/example-linkedin-integration.php
README.md
```

## Install

1. Copy this file into your VIP plugin:

```text
includes/zapier-mcp-action-router-fix.php
```

2. Load it from your main plugin file or publishing class:

```php
require_once plugin_dir_path(__FILE__) . 'includes/zapier-mcp-action-router-fix.php';
```

3. Find where VIP currently builds the LinkedIn Zapier action call.

Look for something like this:

```php
'action' => 'execute_zapier_write_action'
```

or:

```php
$action = 'execute_zapier_write_action';
```

That is the bug.

4. Replace that value with the actual LinkedIn app action key.

Until you know the exact key, the router intentionally returns a clear config error instead of sending the wrong action.

## Example corrected structure

```php
$payload = VIP_Zapier_MCP_Action_Router_Fix::build_publish_payload(
    'linkedin',
    $message,
    array(
        'visibility' => 'PUBLIC',
    ),
    array(
        'action' => get_option('vip_zapier_linkedin_action_key')
    )
);

if (empty($payload['success'])) {
    return array(
        'success' => false,
        'message' => $payload['error'],
    );
}
```

Then your existing Zapier MCP execution layer should call the write executor using:

```text
app: LinkedIn
action: ACTUAL_LINKEDIN_ACTION_KEY
params.message: your post copy
```

## Recommended WordPress setting

Add/store an option like this:

```php
vip_zapier_linkedin_action_key
```

Set its value to the exact LinkedIn action key returned by your Zapier MCP enabled actions list.

## Practical next step

In your logging/admin diagnostic screen, list the enabled Zapier actions for LinkedIn and copy the exact create-post action key into the VIP LinkedIn channel config.

Do not use:

```text
execute_zapier_write_action
```

as the LinkedIn action value.
