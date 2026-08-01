# PCBS2 3DMark Calculator

Open-source 3DMark score calculator for PC Building Simulator (v1) and PCBS2 (v2), with a build configurator and a system upgrader. Score formulas are calibrated against actual in-game results.

## Features

- Accurate 3DMark scores — Fire Strike / Time Spy, Time Spy Extreme, Port Royal, Speedway
- SLI / Crossfire with in-game dual-GPU multipliers
- Level and sandbox restrictions matching the game
- Build Maker — best build for your budget and target score
- Build Upgrader — only meaningful upgrades within budget
- RAM XMP and CPU/GPU overclocking, faithful to game mechanics
- 15 languages (English, Russian, Ukrainian, Korean, Chinese, Japanese, German, Spanish, Italian, Polish, Turkish, Arabic, Portuguese, French, Hindi), RTL for Arabic
- System-based theme and language defaults, dark/light mode, smooth scrolling

## Tech

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, PostgreSQL.

## Getting started

```bash
pnpm install
DATABASE_URL=postgres://user:pass@host:5432/pcbs2 pnpm dev
```

Component data lives in PostgreSQL: tables `cpu`, `gpu`, `ram`, `motherboard`, `psu`, `storage`, `cases`, `coolers` for v1 and `v2_*` for v2.

Build: `pnpm build && pnpm start` · Lint: `pnpm lint`

---

Not affiliated with the game developers or 3DMark.
