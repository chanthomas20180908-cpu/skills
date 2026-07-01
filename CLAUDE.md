# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Overview

This is a **multi-skill repository** for coding-agent capabilities. Each top-level subdirectory (e.g., `build-article-landing/`) is an independent skill containing a `SKILL.md` file and supporting reference files.

## Skill Structure Convention

Each skill follows this layout:

```
<skill-name>/
├── SKILL.md              # Skill definition, parameters, workflow, examples
└── references/           # Templates, schemas, and reference data
    ├── schema.yaml       # Data contract documenting supported fields
    ├── reference.yaml    # Default filled-in instance used as a template
    ├── base.html         # Main HTML template (rendered by external CLI)
    └── components/*.html # Component templates (rendered by external CLI)
```

## Rules for Modifying Skills

1. **Read the skill's `SKILL.md` first** to understand parameters, workflow, and terminology.
2. **Check `references/schema.yaml`** for the data contract before adding or removing fields.
3. **Check `references/reference.yaml`** for the default template structure.
4. **Keep terminology consistent** within a skill. For example, `build-article-landing` uses "article landing page" everywhere.
5. **Document template variables** in `schema.yaml`. If a variable is injected by an external renderer (e.g., `ogi`), mark it as "Renderer-injected" and explain which tool supplies it.
6. **Use English half-width quotes** `"..."` for all HTML/CSS/JS attributes. Never use Chinese full-width quotes `“...”` in attributes.
7. **Run the HTML quote check** after modifying any HTML file:
   ```bash
   rg -n 'class=[”“]|style=[”“]|href=[”“]|src=[”“]|id=[”“]|target=[”“]|rel=[”“]' path/to/file.html
   ```
8. **No git operations** in this repository unless the user explicitly overrides the global rule.

## Adding a New Skill

1. Create a new directory at the repository root.
2. Add `SKILL.md` following the format in existing skills.
3. Add `references/` with `schema.yaml`, `reference.yaml`, and any templates.
4. Update `README.md` to list the new skill.
5. If the skill introduces new conventions, update this `CLAUDE.md`.
