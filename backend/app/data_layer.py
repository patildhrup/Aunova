"""
data_layer.py — Load and index all reference data once at application startup.

Provides:
  - manufacturer_index: list of (canonical_name, brand_name) tuples for fuzzy matching
  - manufacturer_choices: rapidfuzz-ready list of canonical manufacturer strings
  - lov_by_classpath: dict[classpath_str, list[{label, allowed_values, filtering, sequence}]]
  - uom_map: dict[raw_variant -> approved_form]
  - fraction_map: dict[decimal_str -> fraction_str] and reverse
  - ground_truth: pd.DataFrame (200-item expected output)
  - sample_input: pd.DataFrame (1000-item sample)
"""

import os
import re
import json
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# ─── Path resolution ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent  # backend/
ROOT_DIR = BASE_DIR.parent               # project root

GROUND_TRUTH_PATH = os.getenv(
    "GROUND_TRUTH_PATH",
    str(ROOT_DIR / "Unihack_ Expected Output - Delivery Format.csv"),
)
SAMPLE_INPUT_PATH = os.getenv(
    "SAMPLE_INPUT_PATH",
    str(ROOT_DIR / "Unihack_ Sample Dataset - Input.csv"),
)
MANUFACTURER_LIST_PATH = os.getenv(
    "MANUFACTURER_LIST_PATH",
    str(ROOT_DIR / "reference" / "UniCat_Manufacturer_and_Brand_List.xlsx"),
)

# ─── Placeholder values to strip ─────────────────────────────────────────────
PLACEHOLDERS = {
    "-- unbranded --",
    "-- no unilog brand --",
    "-- no dib brand --",
    "--unbranded--",
    "",
}


def _is_placeholder(val: Optional[str]) -> bool:
    if val is None:
        return True
    return str(val).strip().lower() in PLACEHOLDERS


def _clean(val) -> Optional[str]:
    """Return None for placeholders/blanks, stripped string otherwise."""
    if pd.isna(val) or _is_placeholder(str(val)):
        return None
    return str(val).strip()


# ─── UOM normalization map ────────────────────────────────────────────────────
UOM_MAP: dict[str, str] = {
    # Length
    "in": "in", "inch": "in", "inches": "in", '"': "in", "IN": "in",
    "ft": "ft", "foot": "ft", "feet": "ft", "FT": "ft",
    "mm": "mm", "MM": "mm",
    "cm": "cm", "CM": "cm",
    "m": "m", "M": "m", "meter": "m", "meters": "m",
    # Weight
    "lb": "lb", "lbs": "lb", "pound": "lb", "pounds": "lb", "LB": "lb",
    "oz": "oz", "ounce": "oz", "OZ": "oz",
    "kg": "kg", "KG": "kg",
    "g": "g", "gram": "g", "grams": "g",
    # Volume
    "gal": "gal", "gallon": "gal", "gallons": "gal", "GAL": "gal",
    "qt": "qt", "quart": "qt", "QT": "qt",
    "L": "L", "liter": "L", "liters": "L", "l": "L",
    "mL": "mL", "ml": "mL", "milliliter": "mL",
    # Electrical
    "V": "V", "volt": "V", "volts": "V",
    "A": "A", "amp": "A", "amps": "A", "ampere": "A",
    "W": "W", "watt": "W", "watts": "W",
    "Hz": "Hz", "hertz": "Hz",
    # Sound
    "dBA": "dBA", "dba": "dBA", "db": "dB", "dB": "dB",
    # Count / packaging
    "ea": "EA", "each": "EA", "EA": "EA",
    "pc": "PC", "pcs": "PC", "piece": "PC",
    "pk": "PK", "pack": "PK",
    "bx": "BX", "box": "BX",
    # Temperature
    "F": "°F", "°F": "°F", "C": "°C", "°C": "°C",
    # RPM
    "rpm": "RPM", "RPM": "RPM",
    # Pressure
    "psi": "PSI", "PSI": "PSI",
    # Flow
    "gpm": "GPM", "GPM": "GPM",
}

# ─── Decimal → Fraction map (common hardware dimensions) ─────────────────────
DECIMAL_TO_FRACTION: dict[str, str] = {
    "0.0625": "1/16", "0.125": "1/8",  "0.1875": "3/16",
    "0.25":   "1/4",  "0.3125": "5/16", "0.375": "3/8",
    "0.4375": "7/16", "0.5": "1/2",     "0.5625": "9/16",
    "0.625":  "5/8",  "0.6875": "11/16","0.75": "3/4",
    "0.8125": "13/16","0.875": "7/8",   "0.9375": "15/16",
}
FRACTION_TO_DECIMAL: dict[str, str] = {v: k for k, v in DECIMAL_TO_FRACTION.items()}


# ─── LOV — embedded fallback (Appliances / Dishwashers) ──────────────────────
EMBEDDED_LOV: dict[str, list[dict]] = {
    "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers": [
        {"label": "Series", "allowed_values": ["Professional Series", "Eco Series", "Elite Series", "Standard Series", "Premium Series"], "filtering": True, "sequence": 1},
        {"label": "Model", "allowed_values": [], "filtering": False, "sequence": 2},
        {"label": "Number of Wash Cycles", "allowed_values": ["3", "4", "5", "6", "7", "8", "9", "10", "12", "14", "15"], "filtering": True, "sequence": 3},
        {"label": "Voltage Rating", "allowed_values": ["120", "240", "120/240"], "filtering": True, "sequence": 4},
        {"label": "Amperage Rating", "allowed_values": ["10", "12", "15", "20"], "filtering": True, "sequence": 5},
        {"label": "Mounting Type", "allowed_values": ["Built-in", "Leg", "Freestanding", "Portable", "Countertop"], "filtering": True, "sequence": 6},
        {"label": "Plug Type", "allowed_values": ["3-Wire", "4-Wire", "Hardwired", "NEMA 5-15P", "NEMA 5-20P"], "filtering": False, "sequence": 7},
        {"label": "Size", "allowed_values": [], "filtering": False, "sequence": 8},
        {"label": "Depth With Door Open", "allowed_values": [], "filtering": False, "sequence": 9},
        {"label": "Minimum Height", "allowed_values": [], "filtering": False, "sequence": 10},
        {"label": "Maximum Height", "allowed_values": [], "filtering": False, "sequence": 11},
        {"label": "Sound Level", "allowed_values": ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "50", "51", "52"], "filtering": True, "sequence": 12},
        {"label": "Material", "allowed_values": ["Stainless Steel", "Plastic", "Aluminum", "Porcelain", "Carbon Steel"], "filtering": True, "sequence": 13},
        {"label": "Color", "allowed_values": ["Stainless Steel", "White", "Black", "Black Stainless Steel", "Fingerprint Resistant Stainless Steel"], "filtering": True, "sequence": 14},
        {"label": "Additional Information", "allowed_values": [], "filtering": False, "sequence": 15},
        {"label": "With", "allowed_values": [], "filtering": False, "sequence": 16},
    ],
    "Plumbing>Faucets>Kitchen Faucets": [
        {"label": "Handle Style", "allowed_values": ["Single Handle", "Double Handle", "Pull-Down", "Pull-Out", "Wall Mount"], "filtering": True, "sequence": 1},
        {"label": "Material", "allowed_values": ["Brass", "Stainless Steel", "Zinc", "Chrome", "Bronze"], "filtering": True, "sequence": 2},
        {"label": "Finish", "allowed_values": ["Chrome", "Brushed Nickel", "Oil Rubbed Bronze", "Matte Black", "Polished Brass", "Stainless Steel"], "filtering": True, "sequence": 3},
        {"label": "Flow Rate", "allowed_values": ["1.0", "1.5", "1.75", "2.0", "2.2"], "filtering": True, "sequence": 4},
        {"label": "Spout Height", "allowed_values": [], "filtering": False, "sequence": 5},
        {"label": "Number of Holes", "allowed_values": ["1", "2", "3", "4"], "filtering": True, "sequence": 6},
    ],
    "Plumbing>Fittings>Pipe Fittings": [
        {"label": "Material", "allowed_values": ["Brass", "Copper", "PVC", "CPVC", "Stainless Steel", "Cast Iron", "Galvanized Steel"], "filtering": True, "sequence": 1},
        {"label": "Connection Type", "allowed_values": ["Threaded", "Solvent Weld", "Push-Fit", "Compression", "Flare", "Barbed", "Slip"], "filtering": True, "sequence": 2},
        {"label": "Size", "allowed_values": [], "filtering": False, "sequence": 3},
        {"label": "Pipe Size", "allowed_values": [], "filtering": False, "sequence": 4},
        {"label": "Fitting Type", "allowed_values": ["Elbow", "Tee", "Coupling", "Reducer", "Cap", "Union", "Nipple", "Cross", "Plug", "Bushing"], "filtering": True, "sequence": 5},
        {"label": "Angle", "allowed_values": ["45°", "90°", "180°", "Street"], "filtering": True, "sequence": 6},
        {"label": "Pressure Rating", "allowed_values": [], "filtering": False, "sequence": 7},
        {"label": "Temperature Rating", "allowed_values": [], "filtering": False, "sequence": 8},
    ],
    "Abrasives>Coated Abrasives>Sanding Belts": [
        {"label": "Grit", "allowed_values": ["36", "40", "50", "60", "80", "100", "120", "150", "180", "220", "240", "320", "400"], "filtering": True, "sequence": 1},
        {"label": "Width", "allowed_values": [], "filtering": False, "sequence": 2},
        {"label": "Length", "allowed_values": [], "filtering": False, "sequence": 3},
        {"label": "Backing Material", "allowed_values": ["Paper", "Cloth", "Film", "Foam", "Fiber"], "filtering": True, "sequence": 4},
        {"label": "Abrasive Material", "allowed_values": ["Aluminum Oxide", "Silicon Carbide", "Zirconia Alumina", "Ceramic", "Garnet"], "filtering": True, "sequence": 5},
        {"label": "Series", "allowed_values": [], "filtering": False, "sequence": 6},
    ],
    "Abrasives>Bonded Abrasives>Cut-Off Wheels": [
        {"label": "Diameter", "allowed_values": ["4", "4-1/2", "5", "6", "6-1/2", "7", "9", "10", "12", "14"], "filtering": True, "sequence": 1},
        {"label": "Thickness", "allowed_values": [], "filtering": False, "sequence": 2},
        {"label": "Arbor Size", "allowed_values": ["5/8", "7/8", "1", "5/8-11", "20mm"], "filtering": True, "sequence": 3},
        {"label": "Abrasive Material", "allowed_values": ["Aluminum Oxide", "Silicon Carbide", "Zirconia Alumina", "Ceramic", "Cubitron II"], "filtering": True, "sequence": 4},
        {"label": "Application", "allowed_values": ["Metal", "Steel", "Stainless Steel", "Masonry", "Concrete", "Cast Iron", "Aluminum"], "filtering": True, "sequence": 5},
        {"label": "RPM Rating", "allowed_values": [], "filtering": False, "sequence": 6},
    ],
}

# ─── Classification rules (keyword → classpath) ──────────────────────────────
CLASSIFICATION_RULES: list[tuple[list[str], str, str, str]] = [
    # keywords, dept, cls, fine
    (["dishwasher"], "Appliances", "Large Appliances", "Dishwashers"),
    (["refrigerator", "fridge"], "Appliances", "Large Appliances", "Refrigerators"),
    (["washer", "washing machine"], "Appliances", "Large Appliances", "Washers"),
    (["dryer"], "Appliances", "Large Appliances", "Dryers"),
    (["faucet", "tap"], "Plumbing", "Faucets", "Kitchen Faucets"),
    (["fitting", "elbow", "tee", "coupling", "nipple", "reducer"], "Plumbing", "Fittings", "Pipe Fittings"),
    (["sanding belt", "sanding disc", "stikit", "abranet", "hiolit"], "Abrasives", "Coated Abrasives", "Sanding Belts"),
    (["cut-off disc", "cut off disc", "cutoff disc", "grinding disc", "grinding wheel"], "Abrasives", "Bonded Abrasives", "Cut-Off Wheels"),
]

CLASSPATH_MAP: dict[tuple[str, str, str], str] = {
    ("Appliances", "Large Appliances", "Dishwashers"): "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers",
    ("Plumbing", "Faucets", "Kitchen Faucets"): "Plumbing>Faucets>Kitchen Faucets",
    ("Plumbing", "Fittings", "Pipe Fittings"): "Plumbing>Fittings>Pipe Fittings",
    ("Abrasives", "Coated Abrasives", "Sanding Belts"): "Abrasives>Coated Abrasives>Sanding Belts",
    ("Abrasives", "Bonded Abrasives", "Cut-Off Wheels"): "Abrasives>Bonded Abrasives>Cut-Off Wheels",
}


# ─── Manufacturer list — built from ground truth + embedded common brands ─────
EMBEDDED_MANUFACTURERS: list[tuple[str, str]] = [
    # (canonical_manufacturer_name, brand_name)
    ("Rheem Manufacturing", "FRIGIDAIRE®"),
    ("Whirlpool Corporation", "Whirlpool®"),
    ("Freud Inc", "Diablo"),
    ("Milwaukee Accessory", "Milwaukee"),
    ("Milwaukee Electric Tool", "Milwaukee"),
    ("Mirka Abrasives Inc", "Mirka"),
    ("3M", "3M"),
    ("Jam Industrial Supply LLC", "3M"),
    ("Appliance Dealers Cooperative", ""),
    ("Moen Incorporated", "Moen®"),
    ("Delta Faucet Company", "Delta®"),
    ("Kohler Co", "Kohler®"),
    ("American Standard", "American Standard®"),
    ("Bosch Home Appliances", "Bosch®"),
    ("LG Electronics", "LG®"),
    ("Samsung Electronics", "Samsung®"),
    ("GE Appliances", "GE®"),
    ("Electrolux", "Frigidaire®"),
    ("Watts Water Technologies", "Watts®"),
    ("Parker Hannifin Corporation", "Parker®"),
    ("Swagelok Company", "Swagelok®"),
]


# ─── State singleton ──────────────────────────────────────────────────────────
_state: dict = {}


def get_state() -> dict:
    return _state


def initialize(
    ground_truth_path: str = GROUND_TRUTH_PATH,
    sample_input_path: str = SAMPLE_INPUT_PATH,
    manufacturer_list_path: str = MANUFACTURER_LIST_PATH,
) -> None:
    """Load all reference data into _state. Called once at startup."""
    global _state

    # ── Ground truth ──────────────────────────────────────────────────────────
    try:
        gt = pd.read_csv(ground_truth_path, encoding="utf-8", low_memory=False)
        _state["ground_truth"] = gt
        logger.info(f"Ground truth loaded: {len(gt)} rows, {len(gt.columns)} columns")
    except Exception as e:
        logger.warning(f"Could not load ground truth: {e}")
        _state["ground_truth"] = pd.DataFrame()

    # ── Sample input ──────────────────────────────────────────────────────────
    try:
        si = pd.read_csv(sample_input_path, encoding="utf-8", low_memory=False)
        _state["sample_input"] = si
        logger.info(f"Sample input loaded: {len(si)} rows")
    except Exception as e:
        logger.warning(f"Could not load sample input: {e}")
        _state["sample_input"] = pd.DataFrame()

    # ── Manufacturer list ─────────────────────────────────────────────────────
    manufacturers = list(EMBEDDED_MANUFACTURERS)

    if Path(manufacturer_list_path).exists():
        try:
            mfr_xl = pd.read_excel(manufacturer_list_path)
            for _, row in mfr_xl.iterrows():
                mname = _clean(row.get("MANUFACTURER_NAME") or row.get("Manufacturer Name") or "")
                bname = _clean(row.get("BRAND_NAME") or row.get("Brand Name") or "")
                if mname:
                    manufacturers.append((mname, bname or ""))
            logger.info(f"Manufacturer list loaded from Excel: {len(manufacturers)} entries")
        except Exception as e:
            logger.warning(f"Could not load manufacturer Excel: {e}. Using embedded list.")
    else:
        # Extract from ground truth as bonus entries
        gt = _state.get("ground_truth", pd.DataFrame())
        if not gt.empty and "MANUFACTURER_NAME" in gt.columns:
            for _, row in gt.iterrows():
                mname = _clean(row.get("MANUFACTURER_NAME"))
                bname = _clean(row.get("BRAND_NAME"))
                if mname:
                    manufacturers.append((mname, bname or ""))

    # Deduplicate
    seen = set()
    unique_manufacturers = []
    for m, b in manufacturers:
        key = m.lower()
        if key not in seen:
            seen.add(key)
            unique_manufacturers.append((m, b))

    _state["manufacturers"] = unique_manufacturers
    _state["manufacturer_choices"] = [m for m, _ in unique_manufacturers]
    logger.info(f"Manufacturer index built: {len(unique_manufacturers)} unique entries")

    # ── LOV ───────────────────────────────────────────────────────────────────
    _state["lov"] = dict(EMBEDDED_LOV)
    logger.info(f"LOV loaded: {len(EMBEDDED_LOV)} classpaths")

    # ── UOM + fraction maps ───────────────────────────────────────────────────
    _state["uom_map"] = dict(UOM_MAP)
    _state["decimal_to_fraction"] = dict(DECIMAL_TO_FRACTION)
    _state["fraction_to_decimal"] = dict(FRACTION_TO_DECIMAL)
    _state["classification_rules"] = CLASSIFICATION_RULES
    _state["classpath_map"] = CLASSPATH_MAP

    logger.info("Data layer initialized successfully.")


def normalize_uom(raw: Optional[str]) -> str:
    """Normalize a raw UOM string to its approved form."""
    if not raw:
        return ""
    stripped = str(raw).strip()
    return UOM_MAP.get(stripped, stripped)


def decimal_to_fraction(val: str) -> str:
    """Convert a decimal string to fraction if known."""
    return DECIMAL_TO_FRACTION.get(val.strip(), val)


def fraction_to_decimal(val: str) -> str:
    """Convert a fraction string to decimal if known."""
    return FRACTION_TO_DECIMAL.get(val.strip(), val)


def get_lov_for_classpath(classpath: str) -> list[dict]:
    """Return the LOV (attribute definitions) for a given classpath."""
    lov = _state.get("lov", {})
    # Exact match first
    if classpath in lov:
        return lov[classpath]
    # Substring match
    for key in lov:
        if key.lower() in classpath.lower() or classpath.lower() in key.lower():
            return lov[key]
    return []


def get_manufacturers() -> list[tuple[str, str]]:
    return _state.get("manufacturers", [])


def get_manufacturer_choices() -> list[str]:
    return _state.get("manufacturer_choices", [])


def get_ground_truth() -> pd.DataFrame:
    return _state.get("ground_truth", pd.DataFrame())


def get_sample_input() -> pd.DataFrame:
    return _state.get("sample_input", pd.DataFrame())
