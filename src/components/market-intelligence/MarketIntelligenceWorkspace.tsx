"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  MarketResearchFinding,
  MarketResearchProject,
  MarketResearchSource,
} from "@/lib/market-intelligence/market-intelligence";
import {
  MARKET_RESEARCH_FINDING_TYPES,
  MARKET_RESEARCH_SOURCE_TYPES,
} from "@/lib/market-intelligence/market-intelligence";

export function MarketIntelligenceWorkspace({
  projects,
  sources,
  findings,
  canManage,
  accountName,
  defaultGeography,
}: {
  projects: MarketResearchProject[];
  sources: MarketResearchSource[];
  findings: MarketResearchFinding[];
  canManage: boolean;
  accountName: string;
  defaultGeography: string;
}) {
  return (
    <div className="space-y-6">
      {canManage ? (
        <AutomatedResearchForm
          accountName={accountName}
          defaultGeography={defaultGeography}
        />
      ) : (
        <div className="border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          You can review market intelligence, but only account owners and admins can run or approve research.
        </div>
      )}

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Findings Queue
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Review automated market intelligence
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Automated scans create draft findings with cited sources. Approve only the findings that should influence Strategy and campaign planning.
            </p>
          </div>
          <span className="text-sm font-bold text-slate-500">
            {findings.length} finding{findings.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {findings.length ? (
            findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} canManage={canManage} />
            ))
          ) : (
            <div className="border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 lg:col-span-2">
              No findings yet. Run an automated market scan to discover competitors, positioning gaps, search demand, and market opportunities.
            </div>
          )}
        </div>
      </section>

      {canManage ? (
        <details className="border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-base font-black text-slate-900">
            Advanced: add or correct research manually
          </summary>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Use these tools only to add private evidence, interviews, analytics, or corrections that automated web research could not capture.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <ProjectForm />
            <SourceForm projects={projects} />
            <FindingForm projects={projects} sources={sources} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

function AutomatedResearchForm({
  accountName,
  defaultGeography,
}: {
  accountName: string;
  defaultGeography: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setRunning(true);
    setError("");
    setMessage("Researching the web and building the market-position report...");

    try {
      const response = await fetch("/api/market-intelligence/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to complete the market scan.");
      }

      setMessage(
        `Market scan complete: ${result.sourceCount ?? 0} cited sources and ${result.findingCount ?? 0} reviewable findings.`,
      );
      router.refresh();
    } catch (caught) {
      setMessage("");
      setError(caught instanceof Error ? caught.message : "Unable to complete the market scan.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="border border-blue-200 bg-[linear-gradient(135deg,#eff6ff,#ffffff_58%,#f0fdf4)] p-6 shadow-sm">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr] xl:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Automated Web Intelligence
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Discover where {accountName} stands in the market.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            VIP will inspect the account website, discover direct competitors, compare positioning and offers, identify search and content openings, and produce a cited report showing practical gaps this account could fill.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Discover competitors"],
              ["2", "Compare market position"],
              ["3", "Recommend fillable gaps"],
            ].map(([number, label]) => (
              <div key={number} className="border border-blue-100 bg-white/80 p-3">
                <span className="text-xs font-black text-blue-700">STEP {number}</span>
                <p className="mt-1 text-sm font-bold text-slate-800">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 border border-slate-200 bg-white p-5">
          <TextArea
            name="objective"
            label="Research objective"
            placeholder="Find direct competitors, market-position gaps, unmet demand, and realistic growth opportunities."
          />
          <Field
            name="geography"
            label="Target geography"
            defaultValue={defaultGeography}
            placeholder="Wisconsin, Midwest, United States..."
          />
          <TextArea
            name="knownCompetitors"
            label="Known competitors (optional)"
            placeholder="Add names or websites, one per line. VIP will also discover competitors automatically."
          />
          <button
            type="submit"
            disabled={running}
            className="w-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Running Market Scan..." : "Run Automated Market Scan"}
          </button>
          {message ? <p className="text-xs font-semibold leading-5 text-blue-700">{message}</p> : null}
          {error ? <p className="text-xs font-semibold leading-5 text-red-700">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}

function ProjectForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage("Creating project...");

    const response = await fetch("/api/market-intelligence/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(data.entries())),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to create project.");
      return;
    }

    form.reset();
    setMessage("Research project created.");
    startTransition(() => router.refresh());
  }

  return (
    <FormShell title="Manual research project" description="Define a private research scope that will not run an automated web scan.">
      <form onSubmit={submit} className="space-y-3">
        <Field name="title" label="Project title" required />
        <TextArea name="objective" label="Research objective" />
        <Field name="industry" label="Industry" />
        <Field name="geography" label="Geography" placeholder="Wisconsin, Midwest, United States..." />
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Status
          <select name="status" defaultValue="active" className="border border-slate-300 bg-white px-3 py-2">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <SubmitRow pending={pending} label="Create Project" message={message} />
      </form>
    </FormShell>
  );
}

function SourceForm({ projects }: { projects: MarketResearchProject[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage("Saving source...");

    const response = await fetch("/api/market-intelligence/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(data.entries())),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save source.");
      return;
    }

    form.reset();
    setMessage("Source saved.");
    startTransition(() => router.refresh());
  }

  return (
    <FormShell title="Add supplemental source" description="Capture private evidence, interviews, analytics, or a source the automated scan missed.">
      <form onSubmit={submit} className="space-y-3">
        <ProjectSelect projects={projects} />
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Source type
          <select name="sourceType" className="border border-slate-300 bg-white px-3 py-2">
            {MARKET_RESEARCH_SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>{formatLabel(type)}</option>
            ))}
          </select>
        </label>
        <Field name="title" label="Source title" required />
        <Field name="sourceUrl" label="Source URL" placeholder="https://..." />
        <Field name="publisher" label="Publisher" />
        <Field name="publishedAt" label="Published date" type="date" />
        <Field name="credibilityScore" label="Credibility score" type="number" min="0" max="100" />
        <TextArea name="summary" label="Source summary" />
        <SubmitRow pending={pending} label="Save Source" message={message} />
      </form>
    </FormShell>
  );
}

function FindingForm({
  projects,
  sources,
}: {
  projects: MarketResearchProject[];
  sources: MarketResearchSource[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      ...Object.fromEntries(data.entries()),
      sourceIds: data.getAll("sourceIds"),
    };
    setMessage("Saving finding...");

    const response = await fetch("/api/market-intelligence/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save finding.");
      return;
    }

    form.reset();
    setMessage("Draft finding saved.");
    startTransition(() => router.refresh());
  }

  return (
    <FormShell title="Add or correct a finding" description="Create a supplemental insight that still requires approval before downstream use.">
      <form onSubmit={submit} className="space-y-3">
        <ProjectSelect projects={projects} />
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          Finding type
          <select name="findingType" className="border border-slate-300 bg-white px-3 py-2">
            {MARKET_RESEARCH_FINDING_TYPES.map((type) => (
              <option key={type} value={type}>{formatLabel(type)}</option>
            ))}
          </select>
        </label>
        <Field name="title" label="Finding title" required />
        <TextArea name="summary" label="Finding summary" required />
        <TextArea name="evidence" label="Evidence and interpretation" />
        <Field name="geography" label="Geography" />
        <Field name="confidenceScore" label="Confidence score" type="number" min="0" max="100" />
        <div className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Supporting sources</span>
          <div className="max-h-36 space-y-2 overflow-y-auto border border-slate-200 bg-slate-50 p-3">
            {sources.length ? sources.map((source) => (
              <label key={source.id} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" name="sourceIds" value={source.id} className="mt-0.5" />
                <span>{source.title}</span>
              </label>
            )) : <span className="text-xs text-slate-500">Add a source first.</span>}
          </div>
        </div>
        <SubmitRow pending={pending} label="Save Draft Finding" message={message} />
      </form>
    </FormShell>
  );
}

function FindingCard({
  finding,
  canManage,
}: {
  finding: MarketResearchFinding;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function changeStatus(status: "draft" | "approved" | "rejected") {
    setMessage(`Setting ${status}...`);
    const response = await fetch("/api/market-intelligence/findings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingId: finding.id, status }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to update finding.");
      return;
    }

    setMessage(`Finding ${status}.`);
    startTransition(() => router.refresh());
  }

  return (
    <article className="border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {formatLabel(finding.findingType)}
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{finding.title}</h3>
        </div>
        <span className="border border-slate-200 bg-white px-2 py-1 text-xs font-black uppercase tracking-[0.1em] text-slate-600">
          {finding.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{finding.summary}</p>
      {finding.evidence ? (
        <p className="mt-3 whitespace-pre-line border-l-2 border-blue-200 pl-3 text-xs leading-5 text-slate-600">
          {finding.evidence}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        <span>{finding.sourceIds.length} source{finding.sourceIds.length === 1 ? "" : "s"}</span>
        {finding.confidenceScore !== null ? <span>{finding.confidenceScore}% confidence</span> : null}
        {finding.geography ? <span>{finding.geography}</span> : null}
      </div>
      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusButton disabled={pending} onClick={() => changeStatus("approved")}>Approve</StatusButton>
          <StatusButton disabled={pending} onClick={() => changeStatus("rejected")}>Reject</StatusButton>
          <StatusButton disabled={pending} onClick={() => changeStatus("draft")}>Return to Draft</StatusButton>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p> : null}
    </article>
  );
}

function FormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProjectSelect({ projects }: { projects: MarketResearchProject[] }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      Research project
      <select name="projectId" className="border border-slate-300 bg-white px-3 py-2">
        <option value="">No project selected</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.title}</option>
        ))}
      </select>
    </label>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  type = "text",
  min,
  max,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="border border-slate-300 bg-white px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <textarea
        name={name}
        required={required}
        rows={3}
        placeholder={placeholder}
        className="border border-slate-300 bg-white px-3 py-2"
      />
    </label>
  );
}

function SubmitRow({
  pending,
  label,
  message,
}: {
  pending: boolean;
  label: string;
  message: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <span className="text-xs font-semibold text-slate-500">{message}</span>
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving..." : label}
      </button>
    </div>
  );
}

function StatusButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
