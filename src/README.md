# Source organization

Keep route entry points in the root `app/` directory. Shared code belongs in the matching `src/` area:

- `components/` contains reusable UI and layout components, not page-specific markup.
- `features/` groups domain-owned UI, schemas, and types by capability.
- `hooks/`, `lib/`, `schemas/`, and `types/` contain cross-feature code only.
- `server/actions/` and `server/services/` expose application workflows; actions are transport adapters, while services own business rules.
- `server/repositories/` and `server/db/` isolate persistence. Do not query Prisma directly from UI components.
- `server/auth/` owns server-side identity and access checks.
- `server/integrations/` isolates provider SDKs and external APIs from domain logic.
- `emails/`, `constants/`, and `config/` hold transactional templates, stable constants, and validated configuration respectively.

Add a subdirectory when its first real module is implemented; avoid empty feature modules and speculative abstractions.
