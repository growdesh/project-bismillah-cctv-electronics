import { resolveRetailPosSubPath } from "../../lib/auth";
import { useRouter } from "../../lib/router";
import { DemoApp } from "./DemoApp";
import { DemoProvider, type DemoProviderProps } from "./demoStore";
import type { PosAuthUser } from "./demoTypes";

export interface TradeDemoProps {
  basePath: string;
  currentUser?: PosAuthUser;
  onLogout?: () => void;
}

type TradeWorkspaceProps = TradeDemoProps &
  Pick<DemoProviderProps, "mode" | "createState" | "getCapabilities">;

export function TradeDemo({
  basePath,
  mode,
  currentUser,
  createState,
  getCapabilities,
  onLogout,
}: TradeWorkspaceProps) {
  const { path } = useRouter();
  const subPath = resolveRetailPosSubPath(path);

  return (
    <DemoProvider
      mode={mode}
      currentUser={currentUser}
      basePath={basePath}
      subPath={subPath}
      createState={createState}
      getCapabilities={getCapabilities}
      onLogout={onLogout}
    >
      <DemoApp />
    </DemoProvider>
  );
}
