import type {
  AdPackage,
  PaidSocialAdVariant,
  SearchAdVariant,
} from "./ad-package";

export type AdPackageScore = {
  version: "h1.17";
  total: number;
  rating: "excellent" | "ready" | "needs_work";
  dimensions: {
    completeness: number;
    platformFit: number;
    strategyTraceability: number;
    attributionReadiness: number;
    variantDiversity: number;
  };
  issues: string[];
  recommendations: string[];
};

function validUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueRatio(values: string[]) {
  if (!values.length) return 0;
  return new Set(values.map((value) => value.trim().toLowerCase())).size / values.length;
}

function searchScores(variants: SearchAdVariant[]) {
  const issues: string[] = [];
  const recommendations: string[] = [];
  if (variants.length < 2) issues.push("Add at least two distinct Search concepts.");

  const complete = variants.every(
    (item) =>
      item.headlines.length >= 8 &&
      item.descriptions.length >= 4 &&
      item.keywordThemes.length >= 6 &&
      item.negativeKeywordThemes.length >= 4 &&
      item.callouts.length >= 4 &&
      item.sitelinks.length >= 4,
  );
  if (!complete) issues.push("One or more Search concepts is missing required assets.");

  const lengthsFit = variants.every(
    (item) =>
      item.headlines.every((value) => value.length <= 30) &&
      item.descriptions.every((value) => value.length <= 90) &&
      item.pathOne.length <= 15 &&
      item.pathTwo.length <= 15 &&
      item.callouts.every((value) => value.length <= 25) &&
      item.sitelinks.every(
        (sitelink) =>
          sitelink.text.length <= 25 &&
          sitelink.descriptionOne.length <= 35 &&
          sitelink.descriptionTwo.length <= 35,
      ),
  );
  if (!lengthsFit) issues.push("One or more Search assets exceeds platform limits.");

  const headlineDiversity = uniqueRatio(
    variants.flatMap((item) => item.headlines),
  );
  if (headlineDiversity < 0.75) {
    recommendations.push("Increase headline variety across Search concepts.");
  }

  return {
    completeness: complete ? 30 : Math.max(10, variants.length * 8),
    platformFit: lengthsFit ? 25 : 10,
    diversity: Math.round(Math.min(1, headlineDiversity) * 10),
    issues,
    recommendations,
  };
}

function socialScores(variants: PaidSocialAdVariant[]) {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const complete =
    variants.length >= 4 &&
    variants.every(
      (item) =>
        item.primaryText &&
        item.headline &&
        item.description &&
        item.callToAction &&
        item.audienceFrame &&
        item.creativeBrief,
    );
  if (!complete) issues.push("Paid Social requires four complete concepts.");

  const lengthsFit = variants.every((item) =>
    item.platform === "linkedin"
      ? item.primaryText.length <= 150 &&
        item.headline.length <= 70 &&
        item.description.length <= 100
      : item.primaryText.length <= 500 &&
        item.headline.length <= 80 &&
        item.description.length <= 100,
  );
  if (!lengthsFit) issues.push("One or more Paid Social fields exceeds its display guardrail.");

  const diversity = uniqueRatio(variants.map((item) => item.primaryText));
  if (diversity < 1) recommendations.push("Make every Paid Social concept meaningfully distinct.");

  return {
    completeness: complete ? 30 : Math.max(10, variants.length * 6),
    platformFit: lengthsFit ? 25 : 10,
    diversity: Math.round(Math.min(1, diversity) * 10),
    issues,
    recommendations,
  };
}

export function scoreAdPackage(adPackage: AdPackage): AdPackageScore {
  const search = adPackage.variants.filter(
    (item): item is SearchAdVariant => item.kind === "search",
  );
  const social = adPackage.variants.filter(
    (item): item is PaidSocialAdVariant => item.kind === "paid_social",
  );
  const channelScore = adPackage.packageKind === "search"
    ? searchScores(search)
    : socialScores(social);
  const issues = [...channelScore.issues];
  const recommendations = [...channelScore.recommendations];

  let strategyTraceability = 0;
  if (adPackage.strategy.strategySignature) strategyTraceability += 10;
  if (Object.keys(adPackage.strategy.strategySnapshot ?? {}).length) {
    strategyTraceability += 5;
  }
  if (
    adPackage.strategy.marketIntelligenceSignature ||
    adPackage.strategy.evidenceSourceIds.length
  ) {
    strategyTraceability += 5;
  } else {
    recommendations.push(
      "No approved external evidence is attached; keep all claims qualitative and verifiable.",
    );
  }

  let attributionReadiness = 0;
  if (validUrl(adPackage.destinationUrl)) attributionReadiness += 5;
  else issues.push("The final destination URL is invalid.");
  if (adPackage.attribution.source && adPackage.attribution.medium) {
    attributionReadiness += 4;
  } else issues.push("UTM source or medium is missing.");
  if (adPackage.attribution.campaign) attributionReadiness += 3;
  else issues.push("UTM campaign is missing.");
  if (adPackage.attribution.content) attributionReadiness += 3;
  else issues.push("UTM content is missing.");

  const total = Math.max(
    0,
    Math.min(
      100,
      channelScore.completeness +
        channelScore.platformFit +
        strategyTraceability +
        attributionReadiness +
        channelScore.diversity,
    ),
  );
  const rating = total >= 90 ? "excellent" : total >= 75 ? "ready" : "needs_work";
  if (rating !== "excellent") {
    recommendations.push("Review the package before export and resolve the listed issues.");
  }

  return {
    version: "h1.17",
    total,
    rating,
    dimensions: {
      completeness: channelScore.completeness,
      platformFit: channelScore.platformFit,
      strategyTraceability,
      attributionReadiness,
      variantDiversity: channelScore.diversity,
    },
    issues: [...new Set(issues)],
    recommendations: [...new Set(recommendations)],
  };
}

export function buildAdPackageTrackedUrl(adPackage: AdPackage) {
  const url = new URL(adPackage.destinationUrl);
  url.searchParams.set("utm_source", adPackage.attribution.source);
  url.searchParams.set("utm_medium", adPackage.attribution.medium);
  url.searchParams.set("utm_campaign", adPackage.attribution.campaign);
  url.searchParams.set("utm_content", adPackage.attribution.content);
  if (adPackage.attribution.term) {
    url.searchParams.set("utm_term", adPackage.attribution.term);
  }
  url.searchParams.set("vip_campaign", adPackage.campaignId);
  return url.toString();
}
