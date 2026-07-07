import { preparePublicAssetContent } from "@/lib/content/public-content-cleaner";
import { summarizeMemoryForPrompt, BusinessMemoryContext } from "@/lib/content-generation/memory-context";
import { validatePublishReadyContent } from "@/lib/content-generation/content-sanity";
import { buildMonthlyCampaignPlan } from "@/lib/content-calendar/monthly-campaign-planner";
import { buildGenerationPromptDoctrineSection, buildRepairPromptDoctrineSection } from "@/lib/ai/prompt-doctrine";
import { buildAudiencePerspectivePrompt } from "@/lib/content-generation/audience-perspective";

type WeeklyPlan = ReturnType<typeof buildMonthlyCampaignPlan>[number];

export type GeneratedPackageAsset = {
  slotId: string;
  assetType: string;
  title: string;
  content: string;
};

type SlotInput = WeeklyPlan["assets"][number] & {
  slotId: string;
  slotNumber: number;
};

function readText(value: unknown) {
  return String(value ?? "").trim();
}

function extractOutputText(payload: Record<string, any>) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const output = Array.isArray(payload.output) ? payload.output : [];
  const parts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const contentItem of content) {
      if (typeof contentItem?.text === "string") {
        parts.push(contentItem.text);
      } else if (typeof contentItem?.text?.value === "string") {
        parts.push(contentItem.text.value);
      }
    }
  }

  return parts.join("\n");
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) throw new Error(`No JSON object found in model response. Response started with: ${trimmed.slice(0, 300)}`);

    return JSON.parse(match[0]);
  }
}

function normalizeAssetsPayload(raw: any): Array<Record<string, any>> {
  if (Array.isArray(raw)) return raw;

  if (Array.isArray(raw.assets)) return raw.assets;

  if (raw.title || raw.content) return [raw];

  return [];
}

function compactJson(value: unknown) {
  if (!value || typeof value !== "object") return "";

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function packagePrompt({
  month,
  campaignTheme,
  businessContext,
  week,
  slots,
  memory,
}: {
  month: string;
  campaignTheme: string;
  businessContext: string;
  week: WeeklyPlan;
  slots: SlotInput[];
  memory: BusinessMemoryContext;
}) {
  const assetList = slots
    .map((slot) => {
      const metadata =
        slot.metadata && typeof slot.metadata === "object"
          ? (slot.metadata as Record<string, unknown>)
          : {};
      const assetBrief = compactJson(metadata.assetBrief);
      const channelRole = compactJson(metadata.channelRole);

      return [
        `slotId: ${slot.slotId}`,
        `assetType: ${slot.assetType}`,
        `workingTitle: ${slot.title}`,
        `publishDate: ${slot.plannedPublishDate}`,
        assetBrief ? `assetBrief: ${assetBrief}` : "",
        channelRole ? `channelRole: ${channelRole}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  return [
    "You are the publish-ready content writer inside Rudy's VIP marketing system.",
    "Your job is to write strong first-draft content that a human can reasonably approve, not placeholder text.",
    "",
    "VOICE:",
    "- Friendly, supportive, confident, and authoritative.",
    "- Human, practical, direct, and easy to understand.",
    "- Use everyday sentences that the audience would actually understand.",
    "- Do not sound like a generic AI marketing assistant.",
    "- Do not simply restate input fields as sentences.",
    "- Do not stitch together audience, offer, proof, and training fragments. Rewrite the idea from scratch.",
    "",
    "FACTUALITY:",
    "- Be 100% factual.",
    "- Use saved business memory as the source of truth when available.",
    "- Do not invent clients, case studies, locations, metrics, guarantees, rankings, revenue, traffic, or proof.",
    "- If a fact is not in memory, write generally and safely.",
    "",
    "CONTEXT RULE:",
    "- Saved business memory is the source of truth when present.",
    "- Monthly strategy, brand training, and uploaded knowledge can add context and angle, but cannot contradict saved business memory.",
    "- Campaign strategy should guide the output; it should not appear verbatim as raw labels.",
    "- If memory or strategy contains awkward wording, fragments, lists, or notes, translate the meaning into clear public copy instead of copying it.",
    "",
    buildAudiencePerspectivePrompt({
      audience: week.strategy?.targetAudience,
      topic: week.publicTopic,
      offer: week.strategy?.primaryOffer,
    }),
    "",
    buildGenerationPromptDoctrineSection(["blog", "email", "linkedin", "facebook", "video", "visual"]),
    "",
    "PRIVATE SAVED BUSINESS MEMORY:",
    summarizeMemoryForPrompt(memory),
    "",
    "PRIVATE CAMPAIGN BRIEF:",
    `Month: ${month}`,
    `Campaign theme: ${campaignTheme}`,
    `Internal campaign name: ${week.campaignName}`,
    `Public topic: ${week.publicTopic ?? "Use the weekly topic from the campaign plan."}`,
    `Public title direction: ${week.publicTitle ?? "Create a clear public title."}`,
    `Private positioning note, not public copy: ${week.campaignAngle}`,
    businessContext ? `Additional monthly context: ${businessContext}` : "",
    "",
    "ASSETS TO WRITE:",
    assetList,
    "",
    "OUTPUT REQUIREMENTS:",
    "- Return strict JSON only.",
    "- Return an object with one key: assets.",
    "- assets must be an array with exactly one object for each slotId above.",
    "- Each object must include: slotId, title, content.",
    "- Do not include markdown code fences.",
    "- Do not include private memory labels, internal campaign labels, week labels, prompt notes, strategy labels, review notes, or asset IDs in public content.",
    "- Do not write from a marketer's perspective unless marketers are the explicit target audience.",
    "- Do not mention this week's campaign, the article, this content, generic messaging, the reader, the buyer, or what content should do.",
    "- For business-type audiences such as dental practices, contractors, clinics, or service companies, write to the owner/operator/decision-maker in that business.",
    "- Social posts must include natural emoji and relevant hashtags.",
    "- Blogs must be structured, useful, and nearly publish-ready.",
    "- Emails must sound like a person wrote them and include a clear next step.",
    "- Video scripts must be practical and understandable.",
    "- Every sentence must be complete and easy to understand.",
    "- Every asset must lead the reader through a sensible path: problem, why it matters, useful insight, practical next step.",
    "- If the draft sounds like source fields were merged together, rewrite it before returning JSON.",
    "",
    "JSON SHAPE:",
    '{"assets":[{"slotId":"linkedin_post_1","title":"...","content":"..."}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOpenAIForObject(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Publish-ready generation requires model-backed generation.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 12000,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI package generation failed: ${response.status} ${response.statusText} — ${text.slice(0, 800)}`);
  }

  const envelope = parseJsonObject(text);
  const outputText = extractOutputText(envelope);
  const raw = outputText ? parseJsonObject(outputText) : envelope;

  return raw;
}

async function callOpenAIForAssets(prompt: string) {
  const raw = await callOpenAIForObject(prompt);
  const assets = normalizeAssetsPayload(raw);

  if (!assets.length) {
    throw new Error("Package generation response did not include usable assets.");
  }

  return assets;
}

async function repairAsset({
  asset,
  issues,
  memory,
  week,
}: {
  asset: GeneratedPackageAsset;
  issues: string[];
  memory: BusinessMemoryContext;
  week: WeeklyPlan;
}) {
  const prompt = [
    "Repair this asset so it is publish-ready.",
    "Return strict JSON only with two fields: title and content.",
    "",
    "Private memory context:",
    summarizeMemoryForPrompt(memory),
    "",
    buildAudiencePerspectivePrompt({
      audience: week.strategy?.targetAudience,
      topic: week.publicTopic,
      offer: week.strategy?.primaryOffer,
    }),
    "",
    "Private positioning note, not public copy:",
    week.campaignAngle,
    "",
    "Asset type:",
    asset.assetType,
    "",
    "Issues to fix:",
    issues.map((issue) => `- ${issue}`).join("\n"),
    "",
    "Current title:",
    asset.title,
    "",
    "Current content:",
    asset.content,
    "",
    "Rules:",
    buildRepairPromptDoctrineSection(),
    "- Write the actual final public-facing content for the intended end reader.",
    "- If the current draft sounds like it is written for a marketer reviewing a campaign, rewrite it completely for the business owner/operator audience.",
    "- Do not include private labels, internal campaign names, week labels, IDs, or prompt notes.",
    "- Do not invent unsupported claims.",
    "- Keep a friendly, supportive, confident, authoritative human voice.",
    "- Rewrite awkward field fragments into natural everyday language.",
    "- Social posts must include emoji and hashtags.",
  ].join("\n");

  const raw = await callOpenAIForObject(prompt);

  return {
    ...asset,
    title: readText(raw.title) || asset.title,
    content: readText(raw.content) || asset.content,
  };
}

export async function generatePublishReadyWeeklyPackage({
  month,
  campaignTheme,
  businessContext,
  week,
  memory,
  assetTypes,
}: {
  month: string;
  campaignTheme: string;
  businessContext: string;
  week: WeeklyPlan;
  memory: BusinessMemoryContext;
  assetTypes?: string[];
}) {
  const allowedAssetTypes = assetTypes?.length ? new Set(assetTypes) : null;
  const slots: SlotInput[] = week.assets
    .map((asset, index) => ({
      ...asset,
      slotId: `${asset.assetType}_${index + 1}`,
      slotNumber: index + 1,
    }))
    .filter((asset) => !allowedAssetTypes || allowedAssetTypes.has(asset.assetType));

  if (!slots.length) {
    return [];
  }

  const responseAssets = await callOpenAIForAssets(
    packagePrompt({
      month,
      campaignTheme,
      businessContext,
      week,
      slots,
      memory,
    })
  );

  const bySlot = new Map<string, GeneratedPackageAsset>();

  for (const raw of responseAssets) {
    const slotId = readText(raw.slotId);
    const slot = slots.find((candidate) => candidate.slotId === slotId);

    if (!slot) continue;

    const prepared = preparePublicAssetContent({
      content: readText(raw.content),
      assetType: slot.assetType,
      title: readText(raw.title) || slot.title,
    });

    bySlot.set(slotId, {
      slotId,
      assetType: slot.assetType,
      title: readText(raw.title) || slot.title,
      content: prepared,
    });
  }

  const finalAssets: GeneratedPackageAsset[] = [];

  for (const slot of slots) {
    const generated = bySlot.get(slot.slotId);

    if (!generated) {
      throw new Error(`Publish-ready generation did not return content for ${slot.slotId}.`);
    }

    const sanity = validatePublishReadyContent({
      content: generated.content,
      assetType: slot.assetType,
    });

    if (!sanity.ok) {
      const repaired = await repairAsset({
        asset: generated,
        issues: sanity.issues,
        memory,
        week,
      });

      const repairedContent = preparePublicAssetContent({
        content: repaired.content,
        assetType: slot.assetType,
        title: repaired.title,
      });

      const repairedSanity = validatePublishReadyContent({
        content: repairedContent,
        assetType: slot.assetType,
      });

      if (!repairedSanity.ok) {
        throw new Error(
          `${slot.slotId} failed publish-ready sanity check: ${repairedSanity.issues.join("; ")}`
        );
      }

      finalAssets.push({
        ...repaired,
        content: repairedContent,
      });
    } else {
      finalAssets.push(generated);
    }
  }

  return finalAssets;
}
