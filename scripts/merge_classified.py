"""
merge_classified.py - 合并分类结果，生成最终的 papers.json
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

CLASSIFIED_FILES = [
    "classified_aiml.json",
    "classified_cv.json",
    "classified_nlp.json",
    "classified_se_db.json",
]


def main():
    all_papers = []

    for fname in CLASSIFIED_FILES:
        fpath = DATA_DIR / fname
        if not fpath.exists():
            print(f"WARNING: {fname} not found, skipping")
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            papers = json.load(f)
        print(f"Loaded {len(papers)} papers from {fname}")
        all_papers.extend(papers)

    # 按 domain, conference, year, title 排序
    all_papers.sort(key=lambda p: (p["domain"], p["conference"], p["year"], p["title"]))

    # 重新分配 ID
    for i, p in enumerate(all_papers, 1):
        p["id"] = i

    # 统计
    print(f"\nTotal: {len(all_papers)} papers")

    from collections import Counter
    cat_counts = Counter(p["category"] for p in all_papers)
    print("\nCategory distribution:")
    for cat, count in cat_counts.most_common():
        print(f"  {cat}: {count}")

    uncategorized = sum(1 for p in all_papers if not p.get("category"))
    print(f"\nUncategorized: {uncategorized}")

    # 输出
    output_path = DATA_DIR / "papers.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_papers, f, ensure_ascii=False, indent=2)

    print(f"\nOutput: {output_path}")
    print(f"File size: {output_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
