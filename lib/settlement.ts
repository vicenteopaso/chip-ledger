import { activePlayers, cashOutValue, type GameState, playerName } from "@/lib/game";
import { type Currency, minorPerUnit } from "@/lib/money";

export type SettlementRow = {
  playerId: string;
  name: string;
  /** Money the player put in. */
  putIn: number;
  /** Money the player takes out, after scaling when it applies. */
  cashedOut: number;
  /** cashedOut − putIn, in whole smallest units (cents for USD, pesos for CLP). */
  netMinor: number;
};

export type Payment = { from: string; to: string; minor: number };

export type Settlement = {
  currency: Currency;
  rows: SettlementRow[];
  pot: number;
  counted: number;
  /** counted − pot. */
  difference: number;
  payments: Payment[];
  /** Debts left after payments minus credits left, in smallest units (non-zero only without scaling). */
  unaccountedMinor: number;
};

type Balance = { name: string; minor: number };

/** Largest debtor pays largest creditor until one side runs out (REQ-0001-19). */
function matchPayments(debtors: Balance[], creditors: Balance[]): Payment[] {
  const payments: Payment[] = [];
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.minor === 0) break;
      const minor = Math.min(debtor.minor, creditor.minor);
      if (minor === 0) continue;
      payments.push({ from: debtor.name, to: creditor.name, minor });
      debtor.minor -= minor;
      creditor.minor -= minor;
    }
  }
  return payments;
}

const byAmountDescending = (a: Balance, b: Balance) => b.minor - a.minor;

/** Nets, scaling, rounding residue, and payments for the Settle step (REQ-0001-18 … -20). */
export function settle(game: GameState): Settlement {
  const players = activePlayers(game);
  const raw = players.map((player) => ({
    playerId: player.id,
    name: playerName(game, player),
    putIn: player.buyins * game.buyIn,
    value: cashOutValue(game, player),
  }));
  const potTotal = raw.reduce((sum, row) => sum + row.putIn, 0);
  const counted = raw.reduce((sum, row) => sum + row.value, 0);
  const scaling = game.scale && counted > 0;
  const factor = scaling ? potTotal / counted : 1;

  const rows: SettlementRow[] = raw.map((row) => {
    const cashedOut = row.value * factor;
    return {
      playerId: row.playerId,
      name: row.name,
      putIn: row.putIn,
      cashedOut,
      netMinor: Math.round((cashedOut - row.putIn) * minorPerUnit(game.currency)),
    };
  });

  if (scaling) {
    const residue = rows.reduce((sum, row) => sum + row.netMinor, 0);
    const [largest] = rows.toSorted((a, b) => Math.abs(b.netMinor) - Math.abs(a.netMinor));
    if (residue !== 0 && largest) largest.netMinor -= residue;
  }

  const creditors = rows
    .filter((row) => row.netMinor > 0)
    .map((row) => ({ name: row.name, minor: row.netMinor }))
    .sort(byAmountDescending);
  const debtors = rows
    .filter((row) => row.netMinor < 0)
    .map((row) => ({ name: row.name, minor: -row.netMinor }))
    .sort(byAmountDescending);

  const payments = matchPayments(debtors, creditors);
  const sumMinor = (balances: Balance[]) => balances.reduce((sum, b) => sum + b.minor, 0);

  return {
    currency: game.currency,
    rows,
    pot: potTotal,
    counted,
    difference: counted - potTotal,
    payments,
    unaccountedMinor: sumMinor(debtors) - sumMinor(creditors),
  };
}
