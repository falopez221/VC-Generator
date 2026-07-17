# Venture Governance System™

Sitio institucional y demostración pública limitada de Venture Governance System™. La portada explica la arquitectura conceptual; el Public Lab permite explorar oportunidades sintéticas con cuatro agentes visibles —Mathematics, Finance, Strategy y Marketing— y modelos cuantitativos demostrativos.

## Rutas principales

- `/`: landing institucional y whitepaper.
- `/lab`: alcance de la demostración pública.
- `/lab/demo`: simulación interactiva reproducible por semilla.
- `/lab/results/[id]`: resultado guardado localmente.
- `/lab/methodology`: metodología, supuestos y limitaciones.

## Qué incluye el Public Lab

- Generación determinista de 6 a 12 oportunidades sintéticas.
- Catálogo v2.0.0 de 12 modelos: MCDA, Monte Carlo, sensibilidad, actualización bayesiana, escenarios, matriz de riesgo, Pareto, mínimos cuadrados, tornado, break-even, robustez del ranking y prioridad de validación.
- Comparación de hasta tres oportunidades, decisiones humanas y evidencia adicional.
- Persistencia únicamente en `localStorage`, exportación JSON/CSV e impresión.
- Sonido opcional después de una interacción del usuario, con volumen configurable.

Los resultados no son predicciones ni asesoramiento de inversión. La arquitectura completa, los agentes internos, los prompts, el scoring propietario, las fuentes privadas y la ejecución a escala no forman parte de este repositorio público.

## Stack

- Next.js 16 App Router, React 19 y TypeScript estricto.
- Vinext/Vite para Sites/Cloudflare Workers.
- HTML, CSS y SVG nativos para las visualizaciones; sin dependencias de gráficos.
- Motor matemático local y determinista, sin llamadas externas.

## Desarrollo

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

No se requieren variables de entorno para la demo. `.env.example` reserva únicamente nombres para una futura integración de servidor; nunca deben exponerse claves en el cliente.

## Validación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run build:vercel
```

`npm test` ejecuta pruebas unitarias del motor y pruebas de integración de las rutas renderizadas.

## Estructura

```text
app/                         Rutas, layouts, metadata, sitemap y robots
app/lab/                     Rutas del Public Lab
app/applications/            Explorer y fichas de Application Intelligence
src/lab/                     Motor, modelos, esquema, persistencia, audio y UI
src/applications/            Catálogo, filtros, misiones, analytics y componentes
src/styles/lab.css           Sistema visual responsive del Lab
src/components/              Landing institucional
src/config/site.ts           Identidad, URLs y navegación
docs/public-lab*.md          Arquitectura, modelos, límites y audio
public/documents/            Whitepaper público
.openai/hosting.json         Proyecto de Sites existente
AGENTS.md                    Reglas de alcance y protección de IP
```

## Integración futura con modelos de lenguaje

`src/lab/llm-provider.ts` define una interfaz desacoplada. Una implementación futura debe ejecutarse exclusivamente en servidor, validar sus respuestas contra el esquema público, aplicar límites de uso y mantener prompts y credenciales fuera del navegador. El modo determinista actual debe seguir disponible como fallback auditable.

## Documentación

- [Alcance y uso](./docs/public-lab.md)
- [Arquitectura](./docs/public-lab-architecture.md)
- [Modelos matemáticos](./docs/public-lab-models.md)
- [Limitaciones](./docs/public-lab-limitations.md)
- [Audio](./docs/public-lab-audio.md)
- [Application Intelligence Explorer](./docs/applications.md)
- [Guía de edición](./EDITING_GUIDE.md)

El whitepaper público v2 se genera de forma reproducible con `scripts/generate_public_whitepaper.py` y se publica en `public/documents/venture-governance-system-whitepaper-publico-v2.pdf`.

## Despliegue

El proyecto está vinculado a Sites mediante `.openai/hosting.json`. Para Vercel, `vercel.json` usa `npm run build:vercel`. La demo no necesita base de datos ni servicios externos.
