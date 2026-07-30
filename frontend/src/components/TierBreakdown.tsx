import type { AcademicTierId } from "@lucida/shared";
import BreakdownBarChart from "./BreakdownBarChart.js";
import { TIER_LABELS, TIER_ORDER } from "../lib/labels.js";

export default function TierBreakdown({ tierBreakdown }: { tierBreakdown: Record<AcademicTierId, number> }) {
  const data = TIER_ORDER.map((id) => ({
    label: TIER_LABELS[id],
    rate: tierBreakdown[id] ?? 0,
  }));
  return <BreakdownBarChart title="By academic tier" data={data} />;
}
