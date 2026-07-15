# Guía de edición

## Cambios rápidos

Todos los enlaces, la identidad y la metadata están en:

`src/config/site.ts`

Ahí podés cambiar:

- `PROJECT_NAME`: nombre del proyecto.
- `PROJECT_TAGLINE`: subtítulo principal.
- `PROJECT_DESCRIPTION`: descripción general y metadata.
- `CONTACT_EMAIL` y `CONTACT_URL`: contacto.
- `PRIMARY_CTA_URL` y `SECONDARY_CTA_URL`: CTA principales.
- `WHITEPAPER_URL`: ruta o URL del PDF.
- `LINKEDIN_URL`, `GITHUB_URL`, `CALENDAR_URL` y `DEMO_URL`: enlaces externos.
- `SITE_URL`: dominio para canonical y sitemap.
- `NAVIGATION`: textos y destinos del menú.

No escribas URLs directamente dentro de componentes.

## Cambiar textos y datos

El contenido editable está separado por tema:

- Agentes: `src/content/agents.ts`
- Pipeline: `src/content/pipeline.ts`
- Frameworks y Blue Ocean: `src/content/frameworks.ts`
- Modelos, score y algoritmos: `src/content/models.ts`
- Casos de uso y modelo de negocio: `src/content/use-cases.ts`
- Roadmap: `src/content/roadmap.ts`
- Riesgos: `src/content/risks.ts`
- Arquitectura: `src/content/architecture.ts`

Los titulares narrativos cortos viven en cada archivo de sección bajo `src/components/sections/`.

## Reemplazar el PDF

1. Copiá el PDF final como:

   `public/documents/venture-intelligence-whitepaper.pdf`

2. Verificá `WHITEPAPER_URL` en `src/config/site.ts`.
3. Cambiá `WHITEPAPER_AVAILABLE` a `true`.
4. Ejecutá `npm run build` para verificar la descarga.

## Agregar o eliminar agentes

Editá `AGENTS` en `src/content/agents.ts`. Cada agente necesita un `id` único. Las relaciones se definen con `connectsTo`, usando esos mismos ids. El explorador se actualiza automáticamente.

## Cambiar colores

Editá las variables del bloque `:root` en `src/styles/site.css`. Los tokens principales son `--navy-*`, `--blue-*`, `--cyan-400`, `--paper`, `--line`, `--ink` y `--white`.

## Cambiar tipografía

Modificá `--font-sans` y `--font-mono` en `src/styles/site.css`. Si cargás una fuente web, hacelo desde `app/layout.tsx` o mediante archivos locales optimizados. Evitá más de dos familias.

## Modificar secciones

El orden de secciones está en `app/page.tsx`. Cada sección está en `src/components/sections/`. Al eliminar una sección, eliminá también su entrada en `NAVIGATION`.

## Reemplazar imágenes

Guardá imágenes optimizadas en `public/images/` y referencialas desde contenido o componentes. Esta versión usa diagramas HTML/CSS y no depende de imágenes decorativas.

## Ejecutar en Visual Studio Code

1. Abrí la carpeta del proyecto con **File → Open Folder**.
2. Abrí la terminal integrada.
3. Ejecutá:

```bash
npm install
npm run dev
```

## Compilar y verificar

```bash
npm run lint
npm run build
npm run start
```

## Desplegar en Vercel

1. Publicá el proyecto en un repositorio Git.
2. Importalo desde Vercel.
3. Mantené `npm install` y `npm run build`.
4. Cambiá `SITE_URL` por el dominio definitivo.
5. Desplegá y verificá `/sitemap.xml`, `/robots.txt` y la descarga del PDF.
