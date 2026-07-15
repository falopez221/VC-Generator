export const RISKS = [
  { risk: "Sesgo y alucinación", control: "Fuentes trazables, evaluación cruzada y abstención explícita." },
  { risk: "Falsa precisión", control: "Rangos, niveles de confianza y separación entre hecho e hipótesis." },
  { risk: "Datos insuficientes", control: "Registrar vacíos y diseñar experimentos para obtener evidencia." },
  { risk: "Propagación de errores", control: "Contratos entre agentes, checkpoints y revisión humana." },
  { risk: "Privacidad y seguridad", control: "Mínimo privilegio, segregación, auditoría y políticas de retención." },
  { risk: "Manipulación de agentes", control: "Aislamiento de fuentes, validación de entradas y Red Team." },
  { risk: "Modelos y regulación", control: "Portabilidad, monitoreo, documentación y gobernanza configurable." },
  { risk: "Evaluación de equipos", control: "No automatizar juicio interpersonal ni reemplazar referencias humanas." },
] as const;
