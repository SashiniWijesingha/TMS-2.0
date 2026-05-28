# CI/CD Compatibility Report — Node 22

Generated: 2026-03-06

## Summary

This report documents the package version audit and compatibility analysis for the TMS-2.0
project running on **Node.js 22**. All packages have been verified against the npm registry
for stable releases, Node 22 engine compatibility, and the GitHub Advisory Database for
known security vulnerabilities.

---

## Backend (`backend/package.json`)

### Dependencies

| Package | Previous Version | Suggested Version | Compatibility | Notes |
|---------|-----------------|-------------------|---------------|-------|
| `@turf/turf` | `^7.3.2` | `^7.3.4` | ✅ Stable patch | |
| `@types/bcrypt` | `^6.0.0` | `^6.0.0` | ✅ Stable | |
| `@types/bcryptjs` | `^2.4.6` | `^3.0.0` | ✅ Major bump — aligns with bcryptjs 3.x runtime | |
| `@types/cors` | `^2.8.19` | `^2.8.19` | ✅ Stable | |
| `@types/express` | `^5.0.6` | `^5.0.6` | ✅ Stable | |
| `@types/geojson` | `^7946.0.16` | `^7946.0.16` | ✅ Stable | |
| `@types/jsonwebtoken` | `^9.0.10` | `^9.0.10` | ✅ Stable | |
| `@types/multer` | `^2.0.0` | `^2.1.0` | ✅ Stable patch | |
| `@types/node` | **`^25.0.3`** | **`^22.15.21`** | ⚠️ **Critical fix** — previous referenced Node 25 types on a Node 22 runtime | |
| `axios` | `^1.13.2` | `^1.13.6` | ✅ Stable patch | |
| `bcrypt` | `^6.0.0` | `^6.0.0` | ✅ Stable | |
| `bcryptjs` | `^3.0.3` | `^3.0.3` | ✅ Stable | |
| `cors` | `^2.8.5` | `^2.8.6` | ✅ Stable patch | |
| `dotenv` | `^17.2.3` | `^17.3.1` | ✅ Stable patch | |
| `express` | `^5.2.1` | `^5.2.1` | ✅ Stable | |
| `helmet` | `^8.1.0` | `^8.1.0` | ✅ Stable | |
| `jsonwebtoken` | `^9.0.3` | `^9.0.3` | ✅ Stable | |
| `multer` | `^2.0.2` | `^2.1.1` | ✅ Stable patch | |
| `mysql2` | `^3.16.0` | `^3.19.0` | ✅ Stable patch | |
| `nodemailer` | `^8.0.1` | `^8.0.1` | ✅ Stable | |
| `nodemon` | `^3.1.11` | `^3.1.14` | ✅ Stable patch | |
| `reflect-metadata` | `^0.2.2` | `^0.2.2` | ✅ Stable | |
| `sequelize` | `^6.37.7` | `^6.37.7` | ✅ Stable | |
| `sequelize-typescript` | `^2.1.6` | `^2.1.6` | ✅ Stable | |
| `ts-node` | `^10.9.2` | `^10.9.2` | ✅ Stable | |
| `typescript` | `^5.9.3` | `^5.9.3` | ✅ Stable | |

### devDependencies

| Package | Previous Version | Suggested Version | Compatibility | Notes |
|---------|-----------------|-------------------|---------------|-------|
| `@babel/plugin-proposal-class-properties` | `^7.18.6` | `^7.18.6` | ✅ Stable | |
| `@babel/plugin-proposal-decorators` | `^7.28.0` | `^7.29.0` | ✅ Stable patch | |
| `@types/nodemailer` | `^7.0.11` | `^7.0.11` | ✅ Stable | |

---

## Frontend (`frontend/package.json`)

### Dependencies

| Package | Previous Version | Suggested Version | Compatibility | Notes |
|---------|-----------------|-------------------|---------------|-------|
| `@react-google-maps/api` | `2.20.8` | `2.20.8` | ✅ Stable | |
| `@types/leaflet` | `1.9.21` | `1.9.21` | ✅ Stable | |
| `axios` | `^1.13.6` | `^1.13.6` | ✅ Stable | |
| `clsx` | `2.1.1` | `2.1.1` | ✅ Stable | |
| `framer-motion` | `11.18.2` | `11.18.2` | ✅ Stable (v11 LTS) | v12+ is available but breaking |
| `leaflet` | `1.9.4` | `1.9.4` | ✅ Stable | |
| `lucide-react` | `0.514.0` | `0.514.0` | ✅ Stable | |
| `react` | `19.1.0` | `19.1.0` | ✅ Stable | |
| `react-dom` | `19.1.0` | `19.1.0` | ✅ Stable | |
| `react-leaflet` | `5.0.0` | `5.0.0` | ✅ Stable | |
| `react-router-dom` | `^7.13.1` | `^7.13.1` | ✅ Stable | |
| `react-toastify` | `11.0.5` | `11.0.5` | ✅ Stable | |
| `tailwind-merge` | `3.3.0` | `3.3.0` | ✅ Stable | |
| `workbox-core` | `7.3.0` | `7.3.0` | ✅ Stable | |
| `workbox-expiration` | `7.3.0` | `7.3.0` | ✅ Stable | |
| `workbox-precaching` | `7.3.0` | `7.3.0` | ✅ Stable | |
| `workbox-routing` | `7.3.0` | `7.3.0` | ✅ Stable | |
| `workbox-strategies` | `7.3.0` | `7.3.0` | ✅ Stable | |
| `workbox-window` | `7.3.0` | `7.3.0` | ✅ Stable | |

### devDependencies

| Package | Previous Version | Suggested Version | Compatibility | Notes |
|---------|-----------------|-------------------|---------------|-------|
| `@eslint/js` | `9.27.0` | `9.27.0` | ✅ Stable | |
| `@types/node` | `22.15.21` | `22.15.21` | ✅ Stable — Node 22 aligned | |
| `@types/react` | `19.1.5` | `19.1.5` | ✅ Stable | |
| `@types/react-dom` | `19.1.5` | `19.1.5` | ✅ Stable | |
| `@vitejs/plugin-react` | `4.5.2` | `4.5.2` | ✅ Stable | v5 available but breaking |
| `autoprefixer` | `10.4.21` | `10.4.21` | ✅ Stable | |
| `eslint` | `9.27.0` | `9.27.0` | ✅ Stable | |
| `eslint-plugin-react-hooks` | `5.2.0` | `7.0.1` | ⚠️ **Broken API fixed** — `eslint.config.js` uses `reactHooks.configs.flat.recommended` which only exists in v7.0.x |
| `eslint-plugin-react-refresh` | `0.4.20` | `0.4.20` | ✅ Stable | |
| `globals` | `16.2.0` | `16.2.0` | ✅ Stable | |
| `postcss` | `8.5.3` | `8.5.3` | ✅ Stable | |
| `tailwindcss` | `3.4.17` | `3.4.17` | ✅ Stable (v3 LTS) | v4 available but breaking |
| `typescript` | `5.8.3` | `5.8.3` | ✅ Stable — cannot upgrade to 5.9.3 without also updating typescript-eslint past 8.32.1 (peer dep constraint) | |
| `typescript-eslint` | `8.32.1` | `8.32.1` | ✅ Stable | |
| `vite` | `npm:rolldown-vite@7.2.5` | `npm:rolldown-vite@7.3.1` | ✅ Stable patch | |
| `vite-plugin-pwa` | `^0.19.8` | `^0.19.8` | ✅ Stable | |

---

## Key Findings

### Critical Issues Fixed

| Issue | Severity | Resolution |
|-------|----------|------------|
| `@types/node: ^25.0.3` used with Node 22 runtime | **Critical** | Downgraded to `^22.15.21` — Node 25 type definitions reference APIs unavailable in Node 22, causing type errors and potential runtime mismatches. |
| `eslint-plugin-react-hooks@5.2.0` with `configs.flat.recommended` reference | **Critical** | Updated to `7.0.1` — `eslint.config.js` uses `reactHooks.configs.flat.recommended` which was only introduced in v7.0.x; ESLint was completely non-functional before this fix. |
| `serialize-javascript ≤7.0.2` (RCE via RegExp.flags) | **High** | Added `overrides["serialize-javascript": "^7.0.4"]` — transitive dependency via `workbox-build → @rollup/plugin-terser`; pinned to safe version ≥7.0.3 (GHSA-5c6j-r48x-rmvq). |

### Packages Requiring Major Version Lock (No Upgrade Recommended)

| Package | Current | Next Major | Reason to Defer Upgrade |
|---------|---------|------------|--------------------------|
| `framer-motion` | `11.x` | `12.x` | Breaking animation API changes |
| `tailwindcss` | `3.x` | `4.x` | Configuration and plugin format completely changed |
| `@vitejs/plugin-react` | `4.x` | `5.x` | Requires Vite 6+/7+ and React Fast Refresh API changes |
| `eslint` | `9.x` | `10.x` | Flat config format changes; would require `eslint.config.js` updates |

### vite / rolldown-vite Note

The project uses `rolldown-vite` as an alias for `vite`. This is an experimental Vite
implementation backed by Rolldown (a Rust-based JS bundler). It is API-compatible with
standard Vite but may have subtle behavioural differences.

**Recommendation**: If build instability occurs, consider switching back to the standard
`vite` package (currently `7.3.1`) by removing the `overrides` section and updating
the `vite` dev-dependency accordingly.

---

## Security Audit Summary

All suggested versions were checked against the GitHub Advisory Database. **No known
vulnerabilities** were found in any of the proposed package versions.

---

## Node 22 Compatibility Summary

| Package Group | Status |
|--------------|--------|
| Backend runtime deps | ✅ All compatible with Node 22 |
| Backend dev deps | ✅ All compatible with Node 22 |
| Frontend deps | ✅ All compatible with Node 22 |
| Frontend dev deps | ✅ All compatible with Node 22 |

---

## CI/CD Workflows

Two GitHub Actions workflows manage build and deployment:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Build and Deploy | `.github/workflows/main_devtest1.yml` | `push` to `main` | Build + deploy to Azure |
| Version Validation | `.github/workflows/version-validation.yml` | PR / `push` | Validate dependencies, run `npm ci`, build, lint, tests |

### Changes to `main_devtest1.yml`
- Upgraded `actions/setup-node@v3` → `actions/setup-node@v4`
- Added `cache: 'npm'` with `cache-dependency-path` for both backend and frontend

### New `version-validation.yml`
- Runs `npm ci` (strict reproducible installs)
- Checks `npm ls --depth=0` for conflict detection
- Runs `npm audit --audit-level=high`
- Builds both backend and frontend
- Runs linting on frontend
- Generates a GitHub Step Summary with version and validation report
