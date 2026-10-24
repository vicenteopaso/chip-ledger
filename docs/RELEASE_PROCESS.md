# Release Process

A lightweight, label-driven release flow. `main` is always deployable (CONSTITUTION-18).

## 1. Branching and merging

- Branch from `main` with a short-lived branch: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Open a PR; never commit to `main` directly.
- Squash-merge so history stays one commit per change, with a Conventional Commit message.

## 2. Steps

1. Open a PR using the template. Link the spec/ADR. Add exactly one type label (`feat`, `fix`, `docs`, …) and a bump label (`major`, `minor`, `patch`) when it is not obvious.
2. All required checks pass (see `sdd.yaml` → `devex.ci.required-checks`).
3. Obtain approvals, including code owners for governance files.
4. Merge. CI deploys production ([Deployment](./DEPLOYMENT.md)).
5. Verify the deploy (smoke test, error tracker, Web Vitals).

## 3. Versioning

[Semantic Versioning](https://semver.org/):

| Bump  | When                                                              |
| ----- | ----------------------------------------------------------------- |
| Major | Breaking change to a public contract or documented behavior       |
| Minor | Backward-compatible feature                                       |
| Patch | Backward-compatible fix, docs, dependency, or internal change     |

- The version lives in `package.json` and in the latest `CHANGELOG.md` entry; a script (`scripts/check-version-sync.mjs`, optional) keeps them equal.
- Tag releases `vMAJOR.MINOR.PATCH` on `main`. CI re-checks that the tag, `package.json`, and changelog agree.

## 4. Release notes

- [Release Drafter](https://github.com/release-drafter/release-drafter) builds a draft from PR titles and labels (`.github/release-drafter.yml`). Use `skip-changelog` to exclude a PR.
- Promote the draft to a release when you tag.
- Move the notable items into `CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com/) format) in the release PR.

## 5. Hotfixes

1. Branch from `main`: `fix/<short-description>`.
2. Reproduce, add a regression test, fix ([AI Guardrails §2.4](./AI_GUARDRAILS.md)).
3. Fast-track review; required checks still apply — there is no bypass.
4. Merge, deploy, verify, then write the follow-up (post-mortem if user-impacting).

## 6. Rollback

See [Deployment §7](./DEPLOYMENT.md). A rollback does not require a PR; the revert or fix-forward does.

## 7. Release checklist

- [ ] Required checks green on the merge commit
- [ ] Migrations backward compatible; rollback path confirmed
- [ ] `CHANGELOG.md` updated; version bumped in `package.json`
- [ ] Docs, `sdd.yaml`, and `.env.example` current
- [ ] Specs for shipped work set to `implemented`
- [ ] Tag created; release published from the draft
- [ ] Post-deploy verification complete
