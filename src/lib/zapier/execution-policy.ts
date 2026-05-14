export type ZapierExecutionDecision = {
  executable: boolean;
  reason: string;
  label: string;
};

export const REQUIRED_FACEBOOK_PAGE_NAME = "mccormick.web.marketing";

export function getFacebookPageLockStatus() {
  const pageName = process.env.ZAPIER_FACEBOOK_PAGE_NAME;
  const pageId = process.env.ZAPIER_FACEBOOK_PAGE_ID;

  if (pageName === REQUIRED_FACEBOOK_PAGE_NAME && pageId) {
    return {
      configured: true,
      pageName,
      pageId,
      requiredPageName: REQUIRED_FACEBOOK_PAGE_NAME,
      message: `Facebook page lock configured for ${REQUIRED_FACEBOOK_PAGE_NAME}.`,
    };
  }

  return {
    configured: false,
    pageName: pageName ?? null,
    pageId: pageId ?? null,
    requiredPageName: REQUIRED_FACEBOOK_PAGE_NAME,
    message:
      `Facebook execution remains disabled until ZAPIER_FACEBOOK_PAGE_NAME is ${REQUIRED_FACEBOOK_PAGE_NAME} and ZAPIER_FACEBOOK_PAGE_ID is set.`,
  };
}

export function getZapierExecutionDecision(actionName: string): ZapierExecutionDecision {
  if (actionName === "Gmail:draft_v2") {
    return {
      executable: true,
      label: "Gmail Draft",
      reason: "Safe execution enabled. This creates a draft only and does not send email.",
    };
  }

  if (actionName === "Facebook Pages:page_stream") {
    const facebookLock = getFacebookPageLockStatus();

    if (facebookLock.configured) {
      return {
        executable: true,
        label: "Facebook Page Post",
        reason:
          `Execution enabled only for the locked Facebook Page: ${REQUIRED_FACEBOOK_PAGE_NAME}.`,
      };
    }

    return {
      executable: false,
      label: "Facebook Page Post",
      reason:
        `Execution disabled until the target page is hard-locked to ${REQUIRED_FACEBOOK_PAGE_NAME}.`,
    };
  }

  if (actionName === "LinkedIn:share") {
    return {
      executable: false,
      label: "LinkedIn Share",
      reason:
        "Execution disabled until publishing controls and final confirmation are added.",
    };
  }

  if (actionName === "Synthesia:create_video") {
    return {
      executable: false,
      label: "Synthesia Video",
      reason:
        "Execution disabled until template/account requirements are confirmed.",
    };
  }

  if (actionName === "YouTube:upload_video") {
    return {
      executable: false,
      label: "YouTube Upload",
      reason:
        "Execution disabled until video file handling and upload approval controls are added.",
    };
  }

  return {
    executable: false,
    label: "Manual Review",
    reason: "No execution policy exists yet for this action.",
  };
}
