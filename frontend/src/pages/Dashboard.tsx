import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, Copy, Flame } from "lucide-react";
import { Link } from "react-router-dom";

import { bugsApi } from "../api/bugs";
import { BugQueue } from "../components/dashboard/BugQueue";
import { StatsCard } from "../components/dashboard/StatsCard";

export default function Dashboard() {
  const { data: bugs } = useQuery({
    queryKey: ["bugs"],
    queryFn: () => bugsApi.getAll(),
  });

  const bugList = bugs ?? [];
  const openBugs = bugList.filter((bug) => bug.status !== "resolved");
  const newBugs = bugList.filter((bug) => bug.status === "new");
  const highSeverityBugs = bugList.filter(
    (bug) => bug.classified_severity === "critical" || bug.classified_severity === "high"
  );
  const duplicateBugs = bugList.filter((bug) => bug.is_duplicate);
  const duplicateRate = bugList.length
    ? Math.round((duplicateBugs.length / bugList.length) * 100)
    : 0;

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
              Prioritize, de-duplicate, and route bugs faster with AI-assisted triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/bugs" className="btn-ghost">
              View Bugs
            </Link>
            <Link to="/chat" className="btn-primary">
              Ask DataBug
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatsCard
          title="Open Bugs"
          value={openBugs.length}
          icon={<Bug className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="New Bugs"
          value={newBugs.length}
          icon={<AlertTriangle className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="High Severity"
          value={highSeverityBugs.length}
          subtitle="critical + high"
          icon={<Flame className="h-4 w-4 text-neon-mint" />}
        />
        <StatsCard
          title="Duplicate Rate"
          value={`${duplicateRate}%`}
          subtitle={`${duplicateBugs.length} duplicates`}
          icon={<Copy className="h-4 w-4 text-neon-mint" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BugQueue title="New Bugs" emptyLabel="No new bugs." bugs={newBugs.slice(0, 5)} />
        <BugQueue
          title="High Priority"
          emptyLabel="No high-severity bugs."
          bugs={highSeverityBugs.slice(0, 5)}
        />
      </div>
    </div>
  );
}
