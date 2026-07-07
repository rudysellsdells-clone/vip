"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import type { BrandVoiceMonthlyOptions } from "@/lib/accounts/brand-voice-monthly-options";

type ServiceLineOption = {
  id: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
  primaryOutcome?: string | null;
};

type BuyerSegmentOption = {
  id: string;
  name: string;
  description?: string | null;
  commonPains?: string[];
  desiredOutcomes?: string[];
  objections?: string[];
};

type OfferOption = {
  id: string;
  name: string;
  serviceLineId?: string | null;
  description?: string | null;
  offerType?: string | null;
  primaryCta?: string | null;
  outcome?: string | null;
  priceNotes?: string | null;
  targetBuyerSegments?: string[];
};

export type CampaignKnowledgeOption = {
  id: string;
  label: string;
  value: string;
  sourceType: "knowledge_source" | "content_example";
};

function joinParts(parts: Array<string | null | undefined>, separator = "\n") {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(separator);
}

function appendContext(current: string, next: string) {
  const cleanNext = next.trim();

  if (!cleanNext) return current;
  if (current.toLowerCase().includes(cleanNext.toLowerCase())) return current;

  return [current.trim(), cleanNext].filter(Boolean).join("\n\n");
}

function optionLabel(value: string) {
  return value.length > 84 ? `${value.slice(0, 81)}...` : value;
}

function ShortcutSelect({
  label,
  helper,
  emptyLabel,
  options,
  onPick,
}: {
  label: string;
  helper?: string;
  emptyLabel: string;
  options: Array<{ id: string; label: string; value: string }>;
  onPick: (value: string) => void;
}) {
  if (!options.length) return null;

  return (
    <label className={formStyles.field}>
      <span className={formStyles.label}>{label}</span>
      <select
        value=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) onPick(value);
        }}
        className={formStyles.select}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label || optionLabel(option.value)}
          </option>
        ))}
      </select>
      {helper ? <span className={formStyles.help}>{helper}</span> : null}
    </label>
  );
}

export function CampaignWebsiteForm({
  serviceLines,
  buyerSegments,
  offers,
  brandVoiceOptions,
  knowledgeOptions = [],
  accountStrategyUrl = "/accounts",
}: {
  serviceLines: ServiceLineOption[];
  buyerSegments: BuyerSegmentOption[];
  offers: OfferOption[];
  brandVoiceOptions?: BrandVoiceMonthlyOptions;
  knowledgeOptions?: CampaignKnowledgeOption[];
  accountStrategyUrl?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [buyerSegment, setBuyerSegment] = useState("");
  const [idea, setIdea] = useState("");
  const [serviceLineId, setServiceLineId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [goal, setGoal] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [platforms, setPlatforms] = useState("Email, LinkedIn, Facebook, YouTube");
  const [notes, setNotes] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [proofPoints, setProofPoints] = useState("");
  const [originalityAngle, setOriginalityAngle] = useState("");
  const [objections, setObjections] = useState("");
  const [strategyContext, setStrategyContext] = useState("");
  const [sourceContext, setSourceContext] = useState("");

  const selectedServiceLine = serviceLines.find((item) => item.id === serviceLineId) ?? null;
  const selectedOffer = offers.find((item) => item.id === offerId) ?? null;
  const selectedBuyerSegment = buyerSegments.find((item) => item.name === buyerSegment) ?? null;

  function addStrategyContext(label: string, value: string) {
    const next = value.trim();
    if (!next) return;

    setStrategyContext((current) => appendContext(current, `${label}:\n${next}`));
  }

  function addSourceContext(label: string, value: string) {
    const next = value.trim();
    if (!next) return;

    setSourceContext((current) => appendContext(current, `${label}:\n${next}`));
  }

  function handleBuyerSegment(value: string) {
    setBuyerSegment(value);
    const selected = buyerSegments.find((item) => item.name === value);

    if (!selected) return;

    const audienceContext = joinParts([
      selected.name,
      selected.description ?? "",
      selected.commonPains?.length ? `Pain points: ${selected.commonPains.join("; ")}` : "",
      selected.desiredOutcomes?.length ? `Desired outcomes: ${selected.desiredOutcomes.join("; ")}` : "",
    ], "\n");

    if (!audience.trim()) {
      setAudience(selected.description ? `${selected.name}: ${selected.description}` : selected.name);
    }

    if (!objections.trim() && selected.objections?.length) {
      setObjections(selected.objections.join("\n"));
    }

    addStrategyContext("Selected audience from Account Strategy", audienceContext);

    if (selected.objections?.length) {
      addStrategyContext("Audience objections from Account Strategy", selected.objections.join("\n"));
    }
  }

  function handleServiceLine(value: string) {
    setServiceLineId(value);
    const selected = serviceLines.find((item) => item.id === value);

    if (!selected) return;

    if (!campaignName.trim()) {
      setCampaignName(`${selected.name} Campaign`);
    }

    if (!idea.trim() && selected.description) {
      setIdea(selected.description);
    }

    if (!goal.trim() && selected.primaryOutcome) {
      setGoal(selected.primaryOutcome);
    }

    addStrategyContext(
      "Selected service line from Account Strategy",
      joinParts([
        selected.name,
        selected.description ?? "",
        selected.primaryOutcome ? `Primary outcome: ${selected.primaryOutcome}` : "",
      ], "\n"),
    );
  }

  function handleOffer(value: string) {
    setOfferId(value);
    const selected = offers.find((item) => item.id === value);

    if (!selected) return;

    if (!campaignName.trim()) {
      setCampaignName(`${selected.name} Campaign`);
    }

    if (!idea.trim()) {
      setIdea(
        joinParts([
          `Promote ${selected.name}.`,
          selected.description ?? "",
          selected.outcome ? `Outcome: ${selected.outcome}` : "",
        ], "\n"),
      );
    }

    if (!goal.trim()) {
      setGoal(selected.outcome || `Promote ${selected.name}`);
    }

    if (!cta.trim() && selected.primaryCta) {
      setCta(selected.primaryCta);
    }

    addStrategyContext(
      "Selected offer from Account Strategy",
      joinParts([
        selected.name,
        selected.description ?? "",
        selected.outcome ? `Outcome: ${selected.outcome}` : "",
        selected.primaryCta ? `Primary CTA: ${selected.primaryCta}` : "",
        selected.priceNotes ? `Price/package notes: ${selected.priceNotes}` : "",
      ], "\n"),
    );
  }

  function pickBrandAudience(value: string) {
    if (!audience.trim()) {
      setAudience(value);
    } else {
      setAudience((current) => appendContext(current, value));
    }

    addStrategyContext("Audience from Brand Voice", value);
  }

  function pickBrandOffer(value: string) {
    if (!idea.trim()) {
      setIdea(value);
    } else {
      setIdea((current) => appendContext(current, value));
    }

    addStrategyContext("Offer from Brand Voice", value);
  }

  function pickBrandTone(value: string) {
    setTone(value);
    addStrategyContext("Tone from Brand Voice", value);
  }

  function pickBrandCta(value: string) {
    setCta(value);
    addStrategyContext("CTA from Brand Voice", value);
  }

  function pickDifferentiator(value: string) {
    setDifferentiator(value);
    addStrategyContext("Differentiator from Brand Voice", value);
  }

  function pickProofPoint(value: string) {
    setProofPoints((current) => appendContext(current, value));
    addStrategyContext("Proof point from Brand Voice", value);
  }

  function pickKnowledge(value: string) {
    setNotes((current) => appendContext(current, value));
    addSourceContext("Knowledge source selected for one-off campaign", value);
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const selectedPlatforms = platforms
        .split(",")
        .map((platform) => platform.trim())
        .filter(Boolean);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: campaignName || formData.get("name"),
          service_line_id: serviceLineId || null,
          offer_id: offerId || null,
          idea,
          buyer_segment: buyerSegment,
          audience,
          goal,
          platforms: selectedPlatforms,
          tone,
          cta,
          notes,
          differentiator,
          proofPoints,
          originalityAngle,
          objections,
          strategyContext,
          sourceContext,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create campaign.");
      }

      setMessage("Campaign created.");
      const campaignId = result.campaign?.id;

      if (campaignId) {
        router.push(`/campaigns/${campaignId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Create a one-off campaign</h2>
        <p className={formStyles.description}>
          Use Account Strategy, Brand Voice, and Knowledge shortcuts to build a focused campaign brief. VIP will keep this as a fast one-off campaign path while the monthly workflow uses the full Marketing Spine gate.
        </p>
        <div className={formStyles.actions}>
          <Link href={accountStrategyUrl} className={formStyles.secondaryButton}>
            Manage Account Strategy
          </Link>
          <span className={formStyles.help}>
            Audiences, service lines, and offers are managed on the active account workspace.
          </span>
        </div>
      </div>

      <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Name</span>
          <input
            name="name"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            className={formStyles.input}
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Audience from Account Strategy</span>
          <select
            name="buyer_segment"
            value={buyerSegment}
            onChange={(event) => handleBuyerSegment(event.target.value)}
            className={formStyles.select}
            required
          >
            <option value="">Select audience</option>
            {buyerSegments.map((segment) => (
              <option key={segment.id} value={segment.name}>
                {segment.name}
              </option>
            ))}
          </select>
          {buyerSegments.length === 0 ? (
            <span className={formStyles.help}>
              No audiences found. Use Manage Account Strategy to add the buyer groups this account serves.
            </span>
          ) : (
            <span className={formStyles.help}>
              Pulls audience, pain point, outcome, and objection context from Account Strategy.
            </span>
          )}
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Idea</span>
          <textarea
            name="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            className={[formStyles.textarea, formStyles.textareaLarge].join(" ")}
            required
          />
          <span className={formStyles.help}>
            This can be filled manually or populated from offer/Brand Voice shortcuts below.
          </span>
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Service Line from Account Strategy</span>
          <select
            name="service_line_id"
            value={serviceLineId}
            onChange={(event) => handleServiceLine(event.target.value)}
            className={formStyles.select}
          >
            <option value="">Select service line</option>
            {serviceLines.map((serviceLine) => (
              <option key={serviceLine.id} value={serviceLine.id}>
                {serviceLine.name}
              </option>
            ))}
          </select>
          {selectedServiceLine?.description ? (
            <span className={formStyles.help}>{selectedServiceLine.description}</span>
          ) : null}
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Offer from Account Strategy</span>
          <select
            name="offer_id"
            value={offerId}
            onChange={(event) => handleOffer(event.target.value)}
            className={formStyles.select}
          >
            <option value="">Select offer</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
          {selectedOffer?.description ? (
            <span className={formStyles.help}>{selectedOffer.description}</span>
          ) : offers.length === 0 ? (
            <span className={formStyles.help}>
              No offers found. Use Manage Account Strategy to add the offers this account can promote.
            </span>
          ) : null}
        </label>
      </div>

      <div className={formStyles.divider} />

      <div className={formStyles.header}>
        <h3 className={formStyles.smallTitle}>Brand Voice + Knowledge shortcuts</h3>
        <p className={formStyles.description}>
          These dropdowns do not replace the brief. They pull reusable brand, proof, CTA, tone, and memory into the one-off campaign. Audiences, service lines, and offers come from Account Strategy.
        </p>
      </div>

      <div className={[formStyles.grid, formStyles.grid3].join(" ")}>
        <ShortcutSelect
          label="Audience from Brand Voice"
          emptyLabel="Choose audience"
          options={brandVoiceOptions?.audiences ?? []}
          onPick={pickBrandAudience}
        />
        <ShortcutSelect
          label="Offer from Brand Voice"
          emptyLabel="Choose offer"
          options={brandVoiceOptions?.offers ?? []}
          onPick={pickBrandOffer}
        />
        <ShortcutSelect
          label="Tone from Brand Voice"
          emptyLabel="Choose tone"
          options={brandVoiceOptions?.tones ?? []}
          onPick={pickBrandTone}
        />
        <ShortcutSelect
          label="CTA from Brand Voice"
          emptyLabel="Choose CTA"
          options={brandVoiceOptions?.ctas ?? []}
          onPick={pickBrandCta}
        />
        <ShortcutSelect
          label="Differentiator"
          emptyLabel="Choose differentiator"
          options={brandVoiceOptions?.differentiators ?? []}
          onPick={pickDifferentiator}
        />
        <ShortcutSelect
          label="Proof Point"
          emptyLabel="Choose proof point"
          options={brandVoiceOptions?.proofPoints ?? []}
          onPick={pickProofPoint}
        />
      </div>

      {knowledgeOptions.length ? (
        <div className={formStyles.row}>
          <ShortcutSelect
            label="Knowledge / Example Source"
            helper="Adds selected source material to the brief notes and campaign strategy context."
            emptyLabel="Choose knowledge source"
            options={knowledgeOptions}
            onPick={pickKnowledge}
          />
        </div>
      ) : null}

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Goal</span>
          <input
            name="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className={formStyles.input}
            placeholder="Book audit calls"
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>CTA</span>
          <input
            name="cta"
            value={cta}
            onChange={(event) => setCta(event.target.value)}
            className={formStyles.input}
            placeholder="Book a call"
            required
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Tone</span>
          <input
            name="tone"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className={formStyles.input}
            placeholder="Clear, practical, confident"
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Audience</span>
          <input
            name="audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className={formStyles.input}
            placeholder="Business owners..."
          />
          {selectedBuyerSegment?.description ? (
            <span className={formStyles.help}>{selectedBuyerSegment.description}</span>
          ) : null}
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Platforms</span>
          <input
            name="platforms"
            value={platforms}
            onChange={(event) => setPlatforms(event.target.value)}
            className={formStyles.input}
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Originality Angle</span>
          <textarea
            value={originalityAngle}
            onChange={(event) => {
              setOriginalityAngle(event.target.value);
              addStrategyContext("Originality angle", event.target.value);
            }}
            className={formStyles.textarea}
            placeholder="What makes this campaign sharper than a generic marketing campaign?"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Objections to Address</span>
          <textarea
            value={objections}
            onChange={(event) => {
              setObjections(event.target.value);
              addStrategyContext("Objections to address", event.target.value);
            }}
            className={formStyles.textarea}
            placeholder="Cost, timing, complexity, trust, urgency..."
          />
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Differentiator</span>
          <textarea
            value={differentiator}
            onChange={(event) => {
              setDifferentiator(event.target.value);
              addStrategyContext("Differentiator", event.target.value);
            }}
            className={formStyles.textarea}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Proof Points</span>
          <textarea
            value={proofPoints}
            onChange={(event) => {
              setProofPoints(event.target.value);
              addStrategyContext("Proof points", event.target.value);
            }}
            className={formStyles.textarea}
          />
        </label>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Notes / Source Material</span>
          <textarea
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={formStyles.textarea}
          />
          <span className={formStyles.help}>
            Knowledge selections, proof points, objections, and positioning context are saved into the one-off campaign strategy.
          </span>
        </label>
      </div>

      {strategyContext || sourceContext ? (
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Context VIP will save with this one-off campaign</span>
            <textarea
              value={[strategyContext, sourceContext].filter(Boolean).join("\n\n")}
              readOnly
              className={formStyles.textarea}
            />
          </label>
        </div>
      ) : null}

      <div className={formStyles.actions}>
        <button type="submit" disabled={saving} className={formStyles.submit}>
          {saving ? "Creating..." : "Create One-Off Campaign"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
