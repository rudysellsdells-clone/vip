#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const asJson = process.argv.includes("--json");

const ignoreDirs = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function countMatches(files, pattern) {
  let count = 0;
  const hits = [];

  for (const file of files) {
    const text = read(file);
    const matches = text.match(pattern);

    if (matches?.length) {
      count += matches.length;
      hits.push({ file: rel(file), count: matches.length });
    }
  }

  return { count, hits };
}

const allFiles = walk(root);
const sourceFiles = allFiles.filter((file) => /\.(ts|tsx|js|jsx|mjs|sql|md)$/.test(file));
const apiRoutes = sourceFiles.filter((file) => rel(file).startsWith("src/app/api/") && rel(file).endsWith("route.ts"));
const readmes = allFiles.filter((file) => path.basename(file).startsWith("README"));
const migrations = allFiles.filter((file) => rel(file).startsWith("db/migrations/") && rel(file).endsWith(".sql"));

const srcFiles = sourceFiles.filter((file) => rel(file).startsWith("src/"));
const sqlFiles = sourceFiles.filter((file) => rel(file).endsWith(".sql"));

const publishingRoutes = apiRoutes
  .map(rel)
  .filter((file) => /publishing|zapier|tool-runs|gmail|facebook|linkedin/i.test(file));

const metrics = {
  root,
  generatedAt: new Date().toISOString(),
  totals: {
    sourceFiles: sourceFiles.length,
    apiRoutes: apiRoutes.length,
    migrations: migrations.length,
    readmePatchFiles: readmes.length,
    publishingRoutes: publishingRoutes.length,
  },
  publishingRoutes,
  scans: {
    untypedSupabase: countMatches(srcFiles, /untypedSupabase/g),
    executeZapierWriteAction: countMatches(srcFiles, /execute_zapier_write_action/g),
    sendToZapierRouteReferences: countMatches(srcFiles, /send-to-zapier/g),
    executeZapierMcpRouteReferences: countMatches(srcFiles, /execute-zapier-mcp/g),
    userIdOnlyRlsPolicyPatterns: countMatches(sqlFiles, /auth\.uid\(\)\)\s*=\s*user_id|auth\.uid\(\)\s*=\s*user_id|=\s*\(select auth\.uid\(\)\)/g),
    accountContextReferences: countMatches(srcFiles, /account-context|getUserAccountContext|account_id|activeAccountId/g),
    serviceRoleReferences: countMatches(srcFiles, /createAdminClient|SUPABASE_SERVICE_ROLE_KEY|service_role/g),
    metadataPropertyAccess: countMatches(srcFiles, /\.metadata\?\.[A-Za-z0-9_]+/g),
  },
};

function topHits(scan, limit = 12) {
  return scan.hits
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
    .slice(0, limit);
}

if (asJson) {
  console.log(JSON.stringify(metrics, null, 2));
  process.exit(0);
}

console.log("VIP Baseline Audit");
console.log("==================");
console.log(`Root: ${metrics.root}`);
console.log(`Generated: ${metrics.generatedAt}`);
console.log("");
console.log("Totals");
console.log("------");
for (const [key, value] of Object.entries(metrics.totals)) {
  console.log(`${key}: ${value}`);
}

console.log("");
console.log("Publishing-related API routes");
console.log("-----------------------------");
for (const route of publishingRoutes) {
  console.log(`- ${route}`);
}

console.log("");
console.log("High-signal scans");
console.log("-----------------");
for (const [name, scan] of Object.entries(metrics.scans)) {
  console.log(`${name}: ${scan.count}`);
  for (const hit of topHits(scan, 8)) {
    console.log(`  - ${hit.file} (${hit.count})`);
  }
}

console.log("");
console.log("Recommended next review");
console.log("-----------------------");
console.log("1. Confirm canonical publishing route and deprecate legacy UI paths.");
console.log("2. Audit service-role routes for explicit account authorization.");
console.log("3. Prioritize untypedSupabase removal in publishing/account/GalaxyAI routes.");
console.log("4. Review SQL policies that still rely only on user_id.");
console.log("5. Treat metadata property access as a TypeScript Json-narrowing risk.");
