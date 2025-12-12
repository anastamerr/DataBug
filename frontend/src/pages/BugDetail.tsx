import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { bugsApi } from "../api/bugs";
import type { BugReport } from "../types";

function getGitHubUrl(bug: BugReport): string | null {
  const labels = bug.labels as any;
  if (!labels || typeof labels !== "object") return null;
  const url = labels.url;
  return typeof url === "string" && url.length ? url : null;
}

function getGitHubComments(bug: BugReport) {
  const labels = bug.labels as any;
  if (!labels || typeof labels !== "object") return [];
  const comments = labels.comments;
  return Array.isArray(comments) ? comments : [];
}

export default function BugDetail() {
  const { id } = useParams();

  const {
    data: bug,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bugs", id],
    queryFn: () => bugsApi.getById(id as string),
    enabled: Boolean(id),
  });

  const { data: duplicates } = useQuery({
    queryKey: ["bugs", id, "duplicates"],
    queryFn: () => bugsApi.getDuplicates(id as string),
    enabled: Boolean(id),
  });

  if (!id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Bug</h1>
        <div className="surface-solid p-4 text-sm text-black/70">Missing bug id.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Bug</h1>
        <div className="text-sm text-black/60">Loading...</div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Bug</h1>
          <Link to="/bugs" className="btn-ghost">
            Back to Bugs
          </Link>
        </div>
        <div className="surface-solid p-4 text-sm text-black/70">Bug not found.</div>
      </div>
    );
  }

  const githubUrl = getGitHubUrl(bug);
  const comments = getGitHubComments(bug);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {bug.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-black/60">
            <span className="font-mono">{bug.bug_id}</span>
            <span className="badge">{bug.source}</span>
            <span className="badge">{bug.classified_component}</span>
            <span className="badge">{bug.classified_severity}</span>
            <span className="badge">{bug.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Open on GitHub
            </a>
          ) : null}
          <Link to="/bugs" className="btn-ghost">
            Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface-solid p-4 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Description
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-black/80">
            {bug.description || "—"}
          </div>
        </div>

        <div className="surface-solid p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Summary
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="text-black/50">Created</div>
            <div className="font-medium">
              {new Date(bug.created_at).toLocaleString()}
            </div>

            <div className="text-black/50">Reporter</div>
            <div className="font-medium">{bug.reporter || "—"}</div>

            <div className="text-black/50">Team</div>
            <div className="font-medium">{bug.assigned_team || "—"}</div>

            <div className="text-black/50">Data-related</div>
            <div className="font-medium">{bug.is_data_related ? "Yes" : "No"}</div>

            <div className="text-black/50">Correlation</div>
            <div className="font-medium">{bug.correlation_score ?? "—"}</div>

            <div className="text-black/50">Duplicate</div>
            <div className="font-medium">{bug.is_duplicate ? "Yes" : "No"}</div>
          </div>

          {bug.duplicate_of_id ? (
            <div className="mt-4 text-sm">
              Duplicate of{" "}
              <Link
                to={`/bugs/${bug.duplicate_of_id}`}
                className="font-mono text-black underline underline-offset-4 hover:opacity-80"
              >
                {bug.duplicate_of_id}
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="surface-solid overflow-hidden">
          <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">
            Duplicate Matches
          </div>
          <div className="p-4">
            {(duplicates || []).length === 0 ? (
              <div className="text-sm text-black/60">No duplicates found.</div>
            ) : (
              <div className="space-y-2 text-sm">
                {(duplicates || []).slice(0, 10).map((d) => (
                  <div
                    key={d.bug_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold">
                        <Link
                          to={`/bugs/${d.bug_id}`}
                          className="underline underline-offset-4 hover:opacity-80"
                        >
                          {d.title || d.bug_id}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-xs text-black/60">
                        {d.status || "—"}
                      </div>
                    </div>
                    <div className="badge font-mono">
                      {(d.similarity_score ?? 0).toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="surface-solid overflow-hidden">
          <div className="border-b border-black/10 px-4 py-3 text-sm font-semibold">
            GitHub Comments
          </div>
          <div className="p-4">
            {comments.length === 0 ? (
              <div className="text-sm text-black/60">No comments ingested.</div>
            ) : (
              <div className="space-y-3">
                {comments.slice(0, 20).map((c: any) => (
                  <div
                    key={String(c.id)}
                    className="rounded-xl border border-black/10 bg-black/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-black/60">
                      <div className="truncate">
                        {c.user || "unknown"}
                        {c.created_at
                          ? ` • ${new Date(c.created_at).toLocaleString()}`
                          : ""}
                      </div>
                      {c.url ? (
                        <a
                          href={String(c.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 hover:opacity-80"
                        >
                          View
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-black/80">
                      {c.body || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

