
# Transport Management System (TMS)

A comprehensive, map-centric web application designed to streamline vehicle request management, route planning, and fleet allocation within an organization. This system supports both **Passenger** and **Material** transport requests with an advanced geospatial interface.

## 🚀 Key Features

### 1. Interactive Map-Based Routing ("Route Planner")
*   **Unified Interface**: Pickup, Drop-off, and multiple Intermediate Stops can be selected directly on an interactive map.
*   **Smart Features**:
    *   **Live Location**: One-click "Use My Location" using browser Geolocation API.
    *   **Autocomplete Search**: "Search-as-you-type" for locations (powered by Photon/Komoot), optimized for Sri Lanka.
    *   **Route Visualization**: Real-time rendering of the route path on the map.
    *   **Automatic Metrics**: Instantly calculates and displays **Total Distance (km)** and **Duration (mins)**.

### 2. Request Management Workflow
*   **Role-Based Access**:
    *   **Requesters**: Submit trips for People or Materials.
    *   **Coordinators**: Review and approve departmental requests.
    *   **HODs (Head of Dept)**: Final approval authority.
    *   **Transport Division**: Allocate vehicles and drivers.
*   **Advanced Logic**:
    *   **Overlap Detection**: Automatically suggests "Ride Sharing" opportunities if a new request's route overlaps with an existing approved trip (using Turis.js).
    *   **Email/System Notifications**: Real-time alerts for status changes.

### 3. Fleet & User Management
*   **Vehicle Registry**: Manage fleet details, types (Car, Van, Lorry), and capacities.
*   **Driver Management**: Track driver assignments and details.
*   **User Roles**: Admin, Coordinator, HOD, Requester, Driver.

---

## 🛠 Technology Stack

### Frontend
*   **Framework**: React (Vite)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Maps**: Leaflet (via `react-leaflet`)
*   **Icons**: Lucide React
*   **State/API**: Axios, React Router

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Language**: TypeScript
*   **Database**: MariaDB (with Spatial/Geometric data support)
*   **ORM**: Sequelize
*   **Geospatial Analysis**: Turf.js (for overlap/distance calculations)

### External APIs & Services
The application leverages several open-source and free-tier geospatial APIs. **Please be aware of their usage policies.**

1.  **OpenStreetMap (OSM) / Nominatim**:
    *   *Usage*: Reverse Geocoding (getting address from coordinates) and Location Search.
    *   *Limit*: Max 1 request per second. strictly no bulk scraping.
2.  **Photon (by Komoot)**:
    *   *Usage*: Search Autocomplete/Autosuggest.
    *   *Limit*: Free for fair use.
3.  **OpenRouteService (ORS)**:
    *   *Usage*: Backend calculation of precise route geometry, distance, and duration for database storage.
    *   *Limit*: Generous free tier (e.g., 2,000 directions/day), but requires an API Key for production.
4.  **OSRM Demo Server**:
    *   *Usage*: Frontend visual route preview (drawing the blue line instantly).
    *   *Limit*: Demo server with no SLA; recommended to switch to ORS or self-hosted OSRM for heavy production use.

---

## ⚠️ Important Considerations & Limitations

1.  **API Rate Limits**:
    *   The map features rely on free public APIs. If the application scales to many concurrent users, you may hit rate limits (Status 429).
    *   **Solution**: For High-Scale Production, consider getting a paid plan for OpenRouteService or self-hosting OSRM and Photon.

2.  **Environment Variables**:
    *   Ensure your `.env` file in the backend contains a valid `ORS_API_KEY` for the `RouteService` to function correctly during request submission.
    *   Frontend routing uses the public OSRM demo server by default.

3.  **Data Attribution**:
    *   Since the app uses OpenStreetMap data, you must retain the "© OpenStreetMap contributors" attribution on the map interface.

## 🏁 Getting Started

### Prerequisites
*   Node.js (v16+)
*   MariaDB (v10.5+)

### Installation

1.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Configure .env with DB credentials and ORS_API_KEY
    npm run dev
    ```

2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Database**:
    *   Ensure the MariaDB instance is running.
    *   The application (Sequelize) will auto-sync tables on startup.
