# Alembic versions

Drop new migration files here. Generate with:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

The initial schema (legacy + multi-tenant) is bootstrapped via
`database/init.sql` which loads `database/migrations/003_create_users_and_projects.sql`.
After production deploy, all subsequent changes should be in Alembic.
