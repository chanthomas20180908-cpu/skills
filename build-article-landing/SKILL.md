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
4. **Load the generation skeleton**. Read `references/template.yaml` to know the agent-facing structure. Read `references/reference-example.yaml` only if you need a human-readable filled example, but **do not copy its prose**.
5. **Generate structured content** (only if `--content` is not provided):
   - Read `references/template.yaml` as the generation skeleton.
   - **Do not read or copy any prose from `references/reference-example.yaml`.** `reference-example.yaml` is a human-readable filled example only; it is not the generation template.
   - Replace every `[...]` placeholder and every example sentence in `template.yaml` with content derived from the user's topic. Do not reuse creators/SEO example language.
   - Produce a YAML object that conforms to `references/schema.yaml`.
   - Keep the same modules as `template.yaml`: article lede, 4 sections, comparison table, 3 tool reviews, quick tips, inline CTA, 5 FAQ items, bottom CTA, keywords, word count.
   - Use placeholder tool names (Tool A/B/C) for reviews and comparisons.
   - **Do not emit Jinja2 expressions (`{{...}}`) in the generated YAML.** `ogi` does not process them from `--content`; it only processes them in its own internal template. Replace them with plain strings before saving.
   - Product-owned URLs (canonical URL, CTA links, `og_image`) may use `https://example.com/...` placeholders when the user has not provided real URLs.
   - External reference URLs in `media_blocks`, `sources`, and `related` must be real, verified URLs from the user or from research. Do not fabricate competitor URLs or brand names.
   - If no real external URLs are available, set `sources: []` and `related: []`. **Do not omit these fields**, or `ogi` will fall back to its internal defaults.
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

7. **Verify the artifact**:
   - Confirm the output HTML file exists.
   - Check for unrendered `{{...}}` placeholders:
     ```bash
     rg '\{\{.*\}\}' "<output>"
     ```
   - Check for leftover reference phrases that indicate content was copied from `reference-example.yaml`:
     ```bash
     rg -i 'creators|SEO-ready landing page|Open Growth Intel|AI creator tools|Wikipedia' "<output>"
     ```
   - Check for hardcoded default date that should have been renderer-injected:
     ```bash
     rg '2026-06-30' "<output>"
     ```
   - Check for unintended `https://example.com/...` URLs in external reference sections. Product-owned URLs (canonical, CTA, og:image) may legitimately use example.com when no real URL was supplied; external references in sources/related/media must not:
     ```bash
     rg 'example\.com' "<output>"
     ```
   - If any of the above checks find unexpected matches, fix the generated YAML and rebuild.
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

- `references/schema.yaml` — data contract for article landing pages (source of truth for fields and URL rules)
- `references/template.yaml` — agent-facing generation skeleton; the AI/skill layer must start from this file
- `references/reference-example.yaml` — human-readable filled example; **do not copy its prose into generated output**
- `references/base.html` — main HTML template (for reference; rendering is handled by `ogi`)
- `references/components/*.html` — component templates (for reference; rendering is handled by `ogi`)
