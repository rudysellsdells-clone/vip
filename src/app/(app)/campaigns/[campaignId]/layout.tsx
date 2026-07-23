import { CampaignAdLane } from "@/components/ad-studio/CampaignAdLane";

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
    </>
  );
}
