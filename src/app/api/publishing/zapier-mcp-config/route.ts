import { NextResponse } from "next/server";

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

function masked(name: string) {
  const value = process.env[name]?.trim() || "";

  if (!value) return null;

  if (value.length <= 6) return "***";

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    server: {
      hasServerUrl: present("ZAPIER_MCP_SERVER_URL"),
      hasToken: present("ZAPIER_MCP_TOKEN") || present("ZAPIER_MCP_AUTH_TOKEN"),
      tokenSource: present("ZAPIER_MCP_TOKEN")
        ? "ZAPIER_MCP_TOKEN"
        : present("ZAPIER_MCP_AUTH_TOKEN")
          ? "ZAPIER_MCP_AUTH_TOKEN"
          : null,
    },
    defaultMapping: {
      app: masked("ZAPIER_MCP_DEFAULT_APP"),
      action: masked("ZAPIER_MCP_DEFAULT_ACTION"),
      hasApp: present("ZAPIER_MCP_DEFAULT_APP"),
      hasAction: present("ZAPIER_MCP_DEFAULT_ACTION"),
    },
    facebook: {
      app: process.env.ZAPIER_MCP_FACEBOOK_POST_APP || "Facebook Pages",
      hasNewAction: present("ZAPIER_MCP_FACEBOOK_POST_ACTION"),
      hasLegacyAction: present("ZAPIER_FACEBOOK_MCP_TOOL_NAME"),
      hasPageId: present("ZAPIER_FACEBOOK_PAGE_ID"),
      hasPageName: present("ZAPIER_FACEBOOK_PAGE_NAME"),
    },
    linkedin: {
      app: process.env.ZAPIER_MCP_LINKEDIN_POST_APP || "LinkedIn",
      hasNewAction: present("ZAPIER_MCP_LINKEDIN_POST_ACTION"),
      hasLegacyAction: present("ZAPIER_LINKEDIN_MCP_TOOL_NAME"),
      hasPageName: present("ZAPIER_LINKEDIN_PAGE_NAME"),
    },
    wordpress: {
      app: process.env.ZAPIER_MCP_BLOG_POST_APP || "WordPress",
      hasNewAction: present("ZAPIER_MCP_BLOG_POST_ACTION"),
      hasLegacyAction: present("ZAPIER_WORDPRESS_CREATE_POST_ACTION_KEY"),
      defaultPostStatus: process.env.WORDPRESS_DEFAULT_POST_STATUS || null,
    },
    gmail: {
      app: process.env.ZAPIER_MCP_EMAIL_APP || process.env.ZAPIER_GMAIL_APP || "Gmail",
      hasNewAction: present("ZAPIER_MCP_EMAIL_ACTION"),
      hasLegacyAction: present("ZAPIER_GMAIL_CREATE_DRAFT_ACTION"),
    },
  });
}
