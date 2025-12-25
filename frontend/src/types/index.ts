export interface BugReport {
  id: string;
  bug_id: string;
  source: "github" | "jira" | "manual";
  title: string;
  description?: string | null;
  created_at: string;
  reporter?: string | null;
  labels?: unknown;
  stack_trace?: string | null;
  classified_type: "bug" | "feature" | "question";
  classified_component: string;
  classified_severity: "critical" | "high" | "medium" | "low";
  confidence_score?: number | null;
  is_duplicate: boolean;
  duplicate_of_id?: string | null;
  duplicate_score?: number | null;
  assigned_team?: string;
  status: "new" | "triaged" | "assigned" | "resolved";
  resolution_notes?: string | null;
  embedding_id?: string | null;
}
