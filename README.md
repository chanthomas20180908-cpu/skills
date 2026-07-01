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
│   └── references/              # Templates, schema, and reference data
│       ├── schema.yaml          # Data contract for article landing pages
│       ├── template.yaml        # Agent-facing generation skeleton
│       ├── reference-example.yaml # Human-readable filled example
│       ├── base.html            # Main HTML template (rendered by `ogi`)
│       └── components/          # Component templates (rendered by `ogi`)
└── [future skills...]           # Additional skills to be added
```

## Skills

### `build-article-landing`

Generate a single, self-contained HTML article landing page optimized for SEO/GEO.

- **Trigger:** `/build-article-landing` or requests to build an article landing page, listicle, alternatives guide, or tool comparison.
- **Dependencies:** Local `ogi` CLI from open-growth-intel, Python 3.10+.
- **Compatibility:** Shell-capable coding agents with local `ogi` installed.
- **Documentation:** See [`build-article-landing/SKILL.md`](build-article-landing/SKILL.md).

## Adding a New Skill

1. Create a new directory at the repository root using a clear, kebab-case skill name.
2. Add `SKILL.md` with skill definition, parameters, workflow, and usage examples.
3. Add a `references/` directory with `schema.yaml`, `template.yaml`, `reference-example.yaml`, and any templates.
4. Keep terminology consistent within the skill.
5. Update this `README.md` and, if needed, `CLAUDE.md`.

## License

MIT. See [LICENSE](LICENSE).
