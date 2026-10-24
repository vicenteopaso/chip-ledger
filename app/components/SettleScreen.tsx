import { Button } from "@/app/components/Button";
import { Hint, PageTitle, SectionTitle } from "@/app/components/Typography";
import type { GameState } from "@/lib/game";
import type { MoneyFormatter } from "@/lib/money";
import type { Settlement } from "@/lib/settlement";
import { hasPotMismatch } from "@/lib/summaries";

/** `copied` after a successful copy; `fallback` holds text to show when the clipboard failed. */
export type CopyState = { kind: "idle" } | { kind: "copied" } | { kind: "fallback"; text: string };

export type SettleScreenProps = {
  game: GameState;
  settlement: Settlement;
  money: MoneyFormatter;
  copy: CopyState;
  resetArmed: boolean;
  onScaleChange: (scale: boolean) => void;
  onCopy: () => void;
  onNewGame: () => void;
  onReset: () => void;
};

function signedMoney(money: MoneyFormatter, cents: number): string {
  return `${cents > 0 ? "+" : ""}${money(cents / 100)}`;
}

function netTone(cents: number): string {
  if (cents > 0) return "text-success";
  if (cents < 0) return "text-danger";
  return "";
}

/** Step 4: payments, results, and end-of-game actions (REQ-0001-18 … -24). */
export function SettleScreen({
  game,
  settlement,
  money,
  copy,
  resetArmed,
  onScaleChange,
  onCopy,
  onNewGame,
  onReset,
}: SettleScreenProps) {
  const difference = Math.abs(settlement.difference);
  return (
    <>
      <PageTitle>Settle up</PageTitle>
      {hasPotMismatch(settlement) && (
        <div className="my-3 rounded-md bg-warn-bg px-3.5 py-3 text-md text-warn-ink">
          {`The counted chips are ${money(difference)} ${settlement.difference > 0 ? "over" : "short of"} the ${money(settlement.pot)} pot.`}
          <label className="mt-2.5 flex items-start gap-3 text-md">
            <input
              type="checkbox"
              className="mt-px size-5.5 flex-none accent-accent"
              checked={game.scale}
              onChange={(event) => {
                onScaleChange(event.target.checked);
              }}
            />
            <span>
              Spread the difference across everyone in proportion to their chips, so the payments
              balance.
            </span>
          </label>
        </div>
      )}

      <SectionTitle>Payments</SectionTitle>
      {settlement.payments.length > 0 ? (
        <ul>
          {settlement.payments.map((payment, index) => (
            <li
              key={`${payment.from}-${payment.to}-${String(index)}`}
              className="my-2.5 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5"
            >
              <div className="flex-1 text-lg">
                <b>{payment.from}</b> <span className="text-text-muted">pays</span>{" "}
                <b>{payment.to}</b>
              </div>
              <div className="text-4xl font-extrabold">{money(payment.cents / 100)}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="my-3 text-md text-success">Everyone broke even. Nobody owes anything.</p>
      )}
      {!game.scale && settlement.unaccountedCents !== 0 && (
        <Hint>
          {`These payments leave ${money(Math.abs(settlement.unaccountedCents) / 100)} unaccounted for because the chip count doesn't match the pot.`}
        </Hint>
      )}

      <SectionTitle>Results</SectionTitle>
      <ul>
        {settlement.rows.map((row) => (
          <li
            key={row.playerId}
            className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-border py-3"
          >
            <b className="text-lg">{row.name}</b>
            <span className={`text-right text-2xl font-extrabold ${netTone(row.netCents)}`}>
              {signedMoney(money, row.netCents)}
            </span>
            <small className="text-sm text-text-muted">{`Put in ${money(row.putIn)}`}</small>
            <small className="text-right text-sm text-text-muted">
              {`Cashed out ${money(row.cashedOut)}`}
            </small>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="secondary" onClick={onCopy}>
          {copy.kind === "copied" ? "Copied" : "Copy results"}
        </Button>
        {copy.kind === "fallback" && (
          <>
            <textarea
              className="h-42.5 w-full rounded-md border border-border bg-surface p-2.5 font-mono text-sm text-text"
              readOnly
              aria-label="Results text"
              value={copy.text}
            />
            <Hint>Select the text above and copy it.</Hint>
          </>
        )}
        <Button variant="secondary" onClick={onNewGame}>
          New game with the same players
        </Button>
        <Button variant="danger" onClick={onReset}>
          {resetArmed ? "Tap again to erase everything" : "Start over from scratch"}
        </Button>
      </div>
    </>
  );
}
