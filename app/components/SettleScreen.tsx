import { Avatar } from "@/app/components/Avatar";
import { Button } from "@/app/components/Button";
import { ConfirmInline } from "@/app/components/ConfirmInline";
import { Notice } from "@/app/components/Notice";
import { useReadOnly } from "@/app/components/ReadOnly";
import { Card, ListPanel, ListRow } from "@/app/components/Surfaces";
import { Hint, PageTitle, SectionTitle } from "@/app/components/Typography";
import type { GameState, SpreadBy } from "@/lib/game";
import { type Currency, fromMinor, type MoneyFormatter, withoutCurrency } from "@/lib/money";
import { rankByNet, type Settlement } from "@/lib/settlement";
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
  /** Present only where the device has a share menu: sends the results to another app. */
  onShare?: () => void;
  onBackToSetup: () => void;
  onResetConfirmingChange: (open: boolean) => void;
  onReset: () => void;
  /** False where starting over is not offered. */
  allowReset?: boolean;
  /** What "Start over" asks, where it means more than erasing this screen's game (a shared game). */
  resetMessage?: string;
  /** A line above the buttons, such as what "New game" does to a shared game (REQ-0003-16). */
  newGameNote?: string;
};

function signedMoney(money: MoneyFormatter, minor: number, currency: Currency): string {
  return `${minor > 0 ? "+" : ""}${money(fromMinor(minor, currency))}`;
}

function netTone(minor: number): string {
  if (minor > 0) return "text-success";
  if (minor < 0) return "text-danger";
  return "";
}

/**
 * A player's net as a bar from the middle: right in the gain color, left in the loss color, as
 * long as the net is against the largest one (REQ-0005-08). Decorative: the net is in the text.
 */
function NetBar({ netMinor, largestMinor }: { netMinor: number; largestMinor: number }) {
  const length = largestMinor === 0 ? 0 : (Math.abs(netMinor) / largestMinor) * 100;
  return (
    <svg
      className="net-bar col-span-2 mt-2 block h-1.5 w-full"
      viewBox="0 0 200 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="99.5" y="0" width="1" height="6" className="fill-border-control" />
      {netMinor !== 0 && (
        <rect
          data-net={netMinor > 0 ? "gain" : "loss"}
          x={netMinor > 0 ? 100 : 100 - length}
          y="1"
          width={length}
          height="4"
          rx="2"
          className={netMinor > 0 ? "fill-success" : "fill-danger"}
        />
      )}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="size-4 flex-none text-success"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
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
  onShare,
  onBackToSetup,
  onResetConfirmingChange,
  onReset,
  allowReset = true,
  resetMessage = "Erase everything? Names, chips, and buy-ins will be cleared.",
  newGameNote,
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
  const ranked = rankByNet(settlement.rows);
  const largestMinor = Math.max(0, ...settlement.rows.map((row) => Math.abs(row.netMinor)));
  const cashedOut = settlement.rows.reduce((sum, row) => sum + row.cashedOut, 0);
  // The cash-outs used for the payments add up to the money in (REQ-0005-09).
  const balanced =
    settlement.rows.length > 0 && settlement.rows.reduce((sum, row) => sum + row.netMinor, 0) === 0;
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
              {/* The payer, then the payee in brass, overlapping (REQ-0005-06). */}
              <span aria-hidden="true" className="flex flex-none">
                <Avatar name={payment.from} />
                <span className="-ml-2 rounded-full ring-2 ring-surface">
                  <Avatar name={payment.to} tone="brass" />
                </span>
              </span>
              <div className="min-w-0 flex-1 text-lg">
                <b className="font-semibold">{payment.from}</b>{" "}
                <span className="text-text-muted">pays</span>{" "}
                <b className="font-semibold">{payment.to}</b>
              </div>
              <div className="font-mono text-2xl font-semibold">
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
      {/* Biggest winner first; ties keep seating order (REQ-0005-07). */}
      <ListPanel as="ul">
        {ranked.map((row) => (
          <ListRow as="li" key={row.playerId} className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <b className="truncate text-lg font-semibold">{row.name}</b>
            <span className={`text-right font-mono text-xl font-semibold ${netTone(row.netMinor)}`}>
              {signedMoney(money, row.netMinor, game.currency)}
            </span>
            {/* Short on screen, in full words for assistive technology (REQ-0005-10). */}
            <small className="col-span-2 font-mono text-md text-text-muted">
              <span aria-hidden="true">
                {`In ${withoutCurrency(money(row.putIn))} · Out ${withoutCurrency(money(row.cashedOut))}`}
              </span>
              <span className="sr-only">
                {`Put in ${money(row.putIn)}, cashed out ${money(row.cashedOut)}`}
              </span>
            </small>
            <NetBar netMinor={row.netMinor} largestMinor={largestMinor} />
          </ListRow>
        ))}
      </ListPanel>
      {balanced && (
        <p className="mt-3 flex items-center gap-2 text-md text-text-muted">
          <CheckIcon />
          {`${money(settlement.pot)} in, ${money(cashedOut)} out. Balanced.`}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        {onShare && (
          <Button variant="secondary" onClick={onShare}>
            Share results
          </Button>
        )}
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
        {/* The note sits with the button it describes. */}
        {newGameNote && allowReset && <Hint>{newGameNote}</Hint>}
        {allowReset && (
          <ConfirmInline
            triggerLabel="Start over from scratch"
            message={resetMessage}
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
