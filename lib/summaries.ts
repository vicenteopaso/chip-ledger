import { type StackColor, STACK_LABELS } from "@/lib/chips";
import {
  cashOutRate,
  countedChips,
  countedValue,
  type GameState,
  issuedChips,
  MONEY_EPSILON,
  pot,
  stackChips,
  stackValue,
} from "@/lib/game";
import { fromMinor, type MoneyFormatter } from "@/lib/money";
import type { Settlement } from "@/lib/settlement";

/**
 * `ok` renders as a confirmation line, `warn` as a highlighted note. `code` names the message
 * without its amounts, so a change of message can be announced once rather than on every
 * keystroke (REQ-0002-07).
 */
export type Notice = { kind: "ok" | "warn"; code: string; text: string };

/** The note under the chip rows on Setup (REQ-0001-06). */
export function setupSummary(game: GameState, money: MoneyFormatter): Notice {
  const face = stackValue(game);
  if (game.buyIn <= 0) return { kind: "warn", code: "no-buy-in", text: "Enter a buy-in amount." };
  if (face <= 0) {
    return {
      kind: "warn",
      code: "no-stack",
      text: "Add at least one chip color with a count and a value.",
    };
  }
  if (Math.abs(face - game.buyIn) < MONEY_EPSILON) {
    return {
      kind: "ok",
      code: "balanced",
      text: `Each starting stack is worth ${money(face)}, matching the buy-in.`,
    };
  }
  const percent = Math.round(cashOutRate(game) * 1000) / 10;
  return {
    kind: "warn",
    code: "unbalanced",
    text: `The stack adds up to ${money(face)} but the buy-in is ${money(game.buyIn)}. Chips will cash out at ${percent}% of the values above so the money always balances. Adjust the counts or values if that isn't what you want.`,
  };
}

export type CountCheckRow = {
  chipId: string;
  color: StackColor;
  label: string;
  counted: number;
  issued: number;
  mismatch: boolean;
  /** "4 short" or "4 over" when the count does not match, so it is not shown by color alone (REQ-0002-14). */
  note: string | null;
};

function mismatchNote(counted: number, issued: number): string | null {
  if (counted === issued) return null;
  return `${String(Math.abs(counted - issued))} ${counted < issued ? "short" : "over"}`;
}

/** Per-color "counted of issued" lines on Cash out (REQ-0001-12). */
export function countCheckRows(game: GameState): CountCheckRow[] {
  return stackChips(game).map((chip) => {
    const counted = countedChips(game, chip);
    const issued = issuedChips(game, chip);
    return {
      chipId: chip.id,
      color: chip.color,
      label: STACK_LABELS[chip.color],
      counted,
      issued,
      mismatch: counted !== issued,
      note: mismatchNote(counted, issued),
    };
  });
}

/** Whether counted chips match the pot, on Cash out (REQ-0001-12). */
export function countCheckSummary(game: GameState, money: MoneyFormatter): Notice {
  const counted = countedValue(game);
  const potTotal = pot(game);
  const difference = counted - potTotal;
  if (Math.abs(difference) < MONEY_EPSILON) {
    return { kind: "ok", code: "match", text: "Counted chips match the pot exactly." };
  }
  return {
    kind: "warn",
    code: difference > 0 ? "over" : "under",
    text: `Counted chips are worth ${money(counted)}, which is ${money(Math.abs(difference))} ${difference > 0 ? "more" : "less"} than the ${money(potTotal)} pot. Recount the colors marked in red, or settle anyway and the difference is spread across everyone.`,
  };
}

/** Whether Settle needs the "spread the difference" notice (REQ-0001-20). */
export function hasPotMismatch(settlement: Settlement): boolean {
  return Math.abs(settlement.difference) >= MONEY_EPSILON;
}

/** Plain-text results for "Copy results" (REQ-0001-22). */
export function resultsText(settlement: Settlement, money: MoneyFormatter, date: string): string {
  const signed = (minor: number) =>
    `${minor > 0 ? "+" : ""}${money(fromMinor(minor, settlement.currency))}`;
  const payments = settlement.payments.length
    ? settlement.payments.map(
        (p) => `${p.from} pays ${p.to} ${money(fromMinor(p.minor, settlement.currency))}`,
      )
    : ["None, everyone broke even"];
  return [
    `Poker night ${date}`,
    `Pot: ${money(settlement.pot)}`,
    "",
    ...settlement.rows.map((row) => `${row.name}: ${signed(row.netMinor)}`),
    "",
    "Payments:",
    ...payments,
  ].join("\n");
}
