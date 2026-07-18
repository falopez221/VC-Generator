# Venture Governance System™

Sitio institucional y demostración pública limitada de Venture Governance System™. El Public Lab permite explorar oportunidades sintéticas con cuatro agentes visibles —Mathematics, Finance, Strategy y Marketing— y modelos cuantitativos demostrativos. Los perfiles, prompts, datasets, pesos y lógica de ejecución del producto privado no se publican en este repositorio.

## Rutas principales

- `/`: landing institucional.
- `/lab`: alcance de la demostración pública.
- `/lab/demo`: simulación interactiva reproducible por semilla y, si se habilita investigación pública, por snapshot guardado.
- `/lab/results/[id]`: resultado guardado localmente.
- `/lab/methodology`: metodología, supuestos y limitaciones.
- `/applications`: catálogo público y Mission Builder determinista.
- `/app/login`: acceso con identidad gestionada por Sites.
- `/app`: preview autenticada y autorizada del workspace institucional.
- `/request-access`: prepara un pedido por email; no persiste datos.

## Qué incluye el Public Lab

- Generación determinista de 6 a 12 oportunidades sintéticas.
- Catálogo v3.0.0 de 14 modelos: MCDA, Monte Carlo, sensibilidad, actualización bayesiana, escenarios, matriz de riesgo, Pareto, mínimos cuadrados, tornado, break-even, robustez del ranking, prioridad de validación, Defensibility Lens y Macroeconomic Lens.
- Comparación de hasta tres oportunidades, decisiones humanas y evidencia adicional.
- Persistencia únicamente en `localStorage`, exportación JSON/CSV e impresión.
- Sonido opcional después de una interacción del usuario, con volumen configurable.

Los resultados no son predicciones ni asesoramiento de inversión. La arquitectura completa, los agentes internos, los prompts, el scoring propietario, las fuentes privadas y la ejecución a escala no forman parte de este repositorio público.

## Stack

- Next.js 16 App Router, React 19 y TypeScript estricto.
- Vinext/Vite para Sites/Cloudflare Workers.
- HTML, CSS y SVG nativos para las visualizaciones; sin dependencias de gráficos.
- Motor matemático local y determinista. La investigación web pública es opcional, está desactivada por defecto y no altera el ranking.

## Desarrollo

Requiere Node.js 22.13 o superior.

```bash
npm install
npm run dev
```

No se requieren variables de entorno para el sitio o el Lab determinista. La preview autenticada falla de forma segura hasta configurar `VG_OWNER_EMAIL` en el servidor y admite una allowlist server-side opcional mediante `VG_AUTHORIZED_EMAILS`. En Sites también se deben configurar `VG_TRUST_CHATGPT_AUTH_HEADERS=1` y `VG_TRUSTED_SITES_HOSTS` con el hostname exacto de producción; no se deben incluir previews, `workers.dev`, Vercel ni proxies no confiables. Estas variables nunca deben exponerse en el cliente ni derivarse del email público de contacto.

### Abrir el workspace protegido en desarrollo local

La autenticación publicada depende del dispatcher de Sites. Para inspeccionar `/app` exclusivamente en la máquina local, copiá `.env.example` a `.env.local` y configurá:

```dotenv
VG_LOCAL_DEV_MODE=1
VG_LOCAL_DEV_USER_EMAIL=local@example.test
VG_LOCAL_DEV_USER_NAME=Local Operator
```

Luego ejecutá `npm run dev:local` y abrí `http://127.0.0.1:3000/app`. Este modo solo se acepta con `NODE_ENV=development`, no usa una contraseña incluida en el repositorio y no reemplaza una autenticación local de producción.

## Validación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run build:vercel
```

## Instalador local de Windows

El instalador autónomo se genera en `installer/output/Venture-Governance-Local-Setup.exe`. Incluye el runtime necesario, instala por usuario sin permisos de administrador, crea accesos directos y registra un desinstalador. La configuración editable está en `installer/config.psd1`; las instrucciones para modificarlo y recompilarlo están en `installer/README.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1
```

`npm test` ejecuta pruebas unitarias del motor y pruebas de integración de las rutas renderizadas.

## Estructura

```text
app/                         Rutas, layouts, metadata, sitemap y robots
app/lab/                     Rutas del Public Lab
app/applications/            Explorer y fichas de Application Intelligence
src/lab/                     Motor, modelos, esquema, persistencia, audio y UI
src/applications/            Catálogo, filtros, misiones, analytics y componentes
src/platform/                App Shell, fixtures, módulos y grafos funcionales 2D/3D
src/styles/lab.css           Sistema visual responsive del Lab
src/components/              Landing institucional
src/config/site.ts           Identidad, URLs y navegación
docs/public-lab*.md          Arquitectura, modelos, límites y audio
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
- [Arquitectura de la preview autenticada](./docs/platform-architecture.md)
- [Capa espacial funcional](./docs/platform-3d-layer.md)
- [Frontera de referencia visual e IP](./docs/design-reference-boundary.md)
- [Revisión de originalidad del workspace](./docs/ORIGINALITY_REVIEW.md)
- [Guía de edición](./EDITING_GUIDE.md)

Los documentos maestros y whitepapers retirados no forman parte del árbol público ni de los artefactos de producción.

## Despliegue

El proyecto está vinculado a Sites mediante `.openai/hosting.json`. Para Vercel, `vercel.json` usa `npm run build:vercel`, pero `/app` se mantiene denegado hasta integrar una identidad compatible. La demo pública no necesita base de datos ni servicios externos, y el catálogo/runtime privado no está incluido en este repositorio.
