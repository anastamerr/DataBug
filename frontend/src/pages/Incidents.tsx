import { useQuery } from "@tanstack/react-query";

import { incidentsApi } from "../api/incidents";

export default function Incidents() {
  const { data, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => incidentsApi.getAll(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Incidents</h1>
          <div className="text-sm text-black/60">
            Data pipeline incidents detected and tracked in real time.
          </div>
        </div>
        <div className="badge">{(data || []).length} total</div>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Loading...</div>}

      <div className="surface-solid overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left text-xs font-semibold uppercase tracking-wide text-black/50">
            <tr>
              <th className="px-4 py-2">Table</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((i) => (
              <tr key={i.id} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-4 py-2 font-medium">{i.table_name}</td>
                <td className="px-4 py-2">{i.incident_type}</td>
                <td className="px-4 py-2">
                  <span className="badge">{i.severity}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="badge">{i.status}</span>
                </td>
                <td className="px-4 py-2">
                  {new Date(i.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
            {(data || []).length === 0 && !isLoading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No incidents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
