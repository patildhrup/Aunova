import json
import logging
from app import data_layer
from app.pipeline import brand_resolver, classifier, attribute_extractor, description_generator, evaluator

logging.basicConfig(level=logging.INFO)

def main():
    print("=== Initializing Data Layer ===")
    data_layer.initialize()

    gt_df = data_layer.get_ground_truth()
    print(f"Ground Truth loaded: {len(gt_df)} rows")

    sample_df = data_layer.get_sample_input()
    print(f"Sample Input loaded: {len(sample_df)} rows")

    # Pick first 5 rows from sample or ground truth for pipeline run
    test_rows = gt_df.head(5).fillna("").to_dict(orient="records") if not gt_df.empty else sample_df.head(5).fillna("").to_dict(orient="records")

    print("\n=== Stage 1: Brand Resolution ===")
    brand_res = brand_resolver.resolve_batch(test_rows)
    for r in brand_res:
        print(f"  MPN: {r.get('Mfg_Part_Num')} | Manuf: {r.get('MANUFACTURER_NAME')} | Brand: {r.get('BRAND_NAME')} | Score: {r.get('match_score')}")

    print("\n=== Stage 2: Classification ===")
    classified = classifier.classify_batch(brand_res)
    for r in classified:
        print(f"  MPN: {r.get('Mfg_Part_Num')} | Classpath: {r.get('Classpath')}")

    print("\n=== Stage 3: Attribute Extraction ===")
    extracted = attribute_extractor.extract_batch(classified)
    for r in extracted:
        attrs = [f"{a['label']}={a['value']}" for a in r.get('attributes', [])]
        print(f"  MPN: {r.get('Mfg_Part_Num')} | Attrs: {attrs} | LOV%: {r.get('lov_compliance_pct')}%")

    print("\n=== Stage 4: Description Generation ===")
    described = description_generator.generate_batch(extracted)
    for r in described:
        print(f"  MPN: {r.get('Mfg_Part_Num')}")
        print(f"    INVOICE: {r.get('INVOICE_DESC')}")
        print(f"    MOBILE:  {r.get('MOBILE_DESC')}")
        print(f"    SHORT:   {r.get('SHORT_DESC')}")

    print("\n=== Evaluation vs Ground Truth ===")
    metrics = evaluator.evaluate_batch(described)
    print(json.dumps(metrics, indent=2))

if __name__ == "__main__":
    main()
