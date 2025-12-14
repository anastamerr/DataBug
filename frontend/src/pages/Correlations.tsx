import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { correlationsApi } from "../api/correlations";

export default function Correlations() {
  const { data, isLoading } = useQuery({
    queryKey: ["correlations"],
    queryFn: () => correlationsApi.getAll(),
  });

  return (
    <div className="space-y-6">
      <div className="surface-solid p-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Correlations
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Automatically linked bugs to incidents with root-cause explanations.
        </p>
      </div>

      {isLoading && <div className="text-sm text-white/60">Loading...</div>}

      <div className="space-y-3">
        {(data || []).map((correlation) => (
          <div key={correlation.id} className="surface-solid p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  <Link
                    to={`/bugs/${correlation.bug.id}`}
                    className="underline decoration-white/20 underline-offset-4 hover:decoration-neon-mint/60 hover:text-neon-mint"
                  >
                    {correlation.bug.title}
                  </Link>
                </div>
                <div className="mt-2 text-xs font-medium text-white/60">
                  Incident: {correlation.incident.table_name} (
                  {correlation.incident.incident_type}) • Score:{" "}
                  {(correlation.correlation_score * 100).toFixed(0)}%
                </div>
              </div>
              <div className="badge">{correlation.bug.classified_severity}</div>
            </div>

            {correlation.explanation ? (
              <div className="mt-4 rounded-card border border-white/10 bg-surface p-4 text-sm text-white/80">
                {correlation.explanation}
              </div>
            ) : null}
          </div>
        ))}

        {(data || []).length === 0 && !isLoading && (
          <div className="text-sm text-white/60">No correlations yet.</div>
        )}
      </div>
    </div>
  );
}
