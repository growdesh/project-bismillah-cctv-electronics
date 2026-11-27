import { TradeDemo, type TradeDemoProps } from "../shared/TradeDemo";
import { createRetailPosState } from "./seed";

function getCapabilities() {
  return {
    showSuppliers: false,
    showDeliveries: false,
    showFieldTeam: false,
    showPaidFreeStock: false,
  };
}

export default function Demo({ basePath, currentUser, onLogout }: TradeDemoProps) {
  return (
    <TradeDemo
      basePath={basePath}
      mode="retail-pos"
      currentUser={currentUser}
      createState={createRetailPosState}
      getCapabilities={getCapabilities}
      onLogout={onLogout}
    />
  );
}
