import { historicalVolatility, maximumDrawdown } from "./metrics.ts";
import type {
  ArgentineBondAnalysis,
  ArgentineBondInstrument,
  BitcoinPositionAnalysis,
  BitcoinPositionInput,
  CedearAnalysis,
  CedearInstrument,
  MockDataProvenance,
  TransparentMetric,
  ValidationResult,
} from "./types.ts";
import { clampFinite, isIsoTimestamp, roundTo, sanitizeText } from "./validation.ts";

const INSUFFICIENT_INPUTS = "The metric is unavailable because the simulated fixture lacks sufficient validated inputs.";

function provenanceIsUsable(items: readonly MockDataProvenance[]): boolean {
  return items.length > 0 && items.every((item) =>
    item.kind === "mock"
    && item.confidenceLabel === "simulated"
    && item.validated
    && item.notice.length > 0
    && isIsoTimestamp(item.timestamp)
    && Number.isFinite(item.confidence)
    && item.confidence >= 0
    && item.confidence <= 1,
  );
}

function metric(args: TransparentMetric): TransparentMetric {
  return {
    ...args,
    value: args.value === null || !Number.isFinite(args.value) ? null : roundTo(args.value, 8),
    assumptions: args.assumptions.map((item) => sanitizeText(item, 500)).filter(Boolean),
    limitations: args.limitations.map((item) => sanitizeText(item, 500)).filter(Boolean),
    provenance: args.provenance.map((item) => ({ ...item })),
  };
}

export function analyzeCedear(raw: CedearInstrument): ValidationResult<CedearAnalysis> {
  const issues: string[] = [];
  if (!sanitizeText(raw.assetId, 80) || !sanitizeText(raw.underlyingSymbol, 40)) issues.push("CEDEAR and underlying identifiers are required.");
  if (!Number.isFinite(raw.cedearsPerUnderlying) || raw.cedearsPerUnderlying <= 0 || raw.cedearsPerUnderlying > 1_000_000) {
    issues.push("CEDEAR conversion ratio must be finite and greater than zero.");
  }
  for (const [label, value] of [["local price", raw.localPriceArs], ["underlying price", raw.underlyingPriceUsd], ["dividend", raw.annualDividendPerUnderlyingUsd]] as const) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) issues.push(`CEDEAR ${label} must be null or a finite non-negative value.`);
  }
  if (!Number.isFinite(raw.localLiquidityScore) || raw.localLiquidityScore < 0 || raw.localLiquidityScore > 100) {
    issues.push("CEDEAR liquidity score must be between 0 and 100.");
  }
  if (!provenanceIsUsable(raw.provenance)) issues.push("CEDEAR analysis requires explicit validated simulated provenance.");
  if (issues.length > 0) return { value: null, issues };

  const instrument: CedearInstrument = {
    ...raw,
    assetId: sanitizeText(raw.assetId, 80),
    underlyingSymbol: sanitizeText(raw.underlyingSymbol, 40).toUpperCase(),
    cedearsPerUnderlying: clampFinite(raw.cedearsPerUnderlying, 0.00000001, 1_000_000),
    localPriceArs: raw.localPriceArs === null ? null : clampFinite(raw.localPriceArs, 0, 1_000_000_000_000),
    underlyingPriceUsd: raw.underlyingPriceUsd === null ? null : clampFinite(raw.underlyingPriceUsd, 0, 1_000_000_000_000),
    annualDividendPerUnderlyingUsd: raw.annualDividendPerUnderlyingUsd === null ? null : clampFinite(raw.annualDividendPerUnderlyingUsd, 0, 1_000_000_000_000),
    sector: sanitizeText(raw.sector, 100),
    localLiquidityScore: raw.localLiquidityScore,
    provenance: raw.provenance.map((item) => ({ ...item })),
  };
  const pricingAvailable = (instrument.localPriceArs ?? 0) > 0 && (instrument.underlyingPriceUsd ?? 0) > 0;
  const impliedExchangeRate = pricingAvailable
    ? (instrument.localPriceArs! * instrument.cedearsPerUnderlying) / instrument.underlyingPriceUsd!
    : null;
  const dividendAvailable = pricingAvailable && instrument.annualDividendPerUnderlyingUsd !== null;
  const dividendPerCedearUsd = dividendAvailable
    ? instrument.annualDividendPerUnderlyingUsd! / instrument.cedearsPerUnderlying
    : null;

  return {
    value: {
      instrument,
      impliedExchangeRate: metric({
        value: impliedExchangeRate,
        unit: "ARS per USD",
        formula: "local price × CEDEARs per underlying ÷ underlying price",
        assumptions: ["The ratio means local CEDEAR certificates per one underlying security.", "Prices refer to comparable timestamps and exclude fees, taxes and settlement differences."],
        limitations: pricingAvailable ? ["The implied rate is descriptive and may differ from executable prices because of spreads and market frictions."] : [INSUFFICIENT_INPUTS],
        provenance: instrument.provenance,
      }),
      localDividendYield: metric({
        value: dividendAvailable && impliedExchangeRate! > 0
          ? (dividendPerCedearUsd! * impliedExchangeRate!) / instrument.localPriceArs!
          : null,
        unit: "decimal",
        formula: "(annual dividend per underlying ÷ ratio × implied FX) ÷ local CEDEAR price",
        assumptions: ["Dividend input is annualized and does not imply that future dividends will be maintained."],
        limitations: dividendAvailable ? ["Withholding taxes, depositary fees and timing differences are excluded."] : [INSUFFICIENT_INPUTS],
        provenance: instrument.provenance,
      }),
      risks: [
        "Underlying equity or ETF risk.",
        "ARS/USD currency and conversion-ratio risk.",
        "Local liquidity, spread and settlement risk.",
        "The local return can diverge from the underlying return.",
      ],
      limitations: ["Simulated inputs are not suitable for real investment decisions.", "This analysis does not produce an order or trading instruction."],
    },
    issues: [],
  };
}

export function analyzeArgentineBond(raw: ArgentineBondInstrument): ValidationResult<ArgentineBondAnalysis> {
  const issues: string[] = [];
  if (!sanitizeText(raw.assetId, 80) || !sanitizeText(raw.ticker, 24)) issues.push("Bond and ticker identifiers are required.");
  if (!isIsoTimestamp(raw.settlementAt) || !isIsoTimestamp(raw.maturityAt) || Date.parse(raw.maturityAt) <= Date.parse(raw.settlementAt)) {
    issues.push("Bond settlement and maturity must be valid ordered ISO-8601 UTC timestamps.");
  }
  if (!Number.isFinite(raw.faceValue) || raw.faceValue <= 0) issues.push("Bond face value must be finite and greater than zero.");
  if (raw.cleanPricePerFace !== null && (!Number.isFinite(raw.cleanPricePerFace) || raw.cleanPricePerFace < 0)) issues.push("Bond price must be null or finite and non-negative.");
  if (raw.annualYield !== null && (!Number.isFinite(raw.annualYield) || raw.annualYield <= -1 || raw.annualYield > 10)) issues.push("Bond annual yield must be null or between -100% and 1,000%.");
  if (!Number.isFinite(raw.liquidityScore) || raw.liquidityScore < 0 || raw.liquidityScore > 100) issues.push("Bond liquidity score must be between 0 and 100.");
  if (raw.cashFlows.length > 500) issues.push("Bond cash-flow schedule is limited to 500 entries.");
  if (raw.cashFlows.some((flow) => !isIsoTimestamp(flow.paymentAt) || Date.parse(flow.paymentAt) <= Date.parse(raw.settlementAt) || !Number.isFinite(flow.amountPerFace) || flow.amountPerFace < 0)) {
    issues.push("Every bond cash flow must be future-dated, finite and non-negative.");
  }
  if (!provenanceIsUsable(raw.provenance)) issues.push("Bond analysis requires explicit validated simulated provenance.");
  if (issues.length > 0) return { value: null, issues };

  const instrument: ArgentineBondInstrument = {
    ...raw,
    assetId: sanitizeText(raw.assetId, 80),
    ticker: sanitizeText(raw.ticker, 24).toUpperCase(),
    faceValue: clampFinite(raw.faceValue, 0.00000001, 1_000_000_000_000),
    cleanPricePerFace: raw.cleanPricePerFace === null ? null : clampFinite(raw.cleanPricePerFace, 0, 1_000_000_000_000),
    annualYield: raw.annualYield === null ? null : clampFinite(raw.annualYield, -0.999999, 10),
    liquidityScore: raw.liquidityScore,
    cashFlows: [...raw.cashFlows]
      .map((flow) => ({ ...flow, amountPerFace: clampFinite(flow.amountPerFace, 0, 1_000_000_000_000) }))
      .sort((left, right) => left.paymentAt.localeCompare(right.paymentAt) || left.kind.localeCompare(right.kind)),
    provenance: raw.provenance.map((item) => ({ ...item })),
  };
  const priceAvailable = instrument.cleanPricePerFace !== null && instrument.cleanPricePerFace > 0;
  const durationAvailable = priceAvailable && instrument.annualYield !== null && instrument.cashFlows.length > 0;
  const settlementMs = Date.parse(instrument.settlementAt);
  const annualYield = instrument.annualYield ?? 0;
  const discounted = durationAvailable ? instrument.cashFlows.map((flow) => {
    const years = (Date.parse(flow.paymentAt) - settlementMs) / (365.25 * 86_400_000);
    const presentValue = flow.amountPerFace / ((1 + annualYield) ** years);
    return { years, presentValue };
  }) : [];
  const pvTotal = discounted.reduce((sum, flow) => sum + flow.presentValue, 0);
  const macaulay = pvTotal > 0 ? discounted.reduce((sum, flow) => sum + flow.years * flow.presentValue, 0) / pvTotal : null;
  const modified = macaulay === null ? null : macaulay / (1 + annualYield);
  const convexity = pvTotal > 0
    ? discounted.reduce((sum, flow) => sum + flow.years * (flow.years + 1) * flow.presentValue, 0) / (pvTotal * ((1 + annualYield) ** 2))
    : null;
  const durationLimitations = durationAvailable
    ? ["Duration and convexity use supplied yield, ACT/365.25 timing and annual compounding; irregular cash flows make them approximations."]
    : [INSUFFICIENT_INPUTS];

  return {
    value: {
      instrument,
      parity: metric({ value: priceAvailable ? instrument.cleanPricePerFace! / instrument.faceValue : null, unit: "decimal", formula: "clean price ÷ face value", assumptions: ["Price and face value use the same currency and unit basis."], limitations: priceAvailable ? ["Accrued interest, settlement costs and taxes are excluded."] : [INSUFFICIENT_INPUTS], provenance: instrument.provenance }),
      macaulayDuration: metric({ value: macaulay, unit: "years", formula: "Σ(time × discounted cash flow) ÷ Σ(discounted cash flow)", assumptions: ["Annual effective yield and ACT/365.25 timing."], limitations: durationLimitations, provenance: instrument.provenance }),
      modifiedDuration: metric({ value: modified, unit: "years", formula: "Macaulay duration ÷ (1 + annual yield)", assumptions: ["Small parallel yield changes."], limitations: durationLimitations, provenance: instrument.provenance }),
      convexity: metric({ value: convexity, unit: "years²", formula: "Σ(t × (t + 1) × PV cash flow) ÷ (price × (1 + yield)²)", assumptions: ["Annual compounding and a parallel yield shift."], limitations: durationLimitations, provenance: instrument.provenance }),
      riskDimensions: {
        sovereignOrCredit: instrument.issuerKind === "sovereign" ? "Sovereign ability and willingness to pay; recovery may differ by governing law." : "Issuer credit quality and covenant protection require separate review.",
        interestRate: "Price sensitivity is nonlinear; duration is only a local approximation.",
        currency: instrument.currency === "USD" ? "USD-linked value still carries settlement, access and local-currency purchasing-power risk." : "ARS cash flows retain inflation and devaluation exposure.",
        liquidity: instrument.liquidityScore < 40 ? "Simulated liquidity score indicates elevated spread and exit risk." : "Liquidity can deteriorate abruptly and the simulated score is not executable evidence.",
        restructuring: instrument.issuerKind === "sovereign" ? "Restructuring, exchange and collective-action terms require legal review." : "Default, restructuring and subordination terms require prospectus review.",
      },
      limitations: ["Yield is supplied, not inferred from live prices.", "No metric is computed from missing data.", "No output authorizes or executes a trade."],
    },
    issues: [],
  };
}

export function analyzeBitcoinPosition(raw: BitcoinPositionInput): ValidationResult<BitcoinPositionAnalysis> {
  const issues: string[] = [];
  if (!sanitizeText(raw.assetId, 80)) issues.push("Bitcoin asset id is required.");
  if (!Number.isFinite(raw.quantity) || raw.quantity < 0) issues.push("Bitcoin quantity must be finite and non-negative.");
  if (!Number.isFinite(raw.averageCostUsd) || raw.averageCostUsd < 0) issues.push("Bitcoin average cost must be finite and non-negative.");
  if (raw.observedPriceUsd !== null && (!Number.isFinite(raw.observedPriceUsd) || raw.observedPriceUsd < 0)) issues.push("Bitcoin observed price must be null or finite and non-negative.");
  if (!Number.isFinite(raw.totalPortfolioValueUsd) || raw.totalPortfolioValueUsd < 0) issues.push("Portfolio value must be finite and non-negative.");
  if (!Number.isFinite(raw.maximumBitcoinWeight) || raw.maximumBitcoinWeight < 0 || raw.maximumBitcoinWeight > 1) issues.push("Bitcoin maximum weight must be between 0 and 1.");
  if (!provenanceIsUsable(raw.provenance)) issues.push("Bitcoin analysis requires explicit validated simulated provenance.");
  if (issues.length > 0) return { value: null, issues };

  const currentValueUsd = raw.observedPriceUsd === null ? null : roundTo(raw.quantity * raw.observedPriceUsd, 2);
  const portfolioWeight = currentValueUsd === null || raw.totalPortfolioValueUsd <= 0 ? null : roundTo(currentValueUsd / raw.totalPortfolioValueUsd, 8);
  const limitStatus = portfolioWeight === null ? "insufficient_data" : portfolioWeight > raw.maximumBitcoinWeight ? "over_limit" : "within_limit";
  return {
    value: {
      currentValueUsd,
      portfolioWeight,
      maximumBitcoinWeight: raw.maximumBitcoinWeight,
      limitStatus,
      volatility: historicalVolatility(raw.returns),
      maximumDrawdown: maximumDrawdown(raw.valueHistory),
      reviewGuidance: limitStatus === "over_limit"
        ? "Human review is required because simulated Bitcoin exposure exceeds the profile limit; no reduction is executed."
        : limitStatus === "within_limit"
          ? "Exposure is within the stated cap, but volatility, drawdown, custody and total-portfolio suitability still require human review."
          : "A position recommendation cannot be formed until validated price and portfolio-value inputs are available.",
      assumptions: ["No leverage or derivatives are modeled.", "The maximum weight comes from the owner-defined profile constraint."],
      limitations: ["Simulated price history is not evidence of current market conditions.", "No seed phrase, private key or wallet credential is requested or stored."],
      executionAuthorized: false,
    },
    issues: [],
  };
}
