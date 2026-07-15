# Venture Intelligence OS™

Sitio institucional interactivo para presentar Venture Intelligence OS™: una arquitectura conceptual multiagente aplicada al descubrimiento, modelado y evaluación de oportunidades de venture.

El whitepaper estratégico v1.0 está integrado en la narrativa del sitio y disponible en `public/documents/venture-intelligence-whitepaper.pdf`.

## Stack

- Next.js con App Router y React.
- TypeScript estricto.
- Tailwind CSS 4 disponible mediante PostCSS; sistema visual principal centralizado en tokens CSS.
- Vinext/Vite para desarrollo rápido y despliegue compatible con Sites/Cloudflare Workers.
- Componentes interactivos nativos, sin librerías de gráficos o 3D innecesarias.

## Requisitos

- Node.js 22.13 o superior.
- npm 10 o superior.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrí la URL local informada en la terminal. Para producción:

```bash
npm run lint
npm run build
npm run start
```

## Estructura

```text
app/                    Rutas, layout, metadata, sitemap y robots
src/components/         UI, layout y secciones
src/config/site.ts      Todos los enlaces, identidad y metadata
src/content/            Agentes, pipeline, modelos, casos, roadmap y riesgos
src/hooks/              Comportamientos reutilizables
src/styles/site.css     Tokens y sistema visual responsive
public/documents/       Ubicación del whitepaper
.openai/hosting.json    Configuración de hosting
```

## Decisiones arquitectónicas

- Una sola narrativa vertical para que un inversor entienda el sistema sin navegar entre rutas.
- Contenido y URLs desacoplados de la presentación.
- Diagramas HTML/CSS progresivos: funcionan sin WebGL, reducen consumo y respetan `prefers-reduced-motion`.
- Estado cliente limitado a navegación, explorador de agentes y curva de valor editable.
- Ejemplos cuantitativos etiquetados como conceptuales para evitar falsa precisión.
- Gates humanos visibles en arquitectura, pipeline y scorecard.

## Personalización

Consultá [EDITING_GUIDE.md](./EDITING_GUIDE.md). Los cambios habituales se hacen en `src/config/site.ts`, `src/content/` y `src/styles/site.css`.

## Despliegue

### Sites / Cloudflare

El proyecto incluye `.openai/hosting.json` y salida ESM compatible con el hosting administrado de Sites.

### Vercel

1. Subí el repositorio a GitHub, GitLab o Bitbucket.
2. En Vercel, creá un proyecto e importá el repositorio.
3. El archivo `vercel.json` selecciona Next.js y ejecuta `npm run build:vercel`.
4. No se requieren variables de entorno para esta versión.
5. Antes de publicar, reemplazá `SITE_URL` en `src/config/site.ts` por el dominio final.

### Netlify o servidor Node

Configurá el runtime de Node 22+. Para un servidor compatible con el adaptador principal usá `npm run build` y `npm run start`; para un runtime Next.js estándar usá `npm run build:vercel` y `npm run start:next`.

## Mejoras futuras

- Calibrar visualizaciones con datos autorizados.
- Añadir CMS o editor para equipos no técnicos.
- Implementar fuentes, retrieval y agentes reales en un producto separado.
- Realizar pruebas de usuario y auditoría WCAG formal.
