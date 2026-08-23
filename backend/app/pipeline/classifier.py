"""Classification pipeline stage — maps Part_Desc to Dept/Class/Fine/Classpath."""

import logging
import os
from typing import Optional

from app import data_layer

logger = logging.getLogger(__name__)

# ─── Keyword-rule based classifier ───────────────────────────────────────────

def _classify_by_rules(desc: str) -> Optional[tuple[str, str, str, str]]:
    """Return (dept, cls, fine, classpath) if a keyword rule matches, else None."""
    desc_lower = desc.lower()
    rules = data_layer.get_state().get("classification_rules", [])
    classpath_map = data_layer.get_state().get("classpath_map", {})

    for keywords, dept, cls, fine in rules:
        if any(kw in desc_lower for kw in keywords):
            key = (dept, cls, fine)
            cp = classpath_map.get(key, f"{dept}>{cls}>{fine}")
            return dept, cls, fine, cp
    return None


def classify_row(
    part_desc: str,
    mfg_part_num: Optional[str] = None,
    llm_fallback: bool = True,
) -> dict:
    """
    Classify a product description into Dept/Class/Fine/Classpath.

    Returns:
        {
            "Dept": str,
            "Class": str,
            "Fine": str,
            "Classpath": str,
            "classify_method": "rules" | "llm" | "unknown",
            "classify_confidence": float,
        }
    """
    text = f"{mfg_part_num or ''} {part_desc or ''}".strip()

    # ── Rule-based ────────────────────────────────────────────────────────────
    rule_result = _classify_by_rules(text)
    if rule_result:
        dept, cls, fine, cp = rule_result
        return {
            "Dept": dept,
            "Class": cls,
            "Fine": fine,
            "Classpath": cp,
            "classify_method": "rules",
            "classify_confidence": 95.0,
        }

    # ── LLM fallback ──────────────────────────────────────────────────────────
    if llm_fallback:
        try:
            result = _classify_with_llm(text)
            if result:
                return result
        except Exception as e:
            logger.warning(f"LLM classification failed: {e}")

    # ── Unknown fallback ──────────────────────────────────────────────────────
    return {
        "Dept": "General",
        "Class": "General",
        "Fine": "General",
        "Classpath": "General>General>General",
        "classify_method": "unknown",
        "classify_confidence": 10.0,
    }


def _classify_with_llm(text: str) -> Optional[dict]:
    """Use LLM to classify if keyword rules miss."""
    import json
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage

    api_key = os.getenv("OPENAI_API_KEY", "")
    model_name = os.getenv("MODEL_NAME", "gpt-4o-mini")

    if not api_key or api_key.startswith("sk-..."):
        return None

    llm = ChatOpenAI(model=model_name, temperature=0, api_key=api_key)

    system = SystemMessage(content="""You are a product classification engine.
Given a product description, classify it into a hierarchy.
Respond with ONLY valid JSON: {"Dept": "...", "Class": "...", "Fine": "...", "Classpath": "Dept>Class>Fine"}

Common categories:
- Appliances > Large Appliances > Dishwashers
- Appliances > Large Appliances > Refrigerators  
- Plumbing > Faucets > Kitchen Faucets
- Plumbing > Fittings > Pipe Fittings
- Abrasives > Coated Abrasives > Sanding Belts
- Abrasives > Bonded Abrasives > Cut-Off Wheels
- Tools > Power Tools > Angle Grinders
- Electrical > Wiring > Wire & Cable""")

    human = HumanMessage(content=f"Classify this product: {text}")

    response = llm.invoke([system, human])
    raw = response.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1].strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()

    data = json.loads(raw)
    dept = data.get("Dept", "General")
    cls = data.get("Class", "General")
    fine = data.get("Fine", "General")
    cp = data.get("Classpath", f"{dept}>{cls}>{fine}")

    return {
        "Dept": dept,
        "Class": cls,
        "Fine": fine,
        "Classpath": cp,
        "classify_method": "llm",
        "classify_confidence": 75.0,
    }


def classify_batch(rows: list[dict]) -> list[dict]:
    """Classify a batch of input rows."""
    results = []
    for row in rows:
        classification = classify_row(
            part_desc=row.get("Part_Desc", ""),
            mfg_part_num=row.get("Mfg_Part_Num"),
        )
        results.append({**row, **classification})
    return results
