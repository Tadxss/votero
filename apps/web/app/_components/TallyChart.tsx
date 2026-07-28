import type { QuestionTally, SurveyQuestion } from "@repo/types";
import { TallyBars } from "./TallyBars";
import { DonutChart } from "./DonutChart";
import { TextResponseCloud } from "./TextResponseCloud";
import type { ChartView } from "./ChartViewToggle";

// Per-question dispatcher used by Present Mode and the detailed stats page — both offer the
// bar/donut toggle and percentage labels; the plain manage-page results section intentionally
// keeps rendering <TallyBars> directly (unchanged look, no toggle) rather than going through this.
export function TallyChart({
  question,
  q,
  view,
  closed = false,
  size = "md",
}: {
  question: SurveyQuestion | undefined;
  q: QuestionTally;
  view: ChartView;
  closed?: boolean;
  size?: "md" | "lg";
}) {
  if (q.type === "text") {
    return <TextResponseCloud responses={q.responses} size={size} />;
  }

  const options = question?.options ?? [];
  return view === "donut" ? (
    <DonutChart options={options} tally={q.tally} closed={closed} size={size} />
  ) : (
    <TallyBars options={options} tally={q.tally} closed={closed} size={size} showPercentage />
  );
}
