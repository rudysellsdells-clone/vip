"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import accountStyles from "@/components/accounts/AccountForms.module.css";

type ServiceLine = {
  id: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  primary_outcome?: string | null;
};

type Audience = {
  id: string;
  name: string;
  description?: string | null;
  common_pains?: string[] | null;
  desired_outcomes?: string[] | null;
  objections?: string[] | null;
};

type Offer = {
  id: string;
  service_line_id?: string | null;
  name: string;
  description?: string | null;
  offer_type?: string | null;
  primary_cta?: string | null;
  outcome?: string | null;
  price_notes?: string | null;
  target_buyer_segments?: string[] | null;
};

const offerTypes = [
  { value: "project", label: "Project" },
  { value: "retainer", label: "Retainer" },
  { value: "audit", label: "Audit" },
  { value: "consulting", label: "Consulting" },
  { value: "hybrid", label: "Hybrid" },
];

export function AccountMarketProfileManager({
  accountId,
  canManage,
  serviceLines,
  audiences,
  offers,
}: {
  accountId: string;
  canManage: boolean;
  serviceLines: ServiceLine[];
  audiences: Audience[];
  offers: Offer[];
}) {
  return (
    <div className="space-y-6">
      <div className={accountStyles.strategyIntro}>
        <p className="font-bold">Why this matters</p>
        <p className="mt-1">
          These fields tell VIP what this account actually sells, who they sell to, and which offers should drive campaigns. This keeps a service business from generating marketing-agency content by mistake.
        </p>
      </div>

      <StrategyPanel
        title="Service Lines"
        description="The core services this account sells. Examples: pool maintenance, roof replacement, robot mower installation, commercial HVAC service."
        empty="No service lines yet. Add the services this account actually sells."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {serviceLines.map((serviceLine) => (
            <MarketCard key={serviceLine.id} title={serviceLine.name} subtitle={serviceLine.short_name} body={serviceLine.description} footer={serviceLine.primary_outcome}>
              {canManage ? (
                <RemoveMarketItemButton
                  accountId={accountId}
                  endpoint="service-lines"
                  itemId={serviceLine.id}
                  label={serviceLine.name}
                />
              ) : null}
            </MarketCard>
          ))}
          {!serviceLines.length ? <EmptyState message="No service lines yet. Add the services this account actually sells." /> : null}
        </div>
        {canManage ? <ServiceLineForm accountId={accountId} /> : null}
      </StrategyPanel>

      <StrategyPanel
        title="Audiences"
        description="The buyer groups this account serves. Examples: residential pool owners, property managers, homeowners with storm damage, local contractors."
        empty="No audiences yet. Add the buyer groups VIP should write for."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {audiences.map((audience) => (
            <MarketCard
              key={audience.id}
              title={audience.name}
              body={audience.description}
              footer={compactList("Pain points", audience.common_pains)}
            >
              {canManage ? (
                <RemoveMarketItemButton
                  accountId={accountId}
                  endpoint="audiences"
                  itemId={audience.id}
                  label={audience.name}
                />
              ) : null}
            </MarketCard>
          ))}
          {!audiences.length ? <EmptyState message="No audiences yet. Add the buyer groups VIP should write for." /> : null}
        </div>
        {canManage ? <AudienceForm accountId={accountId} /> : null}
      </StrategyPanel>

      <StrategyPanel
        title="Offers"
        description="The specific offers, packages, specials, retainers, audits, or calls-to-action VIP can promote."
        empty="No offers yet. Add the offers this account should promote."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {offers.map((offer) => (
            <MarketCard
              key={offer.id}
              title={offer.name}
              subtitle={offer.offer_type ? offer.offer_type.replace("_", " ") : undefined}
              body={offer.description}
              footer={offer.primary_cta ? `CTA: ${offer.primary_cta}` : offer.outcome}
            >
              {canManage ? (
                <RemoveMarketItemButton
                  accountId={accountId}
                  endpoint="offers"
                  itemId={offer.id}
                  label={offer.name}
                />
              ) : null}
            </MarketCard>
          ))}
          {!offers.length ? <EmptyState message="No offers yet. Add the offers this account should promote." /> : null}
        </div>
        {canManage ? <OfferForm accountId={accountId} serviceLines={serviceLines} audiences={audiences} /> : null}
      </StrategyPanel>
    </div>
  );
}

function ServiceLineForm({ accountId }: { accountId: string }) {
  return (
    <MarketForm
      accountId={accountId}
      endpoint="service-lines"
      title="Add service line"
      submitLabel="Add Service"
      fields={[
        { name: "name", label: "Service name", required: true, placeholder: "Pool maintenance" },
        { name: "shortName", label: "Short name", placeholder: "Maintenance" },
        { name: "description", label: "Description", kind: "textarea", placeholder: "What this service includes and who it helps." },
        { name: "primaryOutcome", label: "Primary outcome", kind: "textarea", placeholder: "What the customer gets from this service." },
      ]}
    />
  );
}

function AudienceForm({ accountId }: { accountId: string }) {
  return (
    <MarketForm
      accountId={accountId}
      endpoint="audiences"
      title="Add audience"
      submitLabel="Add Audience"
      fields={[
        { name: "name", label: "Audience name", required: true, placeholder: "Residential pool owners" },
        { name: "description", label: "Description", kind: "textarea", placeholder: "Who they are and what they care about." },
        { name: "commonPains", label: "Pain points", kind: "textarea", placeholder: "One per line" },
        { name: "desiredOutcomes", label: "Desired outcomes", kind: "textarea", placeholder: "One per line" },
        { name: "objections", label: "Common objections", kind: "textarea", placeholder: "One per line" },
      ]}
    />
  );
}

function OfferForm({
  accountId,
  serviceLines,
  audiences,
}: {
  accountId: string;
  serviceLines: ServiceLine[];
  audiences: Audience[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setMessage("Saving offer...");
    setError("");

    const response = await fetch(`/api/accounts/${accountId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        serviceLineId: formData.get("serviceLineId"),
        offerType: formData.get("offerType"),
        description: formData.get("description"),
        primaryCta: formData.get("primaryCta"),
        outcome: formData.get("outcome"),
        priceNotes: formData.get("priceNotes"),
        targetBuyerSegments: formData.get("targetBuyerSegments"),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage("");
      setError(result.error ?? "Unable to save offer.");
      return;
    }

    form.reset();
    setMessage("Offer added.");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className={accountStyles.softFormCard}>
      <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Add offer</h4>
      <div className={accountStyles.formGrid}>
        <Field label="Offer name" name="name" required placeholder="Spring maintenance plan" />
        <label className={accountStyles.field}>
          <span className={accountStyles.label}>Service line</span>
          <select name="serviceLineId" className={accountStyles.input}>
            <option value="">No service line selected</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>{serviceLine.name}</option>
            ))}
          </select>
        </label>
        <label className={accountStyles.field}>
          <span className={accountStyles.label}>Offer type</span>
          <select name="offerType" defaultValue="project" className={accountStyles.input}>
            {offerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <Field label="Primary CTA" name="primaryCta" placeholder="Schedule service" />
        <TextArea label="Description" name="description" placeholder="What the offer includes." />
        <TextArea label="Outcome" name="outcome" placeholder="What result the customer should expect." />
        <TextArea label="Price notes" name="priceNotes" placeholder="Optional pricing, package, or qualification notes." />
        <TextArea
          label="Target audiences"
          name="targetBuyerSegments"
          placeholder={audiences.length ? audiences.map((audience) => audience.name).join("\n") : "One audience per line"}
          wide
        />
      </div>
      <FormFooter isPending={isPending} submitLabel="Add Offer" message={message} error={error} />
    </form>
  );
}

type FieldConfig = {
  name: string;
  label: string;
  kind?: "input" | "textarea";
  required?: boolean;
  placeholder?: string;
};

function MarketForm({
  accountId,
  endpoint,
  title,
  submitLabel,
  fields,
}: {
  accountId: string;
  endpoint: "service-lines" | "audiences";
  title: string;
  submitLabel: string;
  fields: FieldConfig[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setMessage("Saving...");
    setError("");

    const response = await fetch(`/api/accounts/${accountId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage("");
      setError(result.error ?? "Unable to save.");
      return;
    }

    form.reset();
    setMessage("Saved.");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className={accountStyles.softFormCard}>
      <h4 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">{title}</h4>
      <div className={accountStyles.formGrid}>
        {fields.map((field) =>
          field.kind === "textarea" ? (
            <TextArea key={field.name} label={field.label} name={field.name} placeholder={field.placeholder} />
          ) : (
            <Field key={field.name} label={field.label} name={field.name} required={field.required} placeholder={field.placeholder} />
          ),
        )}
      </div>
      <FormFooter isPending={isPending} submitLabel={submitLabel} message={message} error={error} />
    </form>
  );
}

function RemoveMarketItemButton({
  accountId,
  endpoint,
  itemId,
  label,
}: {
  accountId: string;
  endpoint: "service-lines" | "audiences" | "offers";
  itemId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function onRemove() {
    setError("");
    if (!window.confirm(`Remove ${label} from this account strategy? This archives it but keeps history intact.`)) {
      return;
    }

    const response = await fetch(`/api/accounts/${accountId}/${endpoint}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Unable to remove item.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Removing..." : "Remove"}
      </button>
      {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

function StrategyPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className={accountStyles.strategyPanel}>
      <div className="mb-5">
        <h3 className="text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}

function MarketCard({
  title,
  subtitle,
  body,
  footer,
  children,
}: {
  title: string;
  subtitle?: string | null;
  body?: string | null;
  footer?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-950">{title}</h4>
          {subtitle ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">{subtitle}</p> : null}
        </div>
      </div>
      {body ? <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p> : null}
      {footer ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700">{footer}</p> : null}
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={accountStyles.field}>
      <span className={accountStyles.label}>{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className={accountStyles.input}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  wide = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? accountStyles.wideField : accountStyles.field}>
      <span className={accountStyles.label}>{label}</span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        className={accountStyles.textarea}
      />
    </label>
  );
}

function FormFooter({
  isPending,
  submitLabel,
  message,
  error,
}: {
  isPending: boolean;
  submitLabel: string;
  message: string;
  error: string;
}) {
  return (
    <div className={accountStyles.buttonRow}>
      <div>
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function compactList(label: string, values?: string[] | null) {
  const clean = (values ?? []).map((value) => value.trim()).filter(Boolean);
  if (!clean.length) return null;
  return `${label}: ${clean.slice(0, 3).join(", ")}${clean.length > 3 ? "..." : ""}`;
}
