import assert from "node:assert/strict";
import test from "node:test";
import { PRIVATE_PRODUCT_BOUNDARY, PRIVATE_RUNTIME_STATUS } from "../src/platform/private-product-boundary.ts";

test("public repository exposes only an aggregate private-product boundary", () => {
  assert.deepEqual(PRIVATE_PRODUCT_BOUNDARY, {
    documentedProfiles: 1970,
    expandedProfiles: 1981,
    transversalProfilesAdded: 11,
    documentedDomains: 51,
    documentedDomainSubdomainPairs: 123,
    mathematicalModels: 53,
    mappedRelations: 11880,
    embeddedProfiles: 0,
    validationStatus: "prototype-requires-specialist-validation",
    status: "expanded-external-private-runtime-required",
  });
  assert.deepEqual(PRIVATE_RUNTIME_STATUS, {
    configured: false,
    model: "Not embedded in the public repository",
    teamLimit: 0,
    mode: "external-private-runtime-required",
  });
});
