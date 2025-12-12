import type { DataIncident } from "../../types";

type Props = {
  incidents: DataIncident[];
};

export function IncidentFeed({ incidents }: Props) {
  return (
    <div className="surface-solid p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Recent Incidents</div>
        <div className="badge">Live</div>
      </div>
      <div className="space-y-2">
        {incidents.length === 0 && (
          <div className="text-sm text-gray-500">No incidents yet.</div>
        )}
        {incidents.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium">{i.table_name}</div>
              <div className="mt-0.5 text-xs font-medium text-black/60">
                {i.incident_type} • {i.severity}
              </div>
            </div>
            <div className="badge">{i.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
