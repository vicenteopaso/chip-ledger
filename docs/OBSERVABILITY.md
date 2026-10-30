# Observability

You cannot fix what you cannot see. This document defines what we collect, why, and what we do with it. Vendor choices are defaults; the practices are the standard.

## 1. Signals

| Signal             | Purpose                               | Default tool (swap freely)       |
| ------------------ | ------------------------------------- | -------------------------------- |
| Structured logs    | Debug a specific request or job       | Platform logs / log drain        |
| Error tracking     | Group, count, and alert on exceptions | Sentry or equivalent             |
| Web Vitals _(web)_ | Real-user performance (LCP, INP, CLS) | Platform speed insights / RUM    |
| Product analytics  | Usage, privacy-respecting             | Cookieless analytics             |
| Traces/metrics     | Latency and saturation of services    | OpenTelemetry-compatible backend |
| Synthetic checks   | Is it up, and are budgets met?        | Lighthouse CI, uptime monitor    |

## 2. Principles

1. **Structured over free text.** JSON with stable keys (`level`, `context`, `requestId`, `release`).
2. **One correlation ID** per request, returned to the client and logged everywhere.
3. **Release-tag everything** so a regression maps to a deploy.
4. **Privacy by design.** Never log secrets, tokens, or personal data; redact by key; sample session replay and mask inputs.
5. **Alert on symptoms, not causes.** Page on user-visible impact; chart the rest.

## 3. Error tracking

- Initialize on client, server, and edge runtimes with environment and release labels.
- Upload source maps in CI so stack traces are readable; do not serve them publicly.
- Set a conservative trace sample rate (for example 0.1) and tune from data.
- Filter noise (browser extensions, bot traffic, cancelled navigations) with explicit rules, not blanket ignores.
- Required variables are documented in [Configuration](./CONFIGURATION.md).

Production checklist:

- [ ] Alerts route to a human on-call or a monitored channel
- [ ] New-issue and regression alerts enabled
- [ ] Source maps uploaded for each release
- [ ] PII scrubbing rules reviewed
- [ ] A deliberate test error appears in the dashboard after each major change to setup

## 4. Web Vitals _(web profile)_

Targets at the 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Collect field data from real users and compare against the lab budgets enforced by Lighthouse CI. When field and lab disagree, trust the field and investigate.

## 5. Lighthouse CI

Runs on each PR against a production build, asserting the budgets in `sdd.yaml` (`performance.budgets`) through `lighthouserc.json`. Results are attached to the run. Lab scores vary; use the median of several runs and treat small swings as noise.

## 6. SLOs (lightweight)

Define two or three, review quarterly:

| SLI                       | Objective (example) | Window |
| ------------------------- | ------------------- | ------ |
| Successful page responses | 99.9%               | 30 d   |
| API p95 latency           | < 500 ms            | 30 d   |
| Error-free sessions       | > 99%               | 30 d   |

An exhausted error budget pauses feature work in favor of reliability work.

## 7. Incident basics

1. Acknowledge and declare severity.
2. Stabilize first (roll back per [Deployment](./DEPLOYMENT.md)), diagnose second.
3. Communicate status on a fixed cadence.
4. Write a blameless post-mortem with timeline, root cause, and action items; turn lessons into guardrails ([AI Guardrails §11](./AI_GUARDRAILS.md)).

## Related

[Error Handling](./ERROR_HANDLING.md) · [Configuration](./CONFIGURATION.md) · [Deployment](./DEPLOYMENT.md)
