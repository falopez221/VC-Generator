/** Server-only tenant and product entitlements. Browser input never grants access. */
export const PRIVATE_PRODUCTS = ["mvp-lab", "private-agent-runtime", "private-capital", "aerial-simulation"] as const;
export type PrivateProduct = (typeof PRIVATE_PRODUCTS)[number];
export type TenantRole = "owner" | "member" | "operator";
export type TenantIdentity = { email: string; role?: string };
export type TenantAccess = { tenantId: string; email: string; role: TenantRole; product: PrivateProduct };

type Member = { email: string; role: TenantRole; products: PrivateProduct[] };
type Tenant = { tenantId: string; members: Member[] };
type Environment = Record<string, string | undefined>;

const TENANT_ID = /^[a-z0-9][a-z0-9_-]{1,62}$/u;
const BASE_ROLES = new Set(["System Admin", "Demo User"]);

export function resolveTenantAccess(identity: TenantIdentity | null | undefined, product: PrivateProduct, requestedTenantId: string | null | undefined, environment: Environment = process.env): TenantAccess | null {
  if (!identity || !BASE_ROLES.has(identity.role ?? "")) return null;
  const email = normalizeEmail(identity.email);
  if (!email) return null;
  const permitted = parseTenantEntitlements(environment.VG_TENANT_ENTITLEMENTS).flatMap((tenant) => tenant.members
    .filter((member) => member.email === email && member.products.includes(product))
    .map((member) => ({ tenantId: tenant.tenantId, email, role: member.role, product })));

  // Compatibility migration: only the existing system owner has every product.
  // Customers always require an explicit entitlement above.
  if (!permitted.length && identity.role === "System Admin" && email === normalizeEmail(environment.VG_OWNER_EMAIL)) {
    permitted.push({ tenantId: normalizeTenantId(environment.VG_OWNER_TENANT_ID) ?? "owner", email, role: "owner", product });
  }
  const requested = normalizeTenantId(requestedTenantId ?? "");
  if (requestedTenantId && !requested) return null;
  if (requested) return permitted.find((access) => access.tenantId === requested) ?? null;
  return permitted.length === 1 ? permitted[0] : null;
}

export function parseTenantEntitlements(value: string | undefined): Tenant[] {
  if (!value || value.length > 64 * 1024) return [];
  try {
    const candidates: unknown = JSON.parse(value);
    if (!Array.isArray(candidates) || candidates.length > 500) return [];
    const tenants: Tenant[] = [];
    for (const candidate of candidates) {
      if (!isRecord(candidate) || !Array.isArray(candidate.members) || candidate.members.length > 5_000) return [];
      const tenantId = normalizeTenantId(candidate.tenantId);
      if (!tenantId) return [];
      const members: Member[] = [];
      for (const candidateMember of candidate.members) {
        if (!isRecord(candidateMember) || !Array.isArray(candidateMember.products)) return [];
        const email = normalizeEmail(candidateMember.email);
        const role = candidateMember.role;
        const products = candidateMember.products.filter((item): item is PrivateProduct => typeof item === "string" && PRIVATE_PRODUCTS.includes(item as PrivateProduct));
        if (!email || !isRole(role) || products.length !== candidateMember.products.length || !products.length) return [];
        members.push({ email, role, products });
      }
      tenants.push({ tenantId, members });
    }
    return tenants;
  } catch { return []; }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isRole(value: unknown): value is TenantRole { return value === "owner" || value === "member" || value === "operator"; }
function normalizeTenantId(value: unknown): string | null { if (typeof value !== "string") return null; const tenantId = value.trim().toLowerCase(); return TENANT_ID.test(tenantId) ? tenantId : null; }
function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || /[\s\u0000-\u001f\u007f]/u.test(email)) return null;
  const at = email.indexOf("@"); if (at <= 0 || at !== email.lastIndexOf("@")) return null;
  const [local, domain] = [email.slice(0, at), email.slice(at + 1)];
  return local.length <= 64 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local) && /^[a-z0-9.-]+$/u.test(domain) && domain.split(".").every((label) => label && !label.startsWith("-") && !label.endsWith("-")) ? email : null;
}
