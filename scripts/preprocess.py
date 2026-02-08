"""
preprocess.py - 从 paper-list/*.txt 中筛选 benchmark 相关论文
输出: data/benchmark_papers_raw.json (未分类的原始筛选结果)
"""

import json
import os
import re
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent
PAPER_LIST_DIR = PROJECT_ROOT / "paper-list"
OUTPUT_DIR = Path(__file__).parent.parent / "data"

# 会议到领域的映射
CONFERENCE_DOMAIN = {
    "neurips": "AI/ML", "icml": "AI/ML", "iclr": "AI/ML", "aaai": "AI/ML", "ijcai": "AI/ML",
    "cvpr": "CV", "iccv": "CV", "eccv": "CV",
    "acl": "NLP", "emnlp": "NLP", "naacl": "NLP",
    "icse": "SE", "fse": "SE", "ase": "SE",
    "sigmod": "DB/IR", "vldb": "DB/IR", "cikm": "DB/IR", "sigir": "DB/IR",
}

# Benchmark 相关关键词（大小写不敏感）
BENCHMARK_KEYWORDS = [
    "benchmark",
    "dataset",
    "evaluation",
    "leaderboard",
    "testbed",
    "test bed",
    "test suite",
    "corpus",
    "survey",
]

# 编译正则表达式（单词边界匹配）
KEYWORD_PATTERNS = [
    (kw, re.compile(r"\b" + re.escape(kw) + r"\b", re.IGNORECASE))
    for kw in BENCHMARK_KEYWORDS
]


def parse_filename(filename: str) -> tuple[str, int]:
    """从文件名提取会议名和年份，例如 'neurips_2024.txt' -> ('neurips', 2024)"""
    stem = Path(filename).stem  # 'neurips_2024'
    parts = stem.rsplit("_", 1)
    conference = parts[0].lower()
    year = int(parts[1])
    return conference, year


def match_keywords(title: str) -> list[str]:
    """返回标题中匹配到的关键词列表"""
    matched = []
    for kw, pattern in KEYWORD_PATTERNS:
        if pattern.search(title):
            matched.append(kw)
    return matched


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    papers = []
    paper_id = 0

    txt_files = sorted(PAPER_LIST_DIR.glob("*.txt"))
    print(f"找到 {len(txt_files)} 个论文列表文件")

    total_papers = 0
    matched_papers = 0

    for txt_file in txt_files:
        conference, year = parse_filename(txt_file.name)
        domain = CONFERENCE_DOMAIN.get(conference, "Unknown")

        with open(txt_file, "r", encoding="utf-8") as f:
            titles = [line.strip() for line in f if line.strip()]

        total_papers += len(titles)

        for title in titles:
            matched = match_keywords(title)
            if matched:
                paper_id += 1
                matched_papers += 1
                papers.append({
                    "id": paper_id,
                    "title": title,
                    "conference": conference.upper(),
                    "year": year,
                    "domain": domain,
                    "category": "",
                    "subcategory": "",
                    "url": "",
                    "abstract": "",
                    "matchedKeywords": matched,
                })

    # 按会议和年份排序
    papers.sort(key=lambda p: (p["domain"], p["conference"], p["year"], p["title"]))
    # 重新编号
    for i, p in enumerate(papers, 1):
        p["id"] = i

    output_path = OUTPUT_DIR / "benchmark_papers_raw.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)

    print(f"\n总论文数: {total_papers}")
    print(f"匹配 benchmark 关键词: {matched_papers}")
    print(f"输出: {output_path}")

    # 打印按领域统计
    from collections import Counter
    domain_counts = Counter(p["domain"] for p in papers)
    print("\n按领域统计:")
    for domain, count in sorted(domain_counts.items()):
        print(f"  {domain}: {count}")

    # 打印按会议统计
    conf_counts = Counter(f"{p['conference']}_{p['year']}" for p in papers)
    print("\n按会议+年份统计 (前20):")
    for conf, count in conf_counts.most_common(20):
        print(f"  {conf}: {count}")


if __name__ == "__main__":
    main()
