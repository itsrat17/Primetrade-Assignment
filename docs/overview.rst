Project Overview
================

Stack
-----

- FastAPI backend with JWT OAuth2 password flow and role-based access control
- PostgreSQL with SQLAlchemy and Alembic migrations
- React frontend using shadcn/ui and TanStack Query
- Docker Compose orchestration

Roles
-----

- First registered user becomes ``admin``.
- Every next user is created as ``user``.
- Only admins can list users and change roles.

Main API Prefix
---------------

All API routes are versioned under ``/api/v1``.
