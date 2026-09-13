---
name: new-feature
description: The house build workflow — read matching rules, check version-specific docs, build, test, format, then log. Usage: /new-feature <name>
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Skill, mcp__laravel-boost__search-docs, mcp__laravel-boost__database-schema, mcp__laravel-boost__database-query, mcp__laravel-boost__record-rule, mcp__laravel-boost__last-error, mcp__laravel-boost__get-absolute-url
---

# Build a feature, the house way

Feature: `$1`

Follow these in order. Do not start writing code before Step 2 is done.

## 1. Rules first

Open `.ai/rules/index.md`, identify every rule file whose globs cover the paths you expect
to touch, and read them. Then `grep -rin '<keyword>' .ai/rules` for the feature's domain
terms — a path match alone misses cross-cutting rules.

`.ai/rules` is the load-bearing half of this project's memory. A rule that contradicts
what you were about to do wins.

## 2. Version-specific docs

Do not write framework code from memory. This project is Laravel 13 / Inertia v3 /
React 19 / Tailwind v4 / Pest 5 — several of these have breaking changes from the versions
most examples show.

- `search-docs` with two or three broad topic queries, scoped with `packages` when known.
- `composer show --direct` / `package.json` if you need to confirm an installed version.
- Activate the matching project skill: `laravel-best-practices` for backend PHP,
  `inertia-react-development` for Inertia client patterns, `wayfinder-development` when
  the frontend calls a route, `pest-testing` for tests, `tailwindcss-development` for
  styling.

## 3. Build

Use `php artisan make:*` with `--no-interaction` for new files. Match sibling files.
New models get a factory; ask before adding a seeder.

Frontend calls to backend routes go through Wayfinder imports (`@/actions`, `@/routes`) —
never hardcoded URL strings. Those directories are generated; if an import is missing, the
codegen is stale, not the file.

## 4. Test

Feature tests over unit tests. `php artisan make:test --pest {Name}`. `RefreshDatabase` is
already applied to `tests/Feature` — do not re-apply it. Use factories and their existing
states.

Run: `php artisan test --compact`.

## 5. Format and check

The PostToolUse hook already ran Pint and Prettier on files you edited — do not redo that
by hand. What the hook does *not* cover:

```
composer types:check    # phpstan level 7
npm run types:check     # tsc --noEmit
npm run lint:check      # eslint
```

Before calling the work done, run the full gate: `composer ci:check`. That is exactly what
CI runs.

## 6. Log

Run `/log-feature $1`. It applies its own bar — expect it to write nothing if the work
held no surprises, and treat that as a correct outcome rather than a failure. Whether or
not a note is written, it will also consider recording a rule; a trap belongs in
`.ai/rules` where it fires mid-edit.

## 7. Report

What was built, what the test run said (paste the failing output if anything failed — do
not summarise a failure as a success), and whether a note or rule was recorded.
