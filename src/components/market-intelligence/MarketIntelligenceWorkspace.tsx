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
}: {
  projects: MarketResearchProject[];
  sources: MarketResearchSource[];
  findings: MarketResearchFinding[];
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <ProjectForm />
          <SourceForm projects={projects} />
          <FindingForm projects={projects} sources={sources} />
        </div>
      ) : (
        <div className="border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          You can review market intelligence, but only account owners and admins can add or approve research.
        </div>
      )}

      <section className="border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Findings Queue
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Review market intelligence
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Draft findings remain private research. Only approved findings are eligible to influence Strategy and campaign planning.
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
              No findings yet. Start a project, add evidence, and record the first market insight.
            </div>
          )}
        </div>
      </section>
    </div>
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
    <FormShell title="New research project" description="Define the market question, geography, and industry scope.">
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
    <FormShell title="Add cited source" description="Capture where the evidence came from and when it was retrieved.">
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
    const payload = Object.fromEntries(data.entries());
    payload.sourceIds = data.getAll("sourceIds");
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
    <FormShell title="Record a finding" description="Turn cited evidence into a typed insight that can be reviewed and approved.">
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
        <p className="mt-3 border-l-2 border-blue-200 pl-3 text-xs leading-5 text-slate-600">
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
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  min?: string;
  max?: string;
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
        className="border border-slate-300 bg-white px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  required,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <textarea name={name} required={required} rows={3} className="border border-slate-300 bg-white px-3 py-2" />
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
