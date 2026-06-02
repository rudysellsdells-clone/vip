#!/usr/bin/env node
/**
 * VIP LinkedIn Zapier MCP action-key surgical patch
 *
 * Purpose:
 * Fix the error:
 *   Action 'execute_zapier_write_action' not found
 *
 * Cause:
 * VIP is using the Zapier MCP executor/tool name as the LinkedIn app action key.
 *
 * Correct:
 *   MCP tool/executor: execute_zapier_write_action
 *   LinkedIn action:  create_company_update
 *
 * Usage from repo root:
 *   node scripts/fix-linkedin-zapier-action.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  linkedin: path.join(root, "src", "lib", "zapier", "linkedin.ts"),
  registry: path.join(root, "src", "lib", "zapier", "action-registry.ts"),
};

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace("Z", "");

let changedFiles = 0;

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function backup(filePath) {
  const backupPath = `${filePath}.bak-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function log(message) {
  console.log(`[VIP LinkedIn Zapier patch] ${message}`);
}

function patchLinkedInFile() {
  const filePath = files.linkedin;

  if (!exists(filePath)) {
    log(`Skipped missing file: ${path.relative(root, filePath)}`);
    return;
  }

  const original = read(filePath);
  let content = original;

  /**
   * Add a separate LinkedIn action-key helper.
   * Keep getLinkedInMcpToolName() for the MCP executor/tool.
   */
  if (!content.includes("getLinkedInMcpActionKey")) {
    const helper = `
export function getLinkedInMcpActionKey() {
  return process.env.ZAPIER_LINKEDIN_ACTION_KEY?.trim() || "create_company_update";
}
`;

    const toolNameFunctionRegex =
      /export function getLinkedInMcpToolName\(\)\s*\{[\s\S]*?\n\}/;

    if (toolNameFunctionRegex.test(content)) {
      content = content.replace(toolNameFunctionRegex, (match) => `${match}\n${helper}`);
    } else {
      content = `${helper}\n${content}`;
    }
  }

  /**
   * Fix the most likely bug:
   * action gets assigned from getLinkedInMcpToolName().
   */
  const replacements = [
    {
      from: /\baction\s*:\s*getLinkedInMcpToolName\(\)/g,
      to: "action: getLinkedInMcpActionKey()",
      label: "object action property using getLinkedInMcpToolName()",
    },
    {
      from: /\bactionKey\s*:\s*getLinkedInMcpToolName\(\)/g,
      to: "actionKey: getLinkedInMcpActionKey()",
      label: "object actionKey property using getLinkedInMcpToolName()",
    },
    {
      from: /\bconst\s+action\s*=\s*getLinkedInMcpToolName\(\)\s*;/g,
      to: "const action = getLinkedInMcpActionKey();",
      label: "const action assigned from getLinkedInMcpToolName()",
    },
    {
      from: /\bconst\s+actionKey\s*=\s*getLinkedInMcpToolName\(\)\s*;/g,
      to: "const actionKey = getLinkedInMcpActionKey();",
      label: "const actionKey assigned from getLinkedInMcpToolName()",
    },
    {
      from: /\blet\s+action\s*=\s*getLinkedInMcpToolName\(\)\s*;/g,
      to: "let action = getLinkedInMcpActionKey();",
      label: "let action assigned from getLinkedInMcpToolName()",
    },
    {
      from: /\blet\s+actionKey\s*=\s*getLinkedInMcpToolName\(\)\s*;/g,
      to: "let actionKey = getLinkedInMcpActionKey();",
      label: "let actionKey assigned from getLinkedInMcpToolName()",
    },
    {
      from: /\baction\s*:\s*["']execute_zapier_write_action["']/g,
      to: 'action: "create_company_update"',
      label: "action property set directly to execute_zapier_write_action",
    },
    {
      from: /\bactionKey\s*:\s*["']execute_zapier_write_action["']/g,
      to: 'actionKey: "create_company_update"',
      label: "actionKey property set directly to execute_zapier_write_action",
    },
  ];

  for (const replacement of replacements) {
    if (replacement.from.test(content)) {
      replacement.from.lastIndex = 0;
      content = content.replace(replacement.from, replacement.to);
      log(`Patched linkedin.ts: ${replacement.label}`);
    }
  }

  if (content !== original) {
    const backupPath = backup(filePath);
    write(filePath, content);
    changedFiles++;
    log(`Updated ${path.relative(root, filePath)}`);
    log(`Backup saved as ${path.relative(root, backupPath)}`);
  } else {
    log(`No changes needed in ${path.relative(root, filePath)}`);
  }
}

function patchActionRegistry() {
  const filePath = files.registry;

  if (!exists(filePath)) {
    log(`Skipped missing file: ${path.relative(root, filePath)}`);
    return;
  }

  const original = read(filePath);
  let content = original;

  /**
   * Only patch LinkedIn-ish blocks. Avoid touching Facebook defaults:
   * defaultToolName: "execute_zapier_write_action" is correct and should stay.
   */
  const registryPatterns = [
    {
      from: /((?:app|provider|channel|platform|assetType)\s*:\s*["'](?:LinkedIn|linkedin|linkedin_page|linkedin_company|linkedin-page|linkedin-company)["'][\s\S]{0,900}?\baction\s*:\s*)["']execute_zapier_write_action["']/g,
      to: '$1"create_company_update"',
      label: "LinkedIn block action set to execute_zapier_write_action",
    },
    {
      from: /(\baction\s*:\s*)["']execute_zapier_write_action["']([\s\S]{0,900}?(?:app|provider|channel|platform|assetType)\s*:\s*["'](?:LinkedIn|linkedin|linkedin_page|linkedin_company|linkedin-page|linkedin-company)["'])/g,
      to: '$1"create_company_update"$2',
      label: "LinkedIn block action set before LinkedIn marker",
    },
  ];

  for (const pattern of registryPatterns) {
    if (pattern.from.test(content)) {
      pattern.from.lastIndex = 0;
      content = content.replace(pattern.from, pattern.to);
      log(`Patched action-registry.ts: ${pattern.label}`);
    }
  }

  /**
   * Add a safe LinkedIn registry entry only if the registry mentions LinkedIn
   * but does not contain create_company_update.
   *
   * We do NOT auto-insert a full object because registries vary by project.
   * Instead, we leave a visible comment near existing LinkedIn references.
   */
  if (
    /LinkedIn|linkedin/.test(content) &&
    !/create_company_update/.test(content) &&
    /execute_zapier_write_action/.test(content)
  ) {
    log(
      "Warning: action-registry.ts mentions LinkedIn but create_company_update was not found. Please manually set the LinkedIn Page action to create_company_update."
    );
  }

  if (content !== original) {
    const backupPath = backup(filePath);
    write(filePath, content);
    changedFiles++;
    log(`Updated ${path.relative(root, filePath)}`);
    log(`Backup saved as ${path.relative(root, backupPath)}`);
  } else {
    log(`No automatic changes needed in ${path.relative(root, filePath)}`);
  }
}

function scanForRemainingBadLinkedInAction() {
  const filesToCheck = [files.linkedin, files.registry].filter(exists);

  for (const filePath of filesToCheck) {
    const content = read(filePath);
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      const hasBadAction =
        /\baction(?:Key)?\s*:\s*["']execute_zapier_write_action["']/.test(line) ||
        /\bconst\s+action(?:Key)?\s*=\s*["']execute_zapier_write_action["']/.test(line) ||
        /\bconst\s+action(?:Key)?\s*=\s*getLinkedInMcpToolName\(\)/.test(line);

      if (hasBadAction) {
        log(
          `Review remaining possible bad LinkedIn action at ${path.relative(root, filePath)}:${index + 1}: ${line.trim()}`
        );
      }
    });
  }
}

function main() {
  log("Starting surgical LinkedIn Zapier MCP action-key patch.");
  log("This keeps execute_zapier_write_action as the tool/executor and uses create_company_update as the LinkedIn action.");

  patchLinkedInFile();
  patchActionRegistry();
  scanForRemainingBadLinkedInAction();

  if (changedFiles === 0) {
    log("Finished. No files were changed automatically.");
  } else {
    log(`Finished. Changed ${changedFiles} file(s).`);
    log("Next step: run npm run build.");
  }

  log("Vercel env reminder:");
  log("  ZAPIER_LINKEDIN_MCP_TOOL_NAME=execute_zapier_write_action");
  log("  ZAPIER_LINKEDIN_ACTION_KEY=create_company_update");
}

main();
