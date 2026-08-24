# Aunova

Aunova is an AI-powered product intelligence platform that transforms raw product data into enriched, structured catalog-ready output. It resolves manufacturer and brand names, classifies products into a taxonomy, extracts attribute values from product descriptions, generates publication-ready descriptions, and evaluates result quality against ground-truth data.

The project combines a FastAPI backend with a React + Vite frontend, designed for catalog enrichment and operational review workflows.

## Live Demo

- Web app: https://aunova.vercel.app/
- Demo video: https://www.youtube.com/watch?v=0XT_lQtAQ2Y

## Why Aunova

Modern product catalogs often contain messy, inconsistent, incomplete SKUs and descriptions. Aunova helps teams:

- standardize manufacturer and brand references
- classify products into the correct department, class, fine class, and classpath
- extract structured attributes constrained to a controlled vocabulary
- generate consistent product descriptions
- review confidence and accuracy through an interactive dashboard

---

## Key Features

### 1. Brand and manufacturer resolution
- normalizes raw manufacturer/brand values
- handles aliases, fuzzy matches, and placeholder values
- scores match confidence and tracks resolution method

### 2. Product classification
- maps product descriptions to taxonomy levels such as Department, Class, Fine, and Classpath
- uses keyword-based logic and catalog-specific rules
- produces confidence metadata for downstream review

### 3. Attribute extraction
- identifies and extracts structured product attributes from short product descriptions
- validates values against a list of allowed values (LOV)
- tracks compliance and extraction confidence

### 4. Description generation
- creates product descriptions in structured output formats
- supports both formulaic and LLM-driven generation patterns
- produces market-ready text while staying within the provided attribute constraints

### 5. Evaluation layer
- compares generated results with ground-truth output
- calculates accuracy metrics such as overall accuracy and score breakdowns
- helps measure pipeline reliability before production use

### 6. Dashboard experience
- upload CSV files or load sample datasets
- preview raw vs enriched rows
- run stages individually or run the full pipeline
- inspect pipeline results and scoring metrics
- review row-level explainability and curated output

### 7. Authentication and user flows
- signup/login via Supabase auth
- protected dashboard routes
- secure session-based access for enterprise usage

---

## Tech Stack

### Backend
- Python 3.10+
- FastAPI
- Pydantic
- Pandas
- RapidFuzz
- LangChain / OpenAI integration support
- Supabase client

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Framer Motion
- Lucide Icons

### Data & Integration
- CSV-based sample and expected output datasets
- Supabase authentication and profile management
- structured product enrichment pipeline with review workflow

---

## Project Structure

```text
Aunova/
├── README.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── data_layer.py
│   │   ├── main.py
│   │   └── pipeline/
│   │       ├── __init__.py
│   │       ├── attribute_extractor.py
│   │       ├── brand_resolver.py
│   │       ├── classifier.py
│   │       ├── description_generator.py
│   │       └── evaluator.py
│   ├── data/
│   │   ├── Unihack_ Expected Output - Delivery Format.csv
│   │   └── Unihack_ Sample Dataset - Input.csv
│   ├── requirements.txt
│   ├── supabase_setup.sql
│   └── test_pipeline.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── lib/
│       ├── pages/
│       ├── App.tsx
│       ├── index.css
│       └── main.tsx
└── ...
```

---

## Architecture Overview

Aunova follows a simple pipeline architecture:

1. Data ingestion
   - CSV upload or sample dataset load
   - input rows are normalized to a common product schema

2. Pipeline execution
   - brand resolution
   - classification
   - attribute extraction
   - description generation

3. Review and evaluation
   - dashboard visualizes results and quality indicators
   - scorecard compares predictions to ground truth
   - users can curate and inspect row-level output

4. Authentication and user access
   - login/signup flow through Supabase
   - protected access to the dashboard experience

---

## Backend Flow

The backend is served by FastAPI and exposes endpoints for:

- health checks
- sample dataset retrieval
- ground-truth dataset retrieval
- batch brand resolution
- product classification
- attribute extraction
- description generation
- full pipeline execution
- evaluation against the expected output
- CSV file upload

The main application entry point is:

- backend/app/main.py

Core data initialization logic is handled in:

- backend/app/data_layer.py

---

## Frontend Flow

The frontend is a Vite application with an interactive dashboard.

Users can:

- upload a CSV file
- select product rows
- run the enrichment pipeline
- compare input and enriched output
- evaluate score quality
- view insights and summary metrics

The dashboard is built around the following high-level flow:

- Data tab: load and review product rows
- Pipeline tab: monitor stage completion and preview enriched output
- Results tab: view the enriched dataset
- Scorecard tab: review model evaluation metrics

---

## Getting Started

### Prerequisites

Make sure you have installed:

- Python 3.10+
- Node.js 18+
- npm or yarn
- Git

---

## Backend Setup

From the project root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder if needed for environment-based configuration, including Supabase credentials or other runtime secrets.

### Run the backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- http://localhost:8000
- health endpoint: http://localhost:8000/api/health

---

## Frontend Setup

From the project root:

```bash
cd frontend
npm install
```

### Run the frontend locally

```bash
cd frontend
npm run dev
```

Then open the local Vite URL shown in the terminal, typically:

- http://localhost:5173

---

## Environment Variables

### Backend
Examples of variables commonly used by the app include:

```env
SUPABASE_PROJECT_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
CONFIDENCE_REVIEW_THRESHOLD=60
```

### Frontend
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> If Supabase is not configured, the app may still run in a limited local mode depending on the environment and data availability.

---

## Sample Data

This project includes sample CSV files for testing and demonstration:

- backend/data/Unihack_ Sample Dataset - Input.csv
- backend/data/Unihack_ Expected Output - Delivery Format.csv

These datasets are used to evaluate and validate the enrichment pipeline.

---

## Pipeline Stages

The product intelligence pipeline is structured as follows:

### Stage 1: Brand Resolution
- resolves manufacturer names and brand aliases
- aligns naming conventions to canonical identifiers
- uses fuzzy matching and confidence scoring

### Stage 2: Classification
- identifies product category and classpath
- maps items to standard product taxonomy

### Stage 3: Attribute Extraction
- extracts relevant product attributes from descriptions
- validates attribute values according to known restrictions

### Stage 4: Description Generation
- generates clean product descriptions from structured metadata

### Stage 5: Evaluation
- calculates metrics for prediction quality
- supports confidence and review-driven quality checks

---
---

### 🚀 Happy Coding! 💻

