"use client";

import Link from "next/link";
import { useState } from "react";

type GuideLevel = "easy" | "intermediate" | "complete";
type GuideStep = { title: string; text: string; href: string; action: string };

const GUIDES: Record<GuideLevel, { label: string; title: string; intro: string; steps: GuideStep[] }> = {
  easy: {
    label: "Facil", title: "Una primera vuelta sin tecnicismos",
    intro: "Usa el dashboard como una mesa de trabajo: primero escribis que queres decidir, despues miras quien puede aportar y por ultimo comparas escenarios. No necesitas activar nada ni entender todos los modelos para empezar.",
    steps: [
      { title: "1. Conta la pregunta", text: "Escribi el objetivo, el contexto y que decision queres revisar.", href: "/app/missions/new", action: "Abrir Mission Builder" },
      { title: "2. Mira los especialistas", text: "Busca por categoria o subcategoria y elegi solo los agentes relevantes.", href: "/app/agents", action: "Abrir Agent Library" },
      { title: "3. Proba alternativas", text: "Cambia supuestos y compara resultados; los numeros no aprueban decisiones.", href: "/app/simulation", action: "Abrir Simulation Lab" },
    ],
  },
  intermediate: {
    label: "Intermedia", title: "De una hipotesis a un paquete revisable",
    intro: "Este recorrido conecta una mision con evidencia, agentes y simulacion. El agente se selecciona por el texto de la mision y la sensibilidad que queres estudiar; luego una persona interpreta el resultado antes de seguir.",
    steps: [
      { title: "1. Defini alcance y sensibilidad", text: "Indica que cambia la conclusion: demanda, capital, costos, incertidumbre u horizonte.", href: "/app/missions/new", action: "Definir mision" },
      { title: "2. Investiga evidencia", text: "Usa Research Lab para reunir fuentes; distingui evidencia, supuestos e inferencias.", href: "/app/research", action: "Abrir Research Lab" },
      { title: "3. Elegi y contrasta", text: "Selecciona agentes documentados, corre escenarios reproducibles y guarda los puntos a revisar.", href: "/app/scenarios", action: "Abrir Scenario Lab" },
    ],
  },
  complete: {
    label: "Completa", title: "Flujo de decision gobernado de punta a punta",
    intro: "La plataforma organiza un proceso, no reemplaza criterio. Cada salida conserva sus fuentes y supuestos, pasa por sensibilidad y red team, y termina en una decision humana con condiciones explicitas.",
    steps: [
      { title: "1. Mision y equipo", text: "Crea la mision, filtra el catalogo privado y selecciona la combinacion minima de especialidades.", href: "/app/applications", action: "Configurar aplicacion" },
      { title: "2. Evidencia y modelos", text: "Investiga, registra incertidumbres, simula escenarios y compara modelos alternativos.", href: "/app/models", action: "Abrir Model Library" },
      { title: "3. Objeciones y decision", text: "Pedi criticas, documenta desacuerdos y pasa por gobernanza antes de cerrar una decision.", href: "/app/governance", action: "Abrir Governance" },
    ],
  },
};

export function PrivateDashboardGuide({ compact = false }: { compact?: boolean }) {
  const [level, setLevel] = useState<GuideLevel>("easy");
  const guide = GUIDES[level];
  return <section className={`private-dashboard-guide${compact ? " is-compact" : ""}`} aria-labelledby="private-dashboard-guide-title">
    <header><div><span>GUIA DEL DASHBOARD PRIVADO</span><h2 id="private-dashboard-guide-title">Que hace esta plataforma y por donde empezar</h2></div><p>El dashboard te ayuda a convertir una pregunta en un analisis trazable: mision, agentes y evidencia, simulaciones y revision humana. No ejecuta decisiones ni reemplaza tu criterio.</p></header>
    <div className="private-dashboard-guide__levels" role="tablist" aria-label="Nivel de guia">{(Object.keys(GUIDES) as GuideLevel[]).map((item) => <button key={item} type="button" role="tab" aria-selected={level === item} className={level === item ? "is-active" : ""} onClick={() => setLevel(item)}>{GUIDES[item].label}</button>)}</div>
    <div className="private-dashboard-guide__content" role="tabpanel"><h3>{guide.title}</h3><p>{guide.intro}</p><ol>{guide.steps.map((step) => <li key={step.title}><div><strong>{step.title}</strong><span>{step.text}</span></div><Link href={step.href}>{step.action}</Link></li>)}</ol></div>
  </section>;
}
