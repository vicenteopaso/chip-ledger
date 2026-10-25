# Documentation Map

Start here. Documents are grouped by the question they answer. Precedence for conflicts is in the [Constitution](./CONSTITUTION.md).

## Governance (highest authority first)

| Document                                   | Answers                                     |
| ------------------------------------------ | ------------------------------------------- |
| [Constitution](./CONSTITUTION.md)          | What must always be true?                   |
| [`sdd.yaml`](../sdd.yaml)                  | How is the system shaped, gated, and governed? |
| [ADRs](./adr/README.md)                    | Why did we decide this?                     |
| [Feature specs](./specs/README.md)         | What should this change do?                 |
| [SDD Guide](./SDD_GUIDE.md)                | How do we work spec-first?                  |

## Working with AI agents

| Document                              | Answers                                           |
| ------------------------------------- | ------------------------------------------------- |
| [`AGENTS.md`](../AGENTS.md)           | What does an agent read and run first?            |
| [AI Agent Guide](./AI_AGENT_GUIDE.md) | Quick reference: commands, structure, do/don't    |
| [AI Guardrails](./AI_GUARDRAILS.md)   | Operating protocol, autonomy tiers, hard limits   |
| [Forbidden Patterns](./FORBIDDEN_PATTERNS.md) | What must never be written, and what to write instead |

## Building

| Document                                    | Answers                                  |
| ------------------------------------------- | ---------------------------------------- |
| [Architecture](./ARCHITECTURE.md)           | Where does this code go?                 |
| [Engineering Standards](./ENGINEERING_STANDARDS.md) | What is the quality bar?          |
| [API Patterns](./API_PATTERNS.md)           | How do we write endpoints?               |
| [Error Handling](./ERROR_HANDLING.md)       | How do we fail well?                     |
| [Design System](./DESIGN_SYSTEM.md)         | Which tokens and patterns do we use?     |
| [Component docs](./components/README.md)    | How does each component behave?          |
| [Accessibility](./ACCESSIBILITY.md)         | How do we meet WCAG 2.1 AA?              |
| [SEO Guide](./SEO_GUIDE.md)                 | How do we stay discoverable?             |

## Verifying and reviewing

| Document                                | Answers                                  |
| --------------------------------------- | ---------------------------------------- |
| [Testing](./TESTING.md)                 | How do we prove it works?                |
| [Review Checklist](./REVIEW_CHECKLIST.md) | What must a reviewer check?            |
| [Security Practices](./SECURITY_POLICY.md) | How do we keep it safe?               |

## Running

| Document                                | Answers                                  |
| --------------------------------------- | ---------------------------------------- |
| [Configuration](./CONFIGURATION.md)     | Which variables and config files exist?  |
| [Deployment](./DEPLOYMENT.md)           | How does it get to production?           |
| [Roadmap](./ROADMAP.md)                 | What is planned, not yet scheduled?      |
| [Release Process](./RELEASE_PROCESS.md) | How do we version and release?           |
| [Observability](./OBSERVABILITY.md)     | How do we see what it is doing?          |

## Root files

[`README.md`](../README.md) · [`CONTRIBUTING.md`](../CONTRIBUTING.md) · [`SECURITY.md`](../SECURITY.md) · [`SUPPORT.md`](../SUPPORT.md) · [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) · [`CHANGELOG.md`](../CHANGELOG.md)

## Keeping this map honest

Adding or removing a document? Update this table in the same PR. `scripts/check-doc-links.mjs` fails CI on broken relative links.
