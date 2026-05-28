# 🌟 TMS 2.0: Deep Technical Reference

This document provides a low-level technical deep-dive into the Transport Management System (TMS) 2.0 architecture, logic flows, and state management.

---

## 🔐 1. Authentication & Security (RBAC)

### **JWT Strategy**
*   **Token Issuance**: Handled in `authController.ts` using `jsonwebtoken`.
*   **Structure**: Payload includes `userId`, `email`, `role`, and `divisionId`.
*   **Verification**: `authenticateToken` middleware verifies the `Authorization: Bearer <token>` header against the `JWT_SECRET`.
*   **RBAC**: The `authorizeRole(['ROLE_NAME'])` middleware performs case-insensitive role checks.
    *   *Special Case*: `ADMIN` role overrides most division-level restrictions.

### **Account Types**
*   **HRIS**: Federated accounts synced from the organization's Human Resource Information System.
*   **LOCAL**: Managed internally within TMS (typically for specific vendors or non-employee drivers).

---

## 🧠 2. The Logic Engines

### **A. Geospatial Ride-Sharing (`RideMatchingService`)**
TMS identifies "Eco-Friendly overlaps" using **Cluster Matching**:
1.  **Temporal Filter**: Only trips for the target `date` in `PLANNED` or `ON_GOING` status.
2.  **Capacity Check**: 
    `Available Seats = Vehicle.seating_capacity - SUM(PassengerDetails.no_of_passengers)`
3.  **Spatial Proximity**: Uses `Turf.js` to calculate the distance between coordinates.
    *   **Proximity Rule**: `Match = (Distance(New_Pickup, Existing_Trip_Pickups) <= 3km) AND (Distance(New_Drop, Existing_Trip_Drops) <= 3km)`.

### **B. Financial Processing (`tripEntryController`)**
The "Fuel Adjustment" is the core financial innovation of TMS 2.0. It accounts for price fluctuations between the booking date and the execution date.

**Calculation Logic:**
```typescript
const fuelConsumption = Number(transportPackage.fuel_efficiency);
const currentPrice = Number(fuelType.current_price); // Labeled New Price in UI (The real-time market price)
const baselinePrice = Number(fuelType.new_price);     // Labeled Previous Price in UI (The price defined in the logic)

fuelAdjustment = ((currentPrice - baselinePrice) / fuelConsumption) * totalKm;
```

---

## 📊 3. State Machine: Request Lifecycle

| Status | Trigger | Description |
| :--- | :--- | :--- |
| `PENDING_COORDINATOR` | Staff Submission | Waiting for initial division-level checking. |
| `PENDING_HOD` | Coordinator Verification | Budget and technical validation completed. |
| `APPROVED` | HOD Approval | Legally/Financially cleared. |
| `ALLOCATED` | Transport Admin | Specific vehicle and driver are hard-assigned. |
| `ON_GOING` | Driver Start | Trip is physically in progress. |
| `COMPLETED` | Trip Entry Save | Journey finished and KM logged. |
| `RETURNED` | Rejection (Any level) | Sent back to staff for corrections. |
| `EXPIRED` | System Cron Job | Unallocated request date has passed. |

---

## 🛠 4. Database Mutations & Handling

### **Sequelize JSON Mutations**
The `Vehicle` model uses a `DataType.JSON` column for `attributes` and `documents`.
*   **Change Detection**: Since JSON is a reference type, Sequelize often misses internal mutations. We force detection using:
    `instance.changed('fieldName', true);`

### **Spatial Storage**
*   Locations are stored as discrete `LAT` and `LNG` `DECIMAL` fields for high-precision arithmetic (up to 8 decimal places) rather than standard MySQL `POINT` types, ensuring maximum compatibility across different SQL environments.

---

## 📡 5. Notifications Architecture

### **Web-Push (VAPID)**
*   Provides real-time browser alerts even when the tab is closed.
*   **Workflow**:
    1.  Frontend requests browser permission.
    2.  Token stored in `PushSubscription` model linked to `userId`.
    3.  Backend uses `web-push` to trigger notifications on status changes.

---

## 🚀 6. Performance & Scale

### **Query Optimization**
*   Uses `Op.like` for fuzzy search on license plates and names.
*   Aggressive `include` patterns in Sequelize to prevent N+1 query problems during allocation list rendering.

---
*Last Updated: May 2026*
