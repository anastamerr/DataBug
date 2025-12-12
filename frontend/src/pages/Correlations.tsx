import { useQuery } from "@tanstack/react-query";

import { correlationsApi } from "../api/correlations";

export default function Correlations() {
  const { data, isLoading } = useQuery({
    queryKey: ["correlations"],
    queryFn: () => correlationsApi.getAll(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Correlations</h1>
        <div className="mt-1 text-sm text-black/60">
          Automatically linked bugs ↔ incidents with explanations.
        </div>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Loading...</div>}

      <div className="space-y-2">
        {(data || []).map((c) => (
          <div key={c.id} className="surface-solid p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{c.bug.title}</div>
                <div className="mt-1 text-xs font-medium text-black/60">
                  Incident: {c.incident.table_name} ({c.incident.incident_type}) •{" "}
                  Score: {(c.correlation_score * 100).toFixed(0)}%
                </div>
              </div>
              <div className="badge">{c.bug.classified_severity}</div>
            </div>
            {c.explanation && (
              <div className="mt-3 rounded-xl border border-black/10 bg-black/5 p-3 text-sm text-black/80">
                {c.explanation}
              </div>
            )}
          </div>
        ))}
        {(data || []).length === 0 && !isLoading && (
          <div className="text-sm text-gray-500">No correlations yet.</div>
        )}
      </div>
    </div>
  );
}
