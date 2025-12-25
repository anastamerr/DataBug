# DataBug AI - Bug Triage Implementation Plan

## Current Status (Last updated: 2025-12-13)

### Completed (implemented in repo)
- [x] Monorepo structure: `backend/`, `frontend/`, `docs/`, `demo/`
- [x] Backend API: health, bugs, chat, demo injection
- [x] Realtime updates: Socket.IO server (`/ws`) + frontend query invalidation
- [x] Bug triage engine: classification + auto-routing
- [x] Duplicate detection: Pinecone embeddings + duplicate scoring
- [x] GitHub ingestion: webhook endpoint + upsert/triage + optional backfill script
- [x] GitHub issue comments: ingest `issue_comment` webhooks into bug labels
- [x] LLM: OpenRouter support (`OPEN_ROUTER_API_KEY`) + provider auto-selection
- [x] Dev helper: auto-sync GitHub webhook to current ngrok URL (`python -m src.integrations.github_webhook_sync`)
- [x] Frontend: bug list + bug detail views + chat
- [x] Backend tests in place (pytest)
- [x] Supabase-ready compose: backend uses `backend/.env` (gitignored)

### Remaining / Next
- [ ] Optional: run Ollama locally (only if not using OpenRouter)

## Project Overview

**DataBug AI** is an intelligent bug triage platform that automates classification, duplicate detection, and routing using AI-assisted workflows.

**Core Innovation**: unify bug intake (GitHub), semantic dedupe, and LLM-assisted triage guidance into one workflow so teams can prioritize and resolve issues faster.

---

## Why DataBug AI Wins

### The Problem (Backed by Data)
- Manual classification slows response times
- Duplicate detection is inconsistent
- Routing to the right team is often delayed

### Our Solution (3 Layers of Intelligence)

```
Layer 1: INTAKE        - Normalize bug intake from GitHub
Layer 2: TRIAGE        - Classify, de-duplicate, and prioritize
Layer 3: ASSIST        - LLM-assisted summaries and next actions
```

### Key Differentiators

| Feature | Traditional Tools | DataBug AI |
|---------|-------------------|------------|
| Bug ingestion | Yes | Yes |
| Auto-classification | Limited | Yes |
| Semantic dedupe | Limited | Yes |
| Smart routing | Limited | Yes |
| LLM triage assistant | No | Yes |

---

## Architecture

```
[Frontend: React + Vite]
      |
      | REST API + WebSocket
      v
[Backend: FastAPI]
  - Bug intake (GitHub)
  - Classifier + Router
  - Duplicate detector (Pinecone)
  - Chat assistant (LLM)
      |
      +--> Postgres
      +--> Pinecone
      +--> LLM Provider (OpenRouter/Ollama)
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool, fast HMR |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| TanStack Query | Data fetching, caching |
| Socket.io Client | Real-time updates |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | API framework |
| Python 3.11+ | Runtime |
| SQLAlchemy | ORM |
| Pydantic | Data validation |
| Socket.io | Real-time events |

### AI + Data
| Technology | Purpose | Source |
|------------|---------|--------|
| Sentence-Transformers | Text embeddings | Track 4 |
| Pinecone | Vector database | Track 4 |
| Ollama + Llama 3 | LLM inference | Research |
| OpenRouter | LLM routing | Research |

---

## Testing Strategy

### Testing Philosophy

**Core Principle**: Write tests alongside code, not after. Every feature should be tested before merging.

### Test Pyramid
```
Unit Tests (70%)
Integration Tests (25%)
E2E Tests (5%)
```

### Phase 1: Foundation
```
Unit tests:
- test_config.py
- test_pinecone_client.py

Integration tests:
- test_health_endpoints.py
```

### Phase 2: Bug Triage Engine
```
Unit tests:
- test_classifier.py
- test_duplicate_detector.py
- test_auto_router.py

Integration tests:
- test_bugs_api.py
- test_github_webhook_api.py
- test_chat_api.py
```

### Phase 3: Frontend
```
Component tests:
- StatsCard.test.tsx
- BugQueue.test.tsx

E2E tests:
- test_bug_flow.spec.ts
```

---

## Test Commands

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/team-csis/databug-ai.git
cd databug-ai

# Set environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Run demo
python demo/demo_sequence.py
```

---

*Team CSIS - Unifonic AI Hackathon 2025*
*DataBug AI: Ship the right fix faster.*
