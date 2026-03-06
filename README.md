# Scalable REST API Assignment

Full-stack assignment implementation using:
- Backend: FastAPI, PostgreSQL, SQLAlchemy, Alembic (autogenerate), JWT OAuth2 password flow, structlog
- Frontend: React + Vite + shadcn/ui components + TanStack Query
- Infra: Docker + Docker Compose

## Implemented Features

### Backend
- User registration and login with hashed passwords (`passlib` + `bcrypt`) and JWT auth.
- OAuth2 password flow (`/api/v1/auth/token`) based on FastAPI OAuth2/JWT pattern.
- Role-based access control (`user` and `admin`).
- CRUD APIs for `Task` entity.
- API versioning via `/api/v1`.
- Validation via Pydantic schemas.
- Structured error payloads.
- OpenAPI/Swagger docs at `/docs`.
- PostgreSQL schema with Alembic migration generated using `--autogenerate`.
- 12-factor logging via `structlog` JSON logs to stdout.

### Frontend
- Register and login views.
- JWT-based protected dashboard.
- Task CRUD UI wired to backend with TanStack Query.
- Admin user management UI (role updates).
- Success and error message handling from API responses.
- UI built with installed shadcn components (`button`, `card`, `input`, `label`, `textarea`, `table`, `badge`, `alert`, `dialog`, etc.).

## Project Structure

```
.
├── backend/
│   ├── alembic/
│   ├── src/backend/
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── components.json
└── docker-compose.yml
```

## Run with Docker (Recommended)

1. Start services:

```bash
docker compose up --build -d
```

2. Open:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

3. Stop services:

```bash
docker compose down
```

## Local Development

### Backend (uv)

```bash
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Documentation (Sphinx + autodoc)

Build docs locally:

```bash
python -m pip install -r docs/requirements.txt
python -m pip install -e backend
sphinx-build -b html docs docs/_build/html
```

Open:
- `docs/_build/html/index.html`

CI/CD docs automation:
- GitHub Actions workflow at `.github/workflows/docs.yml`
- Trigger: every push to `main` (including merged PRs)
- Output: deployed to GitHub Pages

## Alembic Notes (Autogenerate)

Migration files are generated using Alembic autogenerate (not hand-written):

```bash
cd backend
uv run alembic revision --autogenerate -m "init"
uv run alembic upgrade head
```

Generated migration:
- `backend/alembic/versions/8d71d4f0d636_init.py`

## API Highlights

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/token` (OAuth2 password form: `username` + `password`)
- `GET /api/v1/auth/me`
- `GET|POST /api/v1/tasks`
- `GET|PUT|DELETE /api/v1/tasks/{task_id}`
- `GET /api/v1/users` (admin)
- `PATCH /api/v1/users/{user_id}/role` (admin)

Note: first registered user is assigned `admin` role for initial bootstrap.

## Scalability Note

This codebase is modular and can scale with:
- Domain-based module expansion (`api`, `models`, `schemas`, `core`).
- Stateless auth (JWT), allowing horizontal scaling behind load balancers.
- Migration-managed schema evolution via Alembic.
- Structured logs (JSON) for centralized observability stacks.
- Easy path to split into services (auth/task/user) when needed.
- Caching layer (Redis) can be introduced later for hot reads and token/session patterns.

## Quick Verification Performed

- Built and started full Docker Compose stack.
- Ran Alembic migration in container startup.
- Verified backend health endpoint.
- Smoke-tested register/login and task creation/listing APIs.
- Verified frontend container serves built app.
