# Skills Repository

This is a multi-skill repository for coding-agent capabilities. Each top-level subdirectory is an independent skill that compatible coding agents can invoke.

## Repository Structure

```
skills/
├── README.md                    # This file
├── CLAUDE.md                    # Guidance for Claude Code when working in this repo
├── LICENSE                      # MIT
├── build-article-landing/       # Skill: generate SEO-ready article landing pages
│   ├── SKILL.md                 # Skill definition, parameters, and workflow
│   ├── render.py                # Local Jinja2 renderer for article landing pages
│   ├── requirements.txt           # Python dependencies for render.py
│   └── references/              # Templates, schema, and reference data
│       ├── schema.yaml          # Data contract for article landing pages
│       ├── template.yaml        # Agent-facing generation skeleton
│       ├── reference-example.yaml # Historical `ogi` renderer reference template (for reference only; contains Jinja2 placeholders)
│       ├── base.html            # Main HTML template (rendered by `build-article-landing/render.py`)
│       └── components/          # Component templates (rendered by `build-article-landing/render.py`)
├── competitor_intel/            # Skill: bi-weekly competitor growth intelligence reports
│   ├── SKILL.md                 # Skill definition, workflow, and report template
│   ├── config/
│   │   └── competitors.yaml     # Competitor definitions and source config
│   ├── update_monitoring_state.mjs  # Node.js monitoring helper
│   └── references/              # Schema, templates, design doc
│       ├── schema.yaml          # Data contract for reports
│       ├── template.yaml        # Agent generation skeleton
│       ├── reference-example.yaml   # Filled report example
│       ├── report-template.md   # Markdown report template
│       └── design.html          # Design document
└── [future skills...]           # Additional skills to be added
```

## Skills

### `build-article-landing`

Generate a single, self-contained HTML article landing page optimized for SEO/GEO.

- **Trigger:** `/build-article-landing` or requests to build an article landing page, listicle, alternatives guide, or tool comparison.
- **Dependencies:** Python 3.10+, `jinja2`, `pyyaml`.
- **Compatibility:** Shell-capable coding agents with Python 3.10+, `jinja2`, and `pyyaml` installed.
- **Documentation:** See [`build-article-landing/SKILL.md`](build-article-landing/SKILL.md).

### `competitor_intel`

Systematically investigate competitor product, SEO, content, ads, social, channel, PLG, and pricing actions over fixed bi-weekly windows.

- **Trigger:** `/competitor-intel`, `竞品情报`, `跑一次情报`, `更新竞品双周报`, `competitor intel`
- **Dependencies:** Node.js 18+ and `curl`. Strongly recommends `web-access`, `multi-search`, and `browse` skills for dynamic sources.
- **Compatibility:** Shell-capable coding agents.
- **Documentation:** See [`competitor_intel/SKILL.md`](competitor_intel/SKILL.md).
- **Output:** Structured Markdown report sorted by event occurrence time, with source audit ledger.

## Adding a New Skill

1. Create a new directory at the repository root using a clear, kebab-case skill name.
2. Add `SKILL.md` with skill definition, parameters, workflow, and usage examples.
3. Add a `references/` directory with `schema.yaml`, `template.yaml`, `reference-example.yaml`, and any templates.
4. Keep terminology consistent within the skill.
5. Update this `README.md` and, if needed, `CLAUDE.md`.

## License

MIT. See [LICENSE](LICENSE).
