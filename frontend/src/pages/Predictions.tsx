import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";

type Prediction = {
  id: string;
  incident_id: string;
  predicted_bug_count: number;
  predicted_components?: string[];
  confidence?: number;
  prediction_window_hours?: number;
  created_at?: string;
};

export default function Predictions() {
  const { data, isLoading } = useQuery({
    queryKey: ["predictions"],
    queryFn: async () => {
      const resp = await api.get<Prediction[]>("/api/predictions");
      return resp.data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Predictions</h1>
        <div className="mt-1 text-sm text-black/60">
          Forecast bug impact from incident patterns.
        </div>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Loading...</div>}

      <div className="space-y-2">
        {(data || []).map((p) => (
          <div key={p.id} className="surface-solid p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
                  Prediction
                </div>
                <div className="mt-1 text-lg font-extrabold tracking-tight">
                  {p.predicted_bug_count} predicted bugs
                </div>
                <div className="mt-1 text-sm text-black/70">
                  Window: {p.prediction_window_hours ?? 6}h • Confidence:{" "}
                  {p.confidence ? `${Math.round(p.confidence * 100)}%` : "n/a"}
                </div>
              </div>
              <div className="badge">{p.incident_id.slice(0, 8)}</div>
            </div>
            {p.predicted_components?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.predicted_components.slice(0, 8).map((c) => (
                  <span key={c} className="badge">
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {(data || []).length === 0 && !isLoading && (
          <div className="text-sm text-gray-500">No predictions yet.</div>
        )}
      </div>
    </div>
  );
}
