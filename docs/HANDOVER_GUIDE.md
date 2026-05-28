# 🤝 Project Handover & Developer Assessment Guide

Welcome to the **Transport Management System (TMS) 2.0**. This document is specifically designed to help a new developer or technical lead assess the codebase, understand the current state of the project, and get up to speed quickly.

---

## 🕒 1. Quick Start for Assessment

To see the system in action within 10 minutes:

1.  **Backend Integrity**:
    *   Navigate to `/backend`, run `npm install`.
    *   Ensure your `.env` has a local DB and a **Google Maps API Key**.
    *   Run `npm run sync` to generate the schema, then `npm run dev`.
2.  **Frontend Exploration**:
    *   Navigate to `/frontend`, run `npm install`.
    *   Run `npm run dev` and login with the default admin credentials (found in `backend/src/seed_db.ts`).
3.  **Critical Path Test**:
    *   Try creating a "Passenger Request". If the map loads and the route displays a blue line, the geospatial services are healthy.

---

## 🏗️ 2. High-Level Architecture Assessment

| Component | Technology | Assessment Note |
| :--- | :--- | :--- |
| **Backend Core** | Express + TypeScript | Strict typing is used for most models and controllers. |
| **ORM Layer** | Sequelize-TS | Uses decorators for models. Clean but requires "changed()" alerts for JSON fields. |
| **Frontend UI** | React 19 + Tailwind | Uses modern functional components and Hooks. Very little legacy class component code. |
| **Map Engine** | Google Maps API | Centralized in `GoogleRoutePlanner.tsx`. High dependency on this for the core product. |
| **Geospatial** | Turf.js | All overlap and raid-sharing logic is performed server-side for accuracy. |

---

## 🚩 3. "Red Flag" & High-Complexity Areas

As a new maintainer, pay close attention to these files. They contain the most "moving parts":

1.  **`backend/src/controllers/requestController.ts`**:
    *   *Complexity*: High.
    *   *Why*: Manages the massive state machine of a request, including email triggers and automated return trips.
2.  **`backend/src/services/RideMatchingService.ts`**:
    *   *Complexity*: Mathematical/Algorithmic.
    *   *Why*: Spatial distance calculations. A small change here can break the "Suggest Matches" feature.
3.  **`backend/src/controllers/tripEntryController.ts`**:
    *   *Complexity*: Financial.
    *   *Why*: The Fuel Adjustment formula is critical for vendor payments. Precision errors here lead to financial discrepancies.

---

## 📚 4. Documentation Index

The following master documents have been prepared for your deep-dive:

1.  **[SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)**: The "What and Why". Business goals and high-level setup.
2.  **[TECHNICAL_DETAILS.md](TECHNICAL_DETAILS.md)**: The "How". Auth strategies, deep logic flows, and state machine details.
3.  **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: The "Where". ER diagrams and detailed field-by-field table descriptions.

---

## 🛠️ 5. Maintenance & Common Tasks

*   **Updating Fuel Prices**: Go to Admin -> System Settings. This updates `fuel_types`, which automatically recalculates adjustments for all *future* trip entries.
*   **Adding a New Vehicle Type**: Update the `VehicleType` model and seed data. Ensure the icon mapping in the frontend `IconSelector.tsx` is updated.
*   **Permission Issues**: Check `authMiddleware.ts`. Roles are ENUM-based and checked case-insensitively.

---

## 📈 6. Tech Debt & Future Improvements

*   **PWA Offline Mode**: Drivers often lose signal. The `sw.ts` (Service Worker) is partially implemented but needs robust offline data syncing for `TripEntry`.
*   **Testing Coverage**: Unit tests for the `RideMatchingService` algorithm are recommended before any refactor.
*   **Caching**: Consider Redis for frequently accessed `RouteSummary` results to save on Google Maps API costs.

---
**Handover Date**: May 28th 2026
**Current Version**: 2.0.0-Stabilized
**Author**: Sashini Wijeshingha
