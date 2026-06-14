# Production Security and PostgreSQL Readiness Plan

## Confirmed Decisions

- Production database: PostgreSQL.
- Local development/demo database: SQLite.
- Existing SQLite migration history must not be rewritten.
- Secrets are treated as potentially exposed and must be rotated before production.
- Production LLM provider: DeepSeek only.
- Production mock LLM fallback is forbidden.
- Core business data is department-isolated by default.
- Admin, finance, and AI information roles may view across departments.

## Secret Rotation

Rotate these values before production deployment:

- `JWT_SECRET`
- `DEEPSEEK_API_KEY`
- `OPENAI_API_KEY` if ever used
- `SENTRY_AUTH_TOKEN`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `WECOM_CORP_SECRET`
- Any database passwords embedded in `DATABASE_URL`

Do not write real secrets into source code, docs, screenshots, issue comments, or reports.

## Required Production Environment

```env
NODE_ENV="production"
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="<rotated-strong-secret-at-least-32-chars>"
DEMO_LOGIN_ENABLED="false"
LLM_PROVIDER="deepseek"
DEEPSEEK_API_KEY="<rotated-deepseek-key>"
LLM_FALLBACK_TO_MOCK="false"
SENTRY_ORG="<org>"
SENTRY_PROJECT="<project>"
SENTRY_AUTH_TOKEN="<rotated-token>"
```

Run this read-only check before deployment:

```bash
npm run prod:check
```

## PostgreSQL Migration Strategy

Do not edit existing SQLite migration history.

Recommended low-risk path:

1. Keep the current SQLite migrations as the local/dev chain.
2. Create a separate PostgreSQL baseline from the current Prisma schema in an isolated branch or release preparation workspace.
3. Apply the PostgreSQL baseline to an empty staging PostgreSQL database.
4. Run Prisma generate, application smoke tests, and core CRUD/API tests against staging.
5. If data migration is needed, export SQLite data, transform incompatible values, import into PostgreSQL, then run consistency checks.
6. Only after staging verification, promote the PostgreSQL baseline and deployment runbook.

Do not run destructive migration commands against production without a backup, rollback plan, and explicit approval.

## Permission Policy

Default data visibility:

- Policy links: same department only.
- Policy briefs: same department as the source policy link.
- Knowledge cards: existing public/department/role rules, with extended visibility for approved roles.
- SOP tasks/submissions: assigned mentor/trainee plus expanded administrative roles.

Expanded visibility roles:

- `admin`
- `finance`
- `ai_info`

All writes, reviews, publishing, and pushes must use the authenticated user from the server-side auth context. Do not trust request body fields such as `userId`, `creatorId`, `submitterId`, `reviewerId`, or `pusherId`.

## Agent Safety Boundary

Autonomous actions:

- scan
- analyze
- generate draft
- create pending task

Requires approval:

- publish knowledge card
- reject content
- push to customers or employees
- modify SOP

Forbidden:

- delete users
- modify permissions
- execute database migrations
- modify security configuration
- access unauthorized external APIs

Forbidden actions must be blocked. Approval-required actions must not directly mutate business state before an approval artifact exists.
