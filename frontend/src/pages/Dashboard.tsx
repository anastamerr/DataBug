import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, Clock, Database } from "lucide-react";
import { Link } from "react-router-dom";

import { bugsApi } from "../api/bugs";
import { incidentsApi } from "../api/incidents";
import { BugQueue } from "../components/dashboard/BugQueue";
import { CorrelationGraph } from "../components/dashboard/CorrelationGraph";
import { IncidentFeed } from "../components/dashboard/IncidentFeed";
import { StatsCard } from "../components/dashboard/StatsCard";
import { PredictionAlert } from "../components/predictions/PredictionAlert";

export default function Dashboard() {
  const { data: incidents } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => incidentsApi.getAll(),
  });
  const { data: bugs } = useQuery({
    queryKey: ["bugs"],
    queryFn: () => bugsApi.getAll(),
  });

  const activeIncidents =
    incidents?.filter((incident) => incident.status === "ACTIVE").length || 0;
  const unresolvedBugs =
    bugs?.filter((bug) => bug.status !== "resolved").length || 0;
  const dataRelatedBugs = bugs?.filter((bug) => bug.is_data_related).length || 0;
  const correlationRate = bugs?.length ? (dataRelatedBugs / bugs.length) * 100 : 0;

  const avgMinutesToImpact = (() => {
    if (!incidents?.length || !bugs?.length) return null;
    const byIncident = new Map(incidents.map((incident) => [incident.id, incident]));
    const deltas = bugs
      .filter((bug) => bug.correlated_incident_id)
      .map((bug) => {
        const incident = byIncident.get(bug.correlated_incident_id as string);
        if (!incident) return null;
        const ms =
          new Date(bug.created_at).getTime() -
          new Date(incident.timestamp).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        return ms / 60000;
      })
      .filter((value): value is number => typeof value === "number");

    if (!deltas.length) return null;
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return Math.round(avg);
  })();

  return (
    <div className="space-y-6">
      <div className="surface-solid relative overflow-hidden p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-neon-mint/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-neon-mint/5 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-pill border border-neon-mint/40 bg-neon-mint/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-neon-mint">
              LIVE CONSOLE
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Monitor data incidents, correlate downstream bugs, and ship faster
              with predictive intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/incidents" className="btn-ghost">
              View Incidents
            </Link>
            <Link to="/chat" className="btn-primary">
              Ask DataBug
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatsCard
          title="Active Incidents"
          value={activeIncidents}
          icon={<AlertTriangle className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="Bug Queue"
          value={unresolvedBugs}
          icon={<Bug className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="Data-Related Bugs"
          value={`${correlationRate.toFixed(0)}%`}
          subtitle={`${dataRelatedBugs} of ${bugs?.length || 0}`}
          icon={<Database className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="Avg Time to Root Cause"
          value={avgMinutesToImpact !== null ? `${avgMinutesToImpact} min` : "—"}
          subtitle={
            avgMinutesToImpact !== null
              ? "Avg time from incident to bug"
              : "Need correlated history"
          }
          icon={<Clock className="h-4 w-4 text-neon-mint" />}
        />
      </div>

      <PredictionAlert />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <IncidentFeed incidents={incidents?.slice(0, 5) || []} />
          <BugQueue bugs={bugs?.filter((bug) => bug.status === "new").slice(0, 5) || []} />
        </div>
        <CorrelationGraph />
      </div>
    </div>
  );
}
