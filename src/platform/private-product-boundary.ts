/**
 * Aggregate public documentation only. Individual profiles, provider contracts,
 * prompts, credentials and execution remain outside this repository.
 */
export const PRIVATE_PRODUCT_BOUNDARY = {
  documentedProfiles: 1_970,
  expandedProfiles: 1_981,
  transversalProfilesAdded: 11,
  documentedDomains: 51,
  documentedDomainSubdomainPairs: 123,
  mathematicalModels: 53,
  mappedRelations: 11_880,
  embeddedProfiles: 0,
  validationStatus: "prototype-requires-specialist-validation",
  status: "expanded-external-private-runtime-required",
} as const;

export const PRIVATE_RUNTIME_STATUS = {
  configured: false,
  model: "Not embedded in the public repository",
  teamLimit: 0,
  mode: "external-private-runtime-required",
} as const;
