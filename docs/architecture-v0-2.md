# Kivitely architecture baseline

## Aktuális állapot

Ez az első Kivitely fejlesztési baseline egy egyrepo-s Next.js MVP alap:

- frontend: Next.js App Router / React / TypeScript
- backend réteg: Next.js API route-ok
- adat: mock repository
- jövőbeni DB: Supabase PostgreSQL
- jövőbeni fájl: Supabase Storage

## Miért jó ez most?

Nem külön backenddel kezdünk, mert MVP-ben a sebesség fontosabb. A Next.js API route-okkal már most tudunk backend-szerű szerződéseket kialakítani, amelyeket később Supabase vagy külön NestJS/Fastify backend mögé lehet kötni.

## Első domain objektumok

- Project
- Issue
- Subcontractor
- EvidencePhoto
- IssueEvent
- TigPackage

## Első workflow

```text
draft → open → assigned → in_progress → ready_for_review → accepted → tig_ready → closed
                   ↓             ↓              ↓
                rejected ←───────┴──────────────┘
```

## Következő technikai döntések

1. Auth: Supabase Auth vagy Auth.js?
2. Storage: Supabase Storage vagy S3-kompatibilis bucket?
3. PDF: server-side PDF generálás API route-ban vagy külön workerben?
4. Multi-tenant: projekt alapú jogosultság vagy szervezet alapú tenant?
5. PWA offline mód: local cache + sync queue kell-e már MVP-be?
