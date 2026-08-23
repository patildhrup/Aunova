"""FastAPI application — Unilog Product Intelligence Pipeline."""

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Lifespan — initialize data layer once ───────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app import data_layer
    logger.info("Initializing data layer...")
    data_layer.initialize()
    logger.info("Data layer ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Unilog Product Intelligence Pipeline",
    version="1.0.0",
    description="AI-powered product data enrichment pipeline",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic models ──────────────────────────────────────────────────────────

class InputRow(BaseModel):
    Mfg_Part_Num: Optional[str] = None
    Part_Desc: Optional[str] = None
    E1_Brand: Optional[str] = None
    Unilog_Brand: Optional[str] = None
    DIB_Brand: Optional[str] = None
    Part_Manuf: Optional[str] = None


class BatchRequest(BaseModel):
    rows: list[InputRow]


class PipelineOptions(BaseModel):
    rows: list[InputRow]
    stages: list[str] = ["brand", "classify", "extract", "describe"]
    fuzzy_threshold: int = 75


class EvaluateRequest(BaseModel):
    predicted_rows: list[dict[str, Any]]


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    from app import data_layer
    state = data_layer.get_state()
    return {
        "status": "ok",
        "manufacturer_count": len(state.get("manufacturers", [])),
        "lov_classpaths": list(state.get("lov", {}).keys()),
        "ground_truth_rows": len(state.get("ground_truth", [])),
        "sample_input_rows": len(state.get("sample_input", [])),
    }


# ─── Sample data endpoints ────────────────────────────────────────────────────

@app.get("/api/sample-input")
async def get_sample_input(limit: int = 50):
    """Return rows from the sample input CSV."""
    from app import data_layer
    df = data_layer.get_sample_input()
    if df.empty:
        raise HTTPException(status_code=404, detail="Sample input not loaded")
    rows = df.head(limit).fillna("").to_dict(orient="records")
    return {"rows": rows, "total": len(df)}


@app.get("/api/ground-truth")
async def get_ground_truth(limit: int = 10):
    """Return rows from the ground truth CSV."""
    from app import data_layer
    df = data_layer.get_ground_truth()
    if df.empty:
        raise HTTPException(status_code=404, detail="Ground truth not loaded")
    rows = df.head(limit).fillna("").to_dict(orient="records")
    return {"rows": rows, "total": len(df)}


# ─── Stage endpoints ──────────────────────────────────────────────────────────

@app.post("/api/resolve-brand")
async def resolve_brand_endpoint(request: BatchRequest):
    """Stage 1: Resolve manufacturer and brand names."""
    from app.pipeline import brand_resolver
    rows = [r.model_dump() for r in request.rows]
    resolved = brand_resolver.resolve_batch(rows)
    return {"results": resolved, "stage": "brand_resolution"}


@app.post("/api/classify")
async def classify_endpoint(request: BatchRequest):
    """Stage 2: Classify rows into Dept/Class/Fine/Classpath."""
    from app.pipeline import classifier
    rows = [r.model_dump() for r in request.rows]
    classified = classifier.classify_batch(rows)
    return {"results": classified, "stage": "classification"}


@app.post("/api/extract")
async def extract_endpoint(request: BatchRequest):
    """Stage 3: Extract LOV-constrained attributes."""
    from app.pipeline import attribute_extractor
    rows = [r.model_dump() for r in request.rows]
    extracted = attribute_extractor.extract_batch(rows)
    return {"results": extracted, "stage": "attribute_extraction"}


@app.post("/api/describe")
async def describe_endpoint(request: BatchRequest):
    """Stage 4: Generate 5 description formats."""
    from app.pipeline import description_generator
    rows = [r.model_dump() for r in request.rows]
    described = description_generator.generate_batch(rows)
    return {"results": described, "stage": "description_generation"}


# ─── Full pipeline ────────────────────────────────────────────────────────────

@app.post("/api/pipeline/run")
async def run_pipeline(request: PipelineOptions):
    """Run the full enrichment pipeline: brand → classify → extract → describe."""
    from app.pipeline import brand_resolver, classifier, attribute_extractor, description_generator

    rows = [r.model_dump() for r in request.rows]
    stages_run = []
    stage_outputs: dict[str, list[dict]] = {}

    # ── Stage 1: Brand resolution ─────────────────────────────────────────────
    if "brand" in request.stages:
        rows = brand_resolver.resolve_batch(rows, threshold=request.fuzzy_threshold)
        stages_run.append("brand_resolution")
        stage_outputs["brand_resolution"] = [
            {k: v for k, v in r.items() if k in [
                "Mfg_Part_Num", "MANUFACTURER_NAME", "BRAND_NAME",
                "match_score", "match_method", "confidence"
            ]}
            for r in rows
        ]

    # ── Stage 2: Classification ───────────────────────────────────────────────
    if "classify" in request.stages:
        rows = classifier.classify_batch(rows)
        stages_run.append("classification")
        stage_outputs["classification"] = [
            {k: v for k, v in r.items() if k in [
                "Mfg_Part_Num", "Dept", "Class", "Fine", "Classpath",
                "classify_method", "classify_confidence"
            ]}
            for r in rows
        ]

    # ── Stage 3: Attribute extraction ─────────────────────────────────────────
    if "extract" in request.stages:
        rows = attribute_extractor.extract_batch(rows)
        stages_run.append("attribute_extraction")
        stage_outputs["attribute_extraction"] = [
            {k: v for k, v in r.items() if k in [
                "Mfg_Part_Num", "attributes", "unmapped_values",
                "extraction_confidence", "lov_compliance_pct"
            ]}
            for r in rows
        ]

    # ── Stage 4: Description generation ──────────────────────────────────────
    if "describe" in request.stages:
        rows = description_generator.generate_batch(rows)
        stages_run.append("description_generation")

    # ── Confidence score per row ──────────────────────────────────────────────
    review_threshold = float(os.getenv("CONFIDENCE_REVIEW_THRESHOLD", "60"))
    for row in rows:
        brand_conf = float(row.get("confidence", 0))
        classify_conf = float(row.get("classify_confidence", 0))
        lov_pct = float(row.get("lov_compliance_pct", 0))
        attr_count = len(row.get("attributes", []))

        overall_conf = (brand_conf * 0.4 + classify_conf * 0.3 + lov_pct * 0.3)
        row["pipeline_confidence"] = round(overall_conf, 1)
        row["needs_review"] = overall_conf < review_threshold
        row["review_reasons"] = []

        if brand_conf < 50:
            row["review_reasons"].append("Low brand match confidence")
        if classify_conf < 50:
            row["review_reasons"].append("Low classification confidence")
        if lov_pct < 80:
            row["review_reasons"].append("Low LOV compliance")
        if attr_count == 0:
            row["review_reasons"].append("No attributes extracted")

    needs_review_count = sum(1 for r in rows if r.get("needs_review", False))

    return {
        "results": rows,
        "stages_run": stages_run,
        "stage_outputs": stage_outputs,
        "summary": {
            "total_rows": len(rows),
            "needs_review_count": needs_review_count,
            "avg_confidence": round(
                sum(r.get("pipeline_confidence", 0) for r in rows) / len(rows), 1
            ) if rows else 0,
        },
    }


# ─── Evaluation ───────────────────────────────────────────────────────────────

@app.post("/api/evaluate")
async def evaluate_endpoint(request: EvaluateRequest):
    """Score predicted rows against ground truth and return accuracy metrics."""
    from app.pipeline import evaluator
    metrics = evaluator.evaluate_batch(request.predicted_rows)
    return metrics


# ─── CSV upload ───────────────────────────────────────────────────────────────

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Accept a CSV upload and return parsed rows."""
    import io
    import pandas as pd

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")), low_memory=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # Return only input-relevant columns that exist
    desired_cols = ["Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf"]
    available_cols = [c for c in desired_cols if c in df.columns]
    if not available_cols:
        available_cols = list(df.columns[:6])

    rows = df[available_cols].fillna("").head(200).to_dict(orient="records")
    return {"rows": rows, "total_in_file": len(df), "columns": available_cols}
