"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import formStyles from "@/components/forms/VipForm.module.css";
import type { BrandVoiceMonthlyOptions } from "@/lib/accounts/brand-voice-monthly-options";
import { websiteStyles } from "@/components/website-ui/WebsitePage";
import type { OneOffCampaignStrategy } from "@/lib/content-generation/one-off-strategy-gate";
import type {
  StrategyEngineDiagnostics,
  StrategyQualityGateDiagnostic,
  StrategyQualityGateStage,
} from "@/lib/content-generation/strategy-engine-v2/types";
import {
  countMissingOneOffStrategyFields,
  EMPTY_ONE_OFF_STRATEGY,
  ONE_OFF_STRATEGY_FIELDS,
} from "@/lib/content-generation/one-off-strategy-form";

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


type CampaignCreatePayload = {
  name: string;
  service_line_id: string | null;
  offer_id: string | null;
  idea: string;
  buyer_segment: string;
  audience: string;
  goal: string;
  promoted_offer: string;
  platforms: string[];
  tone: string;
  cta: string;
  notes: string;
  differentiator: string;
  proofPoints: string;
  originalityAngle: string;
  objections: string;
  strategyContext: string;
  sourceContext: string;
};

type StrategyPreview = {
  accountId: string;
  workflowVersion: string;
  strategy: OneOffCampaignStrategy;
  sourceSignature: string;
  generator: "openai";
  generatedAt: string;
  intelligenceReadinessScore: number;
  intelligenceMissingElements: string[];
  strategyEngine: StrategyEngineDiagnostics;
};

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, any>;

  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { error: text };
  }
}
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

function suggestedCtaForOffer(value: string) {
  const offer = value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (!offer) return "";

  if (/\bconsult(?:ation)?\b/i.test(offer)) return `Schedule a ${offer}`;
  if (/\bdemo(?:nstration)?\b/i.test(offer)) return `Schedule a ${offer}`;
  if (/\b(?:audit|assessment|diagnostic)\b/i.test(offer)) return `Book a ${offer}`;
  if (/\b(?:webinar|workshop|seminar)\b/i.test(offer)) return `Register for the ${offer}`;
  if (/\b(?:guide|checklist|playbook|ebook|template)\b/i.test(offer)) return `Download the ${offer}`;
  if (/\b(?:trial|pilot)\b/i.test(offer)) return `Start the ${offer}`;
  return "";
}

function offerFromCta(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(?:please\s+)?(?:schedule|book|request|get|download|register(?:\s+for)?|join|start|reserve|claim)\s+/i,
      "",
    )
    .replace(/^(?:a|an|the|your|our)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function diagnosticStageLabel(stage: StrategyQualityGateStage) {
  const labels: Record<StrategyQualityGateStage, string> = {
    configuration: "AI configuration",
    planning: "Semantic planning",
    planning_repair: "Semantic planning repair",
    strategy: "Strategy writing",
    quality_review: "Editorial quality review",
    final_validation: "Final deterministic validation",
  };

  return labels[stage];
}

function diagnosticStatusLabel(
  status: StrategyQualityGateDiagnostic["requestStatus"],
) {
  return status.replaceAll("_", " ");
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
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategyFailureDiagnostic, setStrategyFailureDiagnostic] =
    useState<StrategyQualityGateDiagnostic | null>(null);
  const [strategyPreview, setStrategyPreview] = useState<StrategyPreview | null>(null);
  const [strategyDraft, setStrategyDraft] = useState<OneOffCampaignStrategy>(
    EMPTY_ONE_OFF_STRATEGY,
  );
  const [strategyBriefSnapshot, setStrategyBriefSnapshot] = useState<string | null>(null);
  const [strategyEdited, setStrategyEdited] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [buyerSegment, setBuyerSegment] = useState("");
  const [idea, setIdea] = useState("");
  const [serviceLineId, setServiceLineId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [goal, setGoal] = useState("");
  const [promotedOffer, setPromotedOffer] = useState("");
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
    const previousSelected = offers.find((item) => item.id === offerId) ?? null;
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

    if (
      !promotedOffer.trim() ||
      promotedOffer.trim().toLowerCase() === previousSelected?.name.toLowerCase()
    ) {
      setPromotedOffer(selected.name);
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
  }

  function pickBrandOffer(value: string) {
    setPromotedOffer(value);
    if (!campaignName.trim()) setCampaignName(`${value} Campaign`);
    if (!idea.trim()) setIdea(`Promote ${value}.`);
    if (!cta.trim()) {
      const suggestedCta = suggestedCtaForOffer(value);
      if (suggestedCta) setCta(suggestedCta);
    }
  }

  function pickBrandTone(value: string) {
    setTone(value);
  }

  function pickBrandCta(value: string) {
    setCta(value);
    if (!promotedOffer.trim()) {
      const inferredOffer = offerFromCta(value);
      if (inferredOffer) setPromotedOffer(inferredOffer);
    }
  }

  function pickDifferentiator(value: string) {
    setDifferentiator(value);
  }

  function pickProofPoint(value: string) {
    setProofPoints((current) => appendContext(current, value));
  }

  function pickKnowledge(value: string) {
    setNotes((current) => appendContext(current, value));
    addSourceContext("Knowledge source selected for one-off campaign", value);
  }

  function buildPayload(): CampaignCreatePayload {
    return {
      name: campaignName.trim(),
      service_line_id: serviceLineId || null,
      offer_id: offerId || null,
      idea,
      buyer_segment: buyerSegment,
      audience,
      goal,
      promoted_offer: promotedOffer,
      platforms: platforms
        .split(",")
        .map((platform) => platform.trim())
        .filter(Boolean),
      tone,
      cta,
      notes,
      differentiator,
      proofPoints,
      originalityAngle,
      objections,
      strategyContext,
      sourceContext,
    };
  }

  function campaignBriefSnapshot(payload: CampaignCreatePayload) {
    return JSON.stringify(payload);
  }

  async function generateStrategy() {
    const payload = buildPayload();
    setStrategyLoading(true);
    setMessage(null);
    setError(null);
    setStrategyFailureDiagnostic(null);

    try {
      const response = await fetch("/api/campaigns/strategy-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setStrategyPreview(null);
        setStrategyDraft(EMPTY_ONE_OFF_STRATEGY);
        setStrategyBriefSnapshot(null);
        setStrategyEdited(false);
        setStrategyFailureDiagnostic(
          (result.strategyDiagnostic as StrategyQualityGateDiagnostic | undefined) ??
            null,
        );
        setError(result.error ?? "Unable to generate campaign strategy.");
        return;
      }

      const preview = result as StrategyPreview;
      setStrategyPreview(preview);
      setStrategyDraft(preview.strategy);
      setStrategyBriefSnapshot(campaignBriefSnapshot(payload));
      setStrategyEdited(false);
      setStrategyFailureDiagnostic(null);
      setMessage(
        "Marketing Spine generated. Review and edit it before creating the campaign.",
      );
    } catch (err) {
      setStrategyPreview(null);
      setStrategyDraft(EMPTY_ONE_OFF_STRATEGY);
      setStrategyBriefSnapshot(null);
      setStrategyEdited(false);
      setStrategyFailureDiagnostic({
        stage: "strategy",
        requestStatus: "api_error",
        completedStages: [],
        blockingIssues: [
          "The browser could not complete the strategy-preview request, so no server-side quality evaluation was returned.",
        ],
        advisoryIssues: [],
        reviewApproved: null,
        reviewIssues: [],
        retryable: true,
        httpStatus: null,
        apiErrorCode: null,
        requestId: null,
        attemptedModels: [],
        fallbackModelUsed: false,
      });
      setError(
        err instanceof Error ? err.message : "Unexpected strategy error.",
      );
    } finally {
      setStrategyLoading(false);
    }
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await generateStrategy();
  }

  function updateStrategyField(
    key: keyof OneOffCampaignStrategy,
    value: string,
  ) {
    setStrategyDraft((current) => ({ ...current, [key]: value }));
    setStrategyEdited(true);
    setMessage(null);
  }

  async function createApprovedCampaign() {
    if (!strategyPreview) return;

    const payload = buildPayload();
    const currentSnapshot = campaignBriefSnapshot(payload);

    if (strategyBriefSnapshot !== currentSnapshot) {
      setError(
        "Campaign inputs changed after the strategy was generated. Regenerate the Marketing Spine before approval.",
      );
      return;
    }

    const missingCount = countMissingOneOffStrategyFields(strategyDraft);
    if (missingCount) {
      setError(
        `Complete ${missingCount} required strategy section${missingCount === 1 ? "" : "s"} before creating the campaign.`,
      );
      return;
    }

    const confirmed = window.confirm(
      "Approve this Marketing Spine and create the campaign? Content assets will remain locked to this approved strategy.",
    );
    if (!confirmed) return;

    setCreating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          approvedStrategy: strategyDraft,
          strategyApprovalConfirmed: true,
          strategyWorkflowVersion: strategyPreview.workflowVersion,
          strategySourceSignature: strategyPreview.sourceSignature,
          strategyAccountId: strategyPreview.accountId,
          strategyGenerator: strategyPreview.generator,
          strategyGeneratedAt: strategyPreview.generatedAt,
          strategyEdited,
          strategyEngine: strategyPreview.strategyEngine,
          intelligenceReadinessScore:
            strategyPreview.intelligenceReadinessScore,
          intelligenceMissingElements:
            strategyPreview.intelligenceMissingElements,
        }),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create approved campaign.");
      }

      const campaignId = result.campaign?.id;
      if (!campaignId) {
        throw new Error("Campaign was created without a campaign identifier.");
      }

      setMessage("Strategy approved. Campaign created.");
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected campaign error.",
      );
    } finally {
      setCreating(false);
    }
  }

  const currentBriefSnapshot = campaignBriefSnapshot(buildPayload());
  const strategyStale = Boolean(
    strategyPreview && strategyBriefSnapshot !== currentBriefSnapshot,
  );
  const missingStrategyCount = countMissingOneOffStrategyFields(strategyDraft);

  return (
    <form onSubmit={handleFormSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Create a one-off campaign</h2>
        <p className={formStyles.description}>
          Complete the existing brief, generate the Marketing Spine, and approve the strategy before VIP creates the campaign. No campaign row or content asset is created during the strategy-preview step.
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

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Campaign Offer / Desired Conversion</span>
          <input
            name="promoted_offer"
            value={promotedOffer}
            onChange={(event) => setPromotedOffer(event.target.value)}
            className={formStyles.input}
            placeholder="Marketing VIP Demo"
            required
          />
          <span className={formStyles.help}>
            This is the authoritative offer for this campaign. It may match the selected Account Strategy offer or override it for a custom campaign.
          </span>
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
            placeholder="Generate qualified demo requests"
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
            onChange={(event) => setOriginalityAngle(event.target.value)}
            className={formStyles.textarea}
            placeholder="What makes this campaign sharper than a generic marketing campaign?"
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Objections to Address</span>
          <textarea
            value={objections}
            onChange={(event) => setObjections(event.target.value)}
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
            onChange={(event) => setDifferentiator(event.target.value)}
            className={formStyles.textarea}
          />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Proof Points</span>
          <textarea
            value={proofPoints}
            onChange={(event) => setProofPoints(event.target.value)}
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

      <div className={formStyles.divider} />

      <div className={formStyles.header}>
        <div className="flex flex-wrap gap-2">
          <span className={websiteStyles.badge}>Step 1</span>
          <span className={websiteStyles.badge}>Strategy preview only</span>
          <span className={websiteStyles.badge}>No campaign created yet</span>
        </div>
        <h3 className={formStyles.smallTitle} style={{ marginTop: 14 }}>
          Generate the Marketing Spine
        </h3>
        <p className={formStyles.description}>
          VIP will privately synthesize the brief and relevant account knowledge into a reviewable campaign strategy. The campaign is not saved until you approve this strategy.
        </p>
      </div>

      <div className={formStyles.actions}>
        <button
          type="submit"
          disabled={strategyLoading || creating}
          className={formStyles.submit}
        >
          {strategyLoading
            ? "Generating Strategy..."
            : strategyPreview
              ? "Regenerate Campaign Strategy"
              : "Generate Campaign Strategy"}
        </button>
        {strategyPreview ? (
          <span className={formStyles.help}>
            Regenerating replaces the current unapproved strategy draft.
          </span>
        ) : null}
      </div>

      {strategyFailureDiagnostic ? (
        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <span className={formStyles.label}>Strategy generation diagnostic</span>
            <p className={formStyles.description}>
              Stage: <strong>{diagnosticStageLabel(strategyFailureDiagnostic.stage)}</strong>
              {" · "}Request status: {diagnosticStatusLabel(strategyFailureDiagnostic.requestStatus)}
              {" · "}Retryable: {strategyFailureDiagnostic.retryable ? "yes" : "no"}
            </p>

            <p className={formStyles.description}>
              Completed stages: {strategyFailureDiagnostic.completedStages.length
                ? strategyFailureDiagnostic.completedStages
                    .map(diagnosticStageLabel)
                    .join(" → ")
                : "No AI stage completed"}
            </p>

            {strategyFailureDiagnostic.httpStatus ||
            strategyFailureDiagnostic.apiErrorCode ||
            strategyFailureDiagnostic.attemptedModels.length ? (
              <p className={formStyles.description}>
                API response: {strategyFailureDiagnostic.httpStatus
                  ? `HTTP ${strategyFailureDiagnostic.httpStatus}`
                  : "No HTTP status returned"}
                {strategyFailureDiagnostic.apiErrorCode
                  ? ` · Code: ${strategyFailureDiagnostic.apiErrorCode}`
                  : ""}
                {strategyFailureDiagnostic.attemptedModels.length
                  ? ` · Models attempted: ${strategyFailureDiagnostic.attemptedModels.join(", ")}`
                  : ""}
                {strategyFailureDiagnostic.fallbackModelUsed
                  ? " · Compatible model fallback attempted"
                  : ""}
              </p>
            ) : null}

            {strategyFailureDiagnostic.requestId ? (
              <p className={formStyles.description}>
                OpenAI request ID: {strategyFailureDiagnostic.requestId}
              </p>
            ) : null}

            {strategyFailureDiagnostic.reviewApproved !== null ? (
              <p className={formStyles.description}>
                Editorial decision: {strategyFailureDiagnostic.reviewApproved ? "approved" : "not approved"}
              </p>
            ) : (
              <p className={formStyles.description}>
                Editorial decision: not reached
              </p>
            )}

            {strategyFailureDiagnostic.blockingIssues.length ? (
              <div>
                <span className={formStyles.label}>Blocking findings</span>
                <ul className={formStyles.description}>
                  {strategyFailureDiagnostic.blockingIssues.map((issue, index) => (
                    <li key={`blocking-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {strategyFailureDiagnostic.reviewIssues.length ? (
              <div>
                <span className={formStyles.label}>Editorial findings</span>
                <ul className={formStyles.description}>
                  {strategyFailureDiagnostic.reviewIssues.map((issue, index) => (
                    <li key={`review-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {strategyFailureDiagnostic.advisoryIssues.length ? (
              <div>
                <span className={formStyles.label}>Advisory findings</span>
                <ul className={formStyles.description}>
                  {strategyFailureDiagnostic.advisoryIssues.map((issue, index) => (
                    <li key={`advisory-${index}`}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {strategyPreview ? (
        <>
          <div className={formStyles.divider} />

          <div className={formStyles.header}>
            <div className="flex flex-wrap gap-2">
              <span className={websiteStyles.badge}>Step 2</span>
              <span className={websiteStyles.badge}>Review before creation</span>
              <span className={websiteStyles.badge}>
                {strategyPreview.intelligenceReadinessScore}/100 source readiness
              </span>
              <span className={websiteStyles.badge}>
                {strategyEdited ? "Human edited" : "Quality-approved AI draft"}
              </span>
            </div>
            <h3 className={formStyles.smallTitle} style={{ marginTop: 14 }}>
              Approve the campaign strategy
            </h3>
            <p className={formStyles.description}>
              Edit any section that feels generic or misaligned. Only the approved Marketing Spine and verified facts will guide the content assets.
            </p>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <span className={formStyles.label}>Strategy source resolution</span>
              <p className={formStyles.description}>
                Promoted offer: <strong>{strategyPreview.strategyEngine.promotedOffer}</strong>
                {" · "}Source: {strategyPreview.strategyEngine.offerSource.replaceAll("_", " ")}
                {" · "}Engine: {strategyPreview.strategyEngine.version}
              </p>
              <p className={formStyles.description}>
                Semantic plan: {strategyPreview.strategyEngine.semanticPlanGenerated ? "passed" : "not run"}
                {" · "}Planning repair: {strategyPreview.strategyEngine.semanticPlanRepairUsed ? "used" : "not needed"}
                {" · "}Editorial quality review: {strategyPreview.strategyEngine.qualityReviewPassed ? "passed" : "blocked"}
              </p>
              {strategyPreview.strategyEngine.ignoredOffers.length ? (
                <p className={formStyles.message}>
                  Excluded conflicting account offer{strategyPreview.strategyEngine.ignoredOffers.length === 1 ? "" : "s"}: {strategyPreview.strategyEngine.ignoredOffers.join(", ")}.
                </p>
              ) : null}
              {strategyPreview.strategyEngine.conflicts.map((conflict) => (
                <p key={conflict.code} className={conflict.severity === "blocking" ? formStyles.error : formStyles.description}>
                  {conflict.message}
                </p>
              ))}
            </div>
          </div>

          {strategyStale ? (
            <p className={formStyles.error}>
              The campaign brief changed after this strategy was generated. Regenerate the Marketing Spine before approval.
            </p>
          ) : (
            <p className={formStyles.message}>
              No campaign exists yet. Approval will create the campaign with this strategy already locked.
            </p>
          )}

          {strategyPreview.intelligenceMissingElements.length ? (
            <p className={formStyles.description}>
              Review these thin-source areas carefully: {strategyPreview.intelligenceMissingElements.join(", ")}.
            </p>
          ) : null}

          <div className={[formStyles.grid, formStyles.grid2].join(" ")}>
            {ONE_OFF_STRATEGY_FIELDS.map((field) => (
              <label key={field.key} className={formStyles.field}>
                <span className={formStyles.label}>{field.label}</span>
                <textarea
                  value={strategyDraft[field.key]}
                  onChange={(event) =>
                    updateStrategyField(field.key, event.target.value)
                  }
                  rows={field.rows ?? 4}
                  className={formStyles.textarea}
                />
                <span className={formStyles.help}>{field.helper}</span>
              </label>
            ))}
          </div>

          <div className={formStyles.actions}>
            <button
              type="button"
              onClick={createApprovedCampaign}
              disabled={
                creating ||
                strategyLoading ||
                strategyStale ||
                missingStrategyCount > 0
              }
              className={formStyles.submit}
            >
              {creating
                ? "Creating Approved Campaign..."
                : "Approve Strategy and Create Campaign"}
            </button>
            {missingStrategyCount ? (
              <span className={formStyles.help}>
                Complete {missingStrategyCount} required strategy section{missingStrategyCount === 1 ? "" : "s"} before approval.
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {message ? <p className={formStyles.message}>{message}</p> : null}
      {error ? <p className={formStyles.error}>{error}</p> : null}
    </form>
  );
}
