# Functional spatial layer

The spatial layer is implemented with native React, CSS transforms and SVG. No Three.js dependency is required for the bounded public graphs.

## Implemented behavior

- agents, evidence, models, missions, Human Gates and outcomes are meaningful nodes;
- directed edges show the governed flow and selected relationships are listed in text;
- users can switch between 2D and 3D, rotate, zoom, select, trace and isolate;
- inspectors expose type, status, control and direct relationships;
- Intersection Observer delays activation until the graph approaches the viewport;
- mobile keeps Mission, models, Human Gate and Decision Record visible;
- `prefers-reduced-motion` starts the graph in 2D and disables spatial rotation;
- hidden or isolated nodes leave the keyboard tab order;
- every graph states that it is explanatory, not live telemetry.

The public landing also contains an original device presentation with an interactive interconnected dashboard and a five-layer architecture companion. It is live interface markup, not a copied screenshot or a claim of production activity.

---

# CAPA VISUAL 3D

Quiero que la experiencia tenga una **capa 3D sobria, institucional y funcional**, sin estética gamer ni efectos decorativos excesivos.

Aplicarla especialmente en:

* pantalla de acceso;
* Dashboard;
* Knowledge Graph;
* Mission Builder;
* Applications Map;
* Simulation Lab;
* Agent Library.

La visualización 3D debe representar:

* agentes como nodos;
* dominios como clusters;
* modelos matemáticos como conexiones;
* misiones como estructuras activas;
* evidencia como flujos;
* Human Gates como puntos de control;
* resultados como escenarios emergentes.

Debe permitir:

* rotar;
* hacer zoom;
* seleccionar nodos;
* aislar clusters;
* seguir conexiones;
* cambiar entre vista 2D y 3D;
* mostrar tooltips;
* abrir paneles de detalle.

Usar 3D únicamente cuando mejore la comprensión.

Requisitos:

* rendimiento fluido;
* lazy loading;
* versión simplificada en mobile;
* fallback 2D;
* compatibilidad con `prefers-reduced-motion`;
* no bloquear el main thread;
* no cargar miles de nodos simultáneamente;
* no usar partículas decorativas sin significado;
* no copiar visualmente a Palantir.

La sensación debe ser la de explorar una **arquitectura viva de inteligencia**, no una animación ornamental.
