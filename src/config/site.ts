/**
 * CONFIGURACIÓN CENTRAL DEL SITIO
 * Modificá este archivo para cambiar nombres, enlaces, navegación y metadata.
 * Ningún componente debería contener URLs escritas directamente.
 */

export const PROJECT_NAME = "Venture Intelligence";
export const PROJECT_TAGLINE = "De tesis dispersas a decisiones trazables.";
export const PROJECT_DESCRIPTION =
  "Arquitectura conceptual multiagente para descubrir, modelar y evaluar oportunidades de inversión con evidencia, simulación y supervisión humana.";

// Reemplazá esta URL cuando copies el PDF maestro en /public/documents/.
export const WHITEPAPER_URL = "/documents/venture-intelligence-whitepaper.pdf";
// El PDF maestro no estaba incluido en los adjuntos recibidos. Cambiá a true al incorporarlo.
export const WHITEPAPER_AVAILABLE = false;

// Reemplazá estos datos de contacto antes de publicar.
export const CONTACT_EMAIL = "reemplazar@ejemplo.com";
export const CONTACT_URL = "#contacto";
export const LINKEDIN_URL = "#contacto";
export const DEMO_URL = "#arquitectura";
export const GITHUB_URL = "#contacto";
export const CALENDAR_URL = "#contacto";

// CTA globales.
export const PRIMARY_CTA_URL = "#solucion";
export const SECONDARY_CTA_URL = "#arquitectura";

// Reemplazá por el dominio final para canonical, sitemap y previews sociales.
export const SITE_URL = "https://venture-intelligence.example";

export const FOOTER_TEXT =
  "Sistema conceptual de apoyo a decisiones. No constituye asesoramiento financiero ni reemplaza el criterio de un comité de inversión.";

export const NAVIGATION = [
  { label: "Visión", href: "#vision" },
  { label: "Problema", href: "#problema" },
  { label: "Solución", href: "#solucion" },
  { label: "Arquitectura", href: "#arquitectura" },
  { label: "Agentes", href: "#agentes" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Modelado", href: "#modelado" },
  { label: "Evaluación", href: "#evaluacion" },
  { label: "Casos de uso", href: "#casos" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Whitepaper", href: WHITEPAPER_URL, disabled: !WHITEPAPER_AVAILABLE },
  { label: "Contacto", href: CONTACT_URL },
] as const;

export const SITE_LINKS = {
  whitepaper: WHITEPAPER_URL,
  contact: CONTACT_URL,
  email: `mailto:${CONTACT_EMAIL}`,
  linkedin: LINKEDIN_URL,
  demo: DEMO_URL,
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
