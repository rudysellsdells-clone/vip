export const LINKEDIN_POLICY_KEY = "linkedin_create_company_update";
export const LINKEDIN_APP_NAME = "LinkedIn";
export const LINKEDIN_ACTION_NAME = "create_company_update";

export function getLinkedInCompanyPageName() {
  return (
    process.env.ZAPIER_LINKEDIN_PAGE_NAME?.trim() ||
    process.env.LINKEDIN_COMPANY_PAGE_NAME?.trim() ||
    "McCormick Web Marketing"
  );
}

export function getLinkedInOrganizationId() {
  return (
    process.env.ZAPIER_LINKEDIN_ORGANIZATION_ID?.trim() ||
    process.env.LINKEDIN_COMPANY_PAGE_ID?.trim() ||
    null
  );
}

export function isLinkedInAsset(assetType: string | null | undefined, title?: string | null) {
  const haystack = `${assetType ?? ""} ${title ?? ""}`.toLowerCase();

  return haystack.includes("linkedin") || haystack.includes("linked in");
}

export function buildLinkedInMcpInput({
  assetId,
  campaignId,
  assetTitle,
  content,
}: {
  assetId: string;
  campaignId: string | null;
  assetTitle: string | null;
  content: string;
}) {
  const pageName = getLinkedInCompanyPageName();
  const organizationId = getLinkedInOrganizationId();

  return {
    policyKey: LINKEDIN_POLICY_KEY,
    app: LINKEDIN_APP_NAME,
    action: LINKEDIN_ACTION_NAME,
    assetId,
    campaignId,
    assetTitle,
    pageName,
    organizationId,
    instructions:
      "Publish this exact approved content as a LinkedIn company page post. Do not publish to a personal profile. Target only the configured company page.",
    params: {
      organization: organizationId ?? pageName,
      organization_id: organizationId,
      company: pageName,
      company_page: pageName,
      page: pageName,
      page_name: pageName,
      visibility: "PUBLIC",
      text: content,
      body: content,
      comment: content,
      update_text: content,
      post_text: content,
      content,
    },
  };
}
