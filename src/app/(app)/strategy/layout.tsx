import { StrategyWorkspaceNav } from "@/components/strategy/StrategyWorkspaceNav";
import { requireStrategyWorkspace } from "@/lib/strategy/require-strategy-workspace";

export default async function StrategyWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await requireStrategyWorkspace();

  return (
    <>
      <StrategyWorkspaceNav accountName={workspace.accountName} />
      {children}
    </>
  );
}
