# AGENTS.md — Business OS

All standards live in the private docs repo **[business-os-docs](https://github.com/ranjithkodakandla/business-os-docs/blob/main/README.md)**. Before any work, read its [AGENTS.md](https://github.com/ranjithkodakandla/business-os-docs/blob/main/AGENTS.md) and follow, in order:
1. Big picture — [product-context](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/product-context.md)
2. Architecture — [architecture](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/architecture.md), [api](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/api.md)
3. Design — [ui-ux](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/ui-ux.md)
4. Guardrails — [coding](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/coding.md), [testing](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/testing.md), [reliability-observability](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/reliability-observability.md), [feature-flags](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/feature-flags.md), [security-privacy](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/security-privacy.md), [definition-of-done](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/definition-of-done.md)
5. Workflow — [story-workflow](https://github.com/ranjithkodakandla/business-os-docs/blob/main/standards/story-workflow.md) (Jira rozvaa.atlassian.net, project SCRUM)

Tip: clone it next to this repo (`gh repo clone ranjithkodakandla/business-os-docs ../business-os-docs`) so tools can read it locally.

## Hard guardrails (never)
- Commit secrets, keys, tokens, `.env` files, or real customer data.
- Access production, or provision any infrastructure.
- Force-push, rewrite shared history, or push to `main` directly.
- Pick an unassigned story, or edit another service/MFE without a linked story.
- Edit AGENTS.md, pointer files, or the docs repo's standards without Ranjith's approval.
- Introduce a monolith, a shared database across services, or a known tech-debt shortcut.

If blocked or unsure: comment on the Jira story and stop.
