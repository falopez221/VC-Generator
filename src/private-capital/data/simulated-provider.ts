import type {
  MacroDataProvider,
  MarketDataProvider,
  NewsDataProvider,
  OnChainDataProvider,
} from "./providers.ts";
import {
  SIMULATED_DATA_WARNING,
  type DataCurrency,
  type DataProvenance,
  type MacroDataRequest,
  type MacroObservation,
  type MarketDataRequest,
  type MarketQuote,
  type NewsDataRequest,
  type NewsObservation,
  type OnChainDataRequest,
  type OnChainObservation,
  type ProviderResult,
} from "./types.ts";

const FIXTURE_TIMESTAMP = "2026-01-15T15:00:00.000Z";
const SIMULATED_SOURCE = "Venture Governance deterministic simulated fixture";
const MAX_REQUEST_IDS = 100;

type MarketFixture = Omit<MarketQuote, "provenance">;

const MARKET_FIXTURES: Readonly<Record<string, MarketFixture>> = Object.freeze({
  "sim-cedear-alpha": {
    instrumentId: "sim-cedear-alpha",
    symbol: "SIM-CED-A",
    value: 100,
    currency: "ARS",
    market: "SIMULATED-LOCAL",
  },
  "sim-bond-sovereign": {
    instrumentId: "sim-bond-sovereign",
    symbol: "SIM-BOND-S",
    value: 100,
    currency: "USD",
    market: "SIMULATED-BOND",
  },
  "sim-bitcoin": {
    instrumentId: "sim-bitcoin",
    symbol: "SIM-BTC",
    value: 100,
    currency: "USD",
    market: "SIMULATED-DIGITAL-ASSET",
  },
});

const MACRO_FIXTURES: Readonly<Record<string, Omit<MacroObservation, "provenance">>> = Object.freeze({
  "sim-arg-price-index": {
    indicatorId: "sim-arg-price-index",
    label: "Simulated Argentina price-level scenario index",
    value: 100,
    unit: "scenario index",
    period: "simulated baseline",
  },
  "sim-arg-policy-rate-index": {
    indicatorId: "sim-arg-policy-rate-index",
    label: "Simulated Argentina policy-rate scenario index",
    value: 50,
    unit: "scenario index",
    period: "simulated baseline",
  },
});

const ON_CHAIN_FIXTURES: Readonly<Record<string, Omit<OnChainObservation, "provenance">>> = Object.freeze({
  "sim-bitcoin-network-activity": {
    network: "bitcoin",
    metricId: "sim-bitcoin-network-activity",
    label: "Simulated Bitcoin network-activity scenario index",
    value: 50,
    unit: "scenario index",
  },
});

/** Deterministic offline provider. It never fetches or claims observed market data. */
export class SimulatedDataProvider implements
  MarketDataProvider,
  MacroDataProvider,
  NewsDataProvider,
  OnChainDataProvider {
  readonly providerId = "vg-simulated-data-v1";

  async getMarketQuotes(request: MarketDataRequest): Promise<ProviderResult<MarketQuote>> {
    const ids = safeIdentifiers(request.instrumentIds);
    const items = ids.map((instrumentId): MarketQuote => {
      const fixture = MARKET_FIXTURES[instrumentId];
      if (!fixture) return unavailableQuote(instrumentId);
      return { ...fixture, provenance: simulatedProvenance(fixture.currency, fixture.market) };
    });
    return result(items, items.length > 0 && items.every((item) => item.value !== null));
  }

  async getMacroObservations(request: MacroDataRequest): Promise<ProviderResult<MacroObservation>> {
    const items = safeIdentifiers(request.indicatorIds).map((indicatorId): MacroObservation => {
      const fixture = MACRO_FIXTURES[indicatorId];
      if (!fixture) {
        return {
          indicatorId,
          label: "Data unavailable",
          value: null,
          unit: "unavailable",
          period: "unavailable",
          provenance: unavailableProvenance(null, null),
        };
      }
      return { ...fixture, provenance: simulatedProvenance(null, "SIMULATED-MACRO") };
    });
    return result(items, items.length > 0 && items.every((item) => item.value !== null));
  }

  async getNews(request: NewsDataRequest): Promise<ProviderResult<NewsObservation>> {
    // User text is treated only as a filter. It is never executed, fetched or
    // interpolated into provider output.
    const limit = boundedLimit(request.limit);
    const related = safeIdentifiers(request.relatedInstrumentIds ?? []);
    const queryMatchesFixture = !request.query
      || /simulat|scenario|fixture/iu.test(request.query.slice(0, 160));
    const fixture: NewsObservation = {
      id: "sim-scenario-bulletin",
      headline: "Simulated scenario bulletin — no observed market event",
      summary: "Deterministic fixture for testing the news-provider contract; it is not current news.",
      publishedAt: FIXTURE_TIMESTAMP,
      relatedInstrumentIds: related,
      provenance: simulatedProvenance(null, "SIMULATED-NEWS"),
    };
    const items = queryMatchesFixture && limit > 0 ? [fixture] : [];
    return {
      items,
      provenance: simulatedProvenance(null, "SIMULATED-NEWS"),
      limitations: [SIMULATED_DATA_WARNING, "No current news was retrieved."],
    };
  }

  async getOnChainObservations(request: OnChainDataRequest): Promise<ProviderResult<OnChainObservation>> {
    const items = safeIdentifiers(request.metricIds).map((metricId): OnChainObservation => {
      const fixture = ON_CHAIN_FIXTURES[metricId];
      if (!fixture || request.network !== "bitcoin") {
        return {
          network: "bitcoin",
          metricId,
          label: "Data unavailable",
          value: null,
          unit: "unavailable",
          provenance: unavailableProvenance("BTC", "BITCOIN"),
        };
      }
      return { ...fixture, provenance: simulatedProvenance("BTC", "SIMULATED-BITCOIN") };
    });
    return result(items, items.length > 0 && items.every((item) => item.value !== null));
  }
}

function result<T extends { provenance: DataProvenance }>(
  items: readonly T[],
  allAvailable: boolean,
): ProviderResult<T> {
  return {
    items,
    provenance: allAvailable
      ? simulatedProvenance(null, null)
      : unavailableProvenance(null, null),
    limitations: [
      SIMULATED_DATA_WARNING,
      "Values are deterministic fixtures, not prices, forecasts, rates, news or on-chain observations.",
    ],
  };
}

function simulatedProvenance(currency: DataCurrency, market: string | null): DataProvenance {
  return {
    freshness: "simulated",
    source: SIMULATED_SOURCE,
    observedAt: FIXTURE_TIMESTAMP,
    retrievedAt: FIXTURE_TIMESTAMP,
    currency,
    market,
    latencyMs: 0,
    confidence: 1,
    confidenceLabel: "simulated",
    decisionSuitability: "not_suitable",
    validated: true,
    warning: SIMULATED_DATA_WARNING,
  };
}

function unavailableProvenance(currency: DataCurrency, market: string | null): DataProvenance {
  return {
    freshness: "unavailable",
    source: SIMULATED_SOURCE,
    observedAt: null,
    retrievedAt: FIXTURE_TIMESTAMP,
    currency,
    market,
    latencyMs: null,
    confidence: 0,
    confidenceLabel: "unavailable",
    decisionSuitability: "not_suitable",
    validated: false,
    warning: SIMULATED_DATA_WARNING,
  };
}

function unavailableQuote(instrumentId: string): MarketQuote {
  return {
    instrumentId,
    symbol: "UNAVAILABLE",
    value: null,
    currency: null,
    market: null,
    provenance: unavailableProvenance(null, null),
  };
}

function safeIdentifiers(values: readonly string[]): string[] {
  const safe = values
    .slice(0, MAX_REQUEST_IDS)
    .filter((value) => typeof value === "string" && /^[a-z0-9][a-z0-9._:-]{0,63}$/iu.test(value));
  return [...new Set(safe)];
}

function boundedLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 20;
  return Math.max(0, Math.min(50, Math.trunc(value ?? 20)));
}
