#!/usr/bin/env python3
"""Local renderer for build-article-landing.

This script replaces the `ogi landing build --type article` command for the
build-article-landing skill. It renders references/base.html (and its
components) with data from a --content YAML file plus a few CLI-provided
renderer-injected fields.

Dependencies:
    pip install jinja2 pyyaml

Example:
    python3 render.py \
        --product-name "DemoBrand" \
        --product-description "An AI toolkit for creators." \
        --page-name "Top 10 AI Music Video Tools" \
        --page-description "A practical guide to the best AI music video generators." \
        --content article-content.yaml \
        --output out/article.html
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, FileSystemLoader

SKILL_DIR = Path(__file__).resolve().parent
REFERENCES_DIR = SKILL_DIR / "references"
BASE_TEMPLATE = "base.html"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a build-article-landing page to a single HTML file."
    )
    parser.add_argument("--product-name", required=True)
    parser.add_argument("--product-description", required=True)
    parser.add_argument("--page-name", required=True)
    parser.add_argument("--page-description", required=True)
    parser.add_argument("--content", required=True, help="Path to YAML/JSON content file")
    parser.add_argument("--output", required=True, help="Destination HTML file path")
    return parser.parse_args(argv)


def load_content(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Content file not found: {path}")
    payload = path.read_text(encoding="utf-8")
    parsed = yaml.safe_load(payload)
    if not isinstance(parsed, dict):
        raise ValueError("Content must decode to a YAML object.")
    return parsed


def build_context(args: argparse.Namespace, content: dict[str, Any]) -> dict[str, Any]:
    output_path = Path(args.output)
    slug = output_path.stem
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_year = str(datetime.now(timezone.utc).year)

    canonical_url = content.get("canonical_url", f"https://example.com/{slug}.html")
    home_url = content.get("home_url", "https://example.com/")
    cta_url = content.get("cta_url", canonical_url + "#start")

    # Renderer-injected fields mirror what `ogi` used to supply.
    base_context: dict[str, Any] = {
        "brand_name": args.product_name,
        "product_name": args.product_name,
        "product_description": args.product_description,
        "page_name": args.page_name,
        "page_description": args.page_description,
        "title": content.get("title", args.page_name),
        "meta_description": content.get("meta_description", args.page_description),
        "canonical_url": canonical_url,
        "cta_url": cta_url,
        "home_url": home_url,
        "theme_js_url": content.get("theme_js_url", "../assets/js/theme.js"),
        "nav_items": content.get("nav_items", []),
        "footer_links": content.get("footer_links", []),
        "publish_year": content.get("publish_year", current_year),
        "lang": content.get("lang", "en"),
        "bottom_cta": content.get("bottom_cta", {
            "title": content.get("bottom_cta_title", f"Learn more about {args.product_name}"),
            "text": content.get("bottom_cta_text", args.page_description),
            "button": content.get("bottom_cta_button", "Get started free"),
            "url": cta_url,
        }),
    }

    # User content overrides defaults and provides article-specific fields.
    context = dict(content)
    context.update(base_context)
    return context


def build_schemas(context: dict[str, Any]) -> list[str]:
    blocks: list[str] = [render_article_schema(context), render_breadcrumb_schema(context)]
    faq_items = context.get("faq_items")
    if faq_items:
        blocks.append(render_faq_schema(faq_items))
    return blocks


def render_article_schema(context: dict[str, Any]) -> str:
    article_sections = context.get("article_sections", [])
    section_titles = [s.get("title") for s in article_sections if s.get("title")]

    payload = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": context["title"],
        "description": context["meta_description"],
        "image": context.get("og_image", "https://example.com/og-image.png"),
        "author": {"@type": "Organization", "name": context.get("author", context["brand_name"])},
        "publisher": {"@type": "Organization", "name": context.get("author", context["brand_name"])},
        "datePublished": context.get("publish_date", "2026-06-30"),
        "dateModified": context.get("publish_date", "2026-06-30"),
        "mainEntityOfPage": context["canonical_url"],
        "articleSection": section_titles,
        "keywords": context.get("keywords", []),
        "wordCount": context.get("word_count", 1200),
    }
    return "<script type=\"application/ld+json\">\n" + json.dumps(payload, ensure_ascii=False, indent=2) + "\n</script>"


def render_breadcrumb_schema(context: dict[str, Any]) -> str:
    home_url = context.get("home_url", "https://example.com/")
    payload = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": home_url},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{home_url}guides/"},
            {"@type": "ListItem", "position": 3, "name": context["title"], "item": context["canonical_url"]},
        ],
    }
    return "<script type=\"application/ld+json\">\n" + json.dumps(payload, ensure_ascii=False, indent=2) + "\n</script>"


def render_faq_schema(faq_items: list[dict[str, Any]]) -> str:
    payload = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["question"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item["answer"],
                },
            }
            for item in faq_items
        ],
    }
    return "<script type=\"application/ld+json\">\n" + json.dumps(payload, ensure_ascii=False, indent=2) + "\n</script>"


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    content = load_content(Path(args.content))
    context = build_context(args, content)

    env = Environment(loader=FileSystemLoader(str(REFERENCES_DIR)), autoescape=True)
    template = env.get_template(BASE_TEMPLATE)

    context["schemas"] = "\n".join(build_schemas(context))
    html = template.render(**context)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(html, encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
