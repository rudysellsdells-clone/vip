# VIP Zapier MCP LinkedIn Company Update Fix

## Correct LinkedIn action keys

For LinkedIn Page publishing, use:

```text
create_company_update
```

For general/personal share publishing, the fallback/general action is:

```text
share
```

## What caused the error

This error:

```text
Action 'execute_zapier_write_action' not found
```

means VIP tried to use the executor/tool name as the LinkedIn action key.

That is incorrect.

## Correct structure

```text
Executor: write
App: LinkedIn
Action: create_company_update
```

Do not use:

```text
Action: execute_zapier_write_action
```

## Files in this patch

```text
includes/zapier-mcp-linkedin-company-update-fix.php
examples/example-vip-linkedin-company-update-integration.php
README.md
```

## Install

1. Copy the helper file to your VIP plugin:

```text
includes/zapier-mcp-linkedin-company-update-fix.php
```

2. Load it:

```php
require_once plugin_dir_path(__FILE__) . 'includes/zapier-mcp-linkedin-company-update-fix.php';
```

3. Set the WordPress option, or hardcode the action key in your channel config:

```php
update_option('vip_zapier_linkedin_action_key', 'create_company_update');
```

4. Replace any LinkedIn publishing config like this:

```php
'action' => 'execute_zapier_write_action'
```

With this:

```php
'action' => 'create_company_update'
```

## Example payload

```php
$payload = VIP_Zapier_MCP_LinkedIn_Company_Update_Fix::build_linkedin_page_publish_payload(
    $message,
    array(
        // Add required LinkedIn company/page params here if your Zapier MCP action requires them.
    )
);
```

Then your MCP call should execute the write action using:

```text
app: LinkedIn
action: create_company_update
params.message: your LinkedIn post body
```

## Recommended behavior

If LinkedIn returns:

```json
{
  "results": {
    "id": "some_linkedin_update_id",
    "url": null,
    "status": null,
    "message": null
  }
}
```

VIP should treat that as success.

The helper includes:

```php
VIP_Zapier_MCP_LinkedIn_Company_Update_Fix::normalize_publish_response($response);
```

That mirrors the Facebook response-parser fix.
