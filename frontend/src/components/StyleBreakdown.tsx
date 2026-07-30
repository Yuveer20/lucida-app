import type { LearningStyleId } from "@lucida/shared";
import BreakdownBarChart from "./BreakdownBarChart.js";
import { STYLE_LABELS, STYLE_ORDER } from "../lib/labels.js";

export default function StyleBreakdown({ styleBreakdown }: { styleBreakdown: Record<LearningStyleId, number> }) {
  const data = STYLE_ORDER.map((id) => ({
    label: STYLE_LABELS[id],
    rate: styleBreakdown[id] ?? 0,
  }));
  return <BreakdownBarChart title="By learning style" data={data} />;
}
