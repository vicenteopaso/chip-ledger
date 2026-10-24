# Template Setup

First-run checklist for a repository created from this template. Budget about 15 minutes.

## 1. Create your repository

On GitHub, **Use this template → Create a new repository**. Clone it and create a branch for setup:

```bash
git clone git@github.com:<owner>/<repo>.git && cd <repo>
git switch -c chore/template-setup
```

## 2. Fill in the placeholders

```bash
node scripts/init-template.mjs
```

It prompts for (or accepts as `--key=value` flags) and replaces everywhere:

| Placeholder             | Example                              |
| ----------------------- | ------------------------------------ |
| `{{PROJECT_NAME}}`      | `acme-web`                           |
| `{{PROJECT_DESCRIPTION}}` | `Marketing site and docs for Acme` |
| `{{GITHUB_OWNER}}`      | `acme`                               |
| `{{GITHUB_REPO}}`       | `acme-web`                           |
| `{{SECURITY_CONTACT}}`  | `security@acme.com`                  |
| `{{CONTACT_EMAIL}}`     | `hello@acme.com` (support, conduct)  |
| `{{COPYRIGHT_HOLDER}}`  | `Acme, Inc.`                         |
| `{{YEAR}}`              | filled automatically                 |

Use `--dry-run` to preview. The script refuses to run twice if nothing is left to replace, and prints any placeholders it could not fill.

## 3. Choose your stack

`sdd.yaml` ships TypeScript/Next.js defaults marked `TEMPLATE:`.

- **Keeping the defaults?** Scaffold the app (`pnpm create next-app`), then add the scripts the docs reference (`lint`, `typecheck`, `test`, `coverage`, `build`, `test:e2e`, `test:a11y`, `verify`). CI jobs that need `package.json` turn on automatically once it exists. Also **uncomment the `npm` entry in `.github/dependabot.yml`**; it ships disabled because Dependabot errors when there is no manifest.
- **Using a different stack?** Update `sdd.yaml` (`stack`, `standards`, `devex.commands`), then adjust `ci.yml`, `.nvmrc`, `.github/dependabot.yml`, and the code samples in the docs. The governance files do not change.

## 4. Review the Constitution

Read [`docs/CONSTITUTION.md`](./docs/CONSTITUTION.md). Keep, tighten, or retire invariants (mark retired ones `[RETIRED]`, never delete IDs). Adopt optional invariants you need (i18n, privacy). Then run:

```bash
node scripts/check-sdd-refs.mjs
```

It fails if an invariant has no enforcement mapping in `sdd.yaml`.

## 5. Define your layers

Edit `standards.architecture.layers` in `sdd.yaml` and the matching sections of [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Add lint rules that enforce them.

## 6. Configure GitHub (manual; not stored in git)

- [ ] **Branch protection on `main`**: require PRs, code-owner review, and the status checks listed in `sdd.yaml` → `devex.ci.required-checks`. See [Deployment §4](./docs/DEPLOYMENT.md).
- [ ] Enable **secret scanning and push protection**, Dependabot alerts, and **code scanning**.
  - Code scanning is free on public repositories. On private repositories it requires GitHub Code Security. Until it is enabled, the `codeql` check fails at the results upload (the analysis itself still runs).
  - If you cannot enable it, do not just ignore the failure: write an ADR that removes `codeql` from `devex.ci.required-checks` and from the `CONSTITUTION-08` enforcement entry in `sdd.yaml`, and add an alternative static-analysis job.
- [ ] Review `.github/CODEOWNERS` and add teams for governance files.
- [ ] Labels sync on the first push to `main`; confirm `architecture-change` and `constitution-amendment` exist.
- [ ] Add deploy secrets and variables ([Deployment §3](./docs/DEPLOYMENT.md)) and review `.github/workflows/deploy.yml`.
- [ ] Install the local hook: `git config core.hooksPath .husky` (or add Husky when you add `package.json`).

## 7. Replace the inventories

- [ ] `docs/CONFIGURATION.md` and `.env.example` — your real variables
- [ ] `docs/SECURITY_POLICY.md` — threat model and accepted advisories
- [ ] `docs/DESIGN_SYSTEM.md` — token values
- [ ] `docs/adr/README.md` — update the dates on ADRs 0001–0003 or supersede them
- [ ] `SECURITY.md` and `SUPPORT.md` — contact details and response expectations

## 8. Commit and open the first PR

```bash
git add -A
git commit -m "chore: initialize from web-app-sdd-template"
git push -u origin chore/template-setup
gh pr create --template .github/PULL_REQUEST_TEMPLATE.md
```

Delete this file and the notice at the top of `README.md` once you are done.

## Updating from the template later

The template evolves. To pull improvements into an existing project:

```bash
git remote add template git@github.com:<template-owner>/web-app-sdd-template.git
git fetch template
git diff HEAD template/main -- docs/ .github/ scripts/ AGENTS.md
```

Cherry-pick what you want through a normal PR. Never overwrite your Constitution or `sdd.yaml` wholesale.
