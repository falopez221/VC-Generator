export const PIPELINE = [
  { phase: "01", name: "Input humano", detail: "Define problema, tesis, contexto, límites y objetivo de la ejecución.", gate: "Mandato humano" },
  { phase: "02", name: "Validación", detail: "Sanitiza texto, acota números y rechaza configuraciones incompletas.", gate: "Esquema válido" },
  { phase: "03", name: "Generación sintética", detail: "Produce entre 6 y 12 alternativas desde reglas públicas y una semilla.", gate: "Conteo y seed reproducibles" },
  { phase: "04", name: "Muestra de cuatro agentes", detail: "En el Lab, Mathematics, Finance, Strategy y Marketing devuelven contratos estructurados; el registro privado agregado se selecciona por misión.", gate: "Contrato completo" },
  { phase: "05", name: "MCDA", detail: "Normaliza pesos y calcula contribuciones, penalizaciones e intervalo visible.", gate: "Pesos suman 100%" },
  { phase: "06", name: "Incertidumbre", detail: "Explora distribuciones y escenarios sin presentar pronósticos como hechos.", gate: "Bounds finitos" },
  { phase: "07", name: "Economía", detail: "Hace visibles contribución, break-even, adopción y payback demostrativos.", gate: "Unidades explícitas" },
  { phase: "08", name: "Sensibilidad", detail: "Localiza drivers mediante cambios de pesos y tornado one-at-a-time.", gate: "Supuestos visibles" },
  { phase: "09", name: "Robustez", detail: "Mide Pareto, estabilidad del ranking y casos no informativos.", gate: "Limitación declarada" },
  { phase: "10", name: "Gate de evidencia", detail: "Evita que un score alto compense evidencia débil o incertidumbre extrema.", gate: "Revisión requerida" },
  { phase: "11", name: "Comparación", detail: "Ordena sin borrar desacuerdo, riesgo, evidencia ni alternativas no dominadas.", gate: "Resumen textual accesible" },
  { phase: "12", name: "Revisión humana", detail: "Guarda una decisión de revisión y el próximo experimento sin ejecutar acciones.", gate: "Autoridad humana" },
] as const;
