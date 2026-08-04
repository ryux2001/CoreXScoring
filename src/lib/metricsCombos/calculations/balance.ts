/**
 * Balance = 100% - |Potencia Lógica - Potencia Gráfica|
 */
export const calculateBalance = (logicalPower: number, graphicsPower: number): number => {
  const delta = Math.abs(logicalPower - graphicsPower);
  const score = 100 - delta;

  return Math.min(100, Math.max(0, score));
};