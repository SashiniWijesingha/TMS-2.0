# 📘 Master Developer Reference & User Workflow Guide

> **Note to AI Assistant:** This file is the **Source of Truth** for the Transport Management System (TMS). It contains both the technical architecture and the detailed operational workflows for every user role. **Read this completely** before making changes to understand not just the code, but the _business logic_ and _user intent_.

---

## 🏗 System Architecture & Tech Stack

### **Core Stack**

- **Frontend**: React (Vite) + TypeScript + TailwindCSS + Lucide Icons.
- **Backend**: Node.js + Express + TypeScript.
- **Database**: MySQL/MariaDB (via Sequelize ORM).
- **Geospatial**:
  - Frontend: `Leaflet` (React-Leaflet) for maps.
  - Backend: `Turf.js` for geometry calculation.
  - Routing Service: `OpenRouteService` (ORS) API for generating paths, distances, and matrix calculations.
  - **Configuration**: Requires `ORS_API_KEY` in `backend/.env`.

### **Key Database Models**

| Model              | Purpose            | Key Relations                                                                                                                                                                                             |
| :----------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**           | System users       | BelongsOne `Role`, BelongsOne `Division`.                                                                                                                                                                 |
| **VehicleRequest** | The central ticket | `requested_by`, `status`, HasOne `PassengerDetails`/`MaterialDetails`. <br> **Updated**: Now includes `parent_id` and `is_return_leg` for linked return trips.                                            |
| **Allocation**     | The "Booking" link | Links `VehicleRequest` -> `Trip`. Enforce 1-to-1 for legacy tracking.                                                                                                                                     |
| **Vehicle**        | Fleet inventory    | `vehicle_number`, `vehicle_type_id`, `seating_capacity`, `attributes` (JSON), `availability_status`, `ownership` (ENUM: COMPANY/VENDOR), `documents` (JSON — stores paths & expiry dates for legal docs). |
| **Trip**           | The Master Record  | **The "Single Truth" entity**. Groups multiple requests into a physical journey. Holds `vehicle_id`, `driver_id`, and `start_time`.                                                                       |

---

## 🚀 Key Updates in Handoff Documentation (March 06, 2026)

### **1. Google Maps Integration & Advanced Routing**

- **Google Maps Replacements**: The system now seamlessly integrates Google Maps (`GoogleRoutePlanner`, `GoogleAddressAutocomplete`) for dynamic route visualization, exact location picking, and stop-overs parsing.
- **Elimination of Leaflet**: Full move to the Google ecosystem.

### **2. Shared Vehicle Suggestions & Ride Pooling**

- Enhanced shared vehicle suggestion algorithm seamlessly connects with the new routing planner to suggest `Eco Friendly` overlaps (matched via capacity, coordinate overlaps, and route trajectory).

### **3. Enhanced Approval & Budget Boundaries**

- **Project Status Checks**: Absolute constraints applied to requests depending on the project status (`ACTIVE`, `TAKE_OFF`, `COMPLETED`, `CLOSED`). For example, "Take-off" status strictly checks the `project_start_date` before unlocking submission paths.
- **Zero/Low Budget Blocking**: Instant rejection algorithms active when assigned WBS job internal budgets are at 0 or below threshold.
- **Cost Centre Standardization**: Division selection and Cost Centre IDs standardized for specific non-job categories (e.g. Sales, Promotional items).

### **4. Robust Error Logging Architecture**

- Dedicated error logging files were added globally across the forms processing pipeline tracking detailed exceptions.

### **5. Driver Registration Automation Flow**

- Added comprehensive `Driver Registration` interfaces (Admin facing and Standalone), tracking detailed account mappings, driver profiles, and file-upload-verified documents.

---

## 🚀 Key Updates in Handoff Documentation (Feb 24, 2026)

### **1. Company Vehicle Registration — Full Overhaul**

The vehicle registration flow has been completely redesigned to support **Company** vs. **Vendor** vehicle differentiation with document management.

#### **Registration Type Selection**

- Before filling any form, the user now selects between:
  - **Company Vehicle**: Company-owned asset. Requires full legal documentation.
  - **Vendor Vehicle**: External/third-party hired vehicle. Simpler form, no document requirements.
- **Implementation**: `VehicleRegister.tsx` renders a type-selection splash screen first (`registrationType === 'NONE'`), then conditionally shows the appropriate form fields.

#### **Company-Specific Form Fields**

The following fields are shown **only** when `registrationType === 'COMPANY'`:

| Field               | Type        | Purpose                                                           |
| :------------------ | :---------- | :---------------------------------------------------------------- |
| `boot_capacity`     | Text        | Luggage space (e.g., "420L"). Stored in `attributes` JSON.        |
| `fuel_type`         | Select      | Petrol / Diesel / Electric / Hybrid. Stored in `attributes` JSON. |
| `revenue_licence`   | File + Date | Upload file + expiry date. Stored in `Vehicle.documents`.         |
| `emission_report`   | File + Date | Upload file + expiry date. Stored in `Vehicle.documents`.         |
| `insurance`         | File + Date | Upload file + expiry date. Stored in `Vehicle.documents`.         |
| `registration_book` | File + Date | Upload file + expiry date. Stored in `Vehicle.documents`.         |

#### **FormData Submission**

- The frontend builds a `FormData` object (not JSON) and sends it with `Content-Type: multipart/form-data`.
- `vehicleService.ts` detects `FormData` instances and sets the header automatically.

#### **Backend Document Storage Model**

The `Vehicle` model now has a `documents` field (`DataType.JSON`) that stores:

```json
{
  "revenue_licence": {
    "path": "uploads/vehicle_docs/...",
    "expiry": "2027-01-15"
  },
  "emission_report": {
    "path": "uploads/vehicle_docs/...",
    "expiry": "2026-08-30"
  },
  "insurance": { "path": "uploads/vehicle_docs/...", "expiry": "2027-03-01" },
  "registration_book": { "path": "uploads/vehicle_docs/...", "expiry": null }
}
```

### **2. Backend Route Middleware — Multer Integration for Vehicles**

The vehicle POST/PUT routes in `backend/src/routes/index.ts` now use the `driverUpload.fields(...)` Multer middleware to handle document uploads:

```typescript
router.post(
  "/vehicles",
  authenticateToken,
  authorizeRole(["ADMIN", "TRANSPORT"]),
  driverUpload.fields([
    { name: "revenue_licence", maxCount: 1 },
    { name: "emission_report", maxCount: 1 },
    { name: "insurance", maxCount: 1 },
    { name: "registration_book", maxCount: 1 },
  ]),
  createVehicle,
);
```

The same pattern applies to `PUT /vehicles/:id`.

### **3. Vehicle List — Ownership Badges**

`VehicleList.tsx` now displays an ownership badge on each vehicle card:

- **Company** vehicles show a dark badge with a `Building2` icon.
- **Vendor** vehicles show a blue badge with a `Briefcase` icon.
- Implemented using inline conditional class logic for `vehicle.ownership`.

### **4. Controller Updates (`vehicleController.ts`)**

- `createVehicle` now:
  - Reads `req.files` via a `MulterRequest` interface.
  - Stores document paths + expiry dates into the `documents` JSON field.
  - Parses `attributes` from JSON string if sent as `FormData`.
  - Merges `boot_capacity` and `fuel_type` into `attributes` from the request body.
- `updateVehicle` now:
  - Merges new uploads with existing `documents` object, only replacing changed docs.
  - Deletes old files from disk if a document is replaced.
  - Calls `vehicle.changed('documents', true)` to force Sequelize to detect the JSON mutation.

---

## 🚀 Key Updates in Handoff Documentation (Feb 05, 2026)

### **1. Staff Workspace Enhancements**

- **Draft Recovery**: `localStorage` logic for complex Material Requests to prevent data loss.
  - _Technical Note_: Every 1 second, form state is cached to `material_request_draft`. Recovery prompt triggers on mount.
- **Transparency**: Latest rejection/return reasons displayed directly in request list view.
  - _Technical Note_: Fetches latest `Approval` comment for `REJECTED`/`RETURNED` statuses.
- **UX Tracking**: **Visual Status Stepper** for real-time lifecycle visibility.
  - _Technical Note_: `StatusStepper.tsx` maps ENUM status to a 5-step UI.

### **2. Return Trip Engine (Linked Requests)**

- **Parent-Child Request Relationship**: New relationship using `parent_id` and `is_return_leg`.
- **Backend Automation**: Transactional creation in `requestController.ts` where Pickup ↔ Drop is mirrored for the return leg.

### **3. Database Schema Changes**

- **Updated `VehicleRequest` fields**: `parent_id`, `is_return_leg`, `return_date`, `return_time`.

### **4. Process Hygiene**

- **"Past is Dead" (Auto-Expiry)**: Expired unallocated requests auto-move to `EXPIRED`.
- **"4:30 PM Cutoff" (Hard Enforcement)**: Backend rejects requests after configurable daily cutoff.
- **"Inbox Zero" Decline**: Officers can `DECLINE` requests with a mandatory reason.

---

## 👥 Detailed User Workflows & Operational Logic

### **0. Setup & Prerequisites (New Developer Info)**

- **OpenRouteService API**: Requires an API key for route calculation.
  - **Get Key**: [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
  - **Configure**: Add `ORS_API_KEY=your_key` to `backend/.env`.
  - **Safety**: If missing, system gracefully degrades — disables route-path logic and logs a warning instead of crashing.

### **1. The Requester (Staff Member)**

_Goal: To book a vehicle for official travel (Passenger) or goods transport (Material)._

#### **Workflow A: Creating a New Request**

1.  **Login**: User logs in to the Staff Dashboard.
2.  **Select Type**: Chooses "Passenger Vehicle" or "Material Vehicle".
3.  **Fill Form**:
    - **DateTime**: Selects travel date and time.
    - **Locations**: Uses the **Map/Autocomplete** to select `Pickup` and `Drop` points.
      - _System Action_: Frontend immediately checks backend (`RouteService`) for "Shared Ride" opportunities using the Date/Time/Location.
    - **Ride Sharing (The "Pool" Feature)**:
      - If a match is found, user sees "Available Shared Vehicles" card and can join.
    - **Passenger Info**: Enters count, names, contact info.
4.  **Draft Auto-Save (Material Requests)**:
    - _Mechanism_: Every 1 second, form state is saved to `localStorage` (`material_request_draft`).
5.  **Linked Return Leg**:
    - If "Return Trip" is checked, user enters **Return Date & Time**.
    - _Backend Logic_: Creates **Request A** (Outbound) and auto-creates **Request B** (Return) with swapped locations, linked via `parent_id`.
6.  **Submit**:
    - **Scenario 1 (New Trip)**: Status → `PENDING_COORDINATOR`.
    - **Scenario 2 (Joined Shared Ride)**: Status → `PROVISIONALLY_ALLOCATED`.

#### **Workflow B: Monitoring & Transparency**

1.  **Visual Stepper**: 5-Step Progress Bar (`You` -> `Coordinator` -> `HOD` -> `Transport` -> `Ready`).
2.  **Rejection/Return Transparency**: Reason shown directly under status badge in red italics.

---

### **2. The Division Coordinator**

_Goal: To verify legit requests from their division before HOD review._

1.  Sees `PENDING_COORDINATOR` requests for their Division.
2.  **Verify** → Status: `PENDING_HOD` | **Return** → Status: `RETURNED`.
3.  **Route Optimization (Merge)**: Can cluster nearby requests and propose a shared vehicle.
    - Effect: Requests are tagged with `merge_group_id` and `proposed_vehicle_type_id`.

---

### **3. The Head of Department (HOD)**

_Goal: Budgetary and high-level approval._

1.  **Approve** → `APPROVED` | **Reject** → `REJECTED`.
2.  The HOD does _not_ assign vehicles — only validates trip necessity.

---

### **4. The Transport Officer (Admin/Transport)**

_Goal: Fleet Management & Logistics Optimization._

#### **Fleet / Vehicle Management**

- **Register Vehicle**: Navigate to `Register Vehicle`.
  - **Step 1**: Choose **Company Vehicle** (full form with docs) or **Vendor Vehicle** (simple form).
  - **Step 2**: Fill in Vehicle Number, Category (from VehicleType list).
  - **Step 3 (Company Only)**: Fill Boot Capacity, Fuel Type.
  - **Step 4**: Fill dynamic attributes for the selected vehicle type.
  - **Step 5**: Assign a Driver (optional).
  - **Step 6 (Company Only)**: Upload legal documents + expiry dates.
  - **Step 7**: Set Initial Status and submit.
- **Vehicle List**: Fleet visible with ownership badges (Company/Vendor).

#### **Workflow A: Allocating a New Request**

1.  Navigates to **Allocations Page** or **Dashboard**.
2.  On allocation, system creates **ONE `Trip` record**; all requests in a group are tagged `trip_id`.
3.  Cannot fulfill? Hit **Decline** (requires reason, triggers user notification).

#### **Workflow B: Route Optimization (Global Merge)**

1.  Uses the **Transport Route Optimization** page.
2.  Can combine requests from different departments into one trip.

---

### **5. The Driver**

_Goal: Execute the trip._

1.  Logs in to see "My Allocations".
2.  **Start Trip** → `ON_GOING` | **Complete Trip** → `COMPLETED`.

---

## 🧩 Feature Logic Deep Dive

### **Ride Sharing Algorithm (`RouteService.ts`)**

- **Trigger**: `PassengerForm` input changes.
- **Checks**: Time Window (±60 min), Capacity (`seating_capacity` minus current passengers), Location (Turf.js, 3km radius).
- **Data Storage**: `pickup_lat/lng` and `drop_lat/lng` columns on `passenger_details` for fast queries.

### **Coordinator Route Optimization**

- **Algorithmic Logic (`RouteService.findPendingOverlaps`)**:
  - **Time Check**: Requests within **15 minutes** of each other.
  - **Route Check**: Pickup AND Drop within **3km Radius**.
  - **En-Route Check**: Pickup/Drop within **2km** of another request's route path.

### **Performance Architecture: The "Smart Cache"**

- **Problem**: Real-time scanning was O(n²) geospatial math on every load.
- **Solution**: Event-Driven caching. On request Create/Update, `RouteService.scanAndCache` fires as a background job, writing to `RideShareSuggestion` table. Dashboard reads from this table — 0-latency.

### **Process Hygiene & "Inbox Zero" Philosophy**

1.  **"Past is Dead" (Auto-Expiry)**: Requests where `Date < Today` and not `ALLOCATED/COMPLETED` → moved to `EXPIRED`.
2.  **"4:30 PM Cutoff"**: Configurable via `system_configs`. Requests after cutoff are hard-blocked by backend.
3.  **"Inbox Zero" Decline**: Officers can decline unresolvable requests with a mandatory reason.

---

## 🏗 Data Integrity & Scalability: The "Merge" Lifecycle

### **"Soft Merge" Strategy**

- **Concept**: We do NOT combine requests into one record during planning.
- **Mechanism**: Shared `merge_group_id` tag applied to individual `VehicleRequest` rows.
- **Benefit**: Fully reversible; no data overwritten.

### **Approval Chain**

- **Coordinator**: Creates `merge_group_id` (Proposal).
- **HOD**: Approves the group → updates ALL request statuses to `APPROVED`.
- **Transport Officer**: Can super-merge across departments by updating `merge_group_id`.

### **Execution (One Vehicle, Multiple Allocations)**

- One `Allocation` row per request, all sharing same `vehicle_id`/`driver_id`.
- Enables per-department cost allocation (e.g., 30% IT, 70% HR).

---

## 📅 Recent Change Log (For Context)

| Date             | Component                  | Details                                                                                                                                                                                                    |
| :--------------- | :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mar 04, 2026** | **PassengerForm**          | Fully integrated `Google Maps` for tracking stops, distances, and generating `Shared Rides`. Added comprehensive Project Status limits (`TAKE_OFF`/`ACTIVE`) and immediate blocking on `Zero-Budget` Jobs. |
| **Mar 04, 2026** | **Backend Infrastructure** | Tracked comprehensive Error Logging functionality. Supported divisions configured strictly as DB Objects.                                                                                                  |
| **Feb 27, 2026** | **Driver Registration**    | Developed fully-fledged Driver Registration flow components supporting profile details, documentation capture, and specific assigned vehicle classifications.                                              |
| **Feb 24, 2026** | **Vehicle Model**          | Added `documents` (JSON) field to store document file paths and expiry dates. Added `ownership` (ENUM: COMPANY/VENDOR).                                                                                    |
| **Feb 24, 2026** | **Backend Controller**     | `createVehicle` & `updateVehicle` now handle Multer file uploads, parse `attributes` from JSON string, and persist documents.                                                                              |
| **Feb 24, 2026** | **Backend Routes**         | `/vehicles` POST and PUT routes now include `driverUpload.fields(...)` middleware for multipart/form-data support.                                                                                         |
| **Feb 24, 2026** | **vehicleService.ts**      | `createVehicle` service function now accepts `FormData` and sets `Content-Type: multipart/form-data` automatically.                                                                                        |
| **Feb 24, 2026** | **VehicleRegister.tsx**    | Full registration flow redesign: split into Company vs. Vendor type selection. Company form adds Boot Capacity, Fuel Type, and 4 document upload cards with expiry date pickers.                           |
| **Feb 24, 2026** | **VehicleList.tsx**        | Added Company/Vendor ownership badge to each vehicle card using `Building2` and `Briefcase` icons.                                                                                                         |
| **Feb 05, 2026** | **Merge Workflow**         | Changed Coordinator Merge to "Proposal" (`PENDING_HOD`). Added `merge_group_id` and `proposed_vehicle_id` to `VehicleRequest`.                                                                             |
| **Feb 05, 2026** | **Transport UI**           | Added `TransportRouteOptimization` dashboard for Global Merging and Final Allocation.                                                                                                                      |
| **Feb 05, 2026** | **Routing Logic**          | Enhanced `RouteService` to support **En-Route Pickups** (Point-to-Path distance check) using Turf.js.                                                                                                      |
| **Feb 05, 2026** | **Infrastructure**         | Added **OpenRouteService (ORS) API** for real-time route geometry. Added strict API key validation and safe failure modes.                                                                                 |
| **Feb 05, 2026** | **Performance**            | Implemented **Event-Driven Caching** (`RideShareSuggestion`) to move O(N²) clustering logic to background jobs.                                                                                            |
| **Feb 05, 2026** | **Architecture**           | **Resolved "Trip Entity Gap"**. Introduced `Trip` model as master entity for merged groups.                                                                                                                |
| **Feb 05, 2026** | **Process Hygiene**        | Implemented **"Past is Dead" (Auto-Expiry)**, **"Inbox Zero" (Manual Decline)**, and **"4:30 PM Cutoff"** enforcement.                                                                                     |
| **Feb 05, 2026** | **Staff UX**               | Added **Material Draft Recovery** (LocalStorage). Implemented **Rejection Reason Visibility** in request lists.                                                                                            |
| **Feb 05, 2026** | **Logic**                  | Implemented **Linked Return Trips**. Automated creation of return leg with swapped locations via `parent_id`.                                                                                              |
| **Feb 05, 2026** | **UI/UX**                  | Added **Visual Status Stepper** component for granular request lifecycle tracking.                                                                                                                         |
| **Feb 04, 2026** | **DB Schema**              | Added `seating_capacity` (INT) to Vehicle. Added `pickup/drop_lat/lng` (FLOAT) to passenger_details.                                                                                                       |
| **Feb 04, 2026** | **Backend**                | Refactored `RouteService` with new columns and real-time capacity math.                                                                                                                                    |
| **Feb 04, 2026** | **Frontend**               | Updated `PassengerForm` with auto-search for sharing. Added `CoordinatorRouteOptimization` page.                                                                                                           |

---

## ⚠️ System Critique & Architectural Recommendations (Feb 2026 Audit)

### **1. Remaining Pain Points**

- **Notification Fatigue**: In-app notifications are easily missed.
  - _Impact_: HODs delay approvals due to lack of visibility.
  - _Fix_: **Must implement Email/SMS notifications** immediately.
- **Document Expiry Alerts**: Vehicle documents (Insurance, Revenue Licence, etc.) are now stored with expiry dates, but no automated alert system exists.
  - _Fix_: Implement a background job that alerts Transport Officers when docs are nearing expiry (e.g., 30 days before).

### **2. Architectural Blind Spots (Engineering)**

- **Asset vs. Reality Mismatch**:
  - System checks database `availability_status` only — it does not know if a vehicle is physically in the garage.
  - _Recommendation_: Integrate a **Maintenance Calendar** module that hard-locks vehicles during service windows.
- **Driver & License Validation**:
  - We currently trust the seed data for `allowed_vehicle_type_ids`.
  - _Recommendation_: Add license expiration checks and validation logic.

### **3. UI/UX Consolidations**

- **Dashboard Redundancy**: `TransportDashboard` and `TransportAllocation` pages have overlapping functionality.
  - _Recommendation_: Convert `TransportAllocation` into a sub-tab of the Dashboard.

---

## 🔮 Future Roadmap

1.  **Document Expiry Notifications**: Email/in-app alerts when vehicle documents are approaching expiry.
2.  **Email Notifications**: SMTP emails for approval/allocation/rejection events.
3.  **Return Trip Automation**: Automatically book return legs based on drop time.
4.  **Maintenance Calendar**: Hard-lock vehicles during scheduled service windows.
5.  **Driver License Expiry Tracking**: Add license expiry field and validation logic.
