# ADR-0007: Limit shared-game reads per address and game, not per address alone

|              |                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Accepted                                                                                                                                                                                |
| **Date**     | 2026-11-13                                                                                                                                                                              |
| **Deciders** | @vicenteopaso                                                                                                                                                                           |
| **Area**     | security, API                                                                                                                                                                           |
| **Related**  | [SPEC-0006](../specs/0006-shared-game-reliability/spec.md) REQ-0006-08, -09, -12 · [ADR-0005](./0005-shared-live-games-architecture.md) · `sdd.yaml` `security.rules` · CONSTITUTION-08 |

## Context and problem statement

Reads of a shared game (`GET /api/games/{id}`) were limited to 120 a minute per network address, in each server instance. The limit treats one address as one person. At a table, every phone is on the same Wi-Fi and shares one public address, and each phone checks every 2 seconds for a minute after a change (30 reads a minute). From five phones up, checks were refused, and those phones showed Reconnecting, then Offline, on a working connection ([SPEC-0006](../specs/0006-shared-game-reliability/spec.md) §1).

Fixing this means changing a rate limit. `sdd.yaml` requires an ADR for that, and CONSTITUTION-08 forbids weakening a security control to unblock a change. This ADR records what the limit protects, what changes, and what gets weaker.

The read limit protects two things. It slows anyone looking for games or guessing keys. And it caps how fast one client can spend the store's command budget: each read of a real game costs one store command, and the free plan allows 500,000 a month (ADR-0005 addendum).

## Decision drivers

- A table of 12 phones on one network must follow one game at full speed (REQ-0006-08, owner decision).
- Looking for games or guessing keys must not get faster than it is today (CONSTITUTION-08).
- No extra store commands per read: the command budget is the scarce resource (ADR-0005).
- No new dependency, and no accounts or device identity (SPEC-0003 non-goals).

## Considered options

1. **Keep 120 a minute per address** — do nothing.
2. **Raise the one per-address limit** — for example to 600 a minute.
3. **Limit per address and game, cap per address, and keep the old limit for misses** — three in-process limits.
4. **Limit per key or per device** — count by the bearer key, or by the connection id the device sends.
5. **Move read limits into the shared store** — one count shared by all server instances.

## Decision

**Chosen option:** "Option 3", because it is the only one that fits a full table without making it faster to look for games, and it costs no store commands.

Specifics, all per server instance and per minute:

- **400 reads per address and game.** 12 phones at the fastest rate make 360.
- **1,200 reads per address across all games.** About three full tables behind one address, such as a venue or a mobile carrier.
- **120 misses per address.** A read that finds no game, or carries a wrong or malformed key, counts as a miss; these all get the same 404. Once an address reaches 120 misses, further reads are refused before the store is asked anything. This is the limit every read had before, so looking for games is no faster than it was.
- A refusal answers `429` with `Retry-After`, as before. The device now waits that long (REQ-0006-10). Each refusal logs one warning with the route and the name of the limit, and nothing that identifies the address, key or game (REQ-0006-12).

### Consequences

**Positive**

- A table on one network is no longer refused, which removes the main cause of phones dropping out of a shared game.
- Guessing is unchanged in rate (120 a minute per address and instance) and still infeasible: a game needs a 96-bit id and a 128-bit key.
- A client that keeps missing is still refused before the store is asked anything, so it costs no commands.
- Refusals are visible in logs for the first time.

**Negative**

- **One address can spend the command budget faster.** With a valid key, one address can make 400 reads a minute on one game (24,000 store commands an hour), and 1,200 a minute across games (72,000 an hour), where it could make 120 (7,200 an hour). At the per-address cap, one abusive address could use the month's 500,000 commands in about 7 hours instead of about 69. Anyone can get a valid key by sharing a game (10 an hour per address).
- When the budget runs out, sharing answers `503` until the month ends; games on the device keep working (SPEC-0003 REQ-0003-25, -27).
- Three limits are harder to reason about than one.
- The limits are still per instance, so they are looser than their numbers when traffic spreads over several instances. This was already true.

**Neutral / to monitor**

- Honest nights now cost more commands than the first one did, because refused reads cost nothing and those reads now succeed. Twelve phones for four hours is roughly 35,000 to 86,000 reads, so about 6 to 14 such nights a month on the free plan.
- Watch the refusal warnings and the Upstash command count after the next game night.

## Validation

- Route tests: 12 devices × 30 reads a minute from one address pass; the per-game, per-address and miss limits each refuse at their number; a refused miss makes no store call; the log line holds no address, key or id (`test/unit/app/api/games.test.ts`).
- After the next shared game night: no `reads-per-game` warnings for an honest table, and the month's command count stays under the plan limit.
- Review the numbers after the first month, or sooner if a `503` from the store is ever seen.

## Pros and cons of the options

### Option 1: Keep 120 a minute per address

- Good: no change to a security control.
- Bad: shared play fails for five or more phones on one network, which is the product's main use.

### Option 2: Raise the one per-address limit

- Good: one number, smallest change.
- Bad: guessing gets faster by the same factor, and one table still shares its allowance with everything else on that address.

### Option 3: Per address and game, capped per address, misses at the old limit

- Good: fits a table; guessing is no faster; no store commands; small code change.
- Bad: raises how fast one address can spend the command budget; three limits.

### Option 4: Per key or per device

- Good: not affected by shared addresses.
- Bad: every watcher of a game holds the same watch key, so a per-key limit is one limit for the whole game on every network, and one abusive holder could lock everyone out. A connection id is chosen by the client, so it can be changed on every request.

### Option 5: Limits in the shared store

- Good: exact across instances.
- Bad: one more store command per read, which roughly doubles the cost of following a game on a plan where commands are the constraint.

## Follow-ups

- [x] Update `sdd.yaml`: nothing to change (no structure, gate or service changed)
- [x] Update affected reference docs: API Patterns, Security Policy, Observability
- [ ] Review the three numbers after the first month of use
- [ ] If the command budget is ever exhausted, consider a paid store plan or option 5

## References

- [SPEC-0006](../specs/0006-shared-game-reliability/spec.md) and its [plan](../specs/0006-shared-game-reliability/plan.md)
- [ADR-0005](./0005-shared-live-games-architecture.md), addendum on command use
- Code: `app/api/games/_lib.ts` (`readAllowed`, `recordReadMiss`), `lib/infra/rate-limit.ts`
