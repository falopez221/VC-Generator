/**
 * CONFIGURACIÓN CENTRAL DEL SITIO
 * Modificá este archivo para cambiar nombres, enlaces, navegación y metadata.
 * Ningún componente debería contener URLs escritas directamente.
 */

export const PROJECT_NAME = "Venture Governance System™";
export const PROJECT_TAGLINE = "Knowledge begins as possibility.";
export const PROJECT_DESCRIPTION =
  "A governed intelligence environment that turns a human thesis into inspectable opportunities, visible uncertainty and human review.";

// Ruta central del whitepaper maestro dentro de /public/documents/.
export const WHITEPAPER_URL = "/documents/venture-governance-system-whitepaper-publico-v2.pdf";
// Cambiá a false si retirás temporalmente el documento.
export const WHITEPAPER_AVAILABLE = true;

// Reemplazá estos datos de contacto antes de publicar.
export const CONTACT_EMAIL = "franciscoariellopez22@gmail.com";
export const CONTACT_URL = "#contacto";
export const LINKEDIN_URL = "#contacto";
export const DEMO_URL = "/lab/demo";
export const PLATFORM_URL = "/app/login";
export const GITHUB_URL = "#contacto";
export const CALENDAR_URL = "#contacto";

// CTA globales.
export const PRIMARY_CTA_URL = "#solucion";
export const SECONDARY_CTA_URL = "#arquitectura";

// Reemplazá por el dominio final para canonical, sitemap y previews sociales.
export const SITE_URL = "https://venturegovernance.com";

export const FOOTER_TEXT =
  "Sistema conceptual de apoyo a decisiones. No constituye asesoramiento financiero ni reemplaza el criterio de un comité de inversión.";

export const NAVIGATION = [
  { label: "Home", href: "/" },
  { label: "Architecture", href: "/#arquitectura" },
  { label: "Methodology", href: "/lab/methodology" },
  { label: "Applications", href: "/applications" },
  { label: "Whitepaper", href: "/#whitepaper", disabled: !WHITEPAPER_AVAILABLE },
  { label: "Lab", href: "/lab" },
  { label: "Access", href: PLATFORM_URL },
] as const;

export const PRIMARY_NAVIGATION = [
  { label: "Platform", href: "/#platform" },
  { label: "Methodology", href: "/lab/methodology" },
  { label: "Applications", href: "/applications" },
  { label: "Research", href: "/#whitepaper" },
] as const;

export const NAVIGATION_GROUPS = [
  {
    label: "System",
    description: "How the governed decision architecture works.",
    links: [
      { label: "Mission architecture", href: "/#arquitectura" },
      { label: "Public agents", href: "/#agentes" },
      { label: "Quantitative models", href: "/#modelado" },
      { label: "Decision pipeline", href: "/#metodologia" },
    ],
  },
  {
    label: "Explore",
    description: "Inspect the public, bounded product surfaces.",
    links: [
      { label: "Applications map", href: "/applications" },
      { label: "Public Lab", href: "/lab" },
      { label: "Run a simulation", href: DEMO_URL },
      { label: "Read the whitepaper", href: WHITEPAPER_URL },
    ],
  },
  {
    label: "Governance",
    description: "Understand authority, evidence and limitations.",
    links: [
      { label: "Human-in-command", href: "/#solucion" },
      { label: "Evidence boundary", href: "/#evidencia" },
      { label: "Risks and limitations", href: "/#riesgos" },
      { label: "Request access", href: "/request-access" },
    ],
  },
] as const;

export const FOOTER_NAVIGATION = [
  {
    label: "Platform",
    links: [
      { label: "Architecture", href: "/#arquitectura" },
      { label: "Agents", href: "/#agentes" },
      { label: "Models", href: "/#modelado" },
      { label: "Applications", href: "/applications" },
    ],
  },
  {
    label: "Public resources",
    links: [
      { label: "Public Lab", href: "/lab" },
      { label: "Methodology", href: "/lab/methodology" },
      { label: "Whitepaper", href: WHITEPAPER_URL },
      { label: "Request access", href: "/request-access" },
    ],
  },
  {
    label: "Governance",
    links: [
      { label: "Human-in-command", href: "/#solucion" },
      { label: "Evidence", href: "/#evidencia" },
      { label: "Decision pipeline", href: "/#metodologia" },
      { label: "Limitations", href: "/#riesgos" },
    ],
  },
] as const;

export const SITE_LINKS = {
  whitepaper: WHITEPAPER_URL,
  contact: CONTACT_URL,
  email: `mailto:${CONTACT_EMAIL}`,
  linkedin: LINKEDIN_URL,
  demo: DEMO_URL,
  platform: PLATFORM_URL,
  github: GITHUB_URL,
  calendar: CALENDAR_URL,
  primaryCta: PRIMARY_CTA_URL,
  secondaryCta: SECONDARY_CTA_URL,
} as const;

export const SITE_METADATA = {
  title: `${PROJECT_NAME} — ${PROJECT_TAGLINE}`,
  description: PROJECT_DESCRIPTION,
  canonical: SITE_URL,
} as const;
