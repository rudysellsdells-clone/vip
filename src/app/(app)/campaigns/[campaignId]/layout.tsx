import { CampaignAdLane } from "@/components/ad-studio/CampaignAdLane";
import { CampaignVideoLane } from "@/components/video-studio/CampaignVideoLane";

type CampaignLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ campaignId: string }>;
};

export default async function CampaignLayout({
  children,
  params,
}: CampaignLayoutProps) {
  const { campaignId } = await params;

  return (
    <>
      {children}
      <CampaignAdLane campaignId={campaignId} />
      <CampaignVideoLane campaignId={campaignId} />
    </>
  );
}
