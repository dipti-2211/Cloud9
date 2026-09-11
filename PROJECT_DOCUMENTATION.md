# Cloud9 — NER Logistics & Disaster Management Platform
## Master Technical Specification & Complete Feature Architecture

> **System Name:** Cloud9 — AI-Driven Logistics Intelligence & Landslide-Aware Supply Chain Platform  
> **Smart India Hackathon Code:** SIH26002  
> **Geographic Focus:** North Eastern Region (NER), India (Assam, Meghalaya, Arunachal Pradesh, Manipur, Nagaland, Mizoram, Tripura, Sikkim)  
> **Core Hill Corridors:** Dima Hasao, Barail Hill Range, NH-27, NH-06, NH-10, NH-2, SH-5, SH-37  
> **Platform Version:** 3.0 (Production Release & Full System Audit)  
> **Document Status:** Comprehensive Master Reference (Frontend, Backend, Risk Engine, ML Algorithms, Database & Live Features)

---

## Table of Contents

1. [Executive Summary & Problem Domain](#1-executive-summary--problem-domain)
2. [Complete Technology Stack](#2-complete-technology-stack)
   - [2.1 Frontend Architecture & Dependencies](#21-frontend-architecture--dependencies)
   - [2.2 Backend Architecture & Dependencies](#22-backend-architecture--dependencies)
   - [2.3 Python Risk Engine & Geospatial Pipeline](#23-python-risk-engine--geospatial-pipeline)
   - [2.4 Database & Persistence Layer](#24-database--persistence-layer)
   - [2.5 External Services & Hardware Interfaces](#25-external-services--hardware-interfaces)
3. [System Architecture & Communication Flow](#3-system-architecture--communication-flow)
   - [3.1 Architecture Overview Diagram](#31-architecture-overview-diagram)
   - [3.2 Real-Time Event & WebSocket Lifecycle](#32-real-time-event--websocket-lifecycle)
   - [3.3 Reverse Proxy & Zero-CORS Gateway](#33-reverse-proxy--zero-cors-gateway)
4. [Risk Engine & Multi-Factor Risk Analysis (%) Deep Dive](#4-risk-engine--multi-factor-risk-analysis--deep-dive)
   - [4.1 Machine Learning Model Specifications](#41-machine-learning-model-specifications)
   - [4.2 Feature Extraction Pipeline (DEM & Rasters)](#42-feature-extraction-pipeline-dem--rasters)
   - [4.3 Dynamic Single-Point Risk Calculation (%)](#43-dynamic-single-point-risk-calculation-)
   - [4.4 Multi-Factor Resilient Fallback Engine](#44-multi-factor-resilient-fallback-engine)
   - [4.5 Route Risk Analysis (%) & Multi-Point Sampling](#45-route-risk-analysis--multi-point-sampling)
   - [4.6 Graph-Theoretic Critical Bridges & Settlement Isolation Index](#46-graph-theoretic-critical-bridges--settlement-isolation-index)
   - [4.7 AI Vision & Field Photo Hazard Classification](#47-ai-vision--field-photo-hazard-classification)
5. [Exhaustive Feature & Page Catalog](#5-exhaustive-feature--page-catalog)
   - [5.1 Multi-Role Authentication & Access Control (`/login`)](#51-multi-role-authentication--access-control-login)
   - [5.2 Executive Command Center Dashboard (`/` & `/dashboard`)](#52-executive-command-center-dashboard--dashboard)
   - [5.3 Interactive GIS Map Panel (`/map`)](#53-interactive-gis-map-panel-map)
   - [5.4 Route Planner & Turn-by-Turn GPS Navigation HUD (`/route-planner`)](#54-route-planner--turn-by-turn-gps-navigation-hud-route-planner)
   - [5.5 Emergency Incident Management & Map Inspector (`/incidents`)](#55-emergency-incident-management--map-inspector-incidents)
   - [5.6 Field Officer Incident Reporting & Geo-Tagging (`/incident-report`)](#56-field-officer-incident-reporting--geo-tagging-incident-report)
   - [5.7 Early Warning Notification & Regional Alert Center (`/alerts`)](#57-early-warning-notification--regional-alert-center-alerts)
   - [5.8 Fleet Tracking & Live Vehicle Telemetry (`/vehicles`)](#58-fleet-tracking--live-vehicle-telemetry-vehicles)
   - [5.9 Master Personnel Management Hub (`/personnel`)](#59-master-personnel-management-hub-personnel)
   - [5.10 Field Officer Self-Registration (`/register-officer`)](#510-field-officer-self-registration-register-officer)
   - [5.11 Vehicle Operator Onboarding (`/register-operator`)](#511-vehicle-operator-onboarding-register-operator)
   - [5.12 Critical Road Segments & Network Isolation (`/critical-roads`)](#512-critical-road-segments--network-isolation-critical-roads)
   - [5.13 Road Network Inventory & Condition Tracker (`/roads`)](#513-road-network-inventory--condition-tracker-roads)
   - [5.14 Relief & Medical Consignment Deliveries (`/deliveries`)](#514-relief--medical-consignment-deliveries-deliveries)
   - [5.15 Regional Districts Intelligence & DDMA Directory (`/districts`)](#515-regional-districts-intelligence--ddma-directory-districts)
   - [5.16 System Parameter Settings & Sensitivity Controls (`/settings`)](#516-system-parameter-settings--sensitivity-controls-settings)
   - [5.17 User Profile & Security Session (`/account`)](#517-user-profile--security-session-account)
   - [5.18 Global Emergency Audio Siren & Alert Modal (`IncidentAlertModal`)](#518-global-emergency-audio-siren--alert-modal-incidentalertmodal)
   - [5.19 Top Navigation Bar & Global Status Bar (`Navbar`)](#519-top-navigation-bar--global-status-bar-navbar)
   - [5.20 Role-Gated Adaptive Navigation Drawer (`Sidebar`)](#520-role-gated-adaptive-navigation-drawer-sidebar)
6. [Personnel System, Role Matrix & Seed Data](#6-personnel-system-role-matrix--seed-data)
   - [6.1 Role-Based Access Control (RBAC) Matrix](#61-role-based-access-control-rbac-matrix)
   - [6.2 Seeded Field Officers Catalog](#62-seeded-field-officers-catalog)
   - [6.3 Seeded Vehicle Operators Catalog](#63-seeded-vehicle-operators-catalog)
   - [6.4 Profile Avatar & Static Asset Pipeline](#64-profile-avatar--static-asset-pipeline)
7. [Database Data Models & Schema Reference](#7-database-data-models--schema-reference)
   - [7.1 User Model](#71-user-model)
   - [7.2 Vehicle Model](#72-vehicle-model)
   - [7.3 RoadIncident Model](#73-roadincident-model)
   - [7.4 RoadSegment Model](#74-roadsegment-model)
   - [7.5 RiskPrediction Model](#75-riskprediction-model)
   - [7.6 Alert Model](#76-alert-model)
   - [7.7 Delivery Model](#77-delivery-model)
   - [7.8 Road Model](#78-road-model)
   - [7.9 Incident Model](#79-incident-model)
   - [7.10 RerouteEvent Model](#710-rerouteevent-model)
   - [7.11 Setting Model](#711-setting-model)
8. [Master REST API Specification](#8-master-rest-api-specification)
9. [Installation, Environment & Execution Runbook](#9-installation-environment--execution-runbook)
   - [9.1 Prerequisites](#91-prerequisites)
   - [9.2 Step-by-Step Installation](#92-step-by-step-installation)
   - [9.3 Environment Variables Reference](#93-environment-variables-reference)
   - [9.4 Running the Python ML Microservice](#94-running-the-python-ml-microservice)
   - [9.5 Default Login Credentials](#95-default-login-credentials)

---

## 1. Executive Summary & Problem Domain

The North Eastern Region (NER) of India represents one of the world's most ecologically sensitive, geologically complex, and landslide-prone transportation zones. Mountain passes such as Dima Hasao, Cachar, Karbi Anglong, and East Khasi Hills endure extreme monsoon precipitation exceeding 2,500 mm annually. Torrential rainfall destabilizes steep, fractured shale and sandstone slopes, triggering massive debris flows, rockfalls, and road washouts along strategic economic lifelines (such as National Highway 27, National Highway 06, and National Highway 10).

### The Inherent Flaws of Conventional Navigation
Standard commercial navigation solutions (such as Google Maps or Apple Maps) fail catastrophically during mountainous monsoon emergencies because:
1. **Zero Terrain Intelligence:** Standard mapping algorithms calculate travel times strictly based on distance and vehicular congestion. They cannot factor in slope steepness, geological soil stability, or cumulative 72-hour rainfall saturation.
2. **Ignorance of Topological Bridges:** In mountain topography, certain road corridors act as graph-theoretic "cut-edges" (bridges). A single point of blockage on NH-27 isolates entire administrative sub-divisions with zero alternative detours. Standard engines simply advise impossible reroutes or leave vehicles stranded in death-trap corridors.
3. **Disconnected Emergency Stakeholders:** Disaster management authorities, field inspection officers, and commercial relief truck drivers operate in informational silos with delayed paper reports or unverified messaging groups.

### The Cloud9 Architectural Solution
**Cloud9 (SIH26002)** bridges this gap by unifying:
- **Shuttle Radar Topography Mission (SRTM) 30m Digital Elevation Models (DEM)** to extract slope, aspect, elevation, and proximity to road vectors.
- **Trained Machine Learning Models (Random Forest)** predicting landslide probability percentages ($0\% - 100\%$) based on geological slope and real-time precipitation.
- **Graph-Theoretic Topological Analysis (NetworkX)** identifying critical bridge roads whose severance cuts off human settlements.
- **Dynamic Multi-Way Route Optimization** with real-time waypoint hazard scoring, auto-reroute triggers when vehicles stray from safe paths, and turn-by-turn navigation HUDs.
- **Real-Time WebSocket Infrastructure (Socket.IO)** broadcasting instant hazard alerts with Web Audio emergency sirens, browser desktop notifications, and real-time GIS map updates.
- **Comprehensive Multi-Role Personnel Management** governing verified Field Officers and Logistics Operators with digital ID cards, live status toggling, and multi-lingual alerts.

---

## 2. Complete Technology Stack

The Cloud9 ecosystem is architected across three discrete micro-tiers: a reactive modern Single Page Application (SPA) frontend, a scalable asynchronous Express.js backend with MongoDB Atlas, and an ASGI Python microservice dedicated to geospatial raster analytics and machine learning inference.

### 2.1 Frontend Architecture & Dependencies
Located in `/frontend/vite-project`, built on React with Vite.

| Package / Module | Version | Purpose & Technical Role |
|---|---|---|
| **React** | `^18.3.1` / `^19.2.8` | Core UI engine, state reconciliation, hook pipelines (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`). |
| **Vite** | `^5.4.2` / `^8.2.2` | High-speed frontend build tool and development server running on `http://localhost:5173`. Proxies `/api` and `/uploads` to Express. |
| **React Router DOM** | `^6.26.1` / `^7.18.3` | Client-side declarative routing, nested layouts (`Outlet`), programmatic navigation (`useNavigate`), and role-based guards. |
| **Leaflet** | `^1.9.4` | High-performance interactive GIS mapping engine. Controls raster tile layers, vector overlays, custom divIcons, and coordinate transforms. |
| **React-Leaflet** | `^4.2.1` / `^5.0.0` | React wrapper binding Leaflet instances to React lifecycle (`MapContainer`, `TileLayer`, `Marker`, `Popup`, `Polyline`, `useMap`). |
| **Socket.IO Client** | `^4.7.5` | Persistent bi-directional WebSocket client (`useSocket` hook) connecting to backend port 1710 for instant event propagation. |
| **Recharts** | `^2.12.7` / `^3.10.1` | Declarative SVG charting library. Powers the horizontal incident root-cause bar charts and district vulnerability index cards. |
| **Lucide React** | `^0.439.0` / `^1.41.0` | Production iconography system providing over 40 distinct icons across logistics, geography, vehicles, hazards, and navigation. |
| **React Hot Toast** | `^2.4.1` / `^2.6.0` | Non-blocking, accessible toast notifications triggered on rerouting, incident creation, status changes, and network warnings. |
| **Web Audio API** | Native Browser API | AudioContext sound synthesizer. Generates custom dual-tone emergency sawtooth alarm sirens on critical hazard broadcasts. |
| **HTML5 Notification API** | Native Browser API | Operating system desktop notifications triggered when critical landslides or road blocks are broadcast via WebSocket. |
| **Vanilla CSS Design System** | Custom (`index.css`) | Curated Slate/Sky/Blue color tokens, CSS grid/flexbox layouts, responsive media queries, glassmorphism backdrops, anti-inversion shields. |

### 2.2 Backend Architecture & Dependencies
Located in `/backend`, built on Node.js and Express.

| Package / Module | Version | Purpose & Technical Role |
|---|---|---|
| **Node.js** | `>=18.0.0` | Non-blocking, event-driven JavaScript server runtime executing the central API and socket orchestrator. |
| **Express.js** | `^4.19.2` / `^5.1.0` | Core REST API web framework, middleware pipelines, route mounting, and HTTP request/response handling. |
| **Mongoose** | `^8.6.0` | Object Data Modeling (ODM) library for MongoDB Atlas, providing strict schema enforcement, pre-save hooks, and 2dsphere indexing. |
| **Socket.IO** | `^4.7.5` | Real-time WebSocket server mounted on the Node HTTP server. Emits hazard events to global channels and the `dashboard` room. |
| **JSON Web Tokens (JWT)** | `^9.0.2` | Stateless cryptographic authentication tokens (`jsonwebtoken`). Embedded with `userId`, `role`, and expiration timestamps. |
| **BcryptJS** | `^2.4.3` / `^3.0.2` | Cryptographic password hashing using adaptive salts (10 rounds) for secure user credential storage. |
| **Multer** | `^1.4.5-lts.1` | Multipart/form-data middleware handling photo uploads for field hazard inspection reports and personnel profile pictures. |
| **Helmet** | `^7.1.0` / `^8.1.0` | Security middleware configuring protective HTTP response headers (Content Security Policy, Cross-Origin Resource Policy, XSS protection). |
| **CORS** | `^2.8.5` | Cross-Origin Resource Sharing middleware enabling secure API access from authorized client origins. |
| **Cookie-Parser** | `^1.4.6` / `^1.4.7` | Parses cookie headers and populates `req.cookies` for session persistence. |
| **Dotenv / Dotenvx** | `^16.4.5` | Loads environment variables from `.env` into `process.env`. |
| **Google Generative AI** | `^0.1.1` (Optional) | `@google/generative-ai` SDK interfacing with Gemini 1.5/2.0 Flash for automated computer vision hazard classification of road photos. |

### 2.3 Python Risk Engine & Geospatial Pipeline
Located in `/risk-engine`, built with Python 3.9+ and FastAPI.

| Library / Tool | Version | Purpose & Technical Role |
|---|---|---|
| **FastAPI** | `^0.110.0` | High-performance ASGI web framework providing asynchronous endpoints (`/predict`, `/predict-batch`, `/health`) on port 8000. |
| **Uvicorn** | `^0.28.0` | Lightning-fast ASGI production web server managing worker processes and async request loops. |
| **Scikit-learn** | `^1.4.0` | Machine learning library executing the trained `RandomForestClassifier` (`landslide_model.pkl`) to output probability distributions. |
| **Rasterio** | `^1.3.9` | High-speed geospatial raster I/O built on GDAL. Samples elevation, slope, aspect, and road proximity from GeoTIFF rasters in memory. |
| **Xarray** | `^2024.02.0` | N-dimensional labeled array processing library used to parse multi-year precipitation NetCDF files (`RF25_indselect_rfp25.nc`). |
| **Pandas & NumPy** | `>=2.0.0` | High-speed vectorized data manipulation, feature matrix construction, and probability clipping. |
| **NetworkX** | `>=3.0` | Graph theory library used in `critical_roads.py` to identify cut-edges (`bridges`) and quantify settlement isolation impacts. |
| **Shapely & GeoPandas** | `^2.0` / `^0.14` | Geometric vector operations, line buffer intersections, and spatial coordinate reprojection. |
| **Open-Meteo REST Client** | Free REST API | Fetches live 24-hour accumulated precipitation forecasts at dynamic GPS coordinates with zero API key requirement. |

### 2.4 Database & Persistence Layer
- **MongoDB Atlas (Production Cloud Cluster):** Hosted cloud MongoDB cluster connected via encrypted URI (`mongodb+srv://.../cloud9`).
- **Mongoose ODM:** Defines 11 structured schemas: `User`, `Vehicle`, `RoadIncident`, `RoadSegment`, `RiskPrediction`, `Alert`, `Delivery`, `Road`, `Incident`, `RerouteEvent`, `Setting`.
- **Geospatial Indexing:** `2dsphere` indexes enabled on `RoadSegment.geometry` (GeoJSON LineString), `RoadIncident.location` (GeoJSON Point), and `Vehicle.currentLocation` (GeoJSON Point) allowing sub-millisecond nearest-neighbor distance queries.
- **In-Memory Fallback Mode:** The backend features graceful offline fallback caches. If MongoDB Atlas is unreachable during local testing, mock stores enable UI validation.

### 2.5 External Services & Hardware Interfaces
- **OpenStreetMap Nominatim API:** Geocoding service resolving human-readable place names ("Haflong", "Silchar", "Jatinga") to `[lat, lon]` and reverse geocoding GPS coordinates.
- **OSRM (Open Source Routing Machine):** High-speed road network routing engine generating turn-by-turn geometry, maneuver steps, distance, and duration.
- **HTML5 Geolocation Hardware:** Subscribes to device GPS hardware (`navigator.geolocation.watchPosition`) for continuous real-time fleet positioning and automatic off-route detection.

---

## 3. System Architecture & Communication Flow

### 3.1 Architecture Overview Diagram

```
+-------------------------------------------------------------------------------------------------------+
|                                        CLIENT BROWSER (PORT 5173)                                     |
|                                                                                                       |
|  +-------------------------+  +-------------------------+  +---------------------------------------+  |
|  |       React Router      |  |     React-Leaflet GIS   |  |        IncidentAlertModal (Global)    |  |
|  |  RBAC: Admin / Officer  |  |  Custom SVG Teardrops   |  |   Web Audio API Sawtooth Alarm Siren  |  |
|  |    / Vehicle Operator   |  |  OSRM Turn-by-Turn HUD  |  |   HTML5 Desktop Notifications         |  |
|  +-------------------------+  +-------------------------+  +---------------------------------------+  |
|               |                            |                                    ^                     |
|               | REST API (/api/*)          | Static Assets (/uploads/*)         | WebSocket Events    |
+---------------+----------------------------+------------------------------------+---------------------+
                |                            |                                    |
                v                            v                                    |
+---------------------------------------------------------------------------------+---------------------+
|                                      VITE DEVELOPMENT PROXY                                           |
|                   Maps /api/* and /uploads/* ---> http://localhost:1710 (Express Backend)             |
+-------------------------------------------------+-----------------------------------------------------+
                                                  |
                                                  v
+-------------------------------------------------------------------------------------------------------+
|                                  EXPRESS 5 BACKEND GATEWAY (PORT 1710)                                |
|                                                                                                       |
|   +-----------------------+  +-----------------------+  +--------------------+  +------------------+  |
|   |   JWT Authentication  |  |    Multer Uploader    |  |  Socket.IO Server  |  |  Resilient Risk  |  |
|   |  BcryptJS Credentials |  |   Disk: uploads/      |  |  Room: "dashboard" |  |  Fallback Engine |  |
|   +-----------------------+  +-----------------------+  +--------------------+  +------------------+  |
|               |                         |                         |                       |           |
+---------------+-------------------------+-------------------------+-----------------------+-----------+
        |                                                                                   |
        | Mongoose ODM (Encrypted TLS)                                                      | HTTP POST (:8000)
        v                                                                                   v
+------------------------------------+                             +------------------------------------+
|       MONGODB ATLAS (CLOUD)        |                             |     PYTHON RISK ENGINE (PORT 8000) |
|                                    |                             |                                    |
| - Users (RBAC + Profiles + Avatars)|                             | - FastAPI Async Endpoints          |
| - RoadSegments (2dsphere LineString|                             | - DEM.tif (SRTM 30m Elevation)     |
| - RoadIncidents (GeoJSON Points)   |                             | - slope.tif, aspect.tif, dist.tif  |
| - RiskPredictions (Audit Freeze)   |                             | - RandomForestClassifier (pkl)     |
| - Alerts (Regional Multi-Lingual)  |                             | - 15-min Live Open-Meteo LRU Cache |
| - Vehicles (Source, Dest, GPS)     |                             | - NetworkX Critical Road Bridges   |
+------------------------------------+                             +------------------------------------+
```

### 3.2 Real-Time Event & WebSocket Lifecycle

The lifecycle of an emergency field report illustrates the real-time coordination across all layers:

```
[ Field Officer ]
       |
       | 1. Submits incident on /incident-report (GPS, Photo, Slope, Rain, Roadblock: FULL)
       v
[ Express Backend (:1710) ]
       |
       | 2. Verifies JWT & writes photo to /uploads/incident-178915...jpeg
       | 3. Snaps GPS to nearest RoadSegment via 2dsphere spatial query ($near)
       | 4. Saves RoadIncident record in MongoDB
       | 5. Calls Python Risk Engine (:8000/predict-risk) or multi-factor heuristic
       | 6. Risk score computed (e.g. 92% - CRITICAL) & stored in RiskPrediction collection
       | 7. Updates RoadSegment: current_risk_level = "high", current_risk_score = 0.92
       | 8. Creates new Alert document in MongoDB
       | 9. Emits WebSocket events to all clients & "dashboard" room:
       |      - socket.emit("incident_created", incidentData)
       |      - socket.emit("road_segment_updated", segmentData)
       |      - socket.emit("alert_created", alertData)
       | 10. Triggers rerouteCheck(): scans active vehicles whose paths cross this segment
       +------------------------------------+------------------------------------+
                                            |                                    |
                                            v                                    v
                               [ IncidentAlertModal ]                   [ Live Map & Navbar ]
                                            |                                    |
                               - Sounds Web Audio Siren                 - Bell badge counter +1
                               - Displays Emergency Pop-up              - Road segment turns red
                               - Fires Desktop Notification             - Vehicle Live route reroutes
```

### 3.3 Reverse Proxy & Zero-CORS Gateway
In the development and production configurations, the client browser connects directly to the Vite frontend server on port `5173`. Vite's internal development proxy is configured in `vite.config.js`:
- Any request starting with `/api` is transparently forwarded to `http://localhost:1710`.
- Any request starting with `/uploads` is transparently forwarded to `http://localhost:1710/uploads`.
- Any WebSocket upgrade request starting with `/socket.io` is proxied directly to Express.

This architecture completely eliminates Cross-Origin Resource Sharing (CORS) preflight latencies in the client application, guarantees unified cookie/header propagation, and prevents hardcoded IP vulnerabilities.

---

## 4. Risk Engine & Multi-Factor Risk Analysis (%) Deep Dive

The Cloud9 risk computation pipeline is a hybrid intelligence system combining empirical machine learning, geospatial raster analysis, graph theory, and real-time multi-factor field heuristic models.

### 4.1 Machine Learning Model Specifications
- **Model Type:** Scikit-Learn `RandomForestClassifier` (100 estimators, balanced class weighting).
- **Training Ground Truth:** Historical landslide inventory polygons and records compiled across the Barail Hill Range and Dima Hasao district over 36 monsoon months.
- **Coordinate Bounds (Spatial Domain):**
  $$\text{Latitude: } [24.97^\circ\text{N}, 25.83^\circ\text{N}], \quad \text{Longitude: } [92.52^\circ\text{E}, 93.47^\circ\text{E}]$$
- **Inference Latency:** $< 15\text{ ms}$ per coordinate point when rasters are memory-mapped.

### 4.2 Feature Extraction Pipeline (DEM & Rasters)
The Python risk engine loads four continuous raster datasets into memory on startup via `rasterio`:
1. **`DEM.tif` (Elevation):** Digital Elevation Model derived from NASA SRTM 30-meter resolution. Provides absolute altitude above sea level ($Z$).
2. **`slope.tif` (Slope Gradient):** Calculated as the magnitude of elevation gradient:
   $$\text{Slope} = \arctan\left(\sqrt{\left(\frac{\partial Z}{\partial x}\right)^2 + \left(\frac{\partial Z}{\partial y}\right)^2}\right) \times \frac{180^\circ}{\pi}$$
   Slopes $> 30^\circ$ exhibit exponentially higher shear failure risk.
3. **`aspect.tif` (Slope Aspect):** Direction of maximum slope steepness ($0^\circ - 360^\circ$), dictating windward monsoon moisture accumulation.
4. **`dist_to_road.tif` (Proximity to Road):** Euclidean distance transform calculated from vectorized OpenStreetMap highway geometries. Mountain slope toe-cutting during road excavation severely degrades slope stability within $0 - 150\text{ meters}$.
5. **Rainfall Feature Vector:** 24-hour accumulated rainfall ($mm$) queried from Open-Meteo's API with an in-memory $0.05^\circ$ grid LRU cache (15-minute TTL). If the live weather network is unavailable, it seamlessly samples from the 30-year climatological mean NetCDF (`RF25_indselect_rfp25.nc`).

### 4.3 Dynamic Single-Point Risk Calculation (%)
When `/predict?lat={lat}&lon={lon}` is invoked:
1. Coordinates are checked against `_dem_src.bounds`. If outside bounds, an HTTP 200 payload with `error: "outside_coverage"` is returned gracefully without throwing exceptions.
2. The feature vector $X$ is assembled:
   $$X = [\text{elevation}, \text{slope}, \text{aspect}, \text{dist\_to\_road}, \text{rainfall}]$$
3. The model outputs class probabilities:
   $$\mathbf{P} = \text{model.predict\_proba}(X) = [P(\text{safe}), P(\text{landslide})]$$
4. **Landslide Risk Percentage (%)** is extracted:
   $$\text{Risk Percentage (\%)} = \text{round}(P(\text{landslide}) \times 100, 2)$$
5. **Risk Category Mapping:**
   - **Very Low:** $0.00\% \le \text{Risk} < 20.00\%$ (Green)
   - **Low:** $20.00\% \le \text{Risk} < 40.00\%$ (Emerald)
   - **Moderate:** $40.00\% \le \text{Risk} < 60.00\%$ (Yellow / Caution)
   - **High:** $60.00\% \le \text{Risk} < 80.00\%$ (Orange / Warning)
   - **Very High:** $80.00\% \le \text{Risk} \le 100.00\%$ (Red / Critical Danger)

### 4.4 Multi-Factor Resilient Fallback Engine
To guarantee zero-downtime reliability during disaster situations where the Python microservice is offline or overloaded, the Express backend integrates an advanced multi-factor risk predictor (`callPredictRisk` in `server.js`):

```javascript
// Mathematical Formulation of the Backend Multi-Factor Risk Predictor:
const slopeFactor   = (Math.min(slope, 60) / 45) * 0.25;
const rainFactor    = (Math.min(rain, 250) / 180) * 0.20;
const histFactor    = (historical_risk_score || 0.2) * 0.15;
const blockFactor   = isFullBlock ? 0.35 : isPartBlock ? 0.20 : 0.05;
const trafficFactor = isTrafficJam ? 0.20 : isTrafficSlow ? 0.10 : 0.02;
const sevBonus      = isCritical ? 0.30 : isHigh ? 0.15 : 0.05;

let compositeScore = Math.min(1.0, Math.max(0.08,
  slopeFactor + rainFactor + histFactor + blockFactor + trafficFactor + sevBonus
));
```

#### Deterministic Safety Enforcements:
- **Active Critical Hazard Guard:** Any reported incident with a `full` road block, `critical` severity, or `high` risk guarantees a minimum risk score of **$0.88$ ($88\%$, High Risk / Blocked)**.
- **Partial Impairment Guard:** Any incident with a `partial` road block or `medium` severity guarantees a minimum risk score of **$0.48$ ($48\%$, Moderate Risk / Caution)**.
- **General Incident Baseline:** Any active unverified incident enforces a baseline score $\ge 0.38$ ($38\%$).

### 4.5 Route Risk Analysis (%) & Multi-Point Sampling
When an operator plans a route between a source and destination in `RoutePlanner.jsx`:
1. The route geometry polyline is decoded into an ordered array of `[lat, lon]` coordinates.
2. `samplePoints(coords, 20)` selects 20 equidistant geographic sample points along the entire transit trajectory.
3. The frontend sends `POST /api/route-risk` with the points array. The backend delegates to Python `/predict-batch` with 15-minute grid caching.
4. **High Risk Stretch Percentage (%):**
   $$\text{High Risk Stretch (\%)} = \text{round}\left(\frac{N_{\text{High}} + N_{\text{VeryHigh}}}{N_{\text{Valid}}} \times 100\right)$$
   where $N_{\text{Valid}}$ is the count of sampled points within model coverage, and $N_{\text{High}}$ are points with risk $\ge 60\%$.
5. **Worst-Case Probability (%):**
   $$\text{Worst Probability (\%)} = \max_{i \in \text{Valid}}\left(\text{risk\_percentage}_i\right)$$
6. **Composite Route Hazard Score:**
   $$\text{Route Hazard Score} = \text{Worst Probability (\%)} + \text{High Risk Stretch (\%)} + \text{Distance Penalty}$$
7. The Route Planner automatically sorts multiple OSRM candidate routes ascending by this Hazard Score, presenting the safest alternative first.

### 4.6 Graph-Theoretic Critical Bridges & Settlement Isolation Index
Executed via `risk-engine/scripts/critical_roads.py` and visualized on `/critical-roads`:
1. An undirected planar graph $G = (V, E)$ is constructed from OpenStreetMap highway vectors. Vertices $V$ denote settlement junctions and towns; edges $E$ denote highway segments.
2. NetworkX identifies bridge edges (cut-edges):
   $$B = \{e \in E \mid G \setminus \{e\} \text{ contains strictly more connected components than } G\}$$
3. When bridge edge $e = (u, v)$ is severed, the network partitions into disjoint subgraphs $C_u$ and $C_v$.
4. **Settlement Isolation Impact:**
   $$\text{Isolation Impact}(e) = \min(|C_u \cap \text{Settlements}|, |C_v \cap \text{Settlements}|)$$
5. Corridors are ranked descending by this isolation metric. In Dima Hasao, nine verified critical corridors (e.g., NH-27 Maibang–Harangajao pass, SH-5 Haflong–Mahur link) are precomputed. If any of these 9 bridges collapse, up to 14 downstream villages lose 100% of vehicular supply access.

### 4.7 AI Vision & Field Photo Hazard Classification
Field officers can upload physical photographs of road damage directly via `POST /api/analyze-photo`:
1. **Google Gemini Vision Integration:** When `GEMINI_API_KEY` is present in `backend/.env`, the uploaded photo is processed through Gemini 1.5/2.0 Flash with a tailored system prompt:
   ```json
   {
     "hazard_type": "landslide|flood|road_damage|rockfall|fallen_tree",
     "severity": "high|medium|low",
     "road_blocked": true,
     "estimated_debris_coverage_pct": 75,
     "confidence": 0.94,
     "description": "Massive mudslide covering both highway lanes near km 42."
   }
   ```
2. **Heuristic Keyword & Size Fallback:** If the Gemini API key is absent or network connectivity is degraded, the backend inspects filename tokens (`landslide`, `slide`, `blocked`, `collapse`, `flood`, `debris`) combined with image byte density to infer whether the hazard is `high`, `medium`, or `low`.

---

## 5. Exhaustive Feature & Page Catalog

Every single page, view, modal, and component present in the Cloud9 web application is documented below.

```
App Navigation Tree:
├── /login ────────────────────────── [Public] Multi-Role Authentication Portal
└── / (Protected Shell Layout)
    ├── /dashboard ────────────────── [All Roles] Executive Cockpit & KPIs
    ├── /districts ────────────────── [All Roles] NER Regional Vulnerability & DDMA Contacts
    ├── /vehicles ─────────────────── [Admin Only] Fleet Telemetry & VehicleLiveModal
    ├── /roads ────────────────────── [All Roles] Road Network Inventory & Condition Toggles
    ├── /incidents ────────────────── [All Roles] Incident Table, Causes Chart, IncidentMapModal
    ├── /deliveries ───────────────── [All Roles] Supply Consignment & Cargo Logistics
    ├── /alerts ───────────────────── [All Roles] Regional Multi-Lingual Early Warning Center
    ├── /route-planner ────────────── [All Roles] Multi-Route HUD Navigation & GPS Rerouting
    ├── /incident-report ──────────── [Admin + Officer] Geo-Tagged Hazard Photo Reporter
    ├── /critical-roads ───────────── [All Roles] NetworkX Topological Bridges Explorer
    ├── /personnel ────────────────── [Admin Only] Master Staff Roster, 4-Section EditModal
    ├── /register-officer ─────────── [Admin Only] Field Officer Instant Onboarding
    ├── /register-operator ────────── [Admin Only] Vehicle Operator Instant Onboarding
    ├── /account ──────────────────── [All Roles] Digital Profile & Session Claims
    └── /settings ─────────────────── [All Roles] Thresholds & Alert Sensitivity Controls
```

---

### 5.1 Multi-Role Authentication & Access Control (`/login`)
- **Route:** `/login` (Public route wrapped in `PublicRoute`; logged-in users auto-redirect to `/dashboard`).
- **File:** `frontend/vite-project/src/pages/Login.jsx`
- **Backend Endpoints:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- **Purpose:** Secure cryptographic entry point governing role-based access for Emergency Administrators, Field Inspection Officers, and Logistics Operators.
- **Key Features & Mechanics:**
  - Form validation with masked password inputs.
  - **Quick-Fill Demo Credentials:** One-click quick-fill buttons populate verified credentials for instant testing:
    - *Admin:* `admin` / `admin123`
    - *Field Officer:* `OFC-1042` / `officer123`
    - *Vehicle Operator:* `VOP-2317` / `operator123`
  - Returns signed JWT stored in `localStorage.getItem('token')`.
  - Auto-retries and auto-refreshes session through `services/api.js`.

---

### 5.2 Executive Command Center Dashboard (`/` & `/dashboard`)
- **Route:** `/` or `/dashboard` (Protected route).
- **File:** `frontend/vite-project/src/pages/Dashboard.jsx`
- **Backend Endpoints:** `GET /api/vehicles`, `GET /api/roads`, `GET /api/incidents`, `GET /api/deliveries`, `GET /api/alerts`, `GET /api/forecast-risk`.
- **Purpose:** The centralized situational awareness cockpit tailored dynamically to the logged-in user's role.
- **Key Features & Mechanics:**
  - **Role-Aware Views:**
    - *Admin View:* Comprehensive logistics KPIs, full fleet stats, active road status, recent incident logs, and alert feeds.
    - *Field Officer View:* Focuses on local sector hazards, quick-action incident logging shortcuts, and nearby road blockages.
    - *Vehicle Operator View:* Highlights assigned vehicle status, active delivery cargo, current route hazard warnings, and navigation shortcuts.
  - **KPI Metric Stat Cards:**
    - Active Fleet Count (with live moving status)
    - Blocked Roads Count (color-coded red)
    - Open Field Incidents (with severity breakdown)
    - Pending Relief Deliveries (with priority tags)
  - **Live Weather HUD Widget:** Displays live precipitation, temperature, and 24-hour rainfall accumulation for the Haflong epicenter.
  - **Embedded GIS Map Panel:** Interactive Leaflet overview displaying color-coded road segments and active vehicle markers.

---

### 5.3 Interactive GIS Map Panel (`/map`)
- **Component File:** `frontend/vite-project/src/components/map/MapPanel.jsx`
- **Purpose:** Full-featured geographic information system (GIS) providing geospatial visualization of roads, incidents, and vehicle telemetries.
- **Key Features & Mechanics:**
  - **Stadia Maps / OpenStreetMap Tiles:** Crisp, high-contrast cartography optimized for terrain readability.
  - **Dynamic Road Segments Overlay:** Renders vector polylines color-coded by real-time risk level:
    - `BLOCKED` / `HIGH RISK`: Solid Red (`#ef4444`) with pulsing glow.
    - `CAUTION` / `MODERATE`: Amber Yellow (`#f59e0b`).
    - `OPEN`: Emerald Green (`#10b981`).
  - **Vehicle Markers:** Animated position markers displaying current location, vehicle plate, assigned driver, and cargo type.
  - **Interactive Popups:** Clicking any road segment displays segment length, district, current risk score percentage, slope gradient, and isolated settlements.
  - **Point-and-Click Risk Query:** Clicking any coordinate on the map queries `/api/landslide/risk?lat={lat}&lon={lon}` and opens an inspection popup showing exact slope, elevation, rainfall, and landslide percentage.

---

### 5.4 Route Planner & Turn-by-Turn GPS Navigation HUD (`/route-planner`)
- **Route:** `/route-planner`
- **File:** `frontend/vite-project/src/pages/RoutePlanner.jsx`
- **Backend & External Endpoints:** `GET /api/geocode`, `POST /api/route-risk`, `GET https://router.project-osrm.org/route/v1/driving/...`
- **Purpose:** Terrain-aware multi-modal route navigation computing the safest mountain corridors, avoiding high-risk landslide zones, and providing driving HUD navigation.
- **Key Features & Mechanics:**
  - **Origin & Destination Search:** Real-time geocoding powered by Nominatim proxy.
  - **Custom SVG Teardrop Markers:**
    - **Start Marker (`startIcon`):** Clean emerald green teardrop with concentric white/green center circles (no distracting letters).
    - **Destination Marker (`endIcon`):** Clean electric blue teardrop with concentric white/blue center circles (no distracting letters).
  - **Multi-Candidate Route Scoring:** Generates primary and alternate OSRM routes, samples 20 equidistant points along each path, queries the risk engine, and displays:
    - Distance in kilometers and travel time in minutes.
    - High-Risk Stretch Percentage (`highRiskPct`).
    - Worst-Case Landslide Risk Category (`worstCategory`).
    - Composite Hazard Score (`score`).
  - **Hazard Hotspot Badges:** Red pulsing circle badges (`riskHazardIcon`) rendered directly over high-risk points on the route polyline.
  - **Turn-by-Turn Driving HUD:** Full-screen driving mode with distance countdowns, upcoming maneuver icons (turn left, turn right, keep straight), and voice/visual cues.
  - **Automated GPS Off-Route Detection & Rerouting:** Subscribes to hardware GPS via `navigator.geolocation.watchPosition`. If the vehicle deviates $> 80\text{ meters}$ from the active polyline across 3 consecutive GPS updates, the system automatically recalculates the route from the current vehicle location to the destination.

---

### 5.5 Emergency Incident Management & Map Inspector (`/incidents`)
- **Route:** `/incidents`
- **File:** `frontend/vite-project/src/pages/Incidents.jsx`
- **Backend Endpoints:** `GET /api/road-incidents`, `PATCH /api/road-incidents/:id`, `GET /api/incidents`.
- **Purpose:** Comprehensive operational incident tracking dashboard with analytical root-cause charts and popup GIS maps.
- **Key Features & Mechanics:**
  - **Merged Live & Historical Data:** Merges live MongoDB `RoadIncident` records with scenario data.
  - **Real-Time WebSocket Sync:** Listens to `incident_created` socket events; newly reported incidents animate into the table at the top with a pulsing "LIVE" badge.
  - **Root Cause Bar Chart (Recharts):** Horizontal bar chart classifying active incidents by root cause:
    - Landslide (Red)
    - Heavy Rainfall (Orange)
    - Bridge / Road Damage (Amber)
    - Mechanical Breakdown (Blue)
    - Overspeeding (Indigo)
  - **IncidentMapModal (View on Map):**
    - Clicking the **"View"** button on any incident row opens a full-screen Leaflet modal centered on the incident's exact GPS coordinates.
    - Displays a glowing red hazard marker (`⚠️`).
    - Footer HUD displays road blockage status, slope gradient, 7-day rainfall accumulation, reporting officer name, and exact coordinates.
  - **Offline Incident Syncing:** Integrates with `localStorage['sih_offline_incidents']`. If network disconnects during field reporting, records queue locally and automatically flush to the server when `window.addEventListener('online')` fires.

---

### 5.6 Field Officer Incident Reporting & Geo-Tagging (`/incident-report`)
- **Route:** `/incident-report` (Protected: `ADMIN` and `FIELD_OFFICER` roles only).
- **File:** `frontend/vite-project/src/pages/IncidentReport.jsx`
- **Backend Endpoints:** `POST /api/road-incidents`, `POST /api/analyze-photo`, `GET /api/geocode/reverse`.
- **Purpose:** Specialized mobile-friendly hazard reporting tool for field officers inspecting mountain corridors.
- **Key Features & Mechanics:**
  - **Hardware GPS Auto Geo-Tagging:** Automatically queries `useUserLocation()` to retrieve precise device coordinates and reverse-geocodes them into human-readable corridor names.
  - **Field Photo Attachment & Preview:** Captures physical camera photos or file uploads.
  - **AI Computer Vision Analysis:** Clicking "Analyze Photo" invokes `POST /api/analyze-photo`, running Gemini Vision / heuristic analysis to estimate debris coverage percentage, road blockage state, and hazard classification.
  - **Environmental Parameter Sliders:**
    - Slope Steepness ($0^\circ - 60^\circ$)
    - 7-Day Rainfall Accumulation ($0 - 300\text{ mm}$)
    - Road Blockage Selector (`None`, `Partial`, `Full`)
    - Traffic State (`Clear`, `Slow`, `Jammed`, `Blocked`)
  - **Instant Multi-Factor Submission:** Submitting the report triggers backend road snapping, ML risk prediction, alert creation, and system-wide WebSocket broadcast.

---

### 5.7 Early Warning Notification & Regional Alert Center (`/alerts`)
- **Route:** `/alerts`
- **File:** `frontend/vite-project/src/pages/Alerts.jsx`
- **Backend Endpoints:** `GET /api/alerts`, `POST /api/alerts`, `PATCH /api/alerts/:id/acknowledge`.
- **Purpose:** Multi-lingual emergency dispatch hub broadcasting real-time early warnings across indigenous NER languages.
- **Key Features & Mechanics:**
  - **Severity Filtering Tabs:** Filter alerts by `ALL`, `CRITICAL`, `HIGH`, `MODERATE`, `LOW`.
  - **Multi-Lingual Regional Translation Display:** Renders emergency alerts in standard English/Hindi alongside regional indigenous dialects:
    - Assamese (অসমীয়া)
    - Mizo (Mizo ṭawng)
    - Nagamese / Naga
    - Bengali (বাংলা)
  - **Admin Dispatch Form:** Allows administrators to broadcast manual emergency advisories specifying severity, affected district, coordinate pin, and bilingual messaging.
  - **One-Click Acknowledgment:** Field officers can mark alerts as acknowledged, recording their identity and timestamp.

---

### 5.8 Fleet Tracking & Live Vehicle Telemetry (`/vehicles`)
- **Route:** `/vehicles` (Protected: `ADMIN` only).
- **File:** `frontend/vite-project/src/pages/Vehicles.jsx` & `frontend/vite-project/src/components/vehicles/VehicleLiveModal.jsx`
- **Backend Endpoints:** `GET /api/vehicles`, `POST /api/vehicles`, `PATCH /api/vehicles/:id`.
- **Purpose:** Real-time fleet command management overseeing relief trucks, vans, and emergency ambulances.
- **Key Features & Mechanics:**
  - **Fleet Roster Table:** Displays Vehicle Number, Type, Cargo, Priority, Driver Name, Source, Destination, and Operational Status (`IN_TRANSIT`, `IDLE`, `DELAYED`, `DELIVERED`).
  - **VehicleLiveModal (Full-Screen Live Tracking):**
    - High-performance Leaflet modal displaying the active vehicle position marker and route polyline.
    - **Clean Teardrop Start/End Markers:**
      - Origin: Emerald green teardrop (`startIcon`) showing `vehicle.source`.
      - Destination: Electric blue teardrop (`endIcon`) showing `vehicle.destination`.
    - **Proximity-Based Road Risk (`getRelatedRoad`):** Computes the minimum Haversine distance between the vehicle's route waypoints and known road corridors (200km threshold), displaying the true risk level of the corridor the vehicle is actually traversing.
    - **Risky Corridors HUD:** Lists known high-risk routes (NH-2 Kohima–Imphal, NH-10 Siliguri–Gangtok, SH-5 Haflong Pass, SH-37 Dibrugarh Bypass) with one-click **"View on Map"** flyTo triggers.
    - **Live Telemetry Sensors:** Displays real-time mock telemetry: Cargo Temperature ($4.2^\circ\text{C}$ for perishables/medicine), Door Seal integrity (`LOCKED`), GPS accuracy ($\pm 3.2\text{m}$), and Speed HUD overlay.
    - **Camera Controls:** "Reset to Full Route" automatically recalculates map bounds to encompass the entire transit path.

---

### 5.9 Master Personnel Management Hub (`/personnel`)
- **Route:** `/personnel` (Protected: `ADMIN` only).
- **File:** `frontend/vite-project/src/pages/Personnel.jsx`
- **Backend Endpoints:** `GET /api/auth/users`, `PATCH /api/auth/users/:userId`, `POST /api/auth/users/:userId/photo`, `PATCH /api/auth/users/:userId/status`.
- **Purpose:** Centralized personnel administration portal managing all verified Field Officers and Logistics Operators.
- **Key Features & Mechanics:**
  - **Categorized Tabs:** Seamless switching between **Field Officers** and **Vehicle Operators**.
  - **Search & Filter:** Instant search filtering by Employee ID, Name, District, Mobile, or Vehicle Number.
  - **Full Profile View Modal (`ProfileViewModal`):**
    - Clicking any personnel row opens an ID-card-style modal with gradient header.
    - Displays high-resolution SVG profile photo, full name, role badge, Employee/License ID, department, posting office, state, district, email, phone, and date of birth.
  - **4-Section Grouped Edit Modal (`EditModal`):**
    - Clicking "Edit" opens a comprehensive modal organized into 4 logical sections:
      1. **Personal:** First Name, Last Name, Date of Birth, Gender dropdown.
      2. **Contact:** Official Email Address, Mobile Number.
      3. **Role & Deployment:**
         - *For Officers:* Employee ID, Department, Designation, Office, District, State, Posting Location.
         - *For Operators:* Driver License Number, Vehicle Registration, Vehicle Type, Assigned Route, District, State, Posting Location.
      4. **Account:** Account Status selector (`APPROVED`, `DISABLED`, `INACTIVE`).
    - **Profile Photo Replacement:** Integrated file upload button calling `POST /api/auth/users/:userId/photo` to update the user's avatar.
  - **Soft Enable / Disable Toggle:** Dedicated action button allowing administrators to disable or re-enable an account with confirmation dialog.

---

### 5.10 Field Officer Self-Registration (`/register-officer`)
- **Route:** `/register-officer` (Protected: `ADMIN` only).
- **File:** `frontend/vite-project/src/pages/RegisterFieldOfficer.jsx`
- **Backend Endpoint:** `POST /api/auth/register-officer`
- **Purpose:** Onboarding portal for district disaster response officers and road inspection staff.
- **Key Features & Mechanics:**
  - Captures Officer ID, First/Last Name, District, Department, Email, Mobile, and Password.
  - When submitted by the administrator, accounts are automatically created with `APPROVED` status, enabling immediate operational login without delayed approval queues.

---

### 5.11 Vehicle Operator Onboarding (`/register-operator`)
- **Route:** `/register-operator` (Protected: `ADMIN` only).
- **File:** `frontend/vite-project/src/pages/RegisterVehicleOperator.jsx`
- **Backend Endpoint:** `POST /api/auth/register-operator`
- **Purpose:** Dedicated registration portal for relief vehicle drivers and commercial logistics operators.
- **Key Features & Mechanics:**
  - Captures Driver License Number, Vehicle Registration Plate, Vehicle Type (Truck, Van, Ambulance), Assigned Route, Contact Mobile, and Password.
  - Immediately persists to MongoDB Atlas as an `APPROVED` account ready for navigation dispatch.

---

### 5.12 Critical Road Segments & Network Isolation (`/critical-roads`)
- **Route:** `/critical-roads`
- **File:** `frontend/vite-project/src/pages/CriticalRoads.jsx`
- **Backend Endpoint:** `GET /api/critical-roads`
- **Precomputed Dataset:** `risk-engine/data/critical_roads.json`
- **Purpose:** Graph-theoretic vulnerability explorer identifying topological bridges whose severance isolates human settlements.
- **Key Features & Mechanics:**
  - **Isolation Ranking Table:** Sorts critical segments descending by count of isolated settlements.
  - **Dual-Pane Interactive Explorer:**
    - Left Column: Corridor cards detailing road name, district, length, and list of cutoff villages (e.g., Harangajao, Ditokcherra, Jatinga).
    - Right Column: Leaflet GIS map. Clicking any corridor smoothly triggers `map.flyTo()`, highlighting the critical bridge in red and drawing connecting rays to all isolated settlement coordinates.

---

### 5.13 Road Network Inventory & Condition Tracker (`/roads`)
- **Route:** `/roads`
- **File:** `frontend/vite-project/src/pages/Roads.jsx`
- **Backend Endpoints:** `GET /api/roads`, `POST /api/roads`, `PATCH /api/roads/:id`.
- **Purpose:** High-level inventory of surveyed highways and state arterial routes across the region.
- **Key Features & Mechanics:**
  - Tabular listing of highway numbers (NH-27, NH-06, NH-10, SH-5, SH-37), surface classification, length in kilometers, and terrain vulnerability.
  - One-click modal allowing dispatchers to toggle road condition (`Open`, `Restricted - Light Vehicles Only`, `Blocked - Clearance in Progress`).

---

### 5.14 Relief & Medical Consignment Deliveries (`/deliveries`)
- **Route:** `/deliveries`
- **File:** `frontend/vite-project/src/pages/Deliveries.jsx`
- **Backend Endpoints:** `GET /api/deliveries`, `POST /api/deliveries`, `PATCH /api/deliveries/:id`.
- **Purpose:** End-to-end supply chain consignment tracking for food grains, drinking water kits, emergency medicine, and fuel.
- **Key Features & Mechanics:**
  - Tracks origin logistics warehouse to destination relief camp.
  - Displays cargo priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), assigned vehicle plate, and delivery status progression (`PENDING` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELAYED` $\rightarrow$ `DELIVERED`).
  - Flags delivery vulnerability if the designated corridor experiences real-time landslide risk spikes.

---

### 5.15 Regional Districts Intelligence & DDMA Directory (`/districts`)
- **Route:** `/districts`
- **File:** `frontend/vite-project/src/pages/Districts.jsx`
- **Purpose:** Strategic analytical overview of eight key NER administrative districts.
- **Key Features & Mechanics:**
  - Covers Dima Hasao, Cachar, Karbi Anglong, Hailakandi, Karimganj, East Khasi Hills, West Jaintia Hills, and Papum Pare.
  - Visual cards displaying total population, total road network kilometers, historical landslide incident count, and active risk indices.
  - Complete emergency contact directory for District Disaster Management Authorities (DDMA) and control room emergency phone numbers.

---

### 5.16 System Parameter Settings & Sensitivity Controls (`/settings`)
- **Route:** `/settings`
- **File:** `frontend/vite-project/src/pages/Settings.jsx`
- **Backend Endpoints:** `GET /api/settings`, `PATCH /api/settings`.
- **Purpose:** Operational controls allowing dispatchers to tune model sensitivity and routing behaviors.
- **Key Features & Mechanics:**
  - **Rainfall Alert Trigger Threshold:** Slider adjusting millimeter rainfall trigger ($5\text{ mm} - 50\text{ mm}/24\text{h}$).
  - **Route Risk Optimization Bias:** Selector switching between Conservative (strictly avoids all caution roads), Balanced, and Fastest Path.
  - **GPS Rerouting Deviation Threshold:** Meters off-route required to trigger recalculation ($50\text{m} - 200\text{m}$).

---

### 5.17 User Profile & Security Session (`/account`)
- **Route:** `/account`
- **File:** `frontend/vite-project/src/pages/AccountDetails.jsx`
- **Backend Endpoint:** `GET /api/auth/me`
- **Purpose:** User profile inspection, digital credential verification, and cryptographic session management.
- **Key Features & Mechanics:**
  - Displays user ID, full legal name, role badge, contact information, posting location, and security claims.
  - One-click cryptographic session termination (logout) clearing tokens from local storage and resetting socket connections.

---

### 5.18 Global Emergency Audio Siren & Alert Modal (`IncidentAlertModal`)
- **Mounted In:** `frontend/vite-project/src/components/layout/Layout.jsx` (Active across the entire application).
- **Component File:** `frontend/vite-project/src/components/common/IncidentAlertModal.jsx`
- **Purpose:** Global life-safety interceptor alerting users to catastrophic hazards regardless of which page they are currently browsing.
- **Key Features & Mechanics:**
  - **WebSocket Listening:** Listens continuously to `incident_created` events emitted by the backend.
  - **Web Audio API Sawtooth Alarm Siren:** Generates a dual-tone emergency siren using synthesized Web Audio oscillators (Tone 1: $880\text{ Hz} \rightarrow 1320\text{ Hz}$; Tone 2: $1174\text{ Hz} \rightarrow 1760\text{ Hz}$). Bypasses audio file loading delays and works instantly in modern browsers.
  - **Desktop Push Notifications:** Triggers native OS desktop notifications via HTML5 `Notification` API.
  - **Emergency Pop-Up Modal:** Renders a high-z-index modal displaying incident type, road name, district, blockage level, officer name, and hazard description.
  - **Quick Action Triggers:**
    - *"View on Map":* Navigates immediately to `/incidents` with the incident centered and inspected.
    - *"Incident List":* Navigates to the incident roster.
  - **Deduplication Safeguard:** Utilizes a React `useRef(new Set())` to prevent duplicate alerts from sounding for the same incident ID.

---

### 5.19 Top Navigation Bar & Global Status Bar (`Navbar`)
- **Component File:** `frontend/vite-project/src/components/layout/Navbar.jsx`
- **Purpose:** Persistent header bar providing system telemetry, language toggles, notifications, and user profile management.
- **Key Features & Mechanics:**
  - **System Operational Heartbeat:** Green pulsing indicator validating live backend connectivity.
  - **Language Selector:** Seamless one-click switching between English (`EN`) and Hindi (`हि`).
  - **Real-Time Notification Bell:**
    - Displays unread alert count badge.
    - Automatically updates count every 30 seconds and receives instant increments on `alert_created` and `incident_created` socket events.
    - Clicking bell opens the dropdown preview showing the last 8 alerts with risk color tags, relative timestamps, and one-click links to the full alert center.
  - **User Profile Menu:** Displays avatar, user full name, and role badge with one-click logout trigger.

---

### 5.20 Role-Gated Adaptive Navigation Drawer (`Sidebar`)
- **Component File:** `frontend/vite-project/src/components/layout/Sidebar.jsx`
- **Purpose:** Fixed left-hand navigation menu adapting dynamically based on the authenticated user's role.
- **Key Features & Mechanics:**
  - **Administrator:** Full visibility across all 13 navigation items including Vehicles, Personnel Hub, Register Officer, and Register Operator.
  - **Field Officer:** Streamlined menu including Dashboard, Districts, Roads, Incidents, Deliveries, Alerts, Route Planner, Critical Roads, Account, and the dedicated **Report Incident** tool.
  - **Vehicle Operator:** Clean driving-centric menu focusing on Dashboard, Route Planner, Critical Roads, Deliveries, Alerts, and Account.

---

## 6. Personnel System, Role Matrix & Seed Data

### 6.1 Role-Based Access Control (RBAC) Matrix

| Feature / Action | `ADMIN` | `FIELD_OFFICER` | `VEHICLE_OPERATOR` |
|---|:---:|:---:|:---:|
| **View Dashboard & GIS Map** | ✅ Full Access | ✅ Sector Focus | ✅ Fleet/Route Focus |
| **Route Planner & Navigation HUD** | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **View Incidents & View on Map** | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **Report Field Incident (GPS/Photo)** | ✅ Full Access | ✅ Full Access | ❌ Read Only |
| **Manage Fleet & Vehicles Live Tracking** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **View & Acknowledge Alerts** | ✅ Full Access | ✅ Full Access | ✅ View Only |
| **Broadcast Manual Alerts** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Personnel Hub (View/Edit/Disable)** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Register Officer / Operator Accounts** | ✅ Full Access | ❌ Restricted | ❌ Restricted |
| **Toggle Road Operational Status** | ✅ Full Access | ✅ Full Access | ❌ Read Only |
| **Modify System Threshold Settings** | ✅ Full Access | ❌ Restricted | ❌ Restricted |

---

### 6.2 Seeded Field Officers Catalog
All three demonstration officers are pre-seeded into MongoDB Atlas with complete operational profiles and custom SVG avatars:

| User ID | Full Name | Employee ID | Department | Designation | District / Office | Contact Mobile | Status |
|---|---|---|---|---|---|---|:---:|
| `OFC-1042` | **Aniket Sharma** | `EMP-DH-1042` | Disaster Response | Senior Field Inspector | Dima Hasao (Haflong HQ) | `+91 94350 12345` | `APPROVED` |
| `OFC-2088` | **Priyanka Roy** | `EMP-CA-2088` | Highway Engineering | Geological Safety Officer | Cachar (Silchar Division) | `+91 94350 67890` | `APPROVED` |
| `OFC-3115` | **Vikram Thapa** | `EMP-KA-3115` | Emergency Operations | Rapid Assessment Lead | Karbi Anglong (Diphu Branch) | `+91 94350 54321` | `APPROVED` |

*Default Password for all officers:* `officer123`

---

### 6.3 Seeded Vehicle Operators Catalog
All six demonstration operators are pre-seeded into MongoDB Atlas with complete driver profiles, vehicle registrations, and custom SVG avatars:

| User ID | Full Name | License Number | Vehicle Reg. | Vehicle Type | Assigned Route Corridor | Contact Mobile | Status |
|---|---|---|---|---|---|---|:---:|
| `VOP-2317` | **Rajesh Das** | `AS-01-2018-004521` | `AS-01-GC-4412` | TRUCK | Guwahati $\rightarrow$ Silchar (NH-27) | `+91 98640 11223` | `APPROVED` |
| `VOP-4402` | **Biren Gogoi** | `AS-02-2019-007890` | `AS-02-E-8831` | TRUCK | Haflong $\rightarrow$ Jatinga Pass | `+91 98640 22334` | `APPROVED` |
| `VOP-5519` | **Sunil Chetri** | `ML-05-2020-001234` | `ML-05-A-1204` | VAN | Shillong $\rightarrow$ Silchar (NH-06) | `+91 98640 33445` | `APPROVED` |
| `VOP-6124` | **Tenzing Bhutia** | `SK-01-2017-009988` | `SK-01-D-5521` | AMBULANCE | Siliguri $\rightarrow$ Gangtok (NH-10) | `+91 98640 44556` | `APPROVED` |
| `VOP-7281` | **Manoj Kalita** | `AS-03-2021-003344` | `AS-03-K-9902` | TRUCK | Tezpur $\rightarrow$ Tawang Corridor | `+91 98640 55667` | `APPROVED` |
| `VOP-8833` | **Lalduhawma** | `MZ-01-2016-006677` | `MZ-01-C-3319` | VAN | Aizawl $\rightarrow$ Silchar Supply Link | `+91 98640 66778` | `APPROVED` |

*Default Password for all operators:* `operator123`

---

### 6.4 Profile Avatar & Static Asset Pipeline
Profile pictures are stored on disk in `backend/uploads/` and served statically via Express at `/uploads/*`.
- Seed script (`seedPersonnel.js`) generates high-fidelity SVG avatar illustrations featuring distinctive uniform styling, badges, and color themes.
- When an administrator uploads a new image via the Personnel Edit Modal, Multer writes the file to `backend/uploads/` and updates the user's `profilePhotoUrl` field with `/uploads/{filename}`.

---

## 7. Database Data Models & Schema Reference

The system defines 11 Mongoose data schemas in `backend/models/`:

### 7.1 User Model (`models/User.js`)
- `userId`: String (Unique, trim, e.g. `OFC-1042`, `VOP-2317`, `admin`).
- `passwordHash`: String (Bcrypt encrypted hash).
- `role`: String enum (`ADMIN`, `FIELD_OFFICER`, `VEHICLE_OPERATOR`).
- `accountStatus`: String enum (`PENDING`, `APPROVED`, `REJECTED`, `INACTIVE`, `DISABLED`).
- `firstName`: String, `lastName`: String.
- `email`: String, `mobileNumber`: String.
- `employeeId`, `department`, `designation`, `office`, `state`, `district`, `postingLocation`: Strings (Officer attributes).
- `licenseNumber`, `vehicleRegNumber`, `vehicleType`, `assignedRoute`: Strings (Operator attributes).
- `profilePhotoUrl`: String (Path to uploaded avatar).
- `dateOfBirth`: Date, `gender`: String enum (`Male`, `Female`, `Other`, `Prefer not to say`).
- `timestamps`: Automatic `createdAt` and `updatedAt`.

### 7.2 Vehicle Model (`models/Vehicle.js`)
- `vehicleNumber`: String (Unique, e.g. `AS-01-GC-4412`).
- `vehicleType`: String enum (`TRUCK`, `VAN`, `AMBULANCE`).
- `cargoType`: String (e.g. `Medical Kits`, `Grain Consignment`).
- `priority`: String enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `status`: String enum (`IDLE`, `IN_TRANSIT`, `DELAYED`, `DELIVERED`).
- `currentLocation`: GeoJSON Point `{ type: "Point", coordinates: [lon, lat] }` with `2dsphere` index.
- `source`: String (Origin city/hub).
- `destination`: String (Destination relief camp).
- `routeWaypoints`: Array of `[lat, lon]` pairs defining the planned path.
- `routeProgress`: Number ($0.0 \rightarrow 1.0$).

### 7.3 RoadIncident Model (`models/RoadIncident.js`)
- `road_segment_id`: ObjectId referencing `RoadSegment`.
- `location`: GeoJSON Point `{ type: "Point", coordinates: [lon, lat] }` with `2dsphere` index.
- `latitude`: Number, `longitude`: Number.
- `photo_url`: String (Served path from `/uploads/`).
- `reported_risk_level`: String enum (`low`, `medium`, `high`, `critical`).
- `incident_type`: String (e.g. `landslide`, `rockfall`, `flooding`, `road_damage`).
- `road_block`: String enum (`none`, `partial`, `full`).
- `traffic_condition`: String enum (`clear`, `slow`, `jammed`, `blocked`).
- `current_temp`: Number, `slope`: Number (degrees), `rainfall_mm`: Number (7d accumulation).
- `field_officer_name`: String, `vehicle_id`: String, `description`: String.
- `created_at`: Date.

### 7.4 RoadSegment Model (`models/RoadSegment.js`)
- `segment_key`: String (Unique sparse key from `critical_roads.json`).
- `road_name`: String (e.g. `NH-27 Maibang Pass`).
- `from_node`: String, `to_node`: String.
- `geometry`: GeoJSON LineString `{ type: "LineString", coordinates: [[lon, lat], ...] }` with `2dsphere` index.
- `length_km`: Number, `mid_lat`: Number, `mid_lon`: Number, `district`: String.
- `settlements_cutoff`: Array of Strings (Village names isolated if severed).
- `settlement_count`: Number.
- `slope_deg`: Number, `avg_rainfall_mm_7d`: Number, `historical_risk_score`: Number.
- `current_risk_level`: String enum (`low`, `medium`, `high`).
- `current_risk_score`: Number ($0.0 \rightarrow 1.0$).

### 7.5 RiskPrediction Model (`models/RiskPrediction.js`)
- `road_segment_id`: ObjectId referencing `RoadSegment`.
- `incident_id`: ObjectId referencing `RoadIncident`.
- `predicted_risk_level`: String enum (`low`, `medium`, `high`).
- `predicted_risk_score`: Number ($0.0 \rightarrow 1.0$).
- `model_version`: String (e.g. `risk-predictor-v2.2`).
- `inputs_snapshot`: Mixed object freezing all environmental parameters at inference time.
- `created_at`: Date.

### 7.6 Alert Model (`models/Alert.js`)
- `type`: String (`INCIDENT`, `ALERT`, `WEATHER`).
- `severity`: String enum (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
- `message`: String (English primary alert text).
- `regionalMessage`: String (Translated indigenous dialect text).
- `regionalLang`: String (e.g. `as`, `lus`, `bn`).
- `district`: String, `latitude`: Number, `longitude`: Number.
- `acknowledged`: Boolean, `acknowledgedBy`: String, `acknowledgedAt`: Date.
- `createdBy`: String.

### 7.7 Other Supporting Models
- **`Delivery.js`:** Tracks consignment ID, cargo quantities, priority, status, planned departure, and estimated arrival.
- **`Road.js`:** High-level highway inventory attributes and operational flags.
- **`Incident.js`:** Legacy fleet operational incident schema.
- **`RerouteEvent.js`:** Audit ledger capturing vehicle reroute triggers, original routes, and diverted paths.
- **`Setting.js`:** Persists system operational thresholds, alert tolerances, and routing weights.

---

## 8. Master REST API Specification

| HTTP Method | Endpoint Path | Auth Required | Parameters / Body Payload | Response Description |
|---|---|:---:|---|---|
| `GET` | `/health` | No | None | Returns backend status and MongoDB Atlas connection state. |
| `POST` | `/api/auth/login` | No | `{ userId, password }` | Authenticates user; returns signed JWT and user profile object. |
| `GET` | `/api/auth/me` | Yes (JWT) | None | Returns profile claims of the currently authenticated token holder. |
| `POST` | `/api/auth/logout` | No | None | Invalidates client session state. |
| `GET` | `/api/auth/users` | Admin | None | Returns full roster of registered system users. |
| `PATCH` | `/api/auth/users/:userId` | Admin | Partial User fields JSON | Updates personal, contact, deployment, and account status fields. |
| `POST` | `/api/auth/users/:userId/photo` | Admin | `multipart/form-data` (`photo`) | Uploads personnel profile image; returns updated photo URL. |
| `PATCH` | `/api/auth/users/:userId/status` | Admin | `{ status: "APPROVED" \| "DISABLED" }` | Soft-toggles user operational status. |
| `POST` | `/api/auth/register-officer` | Admin | Officer registration JSON | Creates new Field Officer account with immediate `APPROVED` status. |
| `POST` | `/api/auth/register-operator` | Admin | Operator registration JSON | Creates new Vehicle Operator account with immediate `APPROVED` status. |
| `GET` | `/api/road-segments` | Yes | None | Returns all surveyed road segments with GeoJSON geometries and risk scores. |
| `GET` | `/api/road-segments/:id` | Yes | Path ID | Returns single road segment details. |
| `POST` | `/api/analyze-photo` | Yes | `multipart/form-data` (`photo`) | Executes Gemini Vision / heuristic analysis; returns hazard severity and debris %. |
| `POST` | `/api/road-incidents` | Yes | `multipart/form-data` (GPS, photo, slope, rain, blockage) | Creates incident, invokes risk engine, emits WebSocket event, creates alert. |
| `GET` | `/api/road-incidents` | Yes | None | Returns all logged road incidents. |
| `GET` | `/api/road-incidents/:id` | Yes | Path ID | Returns specific incident report. |
| `GET` | `/api/risk-predictions` | Yes | None | Returns frozen ML risk prediction audit logs. |
| `GET` | `/api/alerts` | Yes | None | Returns active emergency alerts list. |
| `POST` | `/api/alerts` | Yes | `{ message, severity, district, lat, lon }` | Broadcasts manual alert; emits `alert_created` WebSocket event. |
| `PATCH` | `/api/alerts/:id/acknowledge` | Yes | None | Acknowledges alert for the logged-in officer. |
| `GET` | `/api/vehicles` | Yes | None | Returns full vehicle fleet roster and telemetries. |
| `POST` | `/api/vehicles` | Yes | Vehicle JSON | Registers new vehicle to fleet. |
| `PATCH` | `/api/vehicles/:id` | Yes | Partial Vehicle JSON | Updates vehicle status, coordinates, or driver assignment. |
| `POST` | `/api/route-risk` | Yes | `{ points: [{ lat, lon }, ...] }` | Batches 20 route points to risk engine; returns stretch risk % and hazard scores. |
| `GET` | `/api/landslide/risk` | Yes | `?lat={lat}&lon={lon}` | Evaluates single-point coordinates against DEM rasters and ML model. |
| `GET` | `/api/critical-roads` | Yes | None | Returns 9 precomputed topological cut-edge corridors with cutoff counts. |
| `GET` | `/api/forecast-risk` | Yes | `?lat={lat}&lon={lon}` | Queries Open-Meteo precipitation models with 30-min cache. |
| `GET` | `/api/geocode` | Yes | `?q={query}` | Proxies text searches to OpenStreetMap Nominatim. |
| `GET` | `/api/geocode/reverse` | Yes | `?lat={lat}&lon={lon}` | Reverse-geocodes coordinates into road and settlement names. |
| `GET` | `/api/settings` | Yes | None | Retrieves operational threshold configuration. |
| `PATCH` | `/api/settings` | Yes | Partial settings JSON | Updates threshold parameters. |

---

## 9. Installation, Environment & Execution Runbook

### 9.1 Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Python:** v3.9+ with virtual environment tools (`venv`)
- **MongoDB Atlas Connection:** Active URI string or local MongoDB instance.

### 9.2 Step-by-Step Installation

```bash
# 1. Clone repository
git clone https://github.com/dipti-2211/Cloud9.git
cd Cloud9

# 2. Install root, backend, and frontend dependencies
npm run install:all

# 3. Seed personnel (3 Field Officers + 6 Vehicle Operators with custom SVG avatars)
cd backend
node scripts/seedPersonnel.js
cd ..

# 4. Start concurrent development servers (Backend :1710 + Frontend :5173)
npm run dev
```

The web application is now live at:
- **Frontend SPA:** `http://localhost:5173`
- **Backend API Gateway:** `http://localhost:1710`
- **Backend Health Check:** `http://localhost:1710/health`

---

### 9.3 Environment Variables Reference

Create `backend/.env`:
```env
# Server Port
PORT=1710

# Database URI (MongoDB Atlas Cluster)
MONGO_URL=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cloud9?retryWrites=true&w=majority

# Cryptographic Secret for JWT
JWT_SECRET=supersecretjwtkey_ner_logistics_2026

# Seed Admin Credentials
ADMIN_USER_ID=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@cloud9.ner

# Client Origins
FRONTEND_URL=http://localhost:5173

# Python Risk Engine Address
RISK_ENGINE_URL=http://localhost:8000

# Optional: Google Gemini Vision API Key for automated field photo AI analysis
GEMINI_API_KEY=AIzaSyYourKeyHere
```

---

### 9.4 Running the Python ML Microservice

```bash
cd risk-engine

# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 3. Verify dataset assets in data/
# Ensure DEM.tif, slope.tif, aspect.tif, dist_to_road.tif, and landslide_model.pkl exist

# 4. Start FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```

FastAPI documentation will be accessible at `http://localhost:8000/docs`.

---

### 9.5 Default Login Credentials

| Role | User Identifier | Password | Access Privileges |
|---|---|---|---|
| **System Administrator** | `admin` | `admin123` | Complete Command Access, Fleet Control, Personnel Roster, Thresholds. |
| **Senior Field Officer** | `OFC-1042` | `officer123` | Road Hazard Inspection, GPS Incident Reports, Photo Uploads, Alerts. |
| **Vehicle Operator** | `VOP-2317` | `operator123` | Turn-by-Turn Routing HUD, Delivery Manifests, Off-Route GPS Navigation. |

---

*Cloud9 — Engineering Resilient Supply Chains & Safeguarding Lives Across India's North Eastern Mountain Corridors.*
