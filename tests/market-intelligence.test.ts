import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketIntelligenceWorkspace,
  normalizeMarketResearchFinding,
  normalizeMarketResearchProject,
  normalizeMarketResearchSource,
} from "../src/lib/market-intelligence/market-intelligence.ts";

const accountId = "account-123";

function project(overrides: Record<string, unknown> = {}) {
  return normalizeMarketResearchProject({
    id: "project-1",
    account_id: accountId,
    title: "Wisconsin contractor market",
    status: "active",
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
    ...overrides,
  });
}

function source(overrides: Record<string, unknown> = {}) {
  return normalizeMarketResearchSource({
    id: "source-1",
    account_id: accountId,
    title: "Industry report",
    source_type: "document",
    active: true,
    retrieved_at: "2026-07-22T00:00:00.000Z",
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
    ...overrides,
  });
}

function finding(overrides: Record<string, unknown> = {}) {
  return normalizeMarketResearchFinding({
    id: "finding-1",
    account_id: accountId,
    title: "Competitors underuse proof",
    summary: "Local competitors make broad claims without showing evidence.",
    finding_type: "competitor",
    status: "draft",
    source_ids: ["source-1"],
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
    ...overrides,
  });
}

test("approved findings are isolated from draft and rejected research", () => {
  const workspace = buildMarketIntelligenceWorkspace({
    projects: [project()],
    sources: [source()],
    findings: [
      finding({ id: "approved", status: "approved" }),
      finding({ id: "draft", status: "draft" }),
      finding({ id: "rejected", status: "rejected" }),
    ],
  });

  assert.equal(workspace.approvedFindings.length, 1);
  assert.equal(workspace.approvedFindings[0]?.id, "approved");
  assert.deepEqual(workspace.counts, {
    activeProjects: 1,
    sources: 1,
    draftFindings: 1,
    approvedFindings: 1,
    rejectedFindings: 1,
  });
});

test("inactive sources do not count as usable evidence", () => {
  const workspace = buildMarketIntelligenceWorkspace({
    projects: [project()],
    sources: [source(), source({ id: "inactive", active: false })],
    findings: [],
  });

  assert.equal(workspace.sources.length, 1);
  assert.equal(workspace.counts.sources, 1);
});

test("findings remain grouped by intelligence type", () => {
  const workspace = buildMarketIntelligenceWorkspace({
    projects: [],
    sources: [],
    findings: [
      finding({ id: "competitor", finding_type: "competitor" }),
      finding({ id: "demand", finding_type: "search_demand" }),
      finding({ id: "opportunity", finding_type: "market_opportunity" }),
    ],
  });

  assert.equal(workspace.findingsByType.competitor.length, 1);
  assert.equal(workspace.findingsByType.search_demand.length, 1);
  assert.equal(workspace.findingsByType.market_opportunity.length, 1);
});

test("invalid enum values fall back to safe draft classifications", () => {
  const normalizedProject = project({ status: "mystery" });
  const normalizedSource = source({ source_type: "unknown" });
  const normalizedFinding = finding({
    finding_type: "unknown",
    status: "published",
  });

  assert.equal(normalizedProject.status, "draft");
  assert.equal(normalizedSource.sourceType, "web");
  assert.equal(normalizedFinding.findingType, "market_opportunity");
  assert.equal(normalizedFinding.status, "draft");
});
