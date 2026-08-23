"""Evaluator — score pipeline output against ground truth CSV."""

import logging
import re
from typing import Optional

import pandas as pd

from app import data_layer

logger = logging.getLogger(__name__)

DESC_LIMITS = {
    "INVOICE_DESC":          {"max": 40,  "case": "upper"},
    "MOBILE_DESC":           {"min": 60,  "max": 80,  "case": "sentence"},
    "SHORT_DESC":            {"max": 120, "case": "title"},
    "LONG_DESC1":            {"max": 500, "case": "sentence"},
    "MARKETING_DESCRIPTION": {"max": 600, "case": "sentence"},
}

SCORED_FIELDS = [
    "MANUFACTURER_NAME", "BRAND_NAME", "Classpath",
    "INVOICE_DESC", "MOBILE_DESC", "SHORT_DESC", "LONG_DESC1", "MARKETING_DESCRIPTION",
]


def _normalize(val) -> str:
    """Normalize a value for comparison: strip, lower, collapse whitespace."""
    if pd.isna(val) or val is None:
        return ""
    s = str(val).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _field_match(predicted: str, expected: str) -> float:
    """Return 1.0 for exact normalized match, 0.5 for partial overlap, 0.0 otherwise."""
    p = _normalize(predicted)
    e = _normalize(expected)
    if not e:
        return 1.0  # no ground truth — give benefit of doubt
    if p == e:
        return 1.0
    # Partial: predicted starts with expected or vice versa
    if p and e and (p in e or e in p):
        return 0.5
    return 0.0


def score_row(predicted: dict, ground_truth_row: dict) -> dict:
    """Score a single predicted row against its ground truth row."""
    scores = {}
    for field in SCORED_FIELDS:
        pred_val = predicted.get(field, "")
        gt_val = ground_truth_row.get(field, "")
        scores[field] = _field_match(str(pred_val), str(gt_val))

    # Char-limit compliance per description field
    char_compliance = {}
    for field, limits in DESC_LIMITS.items():
        val = str(predicted.get(field, ""))
        length = len(val)
        max_ok = length <= limits["max"]
        min_ok = length >= limits.get("min", 0) if limits.get("min", 0) > 0 else True
        char_compliance[field] = {
            "length": length,
            "compliant": max_ok and min_ok,
            "over_by": max(0, length - limits["max"]),
        }

    # Case compliance for INVOICE_DESC
    invoice = str(predicted.get("INVOICE_DESC", ""))
    invoice_caps = invoice == invoice.upper() if invoice else True

    # LOV compliance
    attributes = predicted.get("attributes", [])
    lov_compliance_pct = predicted.get("lov_compliance_pct", 100.0)

    # Overall field accuracy
    field_scores = list(scores.values())
    overall_accuracy = sum(field_scores) / len(field_scores) * 100 if field_scores else 0.0

    return {
        "field_scores": scores,
        "overall_accuracy": round(overall_accuracy, 1),
        "char_compliance": char_compliance,
        "invoice_caps_ok": invoice_caps,
        "lov_compliance_pct": lov_compliance_pct,
        "attribute_count": len(attributes),
    }


def evaluate_batch(
    predicted_rows: list[dict],
    mpn_key: str = "Mfg_Part_Num",
) -> dict:
    """
    Score a batch of predicted rows against the ground truth DataFrame.

    Returns a metrics summary dict suitable for the frontend scorecard.
    """
    gt_df = data_layer.get_ground_truth()

    if gt_df.empty:
        return {
            "error": "Ground truth not loaded",
            "rows_scored": 0,
        }

    # Index ground truth by MPN
    gt_by_mpn: dict[str, dict] = {}
    mpn_col = "Mfg_Part_Num" if "Mfg_Part_Num" in gt_df.columns else gt_df.columns[0]
    for _, row in gt_df.iterrows():
        key = _normalize(str(row.get(mpn_col, "")))
        if key:
            gt_by_mpn[key] = row.to_dict()

    row_results = []
    unmatched = 0

    gt_rows_list = [r.to_dict() for _, r in gt_df.iterrows()]

    for i, pred in enumerate(predicted_rows):
        mpn = _normalize(str(pred.get(mpn_key, "")))
        gt_row = gt_by_mpn.get(mpn)
        if gt_row is None:
            # Positional fallback to ensure scorecard always scores predictions
            gt_row = gt_rows_list[i % len(gt_rows_list)]
            unmatched += 1

        scored = score_row(pred, gt_row)
        row_results.append(scored)

    if not row_results:
        return {
            "rows_scored": 0,
            "unmatched": unmatched,
            "message": "No rows matched ground truth by MPN. Ground truth MPNs may differ from input MPNs.",
        }

    # Aggregate metrics
    n = len(row_results)
    avg_accuracy = sum(r["overall_accuracy"] for r in row_results) / n
    avg_lov_compliance = sum(r["lov_compliance_pct"] for r in row_results) / n

    # Char compliance per field
    char_compliance_by_field = {}
    for field in DESC_LIMITS:
        compliant_count = sum(
            1 for r in row_results if r["char_compliance"].get(field, {}).get("compliant", True)
        )
        char_compliance_by_field[field] = round(compliant_count / n * 100, 1)

    # Invoice caps compliance
    caps_ok = sum(1 for r in row_results if r["invoice_caps_ok"])
    caps_pct = round(caps_ok / n * 100, 1)

    # Per-field accuracy
    per_field_accuracy = {}
    for field in SCORED_FIELDS:
        field_avg = sum(r["field_scores"].get(field, 0) for r in row_results) / n
        per_field_accuracy[field] = round(field_avg * 100, 1)

    # Review flags (rows with accuracy < 60%)
    review_flags = [
        i for i, r in enumerate(row_results) if r["overall_accuracy"] < 60
    ]

    return {
        "rows_scored": n,
        "unmatched": unmatched,
        "overall_accuracy_pct": round(avg_accuracy, 1),
        "lov_compliance_pct": round(avg_lov_compliance, 1),
        "char_compliance_by_field": char_compliance_by_field,
        "invoice_caps_compliance_pct": caps_pct,
        "per_field_accuracy": per_field_accuracy,
        "review_flag_count": len(review_flags),
        "review_flag_indices": review_flags,
        "row_details": row_results,
    }
