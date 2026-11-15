import manifest from "../demo-cache/index.json";
import rules from "../data/interactions.json";

export type DemoStep = {
  scenarioId: string;
  title: string;
  description: string;
  presenterNote: string;
  expected: { id: string; title: string }[];
};

// Presenter copy only. Clinical findings come from existing fixture/rule data.
const outline = [
  { scenarioId: "1-paracetamol-duplication", title: "Recognize the shared ingredient", presenterNote: "Compare the printed name and per-unit strength with the source image, then show the shared US ingredient." },
  { scenarioId: "2-ginkgo-warfarin", title: "Review a cited herbal interaction", presenterNote: "Open the cited rule and its pending-review label. Keep the unresolved ingredient visible." },
  { scenarioId: "3-cold-medicine-bp", title: "Read every ingredient in a combination", presenterNote: "Show the full ingredient list, then compare it with the entered US medicines." },
  { scenarioId: "4-otc-antibiotic", title: "Surface medicines for clinician review", presenterNote: "Show the clinician flags and their sources. Screening flags are not treatment recommendations." },
  { scenarioId: "5-herbal-no-ingredient-list", title: "Keep unreadable ingredients Unverified", presenterNote: "Show the Unverified result when no readable ingredient list is present. Brand recognition must not fill the gap." },
];

export const demoWalkthrough: DemoStep[] = outline.map(step => {
  const scenario = manifest.scenarios.find(s => s.id === step.scenarioId);
  if (!scenario) throw new Error(`Missing walkthrough fixture: ${step.scenarioId}`);
  return { ...step, description: scenario.description, expected: scenario.expected.map(id => {
    if (id === "unresolved") return { id, title: "Not identified / Unverified" };
    const rule = rules.rules.find(r => r.id === id);
    if (!rule) throw new Error(`Missing walkthrough rule: ${id}`);
    return { id, title: rule.title };
  }) };
});
