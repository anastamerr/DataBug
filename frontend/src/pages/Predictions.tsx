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
    <div className="space-y-6">
      <div className="surface-solid p-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Predictions
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Forecast bug impact from incident patterns.
        </p>
      </div>

      {isLoading && <div className="text-sm text-white/60">Loading...</div>}

      <div className="space-y-3">
        {(data || []).map((prediction) => (
          <div key={prediction.id} className="surface-solid p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Prediction
                </div>
                <div className="mt-2 text-lg font-extrabold tracking-tight text-white">
                  {prediction.predicted_bug_count} predicted bugs
                </div>
                <div className="mt-1 text-sm text-white/60">
                  Window: {prediction.prediction_window_hours ?? 6}h • Confidence:{" "}
                  {prediction.confidence
                    ? `${Math.round(prediction.confidence * 100)}%`
                    : "n/a"}
                </div>
              </div>
              <div className="badge font-mono text-white/80">
                {prediction.incident_id.slice(0, 8)}
              </div>
            </div>

            {prediction.predicted_components?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {prediction.predicted_components.slice(0, 8).map((component) => (
                  <span key={component} className="badge">
                    {component}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {(data || []).length === 0 && !isLoading && (
          <div className="text-sm text-white/60">No predictions yet.</div>
        )}
      </div>
    </div>
  );
}
