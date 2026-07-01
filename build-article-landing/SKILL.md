---
name: build-article-landing
description: Generate a SEO-ready article landing page (listicle, alternatives guide, tool comparison) from a short product/page description. Activates on /build-article-landing or when the user asks to build an article landing page, generate a listicle page, make an alternatives guide, or similar.
license: MIT
compatibility: Compatible with shell-capable coding agents; requires local `ogi` CLI (Python 3.10+).
metadata:
  author: tangyuan
  version: "1.0.0"
---

# /build-article-landing

Generate a single, self-contained HTML article landing page optimized for SEO/GEO.

## When to use

- The user types `/build-article-landing`.
- The user asks to "build an article landing page", "generate a listicle page", "make an alternatives guide", or similar.
- The desired output is a static HTML file with structured article landing page content, comparison table, tool reviews, FAQ, and bottom CTA.

## Required parameters

| Parameter | Description |
|-----------|-------------|
| `--product-name` | Brand or product name (e.g., `DemoBrand`). |
| `--product-description` | One-sentence description of the product/brand. |
| `--page-name` | Title of the article landing page (e.g., `Top 10 AI Music Video Tools`). |
| `--page-description` | Short description for meta/OG tags. |
| `--output` | Destination HTML file path. |

## Optional parameters

| Parameter | Description |
|-----------|-------------|
| `--content` | JSON/YAML string or file path with pre-structured article data. If omitted, you (the agent) must generate it from the 5 required parameters. |
| `--theme` | `dark` or `paper` (light blue accent). Defaults to `dark`. |

## Prerequisites

1. The `ogi` CLI must be installed and on `PATH`:

   ```bash
   cd /path/to/open-growth-intel
   pip install -r cli/requirements.txt
   pip install -e .
   ```

2. This skill is compatible with shell-capable coding agents that can run local CLI commands. It reads files inside its own directory and runs standard shell commands. The `ogi` CLI must be installed locally; rendering is not performed by this skill itself.

## Workflow

1. **Acknowledge the request**. State that you will generate an article landing page and call `ogi landing build`.
2. **Resolve parameters**. Ask the user if any required parameter is missing. Do not invent values without confirmation.
3. **Load the data contract**. Read `references/schema.yaml` to know which fields the article landing page supports.
4. **Load the reference instance**. Read `references/reference.yaml` as the default filled-in example.
5. **Generate structured content** (only if `--content` is not provided):
   - Use the 5 required parameters to fill placeholders like `{{product_name}}`, `{{product_description}}`, `{{page_name}}`, `{{page_description}}`.
   - Produce a YAML object that conforms to `references/schema.yaml`.
   - Keep the same modules as `references/reference.yaml`: article lede, 8-10 sections, comparison table, 3-4 tool reviews, quick tips, inline CTA, 5-6 FAQ items, sources, related reading, bottom CTA, keywords, word count.
   - Use placeholder tool names (Tool A/B/C) for reviews and comparisons.
   - Product-owned URLs (canonical URL, CTA links) may use `https://example.com/...` placeholders when the user has not provided real URLs.
   - External reference URLs in `media_blocks`, `sources`, and `related` must be real, verified URLs from the user or from research. Do not fabricate competitor URLs or brand names.
   - Save the generated YAML to a temporary file, e.g., `/tmp/build-article-landing-<uuid>.yaml`.
6. **Run the build**:

   ```bash
   ogi landing build \
     --type article \
     --product-name "<product-name>" \
     --product-description "<product-description>" \
     --page-name "<page-name>" \
     --page-description "<page-description>" \
     --content /tmp/build-article-landing-<uuid>.yaml \
     --output "<output>"
   ```

7. **Verify the artifact**. Check that the output HTML file exists and contains no unrendered `{{...}}` placeholders or unintended `https://example.com/...` URLs when real URLs were expected.
8. **Report** the output path and a one-line summary of what was generated.

## Example usage

```
/build-article-landing \
  --product-name "DemoBrand" \
  --product-description "An AI toolkit for creators." \
  --page-name "Top 10 AI Music Video Tools" \
  --page-description "A practical guide to the best AI music video generators." \
  --output ./out/article.html
```

## Output guarantees

- The generated HTML includes `title`, `meta description`, `canonical`, Open Graph, Twitter Card, `Article` schema, `BreadcrumbList` schema, and `FAQPage` schema when FAQ items exist.
- The page includes TOC, comparison table, tool reviews, quick tips, inline CTA, FAQ, sources, related reading, and bottom CTA.
- No real brand names, real competitor URLs, local `/Users/...` paths, or secrets are emitted.

## File references

- `references/schema.yaml` — data contract for article landing pages
- `references/reference.yaml` — default filled-in instance used as a template
- `references/base.html` — main HTML template (for reference; rendering is handled by `ogi`)
- `references/components/*.html` — component templates (for reference; rendering is handled by `ogi`)
