# Использование AI

Работа шла поэтапно: AI-ассистент (Claude Code) писал код этапа, я ревьюил каждый этап
перед переходом к следующему. Ниже — где AI помог и как проверялся результат.

## Этап 0 — каркас монорепо

**Что сделал AI:** структура монорепо, конфиги TypeScript/ESLint/Prettier, docker-compose
с Postgres, минимальные приложения Nest и Next.

**Как проверялось:**

- Версии не брались «из памяти модели»: перед выбором проверены актуальные версии и
  `peerDependencies` в npm-реестре. Так обнаружилось, что NestJS 12 стал ESM-only, а
  TypeScript 7 не поддерживается `typescript-eslint` — выбор и причины записаны в
  [decisions.md](./decisions.md).
- `pnpm typecheck`, `pnpm lint`, `pnpm build` проходят.
- API поднимается, `GET /api/health` отвечает; Next-страница рендерится с MUI и
  импортом из `@kanban/shared`; Postgres в docker-compose проходит healthcheck.
