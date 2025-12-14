import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { correlationsApi } from "../../api/correlations";
import type { Correlation } from "../../types";

type Datum = {
  key: string;
  label: string;
  scorePct: number;
  bugTitle: string;
  incidentLabel: string;
};

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function CorrelationGraph() {
  const { data, isLoading } = useQuery({
    queryKey: ["correlations"],
    queryFn: () => correlationsApi.getAll(),
  });

  const chartData = useMemo<Datum[]>(() => {
    const correlations = (data || []).slice(0, 8);
    return correlations.map((c: Correlation) => ({
      key: c.id,
      label: truncate(c.bug.title, 16),
      scorePct: Math.round((c.correlation_score || 0) * 100),
      bugTitle: c.bug.title,
      incidentLabel: `${c.incident.table_name} (${c.incident.incident_type})`,
    }));
  }, [data]);

  return (
    <div className="surface-solid p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold tracking-tight text-white">
          Top Correlations
        </div>
        <div className="badge">Last 8</div>
      </div>

      {isLoading && <div className="text-sm text-white/60">Loading...</div>}

      {!isLoading && chartData.length === 0 && (
        <div className="text-sm text-white/60">No correlations yet.</div>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className="h-64 overflow-hidden rounded-card border border-white/10 bg-surface p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.10)" strokeDasharray="3 4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.60)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.10)" }}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.60)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.10)" }}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, "Score"]}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as Datum | undefined;
                  return item
                    ? `${item.bugTitle} | ${item.incidentLabel}`
                    : "";
                }}
                cursor={{ fill: "rgba(0,215,104,0.08)" }}
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.96)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 16,
                  color: "rgba(255,255,255,0.9)",
                }}
                itemStyle={{ color: "rgba(255,255,255,0.9)" }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              />
              <Bar
                dataKey="scorePct"
                fill="var(--color-neon-mint)"
                radius={[12, 12, 12, 12]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
