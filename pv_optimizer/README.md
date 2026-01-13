# PV + Wind + Battery System Optimizer

A web application for optimizing photovoltaic (PV) solar systems combined with wind turbines and battery energy storage systems (BESS).

**Becquerel Institute Italia**

## Architecture

```
pv-optimizer/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI application & endpoints
│   │   ├── models.py       # Pydantic models for API
│   │   └── calculations.py # Core optimization logic
│   └── requirements.txt
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── PVOptimizer.jsx # Main UI component
│   │   └── api.js          # API service layer
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

To stop the containers:
```bash
docker-compose down
```

### Option 2: Manual Setup

#### 1. Start the Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- OpenAPI spec: `http://localhost:8000/openapi.json`

#### 2. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/optimize` | POST | Run optimization (self-consumption or NPV) |
| `/api/simulate` | POST | Simulate specific system configuration |
| `/api/generate-load-profile` | POST | Generate synthetic load profile |
| `/api/generate-export-tariff` | POST | Generate export tariff profile |
| `/api/upload/demand-profile` | POST | Upload custom demand CSV |
| `/api/upload/pv-generation-profile` | POST | Upload custom PV generation CSV |
| `/api/upload/wind-generation-profile` | POST | Upload custom wind generation CSV |
| `/api/upload/export-tariff-profile` | POST | Upload custom export tariff CSV |

## Features

- **Optimization Modes**:
  - Maximize self-consumption ratio
  - Maximize 20-year Net Present Value (NPV)

- **Simulation Mode**: Analyze specific system configurations

- **Custom Profiles**: Upload 8760-hour CSV files for:
  - Demand profiles
  - PV generation profiles
  - Wind generation profiles
  - Export tariff profiles

- **Financial Analysis**:
  - 20-year cash flow projections
  - Battery replacement at years 8 and 16
  - Discount rate for NPV calculations

## CSV File Format

All CSV files must contain exactly **8760 values** (one per hour of the year).

Example format:
```csv
1.5
2.3
1.8
...
```

## Technology Stack

### Backend
- FastAPI
- Pydantic
- NumPy
- Uvicorn

### Frontend
- React 19
- Vite
- Recharts
- Fetch API

## Development

### Backend Development

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

## License

Becquerel Institute Italia - All rights reserved.
