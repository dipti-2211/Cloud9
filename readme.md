# Cloud9 — NER Logistics Intelligence Platform

AI-powered logistics and accessibility intelligence platform for India's **North Eastern Region (NER)**, combining GIS mapping, ML-based landslide disruption prediction, route optimization, GPS tracking, auth-protected dashboards, and real-time field intelligence.

---

## 📁 Project Structure

```
Cloud9/
├── backend/               → Node.js + Express API (JWT auth, MongoDB)
├── frontend/              → React + Vite web app (13 pages, full CRUD)
├── risk-engine/           → Python FastAPI ML micro-service (landslide predictor)
├── datasets/              → ML training datasets & pre-trained model
│   ├── DEM.tif            → Digital Elevation Model (Dima Hasao, Assam)
│   ├── landslide_model.pkl→ Pre-trained RandomForest classifier
│   └── landslide_points.csv
└── Cloud9ipynb.ipynb      → Jupyter notebook (model training)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.9+ (for the risk-engine only)
- **MongoDB** (optional — backend auto-starts an embedded MongoDB if none is running)

### 1. Clone and install all dependencies

```bash
git clone https://github.com/dipti-2211/Cloud9.git
cd Cloud9
npm install           # installs concurrently at root
npm run install:all   # installs backend + frontend dependencies
```

### 2. Configure the backend

Copy `.env.example` to `.env` and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Default values that work out-of-the-box:

```env
PORT=1710
MONGO_URL=mongodb://127.0.0.1:27017/ner_logistics
JWT_SECRET=supersecretjwtkey_ner_logistics_2026
ADMIN_USER_ID=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@example.com
FRONTEND_URL=http://localhost:5173
RISK_ENGINE_URL=http://localhost:8000
```

> **No MongoDB?** Don't worry — the backend automatically launches an embedded MongoDB engine with local persistence in `backend/.mongodb_data/`.

### 3. Seed the admin user

```bash
npm run seed:admin
```

This creates the initial admin account with the credentials from your `.env` file.

### 4. Run the application

```bash
npm run dev
```

This starts both **backend** (`:1710`) and **frontend** (`:5173`) concurrently.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:1710 |
| Health Check | http://localhost:1710/health |
| Risk Engine | http://localhost:8000 (optional) |

---

## 🔑 Default Credentials

| Role | User ID | Password |
|------|---------|----------|
| Admin | `admin` | `admin123` |

> Change these in `backend/.env` before deploying.

---

## 🧠 Risk Engine (Landslide Predictor)

The risk-engine is an **optional** Python FastAPI micro-service. The frontend works without it but landslide prediction features will be unavailable.

### Setup

```bash
cd risk-engine
python3 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy data files from datasets/
cp ../datasets/DEM.tif data/
cp ../datasets/landslide_model.pkl data/

# Run the one-time precompute step
pip install -r requirements-dev.txt
python scripts/precompute_layers.py

# Start the API
uvicorn main:app --reload --port 8000
```

See [`risk-engine/README.md`](./risk-engine/README.md) for full documentation.

---

## 🔌 API Overview

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | Login (returns JWT) |
| `/api/auth/register-officer` | POST | Register field officer |
| `/api/auth/register-operator` | POST | Register vehicle operator |
| `/api/auth/pending-approvals` | GET | Admin: list pending users |
| `/api/vehicles` | GET, POST, PATCH, DELETE | Vehicle management |
| `/api/roads` | GET, POST, PATCH, DELETE | Road status management |
| `/api/incidents` | GET, POST, PATCH, DELETE | Incident logging |
| `/api/deliveries` | GET, POST, PATCH, DELETE | Delivery tracking |
| `/api/alerts` | GET, POST, DELETE | Landslide alerts |
| `/api/landslide` | GET | Proxy to risk-engine predict |
| `/api/route-risk` | POST | Route risk assessment |
| `/api/geocode` | GET | Forward geocoding |
| `/api/settings` | GET, PATCH | User settings |

---

## 🛠️ Available npm Scripts (from root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend together (dev mode) |
| `npm run start` | Start backend + frontend together (production mode) |
| `npm run backend` | Start backend only |
| `npm run frontend` | Start frontend only |
| `npm run seed:admin` | Seed the admin user |
| `npm run seed:demo-alerts` | Seed demo alert data (historical landslide points) |
| `npm run install:all` | Install all dependencies (root + backend + frontend) |

---

## 👥 Team — Cloud9

| Member | Role |
|--------|------|
| Dipti Singh | Integration, ML datasets |
| Masoom | Frontend, connected dataset |
| Sounak | Full backend, auth system |