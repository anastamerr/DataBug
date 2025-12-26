import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { demoApi } from "../api/demo";
import { repositoriesApi } from "../api/repositories";
import { scansApi } from "../api/scans";
import type { Scan } from "../types";

function statusClass(status: Scan["status"]) {
  switch (status) {
    case "completed":
      return "badge border-neon-mint/40 bg-neon-mint/10 text-neon-mint";
    case "failed":
      return "badge border-rose-400/40 bg-rose-400/10 text-rose-200";
    case "analyzing":
      return "badge border-amber-400/40 bg-amber-400/10 text-amber-200";
    case "scanning":
    case "cloning":
      return "badge border-sky-400/40 bg-sky-400/10 text-sky-200";
    case "pending":
    default:
      return "badge";
  }
}

function formatRepoName(url?: string | null) {
  if (!url) return "DAST target";
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
  } catch {
    return url;
  }
  return url;
}

function formatDate(value?: string) {
  if (!value) return "n/a";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "n/a" : dt.toLocaleString();
}

function shortSha(sha?: string | null) {
  if (!sha) return null;
  const trimmed = sha.trim();
  return trimmed.length ? trimmed.slice(0, 7) : null;
}

function formatReduction(scan: Scan) {
  if (!scan.total_findings) return "No findings yet";
  const ratio =
    scan.total_findings > 0
      ? 1 - scan.filtered_findings / scan.total_findings
      : 0;
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return `${scan.total_findings} -> ${scan.filtered_findings} (${pct}% filtered)`;
}

export default function Scans() {
  const queryClient = useQueryClient();
  const [scanType, setScanType] = useState<"sast" | "dast" | "both">("sast");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [dastConsent, setDastConsent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["scans"],
    queryFn: () => scansApi.list(),
    refetchInterval: (data) =>
      (Array.isArray(data) ? data : []).some((scan) =>
        ["pending", "cloning", "scanning", "analyzing"].includes(scan.status),
      )
        ? 8000
        : false,
  });
  const { data: repos } = useQuery({
    queryKey: ["repos"],
    queryFn: () => repositoriesApi.list(),
  });

  const createScan = useMutation({
    mutationFn: async () => {
      const trimmedRepo = repoUrl.trim();
      const trimmedBranch = branch.trim() || "main";
      const trimmedTarget = targetUrl.trim();

      if (scanType !== "dast" && !trimmedRepo) {
        throw new Error("Repository URL is required.");
      }
      if (scanType !== "sast" && !trimmedTarget) {
        throw new Error("Target URL is required for DAST.");
      }
      if (scanType !== "sast" && !dastConsent) {
        throw new Error("Please confirm authorization for DAST scans.");
      }

      return scansApi.create({
        repo_url: scanType !== "dast" ? trimmedRepo : undefined,
        branch: scanType !== "dast" ? trimmedBranch : undefined,
        scan_type: scanType,
        target_url: scanType !== "sast" ? trimmedTarget : undefined,
        dast_consent: scanType !== "sast" ? dastConsent : undefined,
      });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setRepoUrl("");
      await queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error) => {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to trigger scan.");
      }
    },
  });

  const createSavedScan = useMutation({
    mutationFn: async () => {
      if (!selectedRepoId) {
        throw new Error("Select a saved repository.");
      }
      const trimmedTarget = targetUrl.trim();
      if (scanType !== "sast" && !trimmedTarget) {
        throw new Error("Target URL is required for DAST.");
      }
      if (scanType !== "sast" && !dastConsent) {
        throw new Error("Please confirm authorization for DAST scans.");
      }
      return scansApi.create({
        repo_id: selectedRepoId,
        scan_type: scanType,
        target_url: scanType !== "sast" ? trimmedTarget : undefined,
        dast_consent: scanType !== "sast" ? dastConsent : undefined,
      });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error) => {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to trigger scan.");
      }
    },
  });

  const injectDemoScan = useMutation({
    mutationFn: () => demoApi.injectScan(),
    onSuccess: async (data) => {
      setErrorMessage(null);
      setDemoMessage(
        `Seeded ${data.findings_created} findings (${data.real_findings} real).`,
      );
      await queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (error) => {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to seed demo scan.");
      }
    },
  });

  const scans = Array.isArray(data) ? data : [];
  const repoList = Array.isArray(repos) ? repos : [];

  const summary = useMemo(() => {
    const completed = scans.filter((scan) => scan.status === "completed").length;
    const active = scans.filter((scan) =>
      ["pending", "cloning", "scanning", "analyzing"].includes(scan.status),
    ).length;
    return { total: scans.length, completed, active };
  }, [scans]);

  const listErrorMessage =
    error instanceof Error ? error.message : "Unable to load scans.";

  return (
    <div className="space-y-6">
      <div className="surface-solid p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Scans
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Run context-aware Semgrep scans and prioritize the real issues.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{summary.total} total</span>
            <span className="badge">{summary.active} active</span>
            <span className="badge">{summary.completed} completed</span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["sast", "dast", "both"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={scanType === type ? "btn-primary" : "btn-ghost"}
                onClick={() => setScanType(type)}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          {scanType !== "sast" ? (
            <div className="rounded-card border border-white/10 bg-void p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Live target URL
              </div>
              <input
                className="input mt-2 w-full"
                placeholder="https://app.example.com"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
              />
              <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-void text-neon-mint"
                  checked={dastConsent}
                  onChange={(event) => setDastConsent(event.target.checked)}
                />
                I confirm I am authorized to scan this target.
              </label>
            </div>
          ) : null}

          {scanType === "dast" ? (
            <div className="rounded-card border border-white/10 bg-void p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Dynamic scan
              </div>
              <p className="mt-2 text-sm text-white/60">
                Run Nuclei against a live target to confirm exploitable issues.
              </p>
              <button
                type="button"
                className="btn-primary mt-4 w-full"
                onClick={() => createScan.mutate()}
                disabled={
                  createScan.isPending || !targetUrl.trim() || !dastConsent
                }
              >
                {createScan.isPending ? "Starting..." : "Run DAST"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-card border border-white/10 bg-void p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Saved repositories
                </div>
                <select
                  className="input mt-2 w-full"
                  value={selectedRepoId}
                  onChange={(event) => setSelectedRepoId(event.target.value)}
                >
                  <option value="">Select repository</option>
                  {repoList.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.repo_full_name || formatRepoName(repo.repo_url)}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/50">
                  <span>Manage list in Repositories.</span>
                  <Link
                    to="/repos"
                    className="text-neon-mint hover:text-neon-mint/80"
                  >
                    Edit list
                  </Link>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4 w-full"
                  onClick={() => createSavedScan.mutate()}
                  disabled={
                    createSavedScan.isPending ||
                    !selectedRepoId ||
                    (scanType !== "sast" && (!targetUrl.trim() || !dastConsent))
                  }
                >
                  {createSavedScan.isPending ? "Starting..." : "Scan saved repo"}
                </button>
              </div>

              <div className="rounded-card border border-white/10 bg-void p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Quick scan
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Repository URL
                  </div>
                  <input
                    className="input mt-2 w-full"
                    placeholder="https://github.com/org/repo"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Branch
                  </div>
                  <input
                    className="input mt-2 w-full"
                    placeholder="main"
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4 w-full"
                  onClick={() => createScan.mutate()}
                  disabled={
                    createScan.isPending ||
                    !repoUrl.trim() ||
                    (scanType !== "sast" && (!targetUrl.trim() || !dastConsent))
                  }
                >
                  {createScan.isPending ? "Starting..." : "Scan repository"}
                </button>
              </div>
            </div>
          )}
        </div>
        {errorMessage ? (
          <div className="mt-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}
        {demoMessage ? (
          <div className="mt-3 text-sm text-neon-mint">{demoMessage}</div>
        ) : null}

        <div className="mt-6 rounded-card border border-white/10 bg-void p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Demo dataset
          </div>
          <p className="mt-2 text-sm text-white/60">
            Seed a pre-scanned repo with 12 real issues and 75 false positives to
            showcase the noise reduction.
          </p>
          <button
            type="button"
            className="btn-ghost mt-4 w-full"
            onClick={() => injectDemoScan.mutate()}
            disabled={injectDemoScan.isPending}
          >
            {injectDemoScan.isPending ? "Seeding..." : "Seed demo scan"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="surface-solid p-4 text-sm text-rose-200">
          {listErrorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`scan-skeleton-${index}`}
              className="surface-solid animate-pulse p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="h-5 w-16 rounded-pill bg-white/10" />
                    <div className="h-5 w-12 rounded-pill bg-white/5" />
                    <div className="h-5 w-20 rounded-pill bg-white/10" />
                    <div className="h-5 w-28 rounded-pill bg-white/10" />
                  </div>
                  <div className="h-5 w-52 rounded-pill bg-white/10" />
                  <div className="h-3 w-72 rounded-pill bg-white/5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-20 rounded-pill bg-white/5" />
                  <div className="h-9 w-16 rounded-pill bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {scans.map((scan) => {
          const headline = scan.repo_url
            ? formatRepoName(scan.repo_url)
            : scan.target_url || "DAST scan";

          return (
            <div key={scan.id} className="surface-solid p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={statusClass(scan.status)}>{scan.status}</span>
                    <span className="badge">{scan.trigger}</span>
                    {scan.scan_type !== "dast" ? (
                      <span className="badge">SAST</span>
                    ) : null}
                    {scan.scan_type !== "sast" ? (
                      <span className="badge">DAST</span>
                    ) : null}
                    {scan.scan_type !== "dast" ? (
                      <span className="badge">branch {scan.branch}</span>
                    ) : null}
                    <span className="badge">{formatReduction(scan)}</span>
                    {scan.pr_number ? (
                      <span className="badge">PR #{scan.pr_number}</span>
                    ) : null}
                    {shortSha(scan.commit_sha) ? (
                      <span className="badge font-mono text-white/70">
                        {shortSha(scan.commit_sha)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    {headline}
                  </div>
                  <div className="mt-1 space-y-1 break-all text-xs text-white/60">
                    {scan.repo_url ? <div>Repo: {scan.repo_url}</div> : null}
                    {scan.target_url ? (
                      <div>Target: {scan.target_url}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-white/60">
                    {formatDate(scan.created_at)}
                  </div>
                  <Link to={`/scans/${scan.id}`} className="btn-ghost">
                    View
                  </Link>
                </div>
              </div>
              {scan.error_message ? (
                <div className="mt-3 text-xs text-rose-200">
                  {scan.error_message}
                </div>
              ) : null}
            </div>
          );
        })}

        {scans.length === 0 && !isLoading && !error ? (
          <div className="surface-solid p-6 text-sm text-white/60">
            No scans yet. Trigger your first repository scan above.
          </div>
        ) : null}
      </div>
    </div>
  );
}
