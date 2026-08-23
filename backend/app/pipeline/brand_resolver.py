"""Brand/Manufacturer resolution pipeline stage."""

import re
import logging
from typing import Optional

from rapidfuzz import fuzz, process

from app import data_layer

logger = logging.getLogger(__name__)

# Code patterns like "(2435)" or "(JAMIN)" at end of Part_Manuf strings
_CODE_PATTERN = re.compile(r"\s*\(\w+\)\s*$")

FUZZY_THRESHOLD = 75  # configurable via env


def _strip_code(raw: str) -> str:
    """Remove supplier codes like '(2435)' from Part_Manuf."""
    return _CODE_PATTERN.sub("", raw).strip()


def _clean_brand_placeholder(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    placeholders = {
        "-- unbranded --", "-- no unilog brand --", "-- no dib brand --",
        "--unbranded--", "--no unilog brand--", "--no dib brand--",
    }
    if str(val).strip().lower() in placeholders:
        return None
    stripped = str(val).strip()
    return stripped if stripped else None


def resolve_brand(
    part_manuf: Optional[str],
    e1_brand: Optional[str],
    threshold: int = FUZZY_THRESHOLD,
) -> dict:
    """
    Resolve a raw manufacturer/brand pair to canonical names.

    Returns:
        {
            "MANUFACTURER_NAME": str | None,
            "BRAND_NAME": str | None,
            "match_score": float,
            "match_method": str,   # "exact" | "fuzzy" | "desc_brand" | "none"
            "confidence": float,   # 0-100
        }
    """
    choices = data_layer.get_manufacturer_choices()
    manufacturers = data_layer.get_manufacturers()

    # Clean inputs
    clean_manuf = _clean_brand_placeholder(part_manuf)
    clean_brand = _clean_brand_placeholder(e1_brand)

    result = {
        "MANUFACTURER_NAME": None,
        "BRAND_NAME": None,
        "match_score": 0.0,
        "match_method": "none",
        "confidence": 0.0,
    }

    if not clean_manuf and not clean_brand:
        return result

    # Strip supplier codes from Part_Manuf for cleaner matching
    query = _strip_code(clean_manuf) if clean_manuf else clean_brand

    if not query or not choices:
        # Fall back to raw string as manufacturer name
        result["MANUFACTURER_NAME"] = query
        result["BRAND_NAME"] = clean_brand
        result["match_method"] = "none"
        result["confidence"] = 30.0
        return result

    # ── Exact match (case-insensitive) ────────────────────────────────────────
    for i, choice in enumerate(choices):
        if choice.lower() == query.lower():
            canon_manuf, canon_brand = manufacturers[i]
            result["MANUFACTURER_NAME"] = canon_manuf
            result["BRAND_NAME"] = canon_brand or clean_brand or canon_manuf
            result["match_score"] = 100.0
            result["match_method"] = "exact"
            result["confidence"] = 100.0
            return result

    # ── Fuzzy match ───────────────────────────────────────────────────────────
    match = process.extractOne(
        query,
        choices,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold,
    )

    if match:
        matched_name, score, idx = match
        canon_manuf, canon_brand = manufacturers[idx]
        result["MANUFACTURER_NAME"] = canon_manuf
        result["BRAND_NAME"] = canon_brand or clean_brand or canon_manuf
        result["match_score"] = float(score)
        result["match_method"] = "fuzzy"
        result["confidence"] = float(score)
        logger.debug(f"Fuzzy match: '{query}' → '{canon_manuf}' (score={score})")
        return result

    # ── No match — use cleaned raw string ─────────────────────────────────────
    result["MANUFACTURER_NAME"] = query
    # If brand field has a clean value, use it; otherwise use manufacturer name
    result["BRAND_NAME"] = clean_brand if clean_brand else query
    result["match_score"] = 0.0
    result["match_method"] = "none"
    result["confidence"] = 25.0
    logger.debug(f"No fuzzy match for '{query}' above threshold {threshold}")
    return result


def resolve_batch(rows: list[dict], threshold: int = FUZZY_THRESHOLD) -> list[dict]:
    """Resolve brand/manufacturer for a list of input row dicts."""
    results = []
    for row in rows:
        res = resolve_brand(
            part_manuf=row.get("Part_Manuf"),
            e1_brand=row.get("E1_Brand"),
            threshold=threshold,
        )
        results.append({**row, **res})
    return results
