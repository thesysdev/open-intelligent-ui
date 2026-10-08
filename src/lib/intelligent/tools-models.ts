/** Split whole currency units by largest remainder; every displayed share adds up. */
export function allocateCents(total: number, weights: number[]): number[] {
  const safeTotal = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  const safeWeights = weights.map((weight) => Math.max(0, Number.isFinite(weight) ? weight : 0));
  const sum = safeWeights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const exact = safeWeights.map((weight) => (safeTotal * weight) / sum);
  const result = exact.map(Math.floor);
  const order = exact.map((value, i) => ({ i, remainder: value - result[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  const remainder = safeTotal - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remainder; i++) result[order[i % order.length].i]++;
  return result;
}

export function currencyPrecision(currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function projectSavings(
  initial: number,
  monthly: number,
  years: number,
  annualRate: number,
  contributionTiming: "start" | "end" = "end",
  annualContributionGrowth = 0,
) {
  const points = [{ year: 0, balance: initial, contributed: initial }];
  let balance = initial;
  let contributed = initial;
  for (let month = 1; month <= Math.floor(years) * 12; month++) {
    const deposit = monthly * (1 + annualContributionGrowth / 100) ** Math.floor((month - 1) / 12);
    if (contributionTiming === "start") balance += deposit;
    balance *= 1 + annualRate / 1200;
    if (contributionTiming === "end") balance += deposit;
    contributed += deposit;
    if (month % 12 === 0) points.push({ year: month / 12, balance, contributed });
  }
  return points;
}

export type ScalableIngredient = {
  name: string;
  quantity: number;
  unit: string;
  scaling?: "proportional" | "whole" | "fixed";
};

export function scaleIngredient(ingredient: ScalableIngredient, guests: number, baseGuests: number) {
  const quantity = Math.max(0, Number.isFinite(ingredient.quantity) ? ingredient.quantity : 0);
  const scaled = ingredient.scaling === "fixed" ? quantity : quantity * guests / Math.max(1, baseGuests);
  // Whole-item rounding is explicit; fractional cups, eggs and servings remain possible.
  return ingredient.scaling === "whole" || (!ingredient.scaling && !ingredient.unit)
    ? Math.ceil(scaled)
    : scaled;
}

export type PackingRuleData = {
  weather: string;
  includeItemIds: string[];
  excludeItemIds: string[];
  note: string;
};

export function buildPackingList(
  availableIds: string[],
  outfitIds: string[],
  rules: PackingRuleData[],
  weather: string,
) {
  const validIds = new Set(availableIds);
  const chosen = new Set(outfitIds.filter((id) => validIds.has(id)));
  const notes: string[] = [];
  for (const rule of rules) {
    if (rule.weather !== weather && rule.weather !== "*") continue;
    (rule.includeItemIds ?? []).forEach((id) => { if (validIds.has(id)) chosen.add(id); });
    (rule.excludeItemIds ?? []).forEach((id) => chosen.delete(id));
    if (rule.note) notes.push(rule.note);
  }
  return { ids: [...chosen], note: notes.join(" ") };
}

/** OpenUI child references carry data in .props; React views also accept plain records. */
export function readToolRecords<T>(nodes: unknown[] | undefined): T[] {
  return (nodes ?? []).flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    const value = "props" in node ? node.props : node;
    return value && typeof value === "object" ? [value as T] : [];
  });
}

/** Dataset/config changes reset the tool; bound control changes preserve local progress. */
export function toolConfigurationKey(props: object, mutablePropNames: string[] = []) {
  const mutable = new Set(mutablePropNames);
  return JSON.stringify(Object.fromEntries(Object.entries(props).filter(([name]) => !mutable.has(name))));
}
