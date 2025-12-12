from __future__ import annotations

from functools import lru_cache
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...api.deps import get_db
from ...config import get_settings
from ...integrations.pinecone_client import PineconeService
from ...models import BugIncidentCorrelation, BugPrediction, BugReport, DataIncident
from ...schemas.chat import ChatRequest, ChatResponse
from ...services.intelligence.llm_service import get_llm_service

router = APIRouter(prefix="/chat", tags=["chat"])


def _truncate(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _incident_brief(incident: DataIncident) -> str:
    return (
        f"- {incident.id} | {incident.timestamp} | {incident.severity} {incident.incident_type} "
        f"on {incident.table_name} | status={incident.status}"
    )


def _bug_brief(bug: BugReport) -> str:
    return (
        f"- {bug.id} | {bug.created_at} | {bug.classified_severity} "
        f"{bug.classified_component} | status={bug.status} | {bug.title}"
    )


@lru_cache
def _get_pinecone_safe() -> Optional[PineconeService]:
    try:
        return PineconeService()
    except Exception:
        return None


def _priority_order_query(q):
    # Highest priority first: unresolved, severity, data-related, correlation score, recency.
    from sqlalchemy import case, desc

    severity_rank = case(
        (BugReport.classified_severity == "critical", 4),
        (BugReport.classified_severity == "high", 3),
        (BugReport.classified_severity == "medium", 2),
        (BugReport.classified_severity == "low", 1),
        else_=0,
    )
    status_rank = case((BugReport.status == "resolved", 0), else_=1)
    data_rank = case((BugReport.is_data_related.is_(True), 1), else_=0)

    return q.order_by(
        desc(status_rank),
        desc(severity_rank),
        desc(data_rank),
        BugReport.correlation_score.desc().nullslast(),
        BugReport.created_at.desc(),
    )


def _build_context(
    bug: BugReport | None,
    incident: DataIncident | None,
    correlation: BugIncidentCorrelation | None,
    *,
    recent_incidents: list[DataIncident],
    bug_queue: list[BugReport],
    focus_related_bugs: list[BugReport],
    focus_prediction: BugPrediction | None,
    semantic_bugs: list[BugReport],
) -> str:
    parts: list[str] = []

    snapshot = "\n".join(
        [
            "PLATFORM SNAPSHOT:",
            f"- Active incidents: {sum(1 for i in recent_incidents if i.status == 'ACTIVE')}",
            f"- Recent incidents shown: {len(recent_incidents)}",
            f"- High-priority bugs shown: {len(bug_queue)}",
            f"- Semantic-matched bugs shown: {len(semantic_bugs)}",
        ]
    )
    parts.append(snapshot)

    if recent_incidents:
        parts.append(
            "RECENT INCIDENTS:\n" + "\n".join(_incident_brief(i) for i in recent_incidents)
        )

    if bug_queue:
        parts.append("HIGH-PRIORITY BUG QUEUE:\n" + "\n".join(_bug_brief(b) for b in bug_queue))

    if incident:
        parts.append(
            "\n".join(
                [
                    "FOCUS INCIDENT (use this for 'latest incident' questions):",
                    f"- Table: {incident.table_name}",
                    f"- Type: {incident.incident_type}",
                    f"- Severity: {incident.severity}",
                    f"- Status: {incident.status}",
                    f"- Affected Columns: {', '.join(incident.affected_columns or [])}",
                    f"- Details: {incident.details or {}}",
                    f"- Timestamp: {incident.timestamp}",
                ]
            )
        )

        if focus_prediction is not None:
            parts.append(
                "\n".join(
                    [
                        "PREDICTION FOR FOCUS INCIDENT:",
                        f"- Predicted bug count (next {focus_prediction.prediction_window_hours}h): {focus_prediction.predicted_bug_count}",
                        f"- Predicted components: {', '.join(focus_prediction.predicted_components or [])}",
                        f"- Confidence: {focus_prediction.confidence}",
                    ]
                )
            )

        if focus_related_bugs:
            parts.append(
                "BUGS CORRELATED TO FOCUS INCIDENT:\n"
                + "\n".join(_bug_brief(b) for b in focus_related_bugs)
            )

    if bug:
        parts.append(
            "\n".join(
                [
                    "FOCUS BUG:",
                    f"- Title: {bug.title}",
                    f"- Component: {bug.classified_component}",
                    f"- Severity: {bug.classified_severity}",
                    f"- Status: {bug.status}",
                    f"- Description: {_truncate(bug.description or '')}",
                ]
            )
        )

    if correlation:
        parts.append(
            "\n".join(
                [
                    "CORRELATION:",
                    f"- Score: {correlation.correlation_score}",
                    f"- Explanation: {correlation.explanation or ''}",
                ]
            )
        )

    if semantic_bugs:
        parts.append(
            "SEMANTICALLY RELEVANT BUGS (from embeddings):\n"
            + "\n".join(_bug_brief(b) for b in semantic_bugs)
        )

    return "\n\n".join(parts).strip()


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    bug: BugReport | None = None
    incident: DataIncident | None = None
    correlation: BugIncidentCorrelation | None = None

    if payload.correlation_id is not None:
        correlation = (
            db.query(BugIncidentCorrelation)
            .filter(BugIncidentCorrelation.id == payload.correlation_id)
            .first()
        )
        if not correlation:
            raise HTTPException(status_code=404, detail="Correlation not found")

        bug = (
            db.query(BugReport).filter(BugReport.id == correlation.bug_id).first()
        )
        incident = (
            db.query(DataIncident)
            .filter(DataIncident.id == correlation.incident_id)
            .first()
        )

    if payload.bug_id is not None and bug is None:
        bug = db.query(BugReport).filter(BugReport.id == payload.bug_id).first()
        if not bug:
            raise HTTPException(status_code=404, detail="Bug not found")

    if payload.incident_id is not None and incident is None:
        incident = (
            db.query(DataIncident)
            .filter(DataIncident.id == payload.incident_id)
            .first()
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

    # If user didn't provide specific IDs, we still want the assistant to be useful
    # by attaching recent platform context and a "focus" incident.
    recent_incidents = (
        db.query(DataIncident).order_by(DataIncident.timestamp.desc()).limit(5).all()
    )

    if incident is None:
        incident = (
            db.query(DataIncident)
            .filter(DataIncident.status == "ACTIVE")
            .order_by(DataIncident.timestamp.desc())
            .first()
        ) or (
            db.query(DataIncident).order_by(DataIncident.timestamp.desc()).first()
        )

    # High-priority bug queue (enterprise triage default).
    bug_q = _priority_order_query(db.query(BugReport)).limit(8).all()

    focus_related_bugs: list[BugReport] = []
    focus_prediction: BugPrediction | None = None
    if incident is not None:
        focus_related_bugs = (
            _priority_order_query(
                db.query(BugReport).filter(BugReport.correlated_incident_id == incident.id)
            )
            .limit(6)
            .all()
        )
        focus_prediction = (
            db.query(BugPrediction)
            .filter(BugPrediction.incident_id == incident.id)
            .order_by(BugPrediction.created_at.desc())
            .first()
        )

    # Semantic retrieval: pull relevant bugs for the user's question (optional).
    semantic_bugs: list[BugReport] = []
    pinecone = _get_pinecone_safe()
    if pinecone is not None and payload.message.strip():
        try:
            matches = pinecone.find_similar_bugs(payload.message, "", top_k=5)
            ids: list[uuid.UUID] = []
            for m in matches or []:
                mid = getattr(m, "id", None)
                if isinstance(mid, str):
                    try:
                        ids.append(uuid.UUID(mid))
                    except ValueError:
                        continue
            if ids:
                semantic_bugs = (
                    db.query(BugReport)
                    .filter(BugReport.id.in_(ids))
                    .all()
                )
        except Exception:
            semantic_bugs = []

    context = _build_context(
        bug,
        incident,
        correlation,
        recent_incidents=recent_incidents,
        bug_queue=bug_q,
        focus_related_bugs=focus_related_bugs,
        focus_prediction=focus_prediction,
        semantic_bugs=semantic_bugs,
    )

    system = (
        "You are DataBug AI, an enterprise-grade assistant for bug triage and data incident response.\n"
        "Use ONLY the provided platform context. Be concise, technical, and actionable.\n"
        "Do not ask for context if the snapshot already includes incidents/bugs; instead make the best recommendation.\n"
        "If something critical is missing, ask at most 1-2 specific questions."
    )
    prompt = (
        (f"{context}\n\n" if context else "")
        + f"USER QUESTION:\n{payload.message}\n\n"
        "Answer with:\n"
        "1) Root cause hypothesis (with confidence)\n"
        "2) Evidence from context (bullets)\n"
        "3) Blast radius / impacted systems\n"
        "4) Triage plan (next best actions + owners)\n"
        "5) Bug prioritization (top 3 from the queue, if relevant)\n"
    )

    settings = get_settings()
    llm = get_llm_service(settings)

    try:
        if not await llm.is_available():
            fallback = (
                "LLM is unavailable. Configure OPEN_ROUTER_API_KEY or start Ollama.\n"
                + (f"\nContext:\n{context}\n" if context else "")
            ).strip()
            return ChatResponse(response=fallback, used_llm=False, model=None)

        text = await llm.generate(prompt, system=system)
        return ChatResponse(response=text, used_llm=True, model=llm.model)
    except Exception as exc:
        fallback = (
            f"LLM request failed: {type(exc).__name__}. "
            "Check your LLM provider settings and retry.\n"
            + (f"\nContext:\n{context}\n" if context else "")
        ).strip()
        return ChatResponse(response=fallback, used_llm=False, model=None)
