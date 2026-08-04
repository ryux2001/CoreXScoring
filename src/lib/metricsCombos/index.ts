import { ComboMetrics } from "./types";
import { calculateLogicalPower } from "./calculations/logicalPower";
import { calculateGraphicsPower } from "./calculations/graphicsPower";
import { calculateBalance } from "./calculations/balance";

export const getComboMetrics = (combo: any): ComboMetrics => {
  console.log("🔍 DATOS DEL COMBO EN METRICS:", {
    cpu: combo?.cpu,
    gpu: combo?.gpu,
  });

  if (!combo) {
    return {
      logicalPower: 0,
      graphicsPower: 0,
      balance: 0,
    };
  }

  const cpu = combo.cpu || {};
  const gpu = combo.gpu || {};

  const logicalPower = calculateLogicalPower(cpu);
  const graphicsPower = calculateGraphicsPower(gpu);
  const balance = calculateBalance(logicalPower, graphicsPower);

  return {
    logicalPower: Number(logicalPower.toFixed(1)),
    graphicsPower: Number(graphicsPower.toFixed(1)),
    balance: Number(balance.toFixed(1)),
  };
};
