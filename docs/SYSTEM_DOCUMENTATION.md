# 🚀 Transport Management System (TMS) 2.0 - Comprehensive Documentation

A sophisticated, geospatial-driven enterprise resource planning (ERP) module designed for high-efficiency fleet management, automated trip planning, and precise financial tracking of transport operations.

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Project Structure](#-project-structure)
4. [Database Schema (Models)](#-database-schema-models)
5. [Functional Modules & Business Logic](#-functional-modules--business-logic)
6. [API Reference Overview](#-api-reference-overview)
7. [Frontend Overview](#-frontend-overview)
8. [External Integrations](#-external-integrations)
9. [Installation & Setup](#-installation--setup)

---

## 1. Project Overview

### **Core Purpose**
The **Transport Management System (TMS) 2.0** is an enterprise-grade ERP module designed to digitize and optimize the transport logistics of a large organization. It replaces manual booking logs with a high-integrity, geospatial-driven platform that handles everything from the initial request to the final financial settlement of a journey.

### **The Problem It Solves**
*   **Manual Inefficiency**: Eliminates paper-based request forms and manual route planning.
*   **Underutilized Assets**: Uses spatial algorithms to suggest ride-sharing, reducing the number of vehicles on the road.
*   **Compliance Risks**: Tracks legal document expiry (Insurance, Revenue Licenses) for company vehicles to ensure the fleet is always road-legal.
*   **Financial Leakage**: Automates fuel adjustment calculations based on market price volatility, ensuring vendors/drivers are paid accurately based on real-time data and vehicle efficiency.
*   **Lack of Visibility**: Provides a "Visual Status Stepper" so staff can see exactly where their request is in the approval pipeline (Staff -> Coordinator -> HOD -> Transport).

### **User Personas & Workflows**
1.  **Requesters (Staff)**: Create Passenger or Material requests using map-based tools. Features like "Draft Recovery" and "Linked Return Trips" simplify high-volume bookings.
2.  **Coordinators**: Act as the first line of validation. They use "Route Optimization" tools and "Ride-Sharing Suggestions" to merge overlapping requests.
3.  **HODs (Head of Department)**: Provide final fiscal approval. They verify budget availability (WBS Job IDs) and the business necessity of trips.
4.  **Transport Division**: The "Allocators". They match approved requests to the best available `Vehicle` and `Driver`, managing the physical fleet inventory.
5.  **Drivers**: Use the system to log trip progress, update odometer readings (Start/End KM), and report occurrences, which directly feeds into the payment processing logic.

### **Strategic Rules & Constraints**
*   **"Past is Dead"**: Unallocated requests auto-expire past their travel date to maintain system hygiene.
*   **"4:30 PM Cutoff"**: Hard backend enforcement prevents late-day requests for the following morning, ensuring Transport Admins have stable schedules.
*   **"Budget Boundaries"**: Real-time checking of project statuses (`ACTIVE`, `TAKE_OFF`, `COMPLETED`, `CLOSED`) to allow or block requests based on project lifecycle.

---

## 2. System Architecture

### **Core Technology Stack**
*   **Backend**: Node.js v22+ with Express.js and TypeScript.
*   **Frontend**: React 19 (Vite) with TypeScript, Tailwind CSS, and Framer Motion.
*   **Database**: MariaDB/MySQL 10.5+ with Sequelize-TypeScript ORM.
*   **Geospatial**: Google Maps API (V3), Turf.js (Spatial analysis), and OpenRouteService.
*   **Notifications**: Web Push (VAPID) and SMTP (Nodemailer).

---

## 3. Project Structure

### **Backend (`/backend`)**
*   `src/index.ts`: Application entry point, server & database initialization.
*   `src/controllers/`: Business logic implementations (e.g., `requestController.ts`, `tripEntryController.ts`).
*   `src/models/`: Sequelize-TypeScript entities defining the relational schema.
*   `src/routes/`: Express router definitions mapping endpoints to controllers.
*   `src/services/`: Reusable logic for complex tasks (e.g., `GoogleRouteService.ts`, `RideMatchingService.ts`).
*   `src/middleware/`: JWT Auth, Role-based access control (RBAC), and File Upload (Multer) logic.
*   `src/utils/`: Generic utilities like mailers and SMS connectors.

### **Frontend (`/frontend`)**
*   `src/pages/`: Main view components (Dashboard, Request Management, Approvals).
*   `src/components/`: Reusable UI components (Shared Maps, Status Timelines, Modals).
*   `src/services/`: Axios-based API client wrappers.
*   `src/context/`: Global state management for authentication and notifications.
*   `src/types/`: Centralized TypeScript interfaces matching backend models.

---

## 4. Database Schema (Models)

### **Key Entities**
1.  **`User`**: Core identity model.
    *   Fields: `employee_id`, `name`, `email`, `account_type` (HRIS/LOCAL), `role_id`, `division_id`, `sub_division_id`.
2.  **`VehicleRequest`**: The central transaction record.
    *   Fields: `request_type` (PASSENGER/MATERIAL), `status`, `purpose`, `is_return_leg`, `wbs_job_id`.
    *   Status Flow: `PENDING_COORDINATOR` -> `PENDING_HOD` -> `APPROVED` -> `ALLOCATED` -> `ON_GOING` -> `COMPLETED`.
3.  **`Vehicle`**: Fleet inventory.
    *   Fields: `vehicle_number`, `vehicle_type_id`, `assigned_driver_id`, `ownership` (COMPANY/VENDOR), `attributes` (JSON), `documents` (JSON).
4.  **`TransportPackage`**: The pricing engine.
    *   Fields: `package_category` (PER_KM/MONTHLY/DAILY), `base_amount`, `extra_km_rate`, `fuel_efficiency`.
5.  **`TripEntry`**: Financial closure logs.
    *   Fields: `start_km`, `end_km`, `total_km`, `fuel_adjustment`, `ot_hours`, `final_amount`.
6.  **`FuelType`**: Market price tracking.
    *   Fields: `current_price` (Trip Baseline), `new_price` (Adjustment Marker).

---

## ⚙️ Functional Modules & Business Logic

### **1. Geospatial & Map Logic**
*   **Route Planner**: Interactive map allowing selection of pickup, multiple stops, and drop-off.
*   **Automatic Calculation**: Real-time fetching of distance (KM) and estimated duration using Google Directions API.
*   **Reverse Geocoding**: Converts map pins into human-readable addresses via Google Maps.

### **2. Ride-Sharing Suggestion Engine**
*   **Algorithm**: When a new request is submitted, the system uses **Turf.js** to check for spatial overlaps between the new route and existing approved trips within the same time window.
*   **Factors**: Seating capacity, coordinate proximity, and time window overlap.

### **3. Approval Hierarchy**
*   **Coordinator**: Initial review, verifies route efficiency and budget.
*   **HOD (Head of Department)**: Final fiscal authority for department requests.
*   **Transport Admin**: Final vehicle and driver allocation after HOD approval.

### **4. Cost Calculation & Fuel Adjustment**
*   **Package Categories**:
    *   `PER_KM`: Strictly distance-based pricing.
    *   `MONTHLY`/`DAILY`: Base fee + extra KM rate.
*   **Calculated Fuel Adjustment**:
    `Adjustment = ((Current Market Price - Package Baseline Price) / Vehicle Efficiency) * Total KM`

---

## 🔌 API Reference Overview

| Endpoint | Method | Role Allowed | Description |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Public | Authenticate and return JWT token. |
| `/auth/verify-otp` | `POST` | Public | Verify OTP for first-time account setup. |
| `/requests` | `POST` | STAFF/COORDINATOR | Submit a new transport request. |
| `/requests/:id/approve` | `POST` | HOD/CEO | Approve a pending request. |
| `/requests/suggest-matches` | `GET` | COORDINATOR | Find ride-sharing opportunities. |
| `/trip-entries` | `POST` | TRANSPORT/DRIVER | Create a daily log entry for a trip. |
| `/fuel-types` | `PUT` | ADMIN | Update global fuel prices to trigger adjustments. |

---

## 🎨 Frontend Overview

### **Core Pages**
*   **Dashboard**: Role-specific analytics and quick actions.
*   **Create Request**: Multi-step form with integrated Google Maps.
*   **Allocation Panel**: Drag-and-drop or select interface for matching requests to vehicles.
*   **Approval Inbox**: List view for HODs/Coordinators to review and action requests.

### **Services Layer**
*   Uses a centralized `api.ts` for intercepting requests and attaching JWT headers.
*   Service modules: `vehicleService`, `requestService`, `userService`, etc.

---

## 🌐 External Integrations

1.  **Google Maps Platform**:
    *   `Maps JavaScript API`: Visual interface.
    *   `Places API`: Autocomplete addressing.
    *   `Directions API`: Route and distance matrix.
2.  **Web Push Notifications**:
    *   Uses `web-push` library with VAPID keys to send real-time browser alerts.
3.  **Photon (Komoot)**:
    *   Backup/Internal search utility for reverse geocoding.

---

## 9. Installation & Setup

### **Prerequisites**
*   Node.js (LTS recommended)
*   MariaDB or MySQL
*   Google Maps API Key with enabled Maps/Places/Directions services.

### **Step-by-Step**
1.  **Clone Repository**:
    ```bash
    git clone <repository-url>
    ```
2.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Copy .env.example to .env and fill in:
    # DB_HOST, DB_NAME, DB_USER, DB_PASS, JWT_SECRET, GOOGLE_MAPS_API_KEY
    npm run sync # Initializes database tables
    npm run seed # (Optional) Pre-loads roles and default admin
    npm run dev
    ```
3.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    # Ensure vite.config.ts or .env has correct backend VITE_API_URL
    npm run dev
    ```

---

## 📜 Future Roadmap
*   **Mobile App PWA**: Full offline support for drivers in remote areas.
*   **AI Route Optimization**: Advanced sequencing for multi-drop material deliveries.
*   **Telematics Integration**: Real-time GPS tracking for active vehicles.

---
*Documentation Version: 2.0.0 (May 2026)*
*Authorized by Development Team*
