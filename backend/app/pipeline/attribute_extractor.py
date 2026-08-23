"""Attribute extraction pipeline stage — LOV-constrained LLM extraction."""

import json
import logging
import os
from typing import Optional

from app import data_layer

logger = logging.getLogger(__name__)

MAX_RETRIES = 1  # retry once on invalid output, then fall back


def _build_lov_prompt_block(lov: list[dict]) -> str:
    """Render the allowed_attributes block for the prompt."""
    items = []
    for attr in lov:
        label = attr["label"]
        allowed = attr.get("allowed_values", [])
        if allowed:
            items.append({"label": label, "allowed_values": allowed})
        else:
            items.append({"label": label, "allowed_values": ["<any value>"]})
    return json.dumps(items, indent=2)


def _validate_extraction(extracted: list[dict], lov: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Validate extracted attributes against the LOV.

    Returns:
        (valid_attrs, unmapped_values)
    """
    lov_index = {a["label"].lower(): a for a in lov}
    valid = []
    unmapped = []

    for attr in extracted:
        label = str(attr.get("label", "")).strip()
        value = str(attr.get("value", "")).strip()
        raw_uom = attr.get("raw_uom")

        # Check label exists in LOV
        lov_entry = lov_index.get(label.lower())
        if lov_entry is None:
            unmapped.append(f"{label}={value}")
            continue

        # Check value is in allowed list (if list is non-empty and not <any value>)
        allowed = [v for v in lov_entry.get("allowed_values", []) if v != "<any value>"]
        if allowed and value not in allowed:
            unmapped.append(f"{label}={value}")
            continue

        # Normalize UOM
        normalized_uom = data_layer.normalize_uom(raw_uom) if raw_uom else None

        valid.append({
            "label": lov_entry["label"],  # use canonical casing from LOV
            "value": value,
            "uom": normalized_uom,
            "raw_uom": raw_uom,
        })

    return valid, unmapped


def extract_attributes(
    part_desc: str,
    classpath: str,
    mfg_part_num: Optional[str] = None,
) -> dict:
    """
    Extract LOV-constrained attributes from a product description.

    Returns:
        {
            "attributes": [{"label": str, "value": str, "uom": str|None}],
            "unmapped_values": [str],
            "extraction_confidence": "high" | "medium" | "low",
            "lov_compliance_pct": float,
        }
    """
    lov = data_layer.get_lov_for_classpath(classpath)

    if not lov:
        return {
            "attributes": [],
            "unmapped_values": [],
            "extraction_confidence": "low",
            "lov_compliance_pct": 0.0,
        }

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("sk-..."):
        # No LLM — run rule-based extraction
        return _rule_based_extraction(part_desc, lov, mfg_part_num)

    return _llm_extraction(part_desc, classpath, lov, mfg_part_num, retries=MAX_RETRIES)


def _llm_extraction(
    part_desc: str,
    classpath: str,
    lov: list[dict],
    mfg_part_num: Optional[str],
    retries: int = 1,
    corrective_message: Optional[str] = None,
) -> dict:
    """Call the LLM with structured output schema, validate, retry once."""
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage

    api_key = os.getenv("OPENAI_API_KEY", "")
    model_name = os.getenv("MODEL_NAME", "gpt-4o-mini")

    llm = ChatOpenAI(model=model_name, temperature=0, api_key=api_key)
    lov_block = _build_lov_prompt_block(lov)

    system_prompt = f"""You are a product-data extraction engine for an industrial distributor catalog.
You extract attributes from a short, abbreviated product description.

STRICT RULES:
1. You may ONLY use attribute labels from the ALLOWED_ATTRIBUTES list below.
   Never invent a label or value that isn't in that list.
2. If a value is genuinely present in the description but not in the allowed list,
   return it under "unmapped_values" instead of forcing a match.
3. If an attribute has no evidence in the description, omit it — do not guess.
4. Units: extract the raw unit as written; do not normalize it yourself.
5. Output valid JSON only, matching the schema below. No prose, no markdown fences.

CLASSPATH: {classpath}

ALLOWED_ATTRIBUTES:
{lov_block}

OUTPUT SCHEMA:
{{
  "attributes": [
    {{"label": "string (must be an exact label from ALLOWED_ATTRIBUTES)", "value": "string", "raw_uom": "string or null"}}
  ],
  "unmapped_values": ["string"],
  "confidence": "high | medium | low"
}}"""

    human_content = f"PRODUCT DESCRIPTION: {part_desc}"
    if mfg_part_num:
        human_content = f"MPN: {mfg_part_num}\n{human_content}"
    if corrective_message:
        human_content = f"{corrective_message}\n\n{human_content}"

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ])

    raw = response.content.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error from LLM: {e}. Raw: {raw[:200]}")
        return _rule_based_extraction(part_desc, lov, mfg_part_num)

    extracted = parsed.get("attributes", [])
    unmapped = parsed.get("unmapped_values", [])
    llm_confidence = parsed.get("confidence", "medium")

    valid_attrs, invalid_attrs = _validate_extraction(extracted, lov)

    if invalid_attrs and retries > 0:
        logger.debug(f"Retrying extraction — invalid values: {invalid_attrs}")
        corrective = (
            f"CORRECTION: The following label/value pairs were invalid and must be placed "
            f"in 'unmapped_values' instead: {invalid_attrs}"
        )
        return _llm_extraction(part_desc, classpath, lov, mfg_part_num, retries=0, corrective_message=corrective)

    all_unmapped = unmapped + invalid_attrs
    total = len(valid_attrs) + len(all_unmapped)
    compliance = (len(valid_attrs) / total * 100) if total > 0 else 100.0

    return {
        "attributes": valid_attrs,
        "unmapped_values": all_unmapped,
        "extraction_confidence": llm_confidence,
        "lov_compliance_pct": round(compliance, 1),
    }


def _rule_based_extraction(
    part_desc: str,
    lov: list[dict],
    mfg_part_num: Optional[str] = None,
) -> dict:
    """
    Fallback: simple regex/keyword extraction when LLM is unavailable.
    Handles common patterns like voltages, sizes, materials in descriptions.
    """
    import re
    desc = f"{mfg_part_num or ''} {part_desc or ''}".strip()
    attrs = []

    for attr_def in lov:
        label = attr_def["label"]
        allowed = [v for v in attr_def.get("allowed_values", []) if v != "<any value>"]

        # Check if any allowed value appears in the description
        for val in allowed:
            if val.lower() in desc.lower():
                attrs.append({"label": label, "value": val, "uom": None, "raw_uom": None})
                break

        if not allowed:
            # Try numeric patterns for common labels
            if label == "Voltage Rating":
                m = re.search(r"(\d+)\s*V\b", desc, re.I)
                if m:
                    attrs.append({"label": label, "value": m.group(1), "uom": "V", "raw_uom": m.group(0)})
            elif label == "Amperage Rating":
                m = re.search(r"(\d+)\s*A\b", desc, re.I)
                if m:
                    attrs.append({"label": label, "value": m.group(1), "uom": "A", "raw_uom": m.group(0)})
            elif label == "Sound Level":
                m = re.search(r"(\d+)\s*dBA?", desc, re.I)
                if m:
                    attrs.append({"label": label, "value": m.group(1), "uom": "dBA", "raw_uom": m.group(0)})
            elif "size" in label.lower() or "diameter" in label.lower():
                m = re.search(r'([\d\-/]+(?:-\d/\d+)?)\s*(?:in|")', desc, re.I)
                if m:
                    attrs.append({"label": label, "value": m.group(1), "uom": "in", "raw_uom": m.group(0)})

    total = len(lov)
    compliance = (len(attrs) / total * 100) if total > 0 else 0.0

    return {
        "attributes": attrs,
        "unmapped_values": [],
        "extraction_confidence": "medium" if attrs else "low",
        "lov_compliance_pct": round(compliance, 1),
    }


def extract_batch(rows: list[dict]) -> list[dict]:
    """Run attribute extraction for a batch of classified rows."""
    results = []
    for row in rows:
        extraction = extract_attributes(
            part_desc=row.get("Part_Desc", ""),
            classpath=row.get("Classpath", ""),
            mfg_part_num=row.get("Mfg_Part_Num"),
        )
        results.append({**row, **extraction})
    return results
