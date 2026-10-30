import { Button } from "@/app/components/Button";
import { ConfirmInline } from "@/app/components/ConfirmInline";
import { Notice } from "@/app/components/Notice";
import { useReadOnly } from "@/app/components/ReadOnly";
import { Card, ListRow } from "@/app/components/Surfaces";
import { Hint, PageTitle, SectionTitle } from "@/app/components/Typography";
import type { GameState, SpreadBy } from "@/lib/game";
import { type Currency, fromMinor, type MoneyFormatter } from "@/lib/money";
import type { Settlement } from "@/lib/settlement";
import { hasPotMismatch } from "@/lib/summaries";

/** `copied` after a successful copy; `fallback` holds text to show when the clipboard failed. */
export type CopyState = { kind: "idle" } | { kind: "copied" } | { kind: "fallback"; text: string };

export type SettleScreenProps = {
  game: GameState;
  settlement: Settlement;
  money: MoneyFormatter;
  copy: CopyState;
  /** Whether the "Start over" confirmation is open (REQ-0002-11). */
  resetConfirming: boolean;
  onScaleChange: (scale: boolean) => void;
  onSpreadByChange: (spreadBy: SpreadBy) => void;
  onCopy: () => void;
  onBackToSetup: () => void;
  onResetConfirmingChange: (open: boolean) => void;
  onReset: () => void;
  /** False where starting over is not offered, such as a shared game (SPEC-0003 PR 6). */
  allowReset?: boolean;
};

function signedMoney(money: MoneyFormatter, minor: number, currency: Currency): string {
  return `${minor > 0 ? "+" : ""}${money(fromMinor(minor, currency))}`;
}

function netTone(minor: number): string {
  if (minor > 0) return "text-success";
  if (minor < 0) return "text-danger";
  return "";
}

/** Step 4: payments, results, and end-of-game actions (REQ-0001-18 … -24). */
export function SettleScreen({
  game,
  settlement,
  money,
  copy,
  resetConfirming,
  onScaleChange,
  onSpreadByChange,
  onCopy,
  onBackToSetup,
  onResetConfirmingChange,
  onReset,
  allowReset = true,
}: SettleScreenProps) {
  const readOnly = useReadOnly();
  const difference = Math.abs(settlement.difference);
  // Short: the shared money is added to cash-outs; over: it is taken from them.
  const short = settlement.difference < 0;
  const perPlayer = difference / settlement.rows.length;
  const spreadOptions: { value: SpreadBy; label: string; effect: string }[] = [
    {
      value: "chips",
      label: "In proportion to chips",
      effect: short ? "Bigger stacks get more of it." : "Bigger stacks give up more of it.",
    },
    {
      value: "equal",
      label: "Equally",
      effect: `${money(perPlayer)} ${short ? "more" : "less"} for each player.`,
    },
  ];
  const chosen = spreadOptions.find((option) => option.value === game.spreadBy);
  return (
    <>
      <PageTitle>Settle up</PageTitle>
      {settlement.includesChipSales && <Hint>Includes chip sales between players.</Hint>}
      {hasPotMismatch(settlement) && (
        <Notice
          notice={{
            kind: "warn",
            text: `The counted chips are ${money(difference)} ${settlement.difference > 0 ? "over" : "short of"} the ${money(settlement.pot)} pot.`,
          }}
        >
          <label className="mt-2.5 flex items-start gap-3 text-md">
            <input
              type="checkbox"
              className="mt-px size-5.5 flex-none accent-accent"
              checked={game.scale}
              disabled={readOnly}
              onChange={(event) => {
                onScaleChange(event.target.checked);
              }}
            />
            <span>{`Share the ${money(difference)} difference so the payments balance.`}</span>
          </label>
          {game.scale && readOnly && (
            // A disabled radio group hides which choice is on, so a watcher gets a sentence.
            <p className="mt-3 ml-8.5 text-md">
              {`Shared ${chosen?.label.toLowerCase() ?? ""}. ${chosen?.effect ?? ""}`}
            </p>
          )}
          {game.scale && !readOnly && (
            // Indented to line up with the checkbox's text: a 22 px box and a 12 px gap.
            <fieldset className="mt-3 ml-8.5 flex flex-col gap-2.5">
              <legend className="mb-2 font-semibold">Share it</legend>
              {spreadOptions.map((option) => (
                <label key={option.value} className="flex items-start gap-3 text-md">
                  <input
                    type="radio"
                    name="spread-by"
                    className="mt-px size-5 flex-none accent-accent"
                    value={option.value}
                    checked={game.spreadBy === option.value}
                    disabled={readOnly}
                    onChange={() => {
                      onSpreadByChange(option.value);
                    }}
                  />
                  <span>
                    <span className="block font-semibold">{option.label}</span>
                    {option.effect}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </Notice>
      )}

      <SectionTitle>Payments</SectionTitle>
      {settlement.payments.length > 0 ? (
        <ul>
          {settlement.payments.map((payment, index) => (
            <Card
              as="li"
              key={`${payment.from}-${payment.to}-${String(index)}`}
              className="my-2.5 flex items-center gap-3"
            >
              <div className="flex-1 text-lg">
                <b>{payment.from}</b> <span className="text-text-muted">pays</span>{" "}
                <b>{payment.to}</b>
              </div>
              <div className="text-4xl font-extrabold">
                {money(fromMinor(payment.minor, game.currency))}
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <Notice notice={{ kind: "ok", text: "Everyone broke even. Nobody owes anything." }} />
      )}
      {!game.scale && settlement.unaccountedMinor !== 0 && (
        <Hint>
          {`These payments leave ${money(fromMinor(Math.abs(settlement.unaccountedMinor), game.currency))} unaccounted for because the chip count doesn't match the pot.`}
        </Hint>
      )}

      <SectionTitle>Results</SectionTitle>
      <ul>
        {settlement.rows.map((row) => (
          <ListRow as="li" key={row.playerId} className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <b className="text-lg">{row.name}</b>
            <span className={`text-right text-2xl font-extrabold ${netTone(row.netMinor)}`}>
              {signedMoney(money, row.netMinor, game.currency)}
            </span>
            <small className="text-md text-text-muted">{`Put in ${money(row.putIn)}`}</small>
            <small className="text-right text-md text-text-muted">
              {`Cashed out ${money(row.cashedOut)}`}
            </small>
          </ListRow>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button variant="secondary" onClick={onCopy}>
          {copy.kind === "copied" ? "Copied" : "Copy results"}
        </Button>
        {copy.kind === "fallback" && (
          <>
            <textarea
              rows={7}
              className="w-full rounded-md border-control border-border-control bg-surface p-2.5 font-mono text-sm text-text"
              readOnly
              aria-label="Results text"
              value={copy.text}
            />
            <Hint>Select the text above and copy it.</Hint>
          </>
        )}
        {/* "New game, same players" is the bottom bar's primary action (REQ-0002-12). */}
        <Button variant="secondary" onClick={onBackToSetup}>
          Back to Setup
        </Button>
        {!readOnly && allowReset && (
          <ConfirmInline
            triggerLabel="Start over from scratch"
            message="Erase everything? Names, chips, and buy-ins will be cleared."
            confirmLabel="Erase everything"
            open={resetConfirming}
            onOpenChange={onResetConfirmingChange}
            onConfirm={onReset}
          />
        )}
      </div>
    </>
  );
}
