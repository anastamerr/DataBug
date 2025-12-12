import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { bugsApi } from "../api/bugs";

export default function Bugs() {
  const { data, isLoading } = useQuery({
    queryKey: ["bugs"],
    queryFn: () => bugsApi.getAll(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bugs</h1>
          <div className="text-sm text-black/60">
            Automatically triaged and ordered by urgency.
          </div>
        </div>
        <div className="badge">{(data || []).length} total</div>
      </div>

      {isLoading && <div className="text-sm text-gray-500">Loading...</div>}

      <div className="surface-solid overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left text-xs font-semibold uppercase tracking-wide text-black/50">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Component</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Team</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((b) => (
              <tr key={b.id} className="border-t border-black/10 hover:bg-black/5">
                <td className="px-4 py-2 font-medium">
                  <Link to={`/bugs/${b.id}`} className="hover:underline">
                    {b.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{b.classified_component}</td>
                <td className="px-4 py-2">
                  <span className="badge">{b.classified_severity}</span>
                </td>
                <td className="px-4 py-2">{b.assigned_team || "-"}</td>
                <td className="px-4 py-2">
                  <span className="badge">{b.status}</span>
                </td>
              </tr>
            ))}
            {(data || []).length === 0 && !isLoading && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No bugs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
