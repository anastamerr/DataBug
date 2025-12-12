from __future__ import annotations

from datetime import datetime, timedelta
import json
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sqlalchemy import text

from ...models import DataIncident
from ..pipeline_monitor.lineage_graph import DataLineageGraph


class PredictionEngine:
    def __init__(self, db, pinecone=None):
        self.db = db
        self.pinecone = pinecone
        self.model: Optional[GradientBoostingRegressor] = None
        self._baseline_pair: dict[Tuple[str, str], tuple[float, int]] = {}
        self._baseline_type: dict[str, tuple[float, int]] = {}
        self._baseline_global: tuple[float, int] = (0.0, 0)
        self._train_model()

    @staticmethod
    def _as_list(value) -> list:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except Exception:
                return []
        return []

    def _train_model(self) -> None:
        patterns = self.db.execute(
            text(
                """
            SELECT
                i.incident_type,
                i.severity,
                i.anomaly_score,
                i.affected_columns,
                i.downstream_systems,
                COUNT(b.id) as bug_count
            FROM data_incidents i
            LEFT JOIN bug_reports b ON b.correlated_incident_id = i.id
            WHERE i.timestamp > :start
            GROUP BY
                i.id,
                i.incident_type,
                i.severity,
                i.anomaly_score,
                i.affected_columns,
                i.downstream_systems
            """
            ),
            {"start": datetime.utcnow() - timedelta(days=90)},
        ).fetchall()

        # Always compute baselines (even with sparse data), then optionally fit a model.
        counts_all: list[int] = []
        counts_by_pair: dict[Tuple[str, str], list[int]] = {}
        counts_by_type: dict[str, list[int]] = {}

        for p in patterns:
            itype = getattr(p, "incident_type", None)
            sev = getattr(p, "severity", None)
            bug_count = int(getattr(p, "bug_count", 0) or 0)
            if not isinstance(itype, str) or not isinstance(sev, str):
                continue
            counts_all.append(bug_count)
            counts_by_pair.setdefault((itype, sev), []).append(bug_count)
            counts_by_type.setdefault(itype, []).append(bug_count)

        if counts_all:
            self._baseline_global = (float(np.mean(counts_all)), len(counts_all))
        self._baseline_pair = {
            k: (float(np.mean(v)), len(v)) for k, v in counts_by_pair.items() if v
        }
        self._baseline_type = {
            k: (float(np.mean(v)), len(v)) for k, v in counts_by_type.items() if v
        }

        if len(patterns) < 10:
            return

        type_map = {
            "SCHEMA_DRIFT": 4,
            "NULL_SPIKE": 3,
            "VOLUME_ANOMALY": 3,
            "FRESHNESS": 2,
            "DISTRIBUTION_DRIFT": 2,
            "VALIDATION_FAILURE": 1,
        }
        sev_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

        X: List[List[float]] = []
        y: List[int] = []
        for p in patterns:
            affected_count = len(self._as_list(getattr(p, "affected_columns", None)))
            downstream_count = len(self._as_list(getattr(p, "downstream_systems", None)))
            X.append(
                [
                    type_map.get(getattr(p, "incident_type", None), 1),
                    sev_map.get(getattr(p, "severity", None), 1),
                    float(getattr(p, "anomaly_score", None) or 0.5),
                    float(affected_count),
                    float(downstream_count),
                ]
            )
            y.append(int(getattr(p, "bug_count", 0) or 0))

        self.model = GradientBoostingRegressor(n_estimators=50, random_state=42)
        self.model.fit(np.array(X), np.array(y))

    def _baseline_expected_count(self, incident: DataIncident) -> tuple[float, bool, int]:
        itype = str(incident.incident_type)
        sev = str(incident.severity)
        pair_map = getattr(self, "_baseline_pair", {}) or {}
        type_map = getattr(self, "_baseline_type", {}) or {}
        global_mean, global_n = getattr(self, "_baseline_global", (0.0, 0))

        pair = pair_map.get((itype, sev))
        if pair and pair[1] >= 3:
            return pair[0], True, pair[1]

        t = type_map.get(itype)
        if t and t[1] >= 3:
            return t[0], False, t[1]

        if global_n >= 3:
            return float(global_mean), False, int(global_n)

        base_counts = {
            "SCHEMA_DRIFT": 5,
            "NULL_SPIKE": 3,
            "VOLUME_ANOMALY": 2,
            "FRESHNESS": 1,
            "DISTRIBUTION_DRIFT": 2,
            "VALIDATION_FAILURE": 1,
        }
        return float(base_counts.get(itype, 1)), False, 0

    def predict_bugs(self, incident: DataIncident) -> Dict:
        if self.model is None:
            return self._rule_based_prediction(incident)

        type_map = {
            "SCHEMA_DRIFT": 4,
            "NULL_SPIKE": 3,
            "VOLUME_ANOMALY": 3,
            "FRESHNESS": 2,
            "DISTRIBUTION_DRIFT": 2,
            "VALIDATION_FAILURE": 1,
        }
        sev_map = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

        affected_count = len(incident.affected_columns or [])
        downstream_count = len(incident.downstream_systems or [])
        X = np.array(
            [
                [
                    type_map.get(incident.incident_type, 1),
                    sev_map.get(incident.severity, 1),
                    float(incident.anomaly_score or 0.5),
                    float(affected_count),
                    float(downstream_count),
                ]
            ]
        )
        predicted_count = max(0, int(round(float(self.model.predict(X)[0]))))

        similar = self._find_similar_incidents(incident)
        predicted_components = self._predict_affected_components(incident, similar)

        return {
            "predicted_bug_count": predicted_count,
            "predicted_components": predicted_components,
            "confidence": self._calculate_confidence(incident, has_model=True),
            "prediction_window_hours": 6,
            "recommendation": self._generate_recommendation(predicted_count, incident),
        }

    def _rule_based_prediction(self, incident: DataIncident) -> Dict:
        count, used_pair, _n = self._baseline_expected_count(incident)

        # Apply severity boost only when the baseline isn't already pair-specific.
        if not used_pair:
            if incident.severity == "CRITICAL":
                count *= 1.6
            elif incident.severity == "HIGH":
                count *= 1.3
            elif incident.severity == "MEDIUM":
                count *= 1.1
            else:
                count *= 0.9

        # Adjust for anomaly magnitude (kept conservative to avoid overreacting).
        anomaly = float(incident.anomaly_score or 0.5)
        anomaly = max(0.0, min(anomaly, 1.0))
        count *= 0.85 + (0.3 * anomaly)

        downstream = incident.downstream_systems or DataLineageGraph().get_downstream_systems(
            incident.table_name
        )

        return {
            "predicted_bug_count": max(0, int(round(count))),
            "predicted_components": downstream[:3],
            "confidence": self._calculate_confidence(incident, has_model=False),
            "prediction_window_hours": 6,
            "recommendation": f"Expect ~{max(0, int(round(count)))} bug reports in the next 6 hours",
        }

    def _find_similar_incidents(self, incident: DataIncident) -> List[DataIncident]:
        # Simple heuristic: past incidents of same type/severity in last 90 days
        start = datetime.utcnow() - timedelta(days=90)
        return (
            self.db.query(DataIncident)
            .filter(
                DataIncident.timestamp >= start,
                DataIncident.incident_type == incident.incident_type,
                DataIncident.severity == incident.severity,
            )
            .limit(20)
            .all()
        )

    def _predict_affected_components(
        self, incident: DataIncident, similar: List[DataIncident]
    ) -> List[str]:
        freq: dict[str, int] = {}
        for inc in similar:
            if inc.downstream_systems:
                for c in inc.downstream_systems:
                    if not c:
                        continue
                    freq[c] = freq.get(c, 0) + 1

        if not freq:
            for c in (
                incident.downstream_systems
                or DataLineageGraph().get_downstream_systems(incident.table_name)
            ):
                if not c:
                    continue
                freq[c] = freq.get(c, 0) + 1

        ranked = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
        return [k for k, _v in ranked[:5]]

    def _calculate_confidence(self, incident: DataIncident, *, has_model: bool) -> float:
        base = 0.78 if has_model else 0.62

        itype = str(incident.incident_type)
        sev = str(incident.severity)
        pair_map = getattr(self, "_baseline_pair", {}) or {}
        pair = pair_map.get((itype, sev))
        n = pair[1] if pair else 0
        base += min(n / 50.0, 0.15)

        if incident.anomaly_score:
            base += min(float(incident.anomaly_score), 1.0) * 0.1
        return min(base, 0.95)

    def _generate_recommendation(
        self, predicted_count: int, incident: DataIncident
    ) -> str:
        downstream = incident.downstream_systems or []
        if predicted_count >= 5:
            return (
                f"HIGH ALERT: Expect {predicted_count}+ bug reports. "
                f"Consider proactive communication to affected teams: {', '.join(downstream)}"
            )
        if predicted_count >= 2:
            return (
                f"MODERATE: Expect {predicted_count} bug reports. "
                f"Monitor {', '.join(downstream)} closely."
            )
        return "LOW: Expect minimal bug reports. Standard monitoring sufficient."
