import type {
  MacroDataRequest,
  MacroObservation,
  MarketDataRequest,
  MarketQuote,
  NewsDataRequest,
  NewsObservation,
  OnChainDataRequest,
  OnChainObservation,
  ProviderResult,
} from "./types.ts";

export interface MarketDataProvider {
  readonly providerId: string;
  getMarketQuotes(request: MarketDataRequest): Promise<ProviderResult<MarketQuote>>;
}

export interface MacroDataProvider {
  readonly providerId: string;
  getMacroObservations(request: MacroDataRequest): Promise<ProviderResult<MacroObservation>>;
}

export interface NewsDataProvider {
  readonly providerId: string;
  getNews(request: NewsDataRequest): Promise<ProviderResult<NewsObservation>>;
}

export interface OnChainDataProvider {
  readonly providerId: string;
  getOnChainObservations(request: OnChainDataRequest): Promise<ProviderResult<OnChainObservation>>;
}

export type PrivateCapitalDataProviders = {
  market: MarketDataProvider;
  macro: MacroDataProvider;
  news: NewsDataProvider;
  onChain: OnChainDataProvider;
};
