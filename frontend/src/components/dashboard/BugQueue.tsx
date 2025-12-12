import type { BugReport } from "../../types";

type Props = {
  bugs: BugReport[];
};

export function BugQueue({ bugs }: Props) {
  return (
    <div className="surface-solid p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Bug Queue</div>
        <div className="badge">{bugs.length} items</div>
      </div>
      <div className="space-y-2">
        {bugs.length === 0 && (
          <div className="text-sm text-gray-500">No new bugs.</div>
        )}
        {bugs.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{b.title}</div>
              <div className="mt-0.5 text-xs font-medium text-black/60">
                {b.classified_component} • {b.classified_severity}
              </div>
            </div>
            <div className="badge">{b.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
