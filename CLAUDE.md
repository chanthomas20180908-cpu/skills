# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Overview

This is a **multi-skill repository** for coding-agent capabilities. Each top-level subdirectory (e.g., `build-article-landing/`) is an independent skill containing a `SKILL.md` file and supporting reference files.

## Skill Structure Convention

Each skill follows this layout:

```
<skill-name>/
├── SKILL.md                   # Skill definition, parameters, workflow, examples
└── references/                # Templates, schemas, and reference data
    ├── schema.yaml            # Data contract documenting supported fields
    ├── template.yaml          # Agent-facing generation skeleton (start here)
    ├── reference-example.yaml # Historical `ogi` renderer reference template (for reference only; contains Jinja2 placeholders)
    ├── base.html              # Main HTML template (rendered by the skill's local renderer)
    └── components/*.html      # Component templates (rendered by the skill's local renderer)
```

## Skill Output Types

- **HTML-output skills** (e.g., `build-article-landing`): Include `references/base.html` and `references/components/*.html` as Jinja2 templates, plus a local renderer script at the skill root (e.g., `render.py`) that builds the final HTML without requiring an external CLI.
- **Markdown-output skills** (e.g., `competitor_intel`): Include `references/report-template.md` instead of HTML templates. `references/schema.yaml`, `references/template.yaml`, and `references/reference-example.yaml` are still required.

## Rules for Modifying Skills

1. **Read the skill's `SKILL.md` first** to understand parameters, workflow, and terminology.
2. **Check `references/schema.yaml`** for the data contract before adding or removing fields.
3. **Check `references/template.yaml`** for the agent generation skeleton and `references/reference-example.yaml` for the historical `ogi` renderer reference template.
4. **Keep terminology consistent** within a skill. For example, `build-article-landing` uses "article landing page" everywhere.
5. **Document template variables** in `schema.yaml`. If a variable is injected by the skill's local renderer, mark it as "Renderer-injected" and explain which renderer supplies it.
6. **Use English half-width quotes** `"..."` for all HTML/CSS/JS attributes. Never use Chinese full-width quotes `“...”` in attributes.
7. **Run the HTML quote check** after modifying any HTML file:
   ```bash
   rg -n 'class=[”“]|style=[”“]|href=[”“]|src=[”“]|id=[”“]|target=[”“]|rel=[”“]' path/to/file.html
   ```
8. **No git operations** in this repository unless the user explicitly overrides the global rule.

## Adding a New Skill

1. Create a new directory at the repository root.
2. Add `SKILL.md` following the format in existing skills.
3. Add a `references/` directory with `schema.yaml`, `template.yaml`, `reference-example.yaml`, and any templates (HTML or Markdown depending on output type). HTML-output skills should also include a local renderer script (e.g., `render.py`) at the skill root.
4. Update `README.md` to list the new skill.
5. If the skill introduces new conventions, update this `CLAUDE.md`.
