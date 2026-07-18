import type { DerivedInvestorProfile, InvestorProfileInput, ValidationResult } from "./types.ts";
import { clampFinite, sanitizeText } from "./validation.ts";

const componentWeights: DerivedInvestorProfile["componentWeights"] = {
  horizon: 0.25,
  lossCapacity: 0.3,
  liquidityCapacity: 0.2,
  experience: 0.15,
  objective: 0.1,
};

function preferenceScore(preference: InvestorProfileInput["preference"]): number {
  if (preference === "preservation") return 20;
  if (preference === "income") return 48;
  return 80;
}

export function deriveInvestorProfile(raw: InvestorProfileInput): ValidationResult<DerivedInvestorProfile> {
  const issues: string[] = [];
  if (!(raw.capital > 0) || !Number.isFinite(raw.capital)) issues.push("Capital must be finite and greater than zero.");
  if (!sanitizeText(raw.name, 80)) issues.push("Profile name is required.");
  if (!(["ARS", "USD"] as const).includes(raw.referenceCurrency)) issues.push("Reference currency is not supported.");
  if (!(["growth", "income", "preservation"] as const).includes(raw.preference)) issues.push("Investment preference is not supported.");
  if (!(["none", "monthly", "quarterly", "annual"] as const).includes(raw.contributionFrequency)) issues.push("Contribution frequency is not supported.");
  if (raw.profileMode !== undefined && !(["derived", "custom"] as const).includes(raw.profileMode)) issues.push("Profile mode is not supported.");
  const boundedFields: Array<[string, number, number, number]> = [
    ["Horizon", raw.horizonMonths, 1, 1_200],
    ["Liquidity need", raw.liquidityNeedPct, 0, 100],
    ["Loss tolerance", raw.lossTolerancePct, 0, 100],
    ["Maximum tolerable loss", raw.maximumTolerableLossPct, 0, 100],
    ["Target return", raw.targetReturnPct, -100, 500],
    ["Maximum Argentina exposure", raw.maximumArgentinaPct, 0, 100],
    ["Maximum Bitcoin exposure", raw.maximumBitcoinPct, 0, 100],
    ["Maximum asset exposure", raw.maximumAssetPct, 1, 100],
    ["Maximum sector exposure", raw.maximumSectorPct, 1, 100],
    ["Experience", raw.experienceYears, 0, 80],
    ["Rebalance horizon", raw.rebalanceMonths, 1, 120],
    ["Periodic withdrawal", raw.periodicWithdrawalPct, 0, 100],
    ["Emergency reserve", raw.emergencyReserveMonths, 0, 60],
  ];
  for (const [label, value, minimum, maximum] of boundedFields) {
    if (!Number.isFinite(value) || value < minimum || value > maximum) issues.push(`${label} must be between ${minimum} and ${maximum}.`);
  }
  if (raw.allowedAssetClasses.length === 0) issues.push("At least one asset class must be allowed.");
  if (raw.excludedAssetIds.length > 500) issues.push("Excluded assets are limited to 500 entries.");
  if (raw.personalRestrictions.length > 30) issues.push("Personal restrictions are limited to 30 entries.");
  if (raw.allowedAssetClasses.some((item) => !(["cedear", "bond", "bitcoin", "cash"] as const).includes(item))) {
    issues.push("Allowed asset classes contain an unsupported value.");
  }
  if (raw.maximumAssetPct > raw.maximumSectorPct) issues.push("Maximum asset exposure cannot exceed maximum sector exposure.");
  if (raw.maximumBitcoinPct > 0 && !raw.allowedAssetClasses.includes("bitcoin")) {
    issues.push("Bitcoin exposure is non-zero while Bitcoin is excluded.");
  }
  if (issues.length > 0) return { value: null, issues };

  const input: InvestorProfileInput = {
    ...raw,
    name: sanitizeText(raw.name, 80),
    capital: clampFinite(raw.capital, 1, 1_000_000_000_000),
    horizonMonths: clampFinite(raw.horizonMonths, 1, 1_200),
    liquidityNeedPct: clampFinite(raw.liquidityNeedPct, 0, 100),
    lossTolerancePct: clampFinite(raw.lossTolerancePct, 0, 100),
    maximumTolerableLossPct: clampFinite(raw.maximumTolerableLossPct, 0, 100),
    targetReturnPct: clampFinite(raw.targetReturnPct, -100, 500),
    maximumArgentinaPct: clampFinite(raw.maximumArgentinaPct, 0, 100),
    maximumBitcoinPct: clampFinite(raw.maximumBitcoinPct, 0, 100),
    maximumAssetPct: clampFinite(raw.maximumAssetPct, 1, 100),
    maximumSectorPct: clampFinite(raw.maximumSectorPct, 1, 100),
    experienceYears: clampFinite(raw.experienceYears, 0, 80),
    rebalanceMonths: clampFinite(raw.rebalanceMonths, 1, 120),
    periodicWithdrawalPct: clampFinite(raw.periodicWithdrawalPct, 0, 100),
    emergencyReserveMonths: clampFinite(raw.emergencyReserveMonths, 0, 60),
    allowedAssetClasses: [...new Set(raw.allowedAssetClasses)],
    excludedAssetIds: [...new Set(raw.excludedAssetIds.slice(0, 500).map((item) => sanitizeText(item, 80)).filter(Boolean))],
    personalRestrictions: raw.personalRestrictions.slice(0, 30).map((item) => sanitizeText(item, 300)).filter(Boolean),
  };

  const components = {
    horizon: clampFinite((input.horizonMonths / 120) * 100, 0, 100),
    lossCapacity: clampFinite(((input.lossTolerancePct + input.maximumTolerableLossPct) / 70) * 100, 0, 100),
    liquidityCapacity: clampFinite(100 - input.liquidityNeedPct - input.periodicWithdrawalPct - input.emergencyReserveMonths * 2, 0, 100),
    experience: clampFinite((input.experienceYears / 12) * 100, 0, 100),
    objective: clampFinite((preferenceScore(input.preference) + clampFinite(input.targetReturnPct * 3, 0, 100)) / 2, 0, 100),
  };
  const riskScore = Math.round(
    Object.entries(componentWeights).reduce(
      (total, [key, weight]) => total + components[key as keyof typeof components] * weight,
      0,
    ),
  );
  const label = input.profileMode === "custom" ? "custom" : riskScore < 35 ? "conservative" : riskScore < 68 ? "moderate" : "aggressive";

  return {
    value: {
      input,
      riskScore,
      label,
      components,
      componentWeights: { ...componentWeights },
      constraints: {
        maximumArgentinaWeight: input.maximumArgentinaPct / 100,
        maximumBitcoinWeight: input.maximumBitcoinPct / 100,
        maximumAssetWeight: input.maximumAssetPct / 100,
        maximumSectorWeight: input.maximumSectorPct / 100,
        minimumCashWeight: Math.min(0.5, Math.max(input.liquidityNeedPct / 100, input.emergencyReserveMonths / 120)),
        allowedAssetClasses: [...input.allowedAssetClasses],
        excludedAssetIds: [...input.excludedAssetIds],
      },
      assumptions: [
        "Risk score uses disclosed fixed weights that sum to 100%.",
        "The score is a suitability aid, not a prediction of returns or losses.",
        "Profile labels summarize the numeric inputs and do not replace the underlying limits.",
        input.profileMode === "custom" ? "The custom label preserves owner-defined limits; the same transparent quantitative score is still calculated." : "The label is derived from the disclosed score thresholds.",
      ],
    },
    issues,
  };
}

export function investorProfileWeightTotal(): number {
  return Object.values(componentWeights).reduce((sum, weight) => sum + weight, 0);
}
