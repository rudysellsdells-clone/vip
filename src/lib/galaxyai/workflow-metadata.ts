export type GalaxyAiInputMapping = {
  nodeRequestKey: string;
  promptFieldName: string;
};

export type VipManagedGalaxyWorkflowKind =
  | "vip_social_image_only"
  | "vip_social_image_video";

export type VipManagedGalaxyWorkflowMetadata = {
  managed: boolean;
  workflowKind: VipManagedGalaxyWorkflowKind;
  recommendedAssetTypes: string[];
  displayKind: string;
  inputMapping: GalaxyAiInputMapping;
  createdBy?: string | null;
  templateVersion?: string | null;
  selectedImageModel?: string | null;
  selectedVideoModel?: string | null;
  createdAt?: string | null;
  notes?: string | null;
};

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean) as string[]
    : [];
}

export function getVipManagedGalaxyWorkflowMetadata(
  value: unknown,
): VipManagedGalaxyWorkflowMetadata | null {
  const record = jsonRecord(value);
  const vip = jsonRecord(record.vip);

  const managed = Boolean(vip.managed);
  const workflowKind = stringValue(vip.workflowKind);
  const recommendedAssetTypes = stringArray(vip.recommendedAssetTypes);
  const displayKind = stringValue(vip.displayKind);
  const inputMapping = jsonRecord(vip.inputMapping);
  const nodeRequestKey = stringValue(inputMapping.nodeRequestKey);
  const promptFieldName = stringValue(inputMapping.promptFieldName);

  if (!managed || !workflowKind || !nodeRequestKey || !promptFieldName) {
    return null;
  }

  return {
    managed,
    workflowKind: workflowKind as VipManagedGalaxyWorkflowKind,
    recommendedAssetTypes,
    displayKind: displayKind ?? "VIP managed workflow",
    inputMapping: {
      nodeRequestKey,
      promptFieldName,
    },
    createdBy: stringValue(vip.createdBy),
    templateVersion: stringValue(vip.templateVersion),
    selectedImageModel: stringValue(vip.selectedImageModel),
    selectedVideoModel: stringValue(vip.selectedVideoModel),
    createdAt: stringValue(vip.createdAt),
    notes: stringValue(vip.notes),
  };
}

export function mergeWorkflowMetadataWithVip(
  remoteWorkflow: unknown,
  vipMetadata: VipManagedGalaxyWorkflowMetadata | null,
) {
  const remoteRecord = jsonRecord(remoteWorkflow);

  if (!vipMetadata) {
    return remoteRecord;
  }

  return {
    ...remoteRecord,
    vip: vipMetadata,
  };
}

export function recommendedWorkflowKindForAssetType(assetType: string | null | undefined) {
  if (assetType === "galaxyai_image_prompt") {
    return "vip_social_image_only" as VipManagedGalaxyWorkflowKind;
  }

  if (assetType === "galaxyai_prompt") {
    return "vip_social_image_video" as VipManagedGalaxyWorkflowKind;
  }

  return null;
}
