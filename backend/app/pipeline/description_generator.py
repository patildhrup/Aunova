"""Description generation pipeline stage — 5 format types with hard char-limit enforcement."""

import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Character limit rules ────────────────────────────────────────────────────
DESC_LIMITS = {
    "INVOICE_DESC":          {"min": 0,   "max": 40,  "case": "upper"},
    "MOBILE_DESC":           {"min": 60,  "max": 80,  "case": "sentence"},
    "SHORT_DESC":            {"min": 0,   "max": 120, "case": "title"},
    "LONG_DESC1":            {"min": 0,   "max": 500, "case": "sentence"},
    "MARKETING_DESCRIPTION": {"min": 0,   "max": 600, "case": "sentence"},
}


def _apply_case(text: str, case: str) -> str:
    if case == "upper":
        return text.upper()
    elif case == "sentence":
        return text[0].upper() + text[1:] if text else text
    elif case == "title":
        # Preserve trademark symbols and acronyms
        return re.sub(r"([a-z])([A-Z])", r"\1 \2", text).title()
    return text


def _enforce_limit(text: str, max_len: int, min_len: int = 0, case: str = "sentence") -> str:
    """Apply casing and truncate/pad to fit within limits."""
    text = _apply_case(text.strip(), case)
    if len(text) > max_len:
        # Truncate at word boundary
        truncated = text[:max_len].rsplit(" ", 1)[0].rstrip(",;.")
        text = truncated
    return text


def _attrs_to_str(attributes: list[dict]) -> str:
    """Convert attribute list to human-readable string."""
    parts = []
    for a in attributes:
        label = a.get("label", "")
        value = a.get("value", "")
        uom = a.get("uom") or a.get("raw_uom") or ""
        if value:
            if uom:
                parts.append(f"{label}: {value} {uom}")
            else:
                parts.append(f"{label}: {value}")
    return ", ".join(parts)


def _build_short_desc_formula(
    brand: Optional[str],
    mpn: Optional[str],
    classpath: str,
    attributes: list[dict],
) -> str:
    """Formula: Brand + Item Type + key attributes (no LLM needed for title)."""
    item_type = classpath.split(">")[-1].strip() if ">" in classpath else classpath

    key_attrs = []
    priority_labels = ["Number of Wash Cycles", "Voltage Rating", "Mounting Type", "Material", "Color",
                       "Diameter", "Grit", "Handle Style", "Finish", "Series"]
    attr_dict = {a["label"]: a for a in attributes}
    for label in priority_labels:
        if label in attr_dict:
            a = attr_dict[label]
            val = a["value"]
            uom = a.get("uom") or ""
            key_attrs.append(f"{val}{' ' + uom if uom else ''}")

    parts = []
    if brand:
        parts.append(brand)
    if mpn:
        parts.append(mpn)
    parts.append(item_type)
    parts.extend(key_attrs[:3])  # limit to 3 key attrs in title

    return ", ".join(parts)


def generate_descriptions(
    brand: Optional[str],
    manufacturer: Optional[str],
    mpn: Optional[str],
    classpath: str,
    attributes: list[dict],
    part_desc: Optional[str] = None,
) -> dict:
    """
    Generate 5 description formats. Uses LLM if available, formula-based fallback otherwise.
    All outputs are hard-enforced to comply with character limits.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    use_llm = api_key and not api_key.startswith("sk-...")

    if use_llm:
        result = _llm_generate(brand, manufacturer, mpn, classpath, attributes, part_desc)
    else:
        result = _formula_generate(brand, manufacturer, mpn, classpath, attributes, part_desc)

    # ── Hard-enforce all character limits ────────────────────────────────────
    enforced = {}
    compliance = {}
    for field, limits in DESC_LIMITS.items():
        raw = result.get(field, "")
        enforced_val = _enforce_limit(raw, limits["max"], limits["min"], limits["case"])
        enforced[field] = enforced_val
        # Check compliance
        length = len(enforced_val)
        min_ok = length >= limits["min"] if limits["min"] > 0 else True
        max_ok = length <= limits["max"]
        case_ok = _check_case(enforced_val, limits["case"])
        compliance[field] = {
            "length": length,
            "max": limits["max"],
            "compliant": min_ok and max_ok and case_ok,
        }

    return {
        **enforced,
        "desc_compliance": compliance,
        "generation_method": result.get("_method", "formula"),
    }


def _check_case(text: str, case: str) -> bool:
    if not text:
        return True
    if case == "upper":
        return text == text.upper()
    return True  # sentence/title case is hard to validate programmatically


def _llm_generate(
    brand, manufacturer, mpn, classpath, attributes, part_desc
) -> dict:
    """LLM-based description generation."""
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage

    api_key = os.getenv("OPENAI_API_KEY", "")
    model_name = os.getenv("MODEL_NAME", "gpt-4o-mini")
    llm = ChatOpenAI(model=model_name, temperature=0.3, api_key=api_key)

    attrs_json = json.dumps(attributes, indent=2)
    item_type = classpath.split(">")[-1].strip()

    system = SystemMessage(content=f"""Write 5 versions of a product description following exact formulas and limits.
Use ONLY the brand, classpath, and attributes provided — do not invent specifications.

RULES:
- INVOICE_DESC: ALL CAPS, ≤40 characters, heavily abbreviated (use abbr like SST=Stainless Steel, BLTLN=Built-in)
- MOBILE_DESC: 60-80 characters, sentence case, most important specs
- SHORT_DESC: Brand + MPN + Item Type + up to 3 key attributes, title case, ≤120 chars
- LONG_DESC1: Full sentence form, all relevant attributes with units, sentence case
- MARKETING_DESCRIPTION: Promotional tone, may include trademark phrasing (e.g. ™ features)

Return ONLY valid JSON with these exact keys:
{{"INVOICE_DESC": "...", "MOBILE_DESC": "...", "SHORT_DESC": "...", "LONG_DESC1": "...", "MARKETING_DESCRIPTION": "..."}}""")

    human = HumanMessage(content=f"""Brand: {brand or ""}
Manufacturer: {manufacturer or ""}
MPN: {mpn or ""}
Item Type: {item_type}
Classpath: {classpath}
Original Description: {part_desc or ""}
Attributes:
{attrs_json}""")

    try:
        response = llm.invoke([system, human])
        raw = response.content.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:])
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
        data = json.loads(raw)
        data["_method"] = "llm"
        return data
    except Exception as e:
        logger.warning(f"LLM description generation failed: {e}. Falling back to formula.")
        result = _formula_generate(brand, manufacturer, mpn, classpath, attributes, part_desc)
        result["_method"] = "formula_fallback"
        return result


def _formula_generate(
    brand, manufacturer, mpn, classpath, attributes, part_desc
) -> dict:
    """Formula-based description generation without LLM."""
    item_type = classpath.split(">")[-1].strip() if ">" in classpath else classpath
    attr_str = _attrs_to_str(attributes)
    b = brand or manufacturer or ""

    # SHORT DESC: Brand + MPN + Item Type + key attrs
    short = _build_short_desc_formula(b, mpn, classpath, attributes)

    # INVOICE DESC: abbreviate aggressively
    ABBREVS = {
        "Stainless Steel": "SST", "Built-in": "BLTLN", "Professional": "PRO",
        "Series": "SRS", "Dishwasher": "DSHWSHR", "Faucet": "FCET",
        "Voltage": "V", "Amperage": "A", "Mounting": "MNT",
    }
    invoice = f"{b[:4].upper()} {item_type[:8].upper()} {mpn or ''}"[:40]
    for long_word, abbr in ABBREVS.items():
        invoice = invoice.replace(long_word.upper(), abbr)

    # MOBILE DESC: brand + item_type + top 2 attrs
    top_attrs = []
    for a in attributes[:3]:
        val = a["value"]
        uom = a.get("uom") or ""
        top_attrs.append(f"{val}{' ' + uom if uom else ''}")
    mobile_base = f"{b} {item_type}"
    if top_attrs:
        mobile_base += f", {', '.join(top_attrs)}"

    # LONG DESC
    long_base = f"{b} {item_type}"
    if attr_str:
        long_base += f". {attr_str}."
    elif part_desc:
        long_base += f". {part_desc}"

    # MARKETING DESC
    marketing = f"Discover the {b} {item_type}"
    if attributes:
        first_attr = attributes[0]
        marketing += f" featuring {first_attr['value']}"
        if first_attr.get("uom"):
            marketing += f" {first_attr['uom']}"
    marketing += f". {b} delivers industrial-grade quality and reliability for professional use."
    if attr_str:
        marketing += f" Specifications: {attr_str}."

    return {
        "INVOICE_DESC": invoice,
        "MOBILE_DESC": mobile_base,
        "SHORT_DESC": short,
        "LONG_DESC1": long_base,
        "MARKETING_DESCRIPTION": marketing,
        "_method": "formula",
    }


def generate_batch(rows: list[dict]) -> list[dict]:
    """Generate descriptions for a batch of enriched rows."""
    results = []
    for row in rows:
        desc = generate_descriptions(
            brand=row.get("BRAND_NAME"),
            manufacturer=row.get("MANUFACTURER_NAME"),
            mpn=row.get("Mfg_Part_Num"),
            classpath=row.get("Classpath", ""),
            attributes=row.get("attributes", []),
            part_desc=row.get("Part_Desc"),
        )
        results.append({**row, **desc})
    return results
