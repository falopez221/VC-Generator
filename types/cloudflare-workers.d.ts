/**
 * Vinext supplies this virtual module at the Cloudflare runtime. The local
 * TypeScript compiler needs the minimal declaration because the private D1
 * helper is also imported by authenticated route handlers.
 */
declare module "cloudflare:workers" {
  export const env: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DB?: any;
  };
}
