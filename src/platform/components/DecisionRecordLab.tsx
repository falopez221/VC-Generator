"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeScenarios } from "@/src/platform/demo-models";
import { estimateExecutionFeasibility } from "@/src/platform/demo-feasibility";
import { useActiveMission } from "../active-mission";

const ITEM_TYPES = ["Evidence", "Assumption", "Inference", "Hypothesis", "Model output"] as const;
type ItemType = (typeof ITEM_TYPES)[number];
type Outcome = "No conclusion yet" | "Proceed with conditions" | "Return for review" | "Do not proceed";

type DecisionItem = { id: number; type: ItemType; statement: string; source: string; limitation: string };

export function DecisionRecordLab() {
  const { mission, ready } = useActiveMission();
  const restored = useRef(false);
  const [question, setQuestion] = useState("");
  const [itemType, setItemType] = useState<ItemType>("Evidence");
  const [statement, setStatement] = useState("");
  const [source, setSource] = useState("");
  const [limitation, setLimitation] = useState("");
  const [items, setItems] = useState<DecisionItem[]>([]);
  const [outcome, setOutcome] = useState<Outcome>("No conclusion yet");
  const [authority, setAuthority] = useState("");
  const [rationale, setRationale] = useState("");
  const [conditions, setConditions] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const addEnabled = statement.trim().length >= 10 && limitation.trim().length >= 8 && (itemType !== "Evidence" || source.trim().length >= 3);
  const needsConditions = outcome === "Proceed with conditions";
  const recordEnabled = question.trim().length >= 20 && items.length > 0 && outcome !== "No conclusion yet" && authority.trim().length >= 2 && rationale.trim().length >= 20 && (!needsConditions || conditions.trim().length >= 8) && acknowledged;
  const counts = useMemo(() => ITEM_TYPES.map((type) => [type, items.filter((item) => item.type === type).length] as const), [items]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || !ready || restored.current) return;
      restored.current = true;
      if (!mission) return;
      setQuestion(mission.core.decision);
      setAuthority(mission.core.reviewer || mission.core.owner);
      const inherited: DecisionItem[] = [];
      if (mission.scenarioPlan) {
        const result = analyzeScenarios({ scenarios: mission.scenarioPlan.scenarios, discountRatePercent: mission.scenarioPlan.discountRatePercent });
        inherited.push({ id: Date.now(), type: "Model output", statement: `Scenario analysis produced an expected NPV of ${Math.round(result.expectedNetPresentValue).toLocaleString("en-US")} USD and a declared loss probability of ${result.probabilityOfLossPercent.toFixed(1)}%.`, source: `Scenario Lab · seed ${mission.scenarioPlan.seed}`, limitation: "Result depends only on declared scenario weights, cash-flow assumptions and bounded uncertainty; it is not a forecast." });
      }
      if (mission.feasibilityPlan) {
        const result = estimateExecutionFeasibility(mission.feasibilityPlan);
        inherited.push({ id: Date.now() + 1, type: "Model output", statement: `Execution feasibility estimates a P50 duration of ${result.durationMonths.p50} months, expected cost of ${Math.round(result.cost.expected).toLocaleString("en-US")} USD and readiness of ${result.readiness.score}/100.`, source: `Execution Feasibility · seed ${mission.feasibilityPlan.seed}`, limitation: "Synthetic planning estimate without supplier quotes, organizational calibration or authorization to execute." });
      }
      setItems(inherited);
    });
    return () => { active = false; };
  }, [mission, ready]);

  function addItem() {
    if (!addEnabled) return;
    setItems((current) => [...current, { id: Date.now(), type: itemType, statement: statement.trim(), source: source.trim(), limitation: limitation.trim() }]);
    setStatement(""); setSource(""); setLimitation(""); setRecorded(false);
  }
  function removeItem(id: number) { setItems((current) => current.filter((item) => item.id !== id)); setRecorded(false); }
  function createRecord() { if (recordEnabled) setRecorded(true); }

  return <>
    <header className="platform-page-heading"><div><p>DECISION LAB · LOCAL RECORD</p><h1>Keep observations, models and human judgment distinct.</h1></div><p>Create a bounded decision package in the current browser view. It is not an approval system and does not persist evidence, conclusions, or user identity.</p></header>
    <div className="private-workflow-notice" role="status"><strong>ACTIVE CONTEXT RECEIVED</strong><span>The mission question and confirmed model outputs are carried forward on this device. The final conclusion remains page-local and still requires a named human authority.</span></div>
    <div className="decision-record-grid">
      <section className="platform-panel decision-record-form" aria-labelledby="decision-question-title">
        <header><div><span>01 · DECISION QUESTION</span><h2 id="decision-question-title">Set the boundary</h2></div></header>
        <label>Question to be decided<textarea value={question} onChange={(event) => { setQuestion(event.target.value); setRecorded(false); }} maxLength={900} placeholder="What decision is this record intended to inform?" /></label>
        <div className="decision-record-form__classifications" aria-label="Item classification counts">{counts.map(([type, count]) => <span key={type}>{type}: <b>{count}</b></span>)}</div>
      </section>
      <section className="platform-panel decision-record-form" aria-labelledby="decision-item-title">
        <header><div><span>02 · ADD A LABELED ITEM</span><h2 id="decision-item-title">Document the basis</h2></div></header>
        <label>Classification<select value={itemType} onChange={(event) => setItemType(event.target.value as ItemType)}>{ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Statement<textarea value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={700} placeholder="Record one inspectable statement." /></label>
        <label>Source or basis {itemType === "Evidence" ? "(required)" : "(optional)"}<input value={source} onChange={(event) => setSource(event.target.value)} maxLength={240} placeholder="Source title, observation, or model run reference" /></label>
        <label>Limitation or uncertainty<textarea value={limitation} onChange={(event) => setLimitation(event.target.value)} maxLength={500} placeholder="What could make this incomplete, unreliable, or conditional?" /></label>
        <button type="button" onClick={addItem} disabled={!addEnabled}>Add labeled item</button>
      </section>
    </div>
    <section className="platform-panel decision-record-items" aria-labelledby="decision-items-title">
      <header><div><span>03 · RECORD CONTENT</span><h2 id="decision-items-title">{items.length} local {items.length === 1 ? "item" : "items"}</h2></div></header>
      {items.length === 0 ? <p className="platform-caveat">No items added. Add evidence, an assumption, inference, hypothesis, or model output before drawing a conclusion.</p> : <ul>{items.map((item) => <li key={item.id}><div><span>{item.type.toUpperCase()}</span><strong>{item.statement}</strong><small>{item.source ? `Basis: ${item.source}` : "No source recorded"} · Limitation: {item.limitation}</small></div><button type="button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.type} item`}>Remove</button></li>)}</ul>}
    </section>
    <section className="platform-panel decision-record-form decision-record-gate" aria-labelledby="decision-gate-title">
      <header><div><span>04 · HUMAN DECISION GATE</span><h2 id="decision-gate-title">Record a conditional conclusion</h2></div></header>
      <div className="decision-record-gate__fields"><label>Conclusion<select value={outcome} onChange={(event) => { setOutcome(event.target.value as Outcome); setRecorded(false); }}><option>No conclusion yet</option><option>Proceed with conditions</option><option>Return for review</option><option>Do not proceed</option></select></label><label>Named authority<input value={authority} onChange={(event) => { setAuthority(event.target.value); setRecorded(false); }} maxLength={120} placeholder="Person, role, or committee" /></label><label>Rationale<textarea value={rationale} onChange={(event) => { setRationale(event.target.value); setRecorded(false); }} maxLength={900} placeholder="Explain the human judgment, including trade-offs and dissent." /></label><label>Conditions / next review{needsConditions ? " (required)" : " (optional)"}<textarea value={conditions} onChange={(event) => { setConditions(event.target.value); setRecorded(false); }} maxLength={700} placeholder="Safeguards, follow-ups, or a review date." /></label></div>
      <label className="private-workflow-check"><input type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setRecorded(false); }} />I understand this creates no authorization, commitment, or real-world action. A human remains accountable.</label>
      <footer><p>Requires a bounded question, at least one labeled item, a conclusion, named authority, rationale, and acknowledgment.</p><button type="button" onClick={createRecord} disabled={!recordEnabled}>Create local decision record</button></footer>
      {recorded && <p className="private-workflow-success" role="status">Local decision record created. It is not stored, submitted, or an authorization to act.</p>}
    </section>
  </>;
}
