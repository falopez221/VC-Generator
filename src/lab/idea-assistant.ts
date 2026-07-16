import { sanitizeText } from "./schema.ts";
import type { LabInput } from "./types.ts";

type DetectionRule = readonly [RegExp, string];

const INDUSTRY_RULES: DetectionRule[] = [
  [/health|patient|clinic|hospital|salud|paciente|cl[ií]nica/i, "Health technology"],
  [/agricultur|farm|crop|agro|granja|cultivo/i, "Agriculture technology"],
  [/climate|energy|emission|solar|clima|energ[ií]a|emisi[oó]n/i, "Climate and energy"],
  [/finance|fintech|payment|bank|finanzas|pago|banco/i, "Financial technology"],
  [/education|learning|school|educaci[oó]n|aprendizaje|escuela/i, "Education technology"],
  [/logistic|supply chain|freight|log[ií]stica|cadena de suministro/i, "Logistics and supply chain"],
  [/industrial|manufactur|factory|industria|fabricaci[oó]n|f[aá]brica/i, "Industrial technology"],
];

const TECHNOLOGY_RULES: DetectionRule[] = [
  [/language model|\bllm\b|generative ai|artificial intelligence|machine learning|inteligencia artificial|aprendizaje autom[aá]tico|\bia\b/i, "Artificial intelligence"],
  [/blockchain|crypto|smart contract|cadena de bloques|contrato inteligente/i, "Blockchain and programmable controls"],
  [/robot|automation|automatizaci[oó]n/i, "Robotics and automation"],
  [/sensor|internet of things|\biot\b/i, "IoT and sensors"],
  [/knowledge graph|grafo de conocimiento/i, "Knowledge graphs"],
  [/marketplace|mercado digital/i, "Digital marketplace"],
];

const STOP_WORDS = new Set(["a", "an", "and", "are", "de", "el", "en", "for", "la", "las", "los", "of", "para", "que", "the", "to", "un", "una", "with", "y"]);

function firstMatch(text: string, rules: DetectionRule[], fallback: string) {
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function sentences(text: string) {
  return (text.match(/[^.!?]+[.!?]?/g) ?? [text]).map((sentence) => sentence.trim()).filter(Boolean);
}

function sentenceWithPeriod(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function analysisName(text: string) {
  const words = text.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word.toLowerCase())).slice(0, 7);
  const title = words.map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`).join(" ");
  return `${title || "Structured idea"} exploration`.slice(0, 120);
}

function customerType(text: string) {
  if (/government|public sector|municip|gobierno|sector p[uú]blico/i.test(text)) return "Public-sector organizations";
  if (/consumer|people|individual|family|usuario final|consumidor|persona|familia/i.test(text)) return "B2C consumers";
  if (/enterprise|business|company|team|operator|empresa|negocio|equipo|operador/i.test(text)) return "B2B organizations";
  return "Initial customers described in the idea";
}

function targetMarket(text: string) {
  const match = text.match(/\b(?:for|serves|targeting|para)\s+([^.,;!?]{3,80})/i)?.[1];
  return match ? sanitizeText(match).slice(0, 120) : "Initial customer segment described in the idea";
}

export interface IdeaAssistantResult {
  success: boolean;
  input: LabInput;
  detected: string[];
  error?: string;
}

export function structureIdea(input: LabInput): IdeaAssistantResult {
  const narrative = sanitizeText(input.ideaNarrative, "", 4000);
  if (narrative.length < 40) return { success: false, input, detected: [], error: "Write at least 40 characters so the intake assistant has enough context." };

  const parts = sentences(narrative);
  const problem = sentenceWithPeriod(parts[0].slice(0, 599));
  const industry = firstMatch(narrative, INDUSTRY_RULES, "Cross-industry innovation");
  const technology = firstMatch(narrative, TECHNOLOGY_RULES, "Technology to be defined");
  const customers = customerType(narrative);
  const market = targetMarket(narrative);
  const approach = parts[1]
    ? sentenceWithPeriod(parts[1].slice(0, 599))
    : `A focused solution using ${technology.toLowerCase()} could help ${customers.toLowerCase()} address the problem and create measurable value.`;
  const summary = sanitizeText(`Core problem: ${problem} Proposed approach: ${approach} Suggested frame: ${industry}; ${market}; ${technology}; ${customers}.`).slice(0, 900);
  const detected = [industry, technology, customers];

  return {
    success: true,
    detected,
    input: {
      ...input,
      ideaNarrative: narrative,
      ideaSummary: summary,
      analysisName: analysisName(narrative),
      problem,
      thesis: approach,
      industry,
      market,
      technology,
      customerType: customers,
    },
  };
}
