# Cloud9 — SIH26002 Logistics Intelligence Platform
## Complete Master Documentation & System Specification

> **Project Name:** Cloud9 — Logistics Intelligence & Landslide-Aware Supply Chain Platform  
> **Problem Statement Code:** SIH26002 (Smart India Hackathon)  
> **Target Region:** North Eastern Region (NER), India (Focus: Dima Hasao, Assam & Barail Hill Range)  
> **Documentation Version:** 2.0 (Complete System Audit & Feature Implementation Guide)  
> **Generated:** September 2026  

---

## Table of Contents

1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [Master Feature Catalog & Implementation Mechanics](#4-master-feature-catalog--implementation-mechanics)
   - [4.1 Executive Dashboard](#41-executive-dashboard-dashboard)
   - [4.2 Route Planner & GPS Navigation HUD](#42-route-planner--gps-navigation-hud-route-planner)
   - [4.3 Critical Road Segments & Graph Bridge Analysis](#43-critical-road-segments--graph-bridge-analysis-critical-roads)
   - [4.4 Meteorological Forecast & Rainfall Risk](#44-meteorological-forecast--rainfall-risk)
   - [4.5 Alerts & Early Warning Notification Center](#45-alerts--early-warning-notification-center-alerts)
   - [4.6 Fleet & Vehicle Tracking Management](#46-fleet--vehicle-tracking-management-vehicles)
   - [4.7 Road Network Inventory & Condition Monitoring](#47-road-network-inventory--condition-monitoring-roads)
   - [4.8 Field Incident Logging & Emergency Reporting](#48-field-incident-logging--emergency-reporting-incidents)
   - [4.9 Relief & Supply Consignment Deliveries](#49-relief--supply-consignment-deliveries-deliveries)
   - [4.10 Regional Districts Intelligence](#410-regional-districts-intelligence-districts)
   - [4.11 Multi-Role Authentication System](#411-multi-role-authentication-system-login)
   - [4.12 Field Officer Registration](#412-field-officer-registration-register-officer)
   - [4.13 Vehicle Operator Registration](#413-vehicle-operator-registration-register-operator)
   - [4.14 Admin Approval Portal](#414-admin-approval-portal-adminapprovals)
   - [4.15 System Configuration & Settings](#415-system-configuration--settings-settings)
   - [4.16 User Account Details & Session Profile](#416-user-account-details--session-profile-account)
5. [Special & Unique Innovations (Deep Dive)](#5-special--unique-innovations-deep-dive)
6. [API Specification & Endpoint Reference](#6-api-specification--endpoint-reference)
7. [Feature Health & Working Status Matrix](#7-feature-health--working-status-matrix)
8. [Setup, Execution & Deployment Guide](#8-setup-execution--deployment-guide)
9. [Environment Variables Reference](#9-environment-variables-reference)

---

## 1. Executive Summary & Problem Statement

### 1.1 Context & Problem
India's North Eastern Region (NER), particularly hill districts such as Dima Hasao, Cachar, Karbi Anglong, and East Khasi Hills, experiences severe disruptions during the monsoon season. Heavy precipitation triggers recurring landslides, mudslides, and slope instability, cutting off vital arterial corridors (like NH-27, NH-40, and SH-18). 

Standard commercial navigation systems (e.g., Google Maps) optimize purely for the shortest distance or standard traffic congestion, failing to factor in:
1. **Landslide Susceptibility:** Slope gradients, elevation shifts, geological instability, and real-time precipitation.
2. **Topological Criticality:** Road segments that act as topological "bridges" (single points of failure) whose blockage leaves entire villages or settlements isolated with zero alternative detours.
3. **Emergency Logistics Coordination:** Multi-stakeholder coordination between Emergency Command Admins, Field Officers inspecting road slips, and Logistics Operators delivering relief consignments.

### 1.2 The Cloud9 Solution
**Cloud9** is an AI-driven, geospatial logistics intelligence platform tailored for mountainous terrains. It integrates:
- **Machine Learning Landslide Susceptibility Model** trained on Digital Elevation Models (SRTM DEM 30m) and historical landslide events.
- **Graph-Theoretic Network Analysis** using NetworkX to identify cut-edges (critical bridges) and measure settlement isolation impacts.
- **Dynamic Terrain-Aware Route Optimization** with turn-by-turn navigation, waypoint hazard scoring, and automated rerouting upon GPS deviation.
- **Multi-Role Role-Based Access Control (RBAC)** governing administrative authority, field inspection logs, and driver navigation.

---

## 2. Complete Technology Stack

| Layer | Technology | Version | Purpose & Responsibilities |
|---|---|---|---|
| **Frontend Framework** | React | `^19.2.8` | Component-based reactive UI rendering, hooks, state management |
| **Frontend Build Tool** | Vite | `^8.2.2` | Rapid HMR, modern bundling, proxying `/api` requests to backend |
| **Routing** | React Router DOM | `^7.18.3` | Client-side routing, protected routes, role-based route guards |
| **Map & GIS Engine** | Leaflet | `^1.9.4` | Interactive mobile-friendly map rendering and tile layers |
| **Map React Bindings** | React-Leaflet | `^5.0.0` | React wrapper for Leaflet layers, markers, polylines, popups |
| **Routing Machine** | Leaflet Routing Machine | `^3.2.12` | Waypoint routing integration with OSRM |
| **Data Visualization** | Recharts | `^3.10.1` | Analytical charts for district vulnerability, risk trends, metrics |
| **UI Iconography** | Lucide React | `^1.41.0` | High-fidelity icons for logistics, vehicles, alerts, navigation |
| **Notifications** | React Hot Toast | `^2.6.0` | Non-intrusive toast notifications for reroutes, alerts, approvals |
| **Styling & Theme** | Vanilla CSS3 | Standard | Custom Blue-White palette, responsive CSS Grid/Flexbox, anti-dark-inversion shields |
| **Backend Runtime** | Node.js | v18+ | High-performance asynchronous JavaScript server runtime |
| **Web Framework** | Express | `^5.1.0` | REST API routes, middleware pipeline, error handling |
| **Security & Headers** | Helmet | `^8.1.0` | HTTP security headers, XSS prevention, MIME sniffing protection |
| **Cross-Origin** | CORS | `^2.8.5` | Managed origin access for frontend cross-communication |
| **Authentication** | JSON Web Tokens | `^9.0.2` | Stateless cryptographic session tokens with role claims |
| **Password Hashing** | BcryptJS | `^3.0.2` | Secure salt-and-hash storage for user passwords |
| **Cookie Handling** | Cookie-Parser | `^1.4.7` | Signed cookie extraction and session management |
| **External Weather API** | Open-Meteo API | v1 (REST) | Live rainfall and hourly precipitation forecasts (no API key needed) |
| **Geocoding API** | OSM Nominatim | v1 (REST) | Forward and reverse geocoding for NER settlements and landmarks |
| **Risk Engine Microservice** | FastAPI (Python) | `^0.110.0` | High-speed ASGI Python API for real-time ML risk inference |
| **ASGI Web Server** | Uvicorn | `^0.28.0` | Lightning-fast asynchronous server for FastAPI |
| **Machine Learning** | Scikit-learn | `^1.4.0` | Random Forest Classifier for landslide susceptibility |
| **Geospatial Rasters** | Rasterio | `^1.3.9` | GeoTIFF reading, affine coordinate transformations, pixel sampling |
| **Graph Theory** | NetworkX | `>=3.0` | Road network topology, bridge identification, cut-vertex isolation |
| **Vector GIS** | Shapely & GeoPandas | `^2.0` / `^0.14` | Geometric calculations, line-buffer intersections, spatial queries |
| **OSM Data Extraction** | Pyrosm | `^0.6.2` | Parsing `.pbf` OpenStreetMap extracts into topological graphs |

---

## 3. System Architecture & Data Flow

```
                                  +---------------------------------------+
                                  |            CLIENT BROWSER             |
                                  |  React 19 + Vite + React-Leaflet Map  |
                                  |       (Runs on Port 5173/5174)        |
                                  +-------------------+-------------------+
                                                      |
                                                      | Requests: /api/* (Vite Proxy)
                                                      v
                                  +---------------------------------------+
                                  |          EXPRESS 5 BACKEND            |
                                  |        (Runs on Port 1710)            |
                                  +---------+-------------------+---------+
                                            |                   |
            +-------------------------------+                   +-------------------------------+
            |                               |                                                   |
            v                               v                                                   v
+-----------------------+       +-----------------------+                           +-----------------------+
|  METEOROLOGICAL API   |       |  TOPOLOGY & PRECOMP   |                           |   PYTHON RISK ENGINE  |
|      Open-Meteo       |       |  critical_roads.json  |                           |     FastAPI (:8000)   |
| (6h & 24h Rain Cache) |       |  (9 Bridge Segments)  |                           |  RandomForest + DEM   |
+-----------------------+       +-----------------------+                           +-----------------------+
                                                                                                |
                                                                                    +-----------+-----------+
                                                                                    |                       |
                                                                                    v                       v
                                                                            +---------------+       +---------------+
                                                                            |    DEM.tif    |       | landslide_    |
                                                                            |  (SRTM 30m)   |       |   model.pkl   |
                                                                            +---------------+       +---------------+
```

### 3.1 Network Communication Flow
1. **Zero-CORS Proxy Architecture:** The frontend calls relative endpoints (e.g. `/api/vehicles`). Vite's development server proxies all `/api` traffic internally to `http://localhost:1710`.
2. **Resilient Microservice Fallback:** When the frontend requests `/api/landslide/risk`, the backend calls FastAPI on `:8000`. If FastAPI is not running or unreachable, the backend gracefully catches the error and returns a deterministic, heuristic-based terrain risk score. The user interface never crashes.
3. **In-Memory Caching:** External calls to Open-Meteo for rainfall forecasting are cached in a backend in-memory LRU store keyed by rounded coordinates with a 30-minute Time-To-Live (TTL).

---

## 4. Master Feature Catalog & Implementation Mechanics

### 4.1 Executive Dashboard (`/dashboard`)
* **Purpose:** Serves as the mission-critical command cockpit for dispatchers and administrators, displaying live KPIs, high-level road status, immediate weather conditions, and actionable alerts.
* **Component File:** `frontend/vite-project/src/pages/Dashboard.jsx`
* **Backend Endpoints:**
  - `GET /api/vehicles`
  - `GET /api/roads`
  - `GET /api/incidents`
  - `GET /api/deliveries`
  - `GET /api/alerts`
  - `GET /api/forecast-risk`
* **Implementation Details:**
  - **KPI Metric Cards:** Aggregates real-time stats (Active Vehicles, Blocked Roads, Open Incidents, Active Deliveries).
  - **Interactive GIS Map:** Leaflet map centered at `[25.1, 92.9]` displaying color-coded road segments (Red = Blocked, Orange = Restricted, Green = Open).
  - **Live Weather Widget:** Queries current rainfall and 24-hour accumulation for Haflong (Dima Hasao epicenter).
  - **Recent Incidents & Alerts Feed:** Ticker showing real-time hazard reports with quick-action acknowledge buttons.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.2 Route Planner & GPS Navigation HUD (`/route-planner`)
* **Purpose:** End-to-end multi-modal routing engine that plots the safest paths avoiding landslide hotspots, displays an elevation/risk profile, provides turn-by-turn instructions, tracks live GPS, and auto-reroutes upon deviation.
* **Component File:** `frontend/vite-project/src/pages/RoutePlanner.jsx`
* **Backend & External Endpoints:**
  - `GET /api/geocode?q=...` (OpenStreetMap Nominatim proxy)
  - `GET https://router.project-osrm.org/route/v1/driving/...` (OSRM turn-by-turn routing)
  - `GET /api/landslide/risk?lat=...&lon=...` (Point risk evaluation)
* **Implementation Details:**
  - **Geocoding:** Converts text queries (e.g., "Haflong", "Silchar", "Jatinga") into coordinates.
  - **OSRM Pathfinding:** Retrieves route geometry and maneuver steps.
  - **Route Risk Scoring:** Samples points along the polyline, evaluates landslide probability, and calculates a cumulative safety score:
    $$\text{Score} = \text{Distance (km)} \times 0.2 + (\% \text{High Risk Stretch}) \times 2.0$$
  - **High-Risk Hotspot Overlay:** Renders red dashed `CircleMarker` badges directly over hazardous stretches on the map polyline.
  - **Live GPS & Off-Route Rerouting:** Subscribes to browser `navigator.geolocation.watchPosition`. If the vehicle strays further than 80 meters from the polyline for 3 consecutive GPS updates, an automatic recalculation triggers from the user's current coordinates.
  - **Turn-by-Turn HUD:** Full-screen driving mode with audio/visual maneuver cards (distance remaining, next turn, estimated time of arrival).
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.3 Critical Road Segments & Graph Bridge Analysis (`/critical-roads`)
* **Purpose:** Discovers single-point-of-failure roads in the NER network where a single blockage leaves towns and villages entirely isolated from the national grid.
* **Component File:** `frontend/vite-project/src/pages/CriticalRoads.jsx`
* **Backend Endpoint:** `GET /api/critical-roads`
* **Risk Engine Script:** `risk-engine/scripts/critical_roads.py`
* **Precomputed Dataset:** `risk-engine/data/critical_roads.json`
* **Implementation Details:**
  - **Graph Algorithm:** Uses `networkx.bridges(G)` to locate cut-edges in the regional transportation graph.
  - **Settlement Isolation Evaluation:** Removes each bridge edge sequentially, computes connected components, and counts the number of settlements detached from the primary component.
  - **UI Visualization:**
    - Left column: Table sorted descending by the count of isolated settlements.
    - Right column: Interactive map highlighting the critical segment, drawing connecting rays to isolated settlements, and animating a smooth `flyTo` camera transition upon clicking any row.
* **Working Status:** ✅ **Fully Functional & Verified Fine (Precomputed dataset contains 9 verified critical corridors).**

---

### 4.4 Meteorological Forecast & Rainfall Risk
* **Purpose:** Computes immediate (6-hour) and near-term (24-hour) landslide disruption probabilities driven by cumulative rainfall forecasts.
* **Component Usage:** Integrated across `Dashboard.jsx`, `RoutePlanner.jsx`, and standalone query hooks.
* **Backend Endpoint:** `GET /api/forecast-risk?lat={lat}&lon={lon}`
* **Implementation Details:**
  - Connects to Open-Meteo's precipitation models (`hourly=rain`).
  - Aggregates hourly precipitation into rolling 6-hour and 24-hour windows.
  - Classifies rainfall thresholds into categorical hazard levels:
    - $> 20\text{ mm} \rightarrow$ **Very High Risk**
    - $> 10\text{ mm} \rightarrow$ **High Risk**
    - $> 5\text{ mm} \rightarrow$ **Moderate Risk**
    - $\le 5\text{ mm} \rightarrow$ **Low Risk**
  - Evaluates risk velocity (`rising`, `falling`, `stable`).
  - Implements a 30-minute in-memory cache to prevent upstream rate-limiting.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.5 Alerts & Early Warning Notification Center (`/alerts`)
* **Purpose:** Real-time dispatch feed broadcasting emergency warnings, landslide events, road closures, and flash flood alerts to field units.
* **Component File:** `frontend/vite-project/src/pages/Alerts.jsx`
* **Backend Endpoints:**
  - `GET /api/alerts`
  - `POST /api/alerts` (Create manual alert)
  - `PATCH /api/alerts/:id/acknowledge` (Acknowledge alert)
* **Implementation Details:**
  - Filterable by severity tag: `Critical`, `Warning`, `Advisory`, `Info`.
  - Displays affected road names, timestamp, source (Sensor, Field Officer, ML Model).
  - Acknowledge button updates the in-memory state and records the officer's acknowledgment timestamp.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.6 Fleet & Vehicle Tracking Management (`/vehicles`)
* **Purpose:** Manages relief vehicles, supply trucks, ambulances, and emergency bulldozers operating across NER districts.
* **Component File:** `frontend/vite-project/src/pages/Vehicles.jsx`
* **Backend Endpoints:**
  - `GET /api/vehicles`
  - `POST /api/vehicles`
  - `PATCH /api/vehicles/:id`
* **Implementation Details:**
  - Inventory tracking: Plate Number, Vehicle Type (4x4 Truck, Light Van, Heavy Tipper), Capacity (Tons), Assigned Driver, Current Fuel/Battery.
  - Status badges: `Active`, `In-Transit`, `Under Maintenance`, `Idle`.
  - Modal dialog to register and update fleet properties with real-time state synchronization.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.7 Road Network Inventory & Condition Monitoring (`/roads`)
* **Purpose:** Real-time catalog of all surveyed highway and arterial segments across the hill region.
* **Component File:** `frontend/vite-project/src/pages/Roads.jsx`
* **Backend Endpoints:**
  - `GET /api/roads`
  - `POST /api/roads`
  - `PATCH /api/roads/:id`
* **Implementation Details:**
  - Records road identifier, highway classification (NH-27, NH-40, State Highway), length (km), terrain vulnerability rating, and operational status (`Open`, `Restricted - Light Vehicles Only`, `Blocked - Landslide Clearance In Progress`).
  - Instant status update modal to toggle road availability when slips occur.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.8 Field Incident Logging & Emergency Reporting (`/incidents`)
* **Purpose:** Crowd-sourced and officer-verified field hazard reporting tool for instant incident dispatch.
* **Component File:** `frontend/vite-project/src/pages/Incidents.jsx`
* **Backend Endpoints:**
  - `GET /api/incidents`
  - `POST /api/incidents`
  - `PATCH /api/incidents/:id`
* **Implementation Details:**
  - Logs incident type: `Landslide`, `Rockfall`, `Mudslide`, `Road Collapse`, `Flash Flood`.
  - Captures exact coordinates, severity level, affected road, estimated clearance duration, and assigned clearance crew.
  - Provides instant filtering between active and resolved emergency cases.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.9 Relief & Supply Consignment Deliveries (`/deliveries`)
* **Purpose:** End-to-end dispatch and cargo tracking for food grains, medical supplies, water purification kits, and fuel consignments.
* **Component File:** `frontend/vite-project/src/pages/Deliveries.jsx`
* **Backend Endpoints:**
  - `GET /api/deliveries`
  - `POST /api/deliveries`
  - `PATCH /api/deliveries/:id`
* **Implementation Details:**
  - Tracks origin warehouse to destination relief camp.
  - Links assigned vehicle and driver.
  - Flags delivery vulnerability based on the route's current landslide risk score.
  - Status progression: `Scheduled` $\rightarrow$ `Dispatched` $\rightarrow$ `In-Transit` $\rightarrow$ `Delivered` / `Delayed`.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.10 Regional Districts Intelligence (`/districts`)
* **Purpose:** Analytical overview of the 8 NER administrative zones with vulnerability comparisons and relief asset readiness.
* **Component File:** `frontend/vite-project/src/pages/Districts.jsx`
* **Implementation Details:**
  - Statistical cards for districts: Dima Hasao, Cachar, Karbi Anglong, Hailakandi, Karimganj, East Khasi Hills, West Jaintia Hills, Papum Pare.
  - Displays population, active road kilometers, recorded landslides in the last 36 months, and emergency contact numbers for district disaster management authorities (DDMA).
  - Recharts integration displaying comparative risk indexes.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.11 Multi-Role Authentication System (`/login`)
* **Purpose:** Secure authentication gateway protecting sensitive logistical operations with Role-Based Access Control (RBAC).
* **Component File:** `frontend/vite-project/src/pages/Login.jsx`
* **Backend Endpoints:**
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
* **Implementation Details:**
  - Supports 3 roles:
    1. `ADMIN`: Full administrative control, system settings, user approval authorization.
    2. `FIELD_OFFICER`: Road inspection updates, incident creation, alert acknowledgment.
    3. `VEHICLE_OPERATOR`: Turn-by-turn navigation, route execution, vehicle status updates.
  - Uses bcrypt password verification and returns signed JWT tokens.
  - Features quick-fill demo buttons for instantaneous testing (`admin / admin123`, `OFC-1042 / officer123`, `VOP-2317 / operator123`).
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.12 Field Officer Registration (`/register-officer`)
* **Purpose:** Self-registration portal for district field inspectors and disaster response officers.
* **Component File:** `frontend/vite-project/src/pages/RegisterFieldOfficer.jsx`
* **Backend Endpoint:** `POST /api/auth/register-officer`
* **Implementation Details:**
  - Gated navigation: Accessible only via direct links or Admin credentials.
  - Captures Officer ID, Name, Assigned District, Official Email, Mobile Number, and Password.
  - Automatically enqueues new accounts into the `PENDING` approval queue.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.13 Vehicle Operator Registration (`/register-operator`)
* **Purpose:** Onboarding portal for commercial logistics drivers and emergency vehicle operators.
* **Component File:** `frontend/vite-project/src/pages/RegisterVehicleOperator.jsx`
* **Backend Endpoint:** `POST /api/auth/register-operator`
* **Implementation Details:**
  - Captures Driver License Number, Vehicle Registration, Operator Name, Contact, and Password.
  - Enqueues accounts as `PENDING` until an administrator reviews and approves credentials.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.14 Admin Approval Portal (`/admin/approvals`)
* **Purpose:** Restricted administrative console to verify and authorize pending registrations for officers and operators.
* **Component File:** `frontend/vite-project/src/pages/AdminApprovals.jsx`
* **Backend Endpoints:**
  - `GET /api/auth/pending` (or `/api/auth/pending-approvals`)
  - `PATCH /api/auth/users/:userId/approve`
  - `PATCH /api/auth/users/:userId/reject`
* **Implementation Details:**
  - Protected by `AdminRoute` wrapper; unauthorized roles are redirected.
  - Displays pending cards with badge ID, role requested, timestamp, and credentials.
  - One-click approval updates user status to `active`, granting immediate login privileges.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.15 System Configuration & Settings (`/settings`)
* **Purpose:** Operational parameter controls allowing dispatchers to tune alert sensitivity and routing thresholds.
* **Component File:** `frontend/vite-project/src/pages/Settings.jsx`
* **Backend Endpoints:**
  - `GET /api/settings`
  - `PATCH /api/settings`
* **Implementation Details:**
  - Configurable properties:
    - Rainfall Alert Trigger Threshold (default: $15\text{ mm}/24\text{h}$)
    - Route Risk Sensitivity (Conservative vs Balanced vs Fast)
    - Off-Route Rerouting Sensitivity (Meters deviation)
    - Emergency SMS/Push Alert Dispatches
  - Changes persist immediately to backend memory.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

### 4.16 User Account Details & Session Profile (`/account`)
* **Purpose:** Displays logged-in user profile, role badge, permissions summary, and session management.
* **Component File:** `frontend/vite-project/src/pages/AccountDetails.jsx`
* **Backend Endpoint:** `GET /api/auth/me`
* **Implementation Details:**
  - Renders user metadata, assigned sector, security claims, and a one-click session termination (logout) trigger.
* **Working Status:** ✅ **Fully Functional & Verified Fine.**

---

## 5. Special & Unique Innovations (Deep Dive)

### 5.1 Graph-Theoretic Critical Road Detection (NetworkX Bridges)
Traditional routing platforms identify bottlenecks solely by traffic congestion. In remote mountainous areas, roads carry zero traffic congestion yet remain hyper-critical because their failure physically isolates human settlements.
* **Algorithm:**
  1. Construct undirected planar graph $G = (V, E)$ where vertices $V$ represent settlement nodes and road junctions, and edges $E$ represent road segments.
  2. Compute bridge edges $B = \{e \in E \mid G \setminus \{e\} \text{ has strictly more connected components than } G\}$.
  3. For every bridge edge $e = (u, v)$, compute the size of the disconnected component:
     $$\text{Isolation Impact}(e) = \min(|C_u|, |C_v|)$$
     where $C_u$ and $C_v$ are the partitioned settlement sets.
  4. Segments are ranked descending by $\text{Isolation Impact}$.

### 5.2 Dynamic Landslide Susceptibility Model (DEM + Random Forest)
* **Dataset:** 30-meter Shuttle Radar Topography Mission (SRTM) DEM clipped to Dima Hasao, Assam.
* **Feature Extraction:**
  - **Slope:** First derivative of elevation surface ($\tan \theta = \sqrt{f_x^2 + f_y^2}$).
  - **Aspect:** Direction of maximum slope steepness.
  - **Plan & Profile Curvature:** Second derivatives indicating acceleration and divergence of surface runoff.
  - **Distance to Road Network:** Euclidean distance transform from vectorized OSM highways.
  - **Antecedent Rainfall:** 24-hour and 72-hour precipitation accumulation.
* **Model:** Scikit-learn `RandomForestClassifier` outputting probability of slope failure $P(\text{landslide} \mid \mathbf{x}) \in [0, 1]$.

### 5.3 Automated Off-Route GPS Re-Routing
* While in navigation mode, the application tracks `(lat, lon)` from the device's hardware GPS.
* Every tick computes the Haversine distance from the user position to every coordinate vertex on the active polyline:
  $$d = 2R \arcsin \left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos \phi_1 \cos \phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
* If $\min(d) > 80\text{ meters}$ across 3 consecutive readings, an off-route condition is triggered, and a non-blocking reroute request is sent to OSRM using the current GPS fix as the new origin.

### 5.4 Curated Blue-White Professional UI Design System
* Completely custom CSS architecture located in `frontend/vite-project/src/index.css`.
* Uses harmonious primary blues (`#1e40af`, `#2563eb`, `#3b82f6`), crisp white/slate card backgrounds (`#ffffff`, `#f8fafc`), and high-contrast text (`#0f172a`).
* Features hardware-level anti-inversion shields (`forced-color-adjust: none`, `-webkit-filter: none !important`) ensuring crisp light-mode readability across all modern browsers.

---

## 6. API Specification & Endpoint Reference

| Method | Endpoint Path | Auth Required | Request Body / Query | Success Response Structure |
|---|---|---|---|---|
| `GET` | `/health` | No | None | `{ success: true, message: "Backend is healthy" }` |
| `POST` | `/api/auth/login` | No | `{ userId, password }` | `{ success: true, token, user: { id, name, role, email } }` |
| `GET` | `/api/auth/me` | Yes (JWT) | None | `{ success: true, user }` |
| `POST` | `/api/auth/logout` | No | None | `{ success: true, message: "Logged out" }` |
| `POST` | `/api/auth/register-officer` | Admin/Public | `{ officerId, name, district, email, password }` | `{ success: true, user: { ..., status: "pending" } }` |
| `POST` | `/api/auth/register-operator` | Admin/Public | `{ operatorId, name, vehicleNo, email, password }` | `{ success: true, user: { ..., status: "pending" } }` |
| `GET` | `/api/auth/users` | Admin | None | `{ success: true, users: [...] }` |
| `GET` | `/api/auth/pending` | Admin | None | `{ success: true, users: [...] }` |
| `PATCH` | `/api/auth/users/:userId/approve` | Admin | None | `{ success: true, user: { ..., status: "active" } }` |
| `PATCH` | `/api/auth/users/:userId/reject` | Admin | None | `{ success: true, message: "User rejected" }` |
| `GET` | `/api/vehicles` | Yes | None | `{ success: true, vehicles: [...], total }` |
| `POST` | `/api/vehicles` | Yes | `{ plate, type, capacity, driver, status }` | `{ success: true, vehicle: { ... } }` |
| `PATCH` | `/api/vehicles/:id` | Yes | Partial vehicle fields | `{ success: true, vehicle: { ... } }` |
| `GET` | `/api/roads` | Yes | None | `{ success: true, roads: [...], total }` |
| `POST` | `/api/roads` | Yes | `{ name, number, condition, risk, status }` | `{ success: true, road: { ... } }` |
| `PATCH` | `/api/roads/:id` | Yes | Partial road fields | `{ success: true, road: { ... } }` |
| `GET` | `/api/incidents` | Yes | None | `{ success: true, incidents: [...], total }` |
| `POST` | `/api/incidents` | Yes | `{ type, road, severity, lat, lon, description }` | `{ success: true, incident: { ... } }` |
| `PATCH` | `/api/incidents/:id` | Yes | Partial incident fields | `{ success: true, incident: { ... } }` |
| `GET` | `/api/deliveries` | Yes | None | `{ success: true, deliveries: [...], total }` |
| `POST` | `/api/deliveries` | Yes | `{ origin, destination, vehicle, items, status }` | `{ success: true, delivery: { ... } }` |
| `PATCH` | `/api/deliveries/:id` | Yes | Partial delivery fields | `{ success: true, delivery: { ... } }` |
| `GET` | `/api/alerts` | Yes | None | `{ success: true, alerts: [...], total }` |
| `POST` | `/api/alerts` | Yes | `{ title, message, severity, road }` | `{ success: true, alert: { ... } }` |
| `PATCH` | `/api/alerts/:id/acknowledge` | Yes | None | `{ success: true, alert: { ..., acknowledged: true } }` |
| `GET` | `/api/critical-roads` | Yes | None | `{ success: true, criticalRoads: [...], total, source }` |
| `GET` | `/api/forecast-risk` | Yes | `?lat=...&lon=...` | `{ success: true, current_risk, forecast_24h, rainfall_24h_mm, trend }` |
| `GET` | `/api/landslide/risk` | Yes | `?lat=...&lon=...` | `{ success: true, risk_score, risk_level }` |
| `POST` | `/api/route-risk` | Yes | `{ waypoints: [...] }` | `{ success: true, overallRisk, riskScore, recommendation }` |
| `GET` | `/api/geocode` | Yes | `?q=...` | `[ { lat, lon, display_name } ]` |
| `GET` | `/api/settings` | Yes | None | `{ success: true, settings: { ... } }` |
| `PATCH` | `/api/settings` | Yes | Partial settings object | `{ success: true, settings: { ... } }` |

---

## 7. Feature Health & Working Status Matrix

| Module / Feature | Route / Interface | Verified Status | Operating Mode & Resiliency Details |
|---|---|---|---|
| **Executive Dashboard** | `/dashboard` | ✅ Working 100% | Full live data aggregation, KPIs, Leaflet map, and live weather. |
| **Route Planner & HUD** | `/route-planner` | ✅ Working 100% | Nominatim geocoding, OSRM routing, risk dots overlay, GPS tracking, and rerouting. |
| **Critical Road Segments** | `/critical-roads` | ✅ Working 100% | Precomputed 9 bridge segments loaded from `critical_roads.json`; fallback mock available. |
| **Weather & Rainfall Forecast** | `/forecast-risk` | ✅ Working 100% | Live Open-Meteo precipitation API with 30-min cache and local fallback. |
| **Alerts & Warnings** | `/alerts` | ✅ Working 100% | Live filtering, creation, and acknowledgment tracking. |
| **Fleet / Vehicles CRUD** | `/vehicles` | ✅ Working 100% | In-memory persistence, status updates, filtering, and add-vehicle modal. |
| **Roads Network CRUD** | `/roads` | ✅ Working 100% | Road segment status toggling and hazard classification. |
| **Incident Logging** | `/incidents` | ✅ Working 100% | Severity categorization, coordinates tagging, and status updating. |
| **Deliveries Tracking** | `/deliveries` | ✅ Working 100% | Origin-destination assignment and transit status monitoring. |
| **Districts Analytics** | `/districts` | ✅ Working 100% | Comparative graphs, district metrics, and contact directory. |
| **User Authentication** | `/login` | ✅ Working 100% | JWT session creation, role verification, and demo account presets. |
| **Officer Registration** | `/register-officer` | ✅ Working 100% | Submission validation with pending status assignment. |
| **Operator Registration** | `/register-operator` | ✅ Working 100% | Submission validation with pending status assignment. |
| **Admin Approvals** | `/admin/approvals` | ✅ Working 100% | Route-guarded approval console; patches user status to active. |
| **System Settings** | `/settings` | ✅ Working 100% | Threshold controls persisted via PATCH `/api/settings`. |
| **Account Details** | `/account` | ✅ Working 100% | User session profile inspection and logout. |
| **Risk Engine Microservice** | `:8000/predict` | ⚠️ Standalone Service | Optional Python FastAPI service. If offline, the backend seamlessly falls back to terrain heuristics without crashing. |

---

## 8. Setup, Execution & Deployment Guide

### 8.1 Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python (Optional for local ML inference):** v3.9+ with `venv`

### 8.2 Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/dipti-2211/Cloud9.git
cd Cloud9

# 2. Install all root, backend, and frontend dependencies
npm run install:all
```

### 8.3 Starting the Development Server
```bash
# Starts both Backend (:1710) and Frontend (:5173) concurrently:
npm run dev
```

The application will be accessible at:
- **Web Application:** `http://localhost:5173`
- **Backend API:** `http://localhost:1710`
- **API Health Check:** `http://localhost:1710/health`

### 8.4 (Optional) Running the Python Risk Engine
```bash
cd risk-engine
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Copy dataset assets from repository root
cp ../datasets/DEM.tif data/
cp ../datasets/landslide_model.pkl data/

# Start FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```

### 8.5 Default Demonstration Credentials

| Role | User Identifier | Password | Access Level |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | Full Access + Approvals + Settings |
| **Field Officer** | `OFC-1042` | `officer123` | Road Status, Incidents, Alerts |
| **Vehicle Operator** | `VOP-2317` | `operator123` | Route Planner, HUD Navigation, Vehicle Status |

---

## 9. Environment Variables Reference

Create a file named `.env` inside the `backend/` directory:

```env
# Server Port Configuration
PORT=1710

# Database Configuration (Optional - in-memory fallback enabled)
MONGO_URL=mongodb://127.0.0.1:27017/ner_logistics

# Cryptographic Secret for JWT Signing
JWT_SECRET=supersecretjwtkey_ner_logistics_2026

# Seed Administrative User
ADMIN_USER_ID=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@example.com

# Allowed Client Origin
FRONTEND_URL=http://localhost:5173

# Python Risk Engine Microservice Address
RISK_ENGINE_URL=http://localhost:8000
```

---

*Cloud9 — Empowering resilient supply chains and life-saving logistics in the North Eastern Region.*
