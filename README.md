# PCBS2 3DMark Calculator

Точный калькулятор 3DMark-счёта для игр **PC Building Simulator** и **PCBS2** — с инструментом подбора сборок под бюджет и умным апгрейдером существующей системы.

Формулы откалиброваны по реальным значениям игры: при одинаковых конфигурациях счёт совпадает с игровым вплоть до единиц.

## Возможности

- **Калькулятор 3DMark** — точный расчёт счёта для всех режимов:
  - Fire Strike / Time Spy (standard), Time Spy Extreme, Port Royal, Speedway
  - Одинарные и двойные (SLI / Crossfire) GPU — со встроенными в игру множителями `dual_gpu_performance_increase`
  - Учёт уровня и прогресса персонажа, режим «Песочница» (Sandbox)
  - Разблокировка/блокировка режимов и компонентов в точности по правилам игры
- **Build Maker** — подбор оптимальной сборки под заданный бюджет и целевой счёт: фильтры по сокету, брендам, объёму RAM, типу и размеру диска, корпусу; 10 лучших разнообразных вариантов
- **Build Upgrader** — поиск осмысленных апгрейдов текущей системы (CPU, GPU, RAM и их комбинации) в пределах бюджета: каждый заменённый компонент должен давать прирост счёта, худшие конфигурации отбрасываются
- **Разгон в стиле игры** — RAM XMP c честным ограничением по дефолтной частоте CPU, ручной разгон CPU и GPU
- **Два поколения данных** — PCBS (v1) и PCBS2 (v2) с независимыми уровнями и формулами

## Локализация

Интерфейс переведён на **15 языков**; язык по умолчанию определяется из системного. Арабский — полноценный RTL (`dir="rtl"` переключается автоматически).

| en | ru | uk | ko | zh | ja | de | es |
|----|----|----|----|----|----|----|----|
| 🇬🇧 | 🇷🇺 | 🇺🇦 | 🇰🇷 | 🇨🇳 | 🇯🇵 | 🇩🇪 | 🇪🇸 |

| it | pl | tr | ar | pt | fr | hi |
|----|----|----|----|----|----|----|
| 🇮🇹 | 🇵🇱 | 🇹🇷 | 🇸🇦 | 🇵🇹 | 🇫🇷 | 🇮🇳 |

## Интерфейс

- Тёмная и светлая темы; по умолчанию — системная (`prefers-color-scheme`), выбор пользователя сохраняется
- Плавная прокрутка (Lenis), анимация смены темы через View Transitions
- Адаптивная вёрстка: на мобильных вкладки остаются с текстом и скроллятся, шапка прилипает при прокрутке
- Бейдж звёзд GitHub-репозитория

## Стек

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![pnpm](https://img.shields.io/badge/pnpm-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)

- **Next.js 16 (App Router)** — серверные компоненты читают базу, клиент получает данные через RSC
- **Tailwind CSS 4** — CSS-first конфигурация, встроенные `rtl:`/`ltr:` варианты для RTL
- **PostgreSQL** — таблицы `cpu`, `gpu`, `ram`, `motherboard`, `psu`, `storage`, `cases`, `coolers` (v1) и `v2_*` (v2); запросы кэшируются в памяти процесса

## Структура

```
src/
├── app/
│   ├── (app)/            # calculator, build-maker, upgrader (server components)
│   └── api/build-maker/  # POST — поиск сборок под параметры
├── components/           # AppShell, BuildMaker, BuildUpgrader, UI (селекты, модалки)
├── lib/
│   ├── calculator.ts     # игровые формулы 3DMark (SCALE_TSE, множители dual-GPU, XMP-капы)
│   ├── db.ts             # PostgreSQL-пул + кэш queryByVersion
│   └── i18n/             # 15 языков, LangProvider, RTL
```

## Установка и запуск

```bash
# 1. зависимости
pnpm install

# 2. переменные окружения (.env.local)
# DATABASE_URL=postgres://user:pass@host:5432/pcbs2

# 3. разработка
pnpm dev        # http://localhost:3000

# 4. продакшен
pnpm build && pnpm start
```

## Деплой (Vercel)

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fberezenko04%2Fpcbs2calculator)

1. Импортируй репозиторий на [Vercel](https://vercel.com) (или нажми кнопку выше) — платформа сама определит Next.js и pnpm
2. Подними PostgreSQL (Neon, Supabase, RDS) и импортируй схему и данные текущей базы:
   ```bash
   # локально: выгрузить дамп
   pg_dump --no-owner -F c pcbs2 > pcbs2.dump
   # на сервере: восстановить
   pg_restore --no-owner -d postgres://user:pass@host:5432/db pcbs2.dump
   ```
3. В Project Settings → Environment Variables добавь `DATABASE_URL` (для Neon — pooled-URL)
4. `Deploy` — приложение использует `@vercel/analytics` и `@vercel/speed-insights` автоматически

## Скрипты

| Команда | Назначение |
|---------|-----------|
| `pnpm dev` | dev-сервер |
| `pnpm build` | продакшен-сборка + проверка типов |
| `pnpm start` | запуск собранного приложения |
| `pnpm lint` | ESLint (`eslint src/`) |

## Благодарности

Формулы сверены по фактическим счётам в игре; данные компонентов импортированы из выгрузок обеих версий игры.

---

Проект не аффилирован с авторами игры и 3DMark — это фанатский инструмент.
