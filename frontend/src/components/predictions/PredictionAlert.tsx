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
    <div className="surface-solid p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Prediction Alert
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight text-white">
            {latest.predicted_bug_count} predicted bugs
          </div>
          <div className="mt-1 text-sm text-white/60">
            Next {latest.prediction_window_hours ?? 6}h •{" "}
            {latest.confidence
              ? `${Math.round(latest.confidence * 100)}% confidence`
              : "n/a confidence"}
          </div>
        </div>
        <div className="badge border-neon-mint/40 bg-neon-mint/10 text-neon-mint">
          Proactive
        </div>
      </div>

      {latest.predicted_components?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {latest.predicted_components.slice(0, 6).map((component) => (
            <span key={component} className="badge">
              {component}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
