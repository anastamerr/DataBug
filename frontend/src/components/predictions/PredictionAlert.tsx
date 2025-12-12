import { useQuery } from "@tanstack/react-query";

import { api } from "../../api/client";

type Prediction = {
  id: string;
  predicted_bug_count: number;
  predicted_components?: string[];
  confidence?: number;
  prediction_window_hours?: number;
  created_at?: string;
};

export function PredictionAlert() {
  const { data } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const resp = await api.get<Prediction[]>("/api/predictions");
      return resp.data;
    },
  });

  const latest = data?.[0];
  if (!latest) return null;

  return (
    <div className="surface-solid p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Prediction Alert
          </div>
          <div className="mt-1 text-lg font-extrabold tracking-tight">
            {latest.predicted_bug_count} predicted bugs
          </div>
          <div className="mt-1 text-sm text-black/70">
            Next {latest.prediction_window_hours ?? 6}h •{" "}
            {latest.confidence ? `${Math.round(latest.confidence * 100)}%` : "n/a"}{" "}
            confidence
          </div>
        </div>
        <div className="badge">Proactive</div>
      </div>
      {latest.predicted_components?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {latest.predicted_components.slice(0, 6).map((c) => (
            <span key={c} className="badge">
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
