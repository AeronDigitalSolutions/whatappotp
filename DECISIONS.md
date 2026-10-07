# Architecture & Decisions

- **Monorepo**: pnpm workspaces + Turborepo
- **API Framework**: Fastify (Node.js) + TypeScript
- **Database**: PostgreSQL 15 + Prisma ORM
- **Web**: Next.js 14 App Router + Tailwind CSS + shadcn/ui
- **Message Queue**: Redis + BullMQ
- **Authentication**: Custom DB-backed Session/JWT strategy to easily manage multi-tenant relationships and API keys.

