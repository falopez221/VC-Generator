# Mini-apps privadas por dominio

## Alcance

El area autenticada `/app/applications` contiene 30 mini-apps deterministas: una por cada dominio del catalogo institucional. Cada workspace tiene KPIs, vocabulario, fuentes, roles analiticos, modelos, riesgos, oportunidades, visualizacion y simulacion propios. Los datos son sinteticos y ninguna pantalla se conecta a una operacion, proveedor, activo, paciente, estudiante, wallet, cuenta o persona real.

Los roles visibles son responsabilidades ilustrativas de analisis y revision. No son perfiles ejecutables y no exponen prompts, credenciales, pesos, calibracion, datasets, proveedores ni la red privada completa. Los modelos son reglas publicas de demostracion, no la formula propietaria.

## Patrones de producto aplicados

- Empezar por el estado de la decision, no por una pared generica de widgets.
- Mantener contexto espacial o de proceso junto a la cola de excepciones.
- Mostrar unidad, tendencia, procedencia, frescura y limite de cada KPI.
- Permitir drill-down conceptual desde el resumen hacia evidencia, modelo y owner.
- Separar observado sintetico, estimado y simulado.
- Hacer los escenarios reproducibles, acotados y read-only.
- Mantener el gate humano y la limitacion sectorial visibles.
- Preservar aislamiento por identidad y evitar datos sensibles incluso dentro del area autenticada.

Los 30 renderers sectoriales se organizan conceptualmente en cinco familias —red, mapa, pipeline, flujo y matriz— pero cada dominio implementa su propia visualizacion principal. Por ejemplo, Finance combina curva de rendimientos, heatmap de correlacion y distribucion VaR; Venture Capital combina funnel, ranking de evidencia y distribucion Monte Carlo; Agriculture usa parcelas y capas agronomicas. Solo se comparten el shell, los estados accesibles y los limites de seguridad.

## Referencias oficiales investigadas

Estas referencias se usaron para estudiar jerarquia de informacion, excepciones, procedencia y patrones de navegacion. No se copiaron layouts, marcas, codigo ni capturas, y el sitio no realiza fetches hacia estos servicios.

| Dominio | Referencias | Patron transferido |
| --- | --- | --- |
| AI & Software | [Datadog Dashboards](https://docs.datadoghq.com/getting_started/dashboards/), [GitHub Pulse](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/using-pulse-to-view-a-summary-of-repository-activity) | SLO, latencia, errores y drill-down a evidencia. |
| Agriculture | [John Deere Operations Center](https://www.deere.com/en-us/products-solutions/technology-solutions/precision-ag-technology/operations-center/features), [Climate FieldView](https://climate.com/en-us/solutions/analyze-data.html) | Mapa de lotes, avance de campana y comparacion de rendimiento. |
| Biotechnology | [Benchling Insights](https://www.benchling.com/insights) | Pipeline por etapa y trazabilidad a experimento y dataset. |
| Blockchain | [Dune Data Hub](https://docs.dune.com/web-app/overview) | Metricas de protocolo, filtros y metodologia visible. |
| Cities | [ArcGIS Urban](https://www.esri.com/en-us/arcgis/products/arcgis-urban/overview), [Bentley iTwin Experience](https://www.bentley.com/software/itwin-experience/) | Capas urbanas, comparacion actual-escenario y drill-down territorial. |
| Climate | [Microsoft Sustainability Manager](https://learn.microsoft.com/en-us/industry/sustainability/report-dashboard), [Watershed](https://watershed.com/en-GB/platform) | Scope 1/2/3, hotspots y calidad observado-estimado. |
| Corporate Strategy | [Cascade](https://www.cascade.app/product/getting-started) | Objetivo a iniciativa, owner, meta, tendencia y excepciones. |
| Culture & Media | [Spotify for Artists Analytics](https://artists.spotify.com/blog/release-details-page-and-audience-engagement-analytics) | Funnel de alcance, afinidad y engagement por cohorte. |
| Cybersecurity | [Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/monitor-your-data), [CrowdStrike Exposure Management](https://www.crowdstrike.com/en-us/platform/exposure-management/) | Cola por riesgo, timeline, entidades y SLA. |
| Defense | [AnyLogic Defense](https://www.anylogic.com/defense/) | Simulaciones reproducibles de capacidad y logistica, sin datos reales. |
| Education | [Instructure Data Insights](https://www.instructure.com/solutions/data-insights) | Institucion a cohorte, resultados, actividad y apoyo priorizado. |
| Emergency Response | [Esri Emergency Management](https://www.esri.com/en-us/industries/emergency-management/solutions/situational-awareness), [Motorola CommandCentral Aware](https://www.motorolasolutions.com/en_us/products/command-center-software/public-safety-software/real-time-intelligence-operations/commandcentral-aware.html) | Common operating picture, prioridad, edad, fase y auditoria. |
| Energy | [Schneider EcoStruxure PME](https://www.se.com/us/en/product-range/65404-ecostruxure-power-monitoring-expert/), [GE Vernova GridOS](https://www.gevernova.com/software/products/gridos) | Diagrama agregado de flujo, demanda-oferta y excepciones de activos. |
| Finance | [Stripe Payments Analytics](https://docs.stripe.com/payments/analytics), [Stripe Billing Analytics](https://docs.stripe.com/billing/subscriptions/analytics) | Comparacion temporal, reconciliacion y drill-down transaccional conceptual. |
| Government | [USAspending Spending Explorer](https://www.usaspending.gov/explorer) | Presupuesto a programa, filtros, definiciones, fuente y descarga. |
| Healthcare | [GE HealthCare Command Center](https://www.gehealthcare.com/en-us/products/software/command-center), [Epic Patient Flow](https://www.epic.com/software/hospital-patient-flow/) | Capacidad, flujo, bloqueos, throughput y confianza. |
| Infrastructure | [IBM Maximo](https://www.ibm.com/products/maximo), [Bentley iTwin Experience](https://www.bentley.com/software/itwin-experience/) | Portafolio a activo, condicion, backlog e historial. |
| International Relations | [ACLED Explorer](https://acleddata.com/platform/explorer), [CFR Global Conflict Tracker](https://www.cfr.org/global-conflict-tracker) | Mapa sincronizado, severidad descompuesta y evidencia fechada. |
| Law | [Clio Case Management](https://www.clio.com/features/case-management/) | Matter como unidad central, plazos, tareas y evidencia. |
| Logistics | [project44 Visibility](https://www.project44.com/platform/visibility/), [FourKites](https://www.fourkites.com/platform/real-time-visibility/) | Mapa multimodal, hitos, ETA y excepciones con owner. |
| Manufacturing | [Siemens Performance Insight](https://www.siemens.com/en-us/products/simatic-apps/performance-insight/), [PTC Asset Monitoring](https://support.ptc.com/help/thingworx_applications/r9.7/en/thingworx_applications/user_interface/AMU_AMD.html) | Planta a linea, OEE, paradas, scrap y mantenimiento. |
| Mining | [Komatsu DISPATCH](https://www.komatsu.com/en-us/technology/smart-mining/loading-and-haulage/dispatch), [Cat MineStar Fleet](https://www.cat.com/en_US/by-industry/mining/minestar-solutions/solutions/fleet-management-solutions.html) | Plan versus resultado, ciclo, cola y salud de activos. |
| Public Safety | [Axon Fusus](https://www.axon.com/products/axon-fusus) | Incidentes agregados, severidad, estado y timeline auditado. |
| Science | [Elsevier SciVal](https://www.elsevier.com/products/scival), [Clarivate InCites](https://clarivate.com/products/scientific-and-academic-research/research-funding-and-analytics/incites-benchmarking-analytics/) | Evidencia multidimensional, colaboracion y comparacion responsable. |
| Space | [Ansys STK](https://www.ansys.com/products/missions/ansys-stk), [LeoLabs Space Traffic Management](https://leolabs.space/space-traffic-management/) | Tiempo controlable, cobertura y cola de conjunciones. |
| Sports | [Hudl Signal](https://hudl-www.hudl.com/products/signal), [Hudl Insight](https://hudl-www.hudl.com/products/insight) | Microciclo, carga, disponibilidad y contexto tactico. |
| Telecommunications | [Ericsson Satori RAN Insights](https://www.ericsson.com/en/portfolio/networks/network-services/rapp-directory/a-z-directory/satori-ran-insights-rapp), [Nokia AVA NWDAF](https://www.nokia.com/ai-and-analytics/nwdaf/) | Region a celda, disponibilidad, latencia, capacidad y causa probable. |
| Universities | [Ellucian Reporting & Analytics](https://www.ellucian.com/products/platform/reporting-analytics), [Watermark Leader Insights](https://support.watermarkinsights.com/hc/en-us/articles/15280781942939-Student-Success-Engagement-Data-in-Institution-Leader-Insights) | Vistas por rol, pipeline institucional y cartera priorizada. |
| Venture Capital | [Affinity Analytics](https://www.affinity.co/product/analytics), [Carta Fund Forecasting](https://carta.com/explore-erp/venture-capital/fund-forecasting/) | Dealflow, conversion, aging, reservas y escenarios de fondo. |
| Water | [Autodesk Info360 Insight](https://www.autodesk.com/products/info360-insight/overview/), [Bentley OpenFlows WaterSight](https://www.bentley.com/software/openflows-watersight/) | Mapa de red abstracto, balance, perdidas y escenarios what-if. |

## Seguridad sectorial

Defense, Emergency Response, Energy, Healthcare, Infrastructure, Manufacturing, Mining, Public Safety, Space, Telecommunications y Water no exponen coordenadas, topologia, telemetria, endpoints, setpoints, tasking, personas ni controles reales. Finance y Venture Capital no ofrecen asesoramiento ni aprobacion. Healthcare no contiene datos medicos personales. Law no ofrece asesoramiento legal. Public Safety no incorpora reconocimiento facial, seguimiento o perfilado.
