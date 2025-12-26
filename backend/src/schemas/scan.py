from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, model_validator


class ScanStatus(str, Enum):
    pending = "pending"
    cloning = "cloning"
    scanning = "scanning"
    analyzing = "analyzing"
    completed = "completed"
    failed = "failed"


class ScanTrigger(str, Enum):
    manual = "manual"
    webhook = "webhook"


class ScanType(str, Enum):
    sast = "sast"
    dast = "dast"
    both = "both"


class ScanCreate(BaseModel):
    repo_url: Optional[str] = None
    repo_id: Optional[uuid.UUID] = None
    branch: Optional[str] = "main"
    scan_type: ScanType = ScanType.sast
    target_url: Optional[str] = None
    dast_consent: bool = False

    @model_validator(mode="after")
    def _require_repo(self) -> "ScanCreate":
        if self.scan_type in {ScanType.sast, ScanType.both}:
            if not self.repo_url and not self.repo_id:
                raise ValueError("repo_url or repo_id is required for SAST scans")
        if self.scan_type in {ScanType.dast, ScanType.both}:
            if not self.target_url:
                raise ValueError("target_url is required for DAST scans")
            if not self.dast_consent:
                raise ValueError("dast_consent is required for DAST scans")
        return self


class ScanUpdate(BaseModel):
    status: Optional[ScanStatus] = None
    scan_type: Optional[ScanType] = None
    target_url: Optional[str] = None
    trigger: Optional[ScanTrigger] = None
    total_findings: Optional[int] = None
    filtered_findings: Optional[int] = None
    dast_findings: Optional[int] = None
    error_message: Optional[str] = None
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None
    detected_languages: Optional[List[str]] = None
    rulesets: Optional[List[str]] = None
    scanned_files: Optional[int] = None
    semgrep_version: Optional[str] = None


class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: Optional[uuid.UUID] = None
    repo_url: Optional[str] = None
    branch: str
    scan_type: ScanType
    target_url: Optional[str] = None
    status: ScanStatus
    trigger: ScanTrigger
    total_findings: int
    filtered_findings: int
    dast_findings: int
    error_message: Optional[str] = None
    pr_number: Optional[int] = None
    pr_url: Optional[str] = None
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None
    detected_languages: Optional[List[str]] = None
    rulesets: Optional[List[str]] = None
    scanned_files: Optional[int] = None
    semgrep_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime
