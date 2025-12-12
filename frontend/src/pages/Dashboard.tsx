import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, Clock, Database } from "lucide-react";

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
    incidents?.filter((i) => i.status === "ACTIVE").length || 0;
  const unresolvedBugs = bugs?.filter((b) => b.status !== "resolved").length || 0;
  const dataRelatedBugs = bugs?.filter((b) => b.is_data_related).length || 0;
  const correlationRate = bugs?.length
    ? (dataRelatedBugs / bugs.length) * 100
    : 0;

  const avgMinutesToImpact = (() => {
    if (!incidents?.length || !bugs?.length) return null;
    const byIncident = new Map(incidents.map((i) => [i.id, i]));
    const deltas = bugs
      .filter((b) => b.correlated_incident_id)
      .map((b) => {
        const incident = byIncident.get(b.correlated_incident_id as string);
        if (!incident) return null;
        const ms =
          new Date(b.created_at).getTime() - new Date(incident.timestamp).getTime();
        if (!Number.isFinite(ms) || ms < 0) return null;
        return ms / 60000;
      })
      .filter((v): v is number => typeof v === "number");

    if (!deltas.length) return null;
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return Math.round(avg);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <div className="mt-1 text-sm text-black/60">
          Enterprise-grade triage across data incidents and bug reports.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatsCard
          title="Active Incidents"
          value={activeIncidents}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        />
        <StatsCard
          title="Bug Queue"
          value={unresolvedBugs}
          icon={<Bug className="h-4 w-4 text-yellow-600" />}
        />
        <StatsCard
          title="Data-Related Bugs"
          value={`${correlationRate.toFixed(0)}%`}
          subtitle={`${dataRelatedBugs} of ${bugs?.length || 0}`}
          icon={<Database className="h-4 w-4 text-blue-600" />}
        />
        <StatsCard
          title="Avg Time to Root Cause"
          value={avgMinutesToImpact !== null ? `${avgMinutesToImpact} min` : "—"}
          subtitle={avgMinutesToImpact !== null ? "Avg time from incident → bug" : "Need correlated history"}
          icon={<Clock className="h-4 w-4 text-green-600" />}
        />
      </div>

      <PredictionAlert />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <IncidentFeed incidents={incidents?.slice(0, 5) || []} />
          <BugQueue bugs={bugs?.filter((b) => b.status === "new").slice(0, 5) || []} />
        </div>
        <CorrelationGraph />
      </div>
    </div>
  );
}
