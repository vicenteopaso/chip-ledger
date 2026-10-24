import { activePlayers, cashOutValue, type GameState, playerName } from "@/lib/game";

export type SettlementRow = {
  playerId: string;
  name: string;
  /** Money the player put in. */
  putIn: number;
  /** Money the player takes out, after scaling when it applies. */
  cashedOut: number;
  /** cashedOut − putIn, in whole cents. */
  netCents: number;
};

export type Payment = { from: string; to: string; cents: number };

export type Settlement = {
  rows: SettlementRow[];
  pot: number;
  counted: number;
  /** counted − pot. */
  difference: number;
  payments: Payment[];
  /** Debts left after payments minus credits left, in cents (non-zero only without scaling). */
  unaccountedCents: number;
};

type Balance = { name: string; cents: number };

/** Largest debtor pays largest creditor until one side runs out (REQ-0001-19). */
function matchPayments(debtors: Balance[], creditors: Balance[]): Payment[] {
  const payments: Payment[] = [];
  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.cents === 0) break;
      const cents = Math.min(debtor.cents, creditor.cents);
      if (cents === 0) continue;
      payments.push({ from: debtor.name, to: creditor.name, cents });
      debtor.cents -= cents;
      creditor.cents -= cents;
    }
  }
  return payments;
}

const byCentsDescending = (a: Balance, b: Balance) => b.cents - a.cents;

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
      netCents: Math.round((cashedOut - row.putIn) * 100),
    };
  });

  if (scaling) {
    const residue = rows.reduce((sum, row) => sum + row.netCents, 0);
    const [largest] = rows.toSorted((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents));
    if (residue !== 0 && largest) largest.netCents -= residue;
  }

  const creditors = rows
    .filter((row) => row.netCents > 0)
    .map((row) => ({ name: row.name, cents: row.netCents }))
    .sort(byCentsDescending);
  const debtors = rows
    .filter((row) => row.netCents < 0)
    .map((row) => ({ name: row.name, cents: -row.netCents }))
    .sort(byCentsDescending);

  const payments = matchPayments(debtors, creditors);
  const sumCents = (balances: Balance[]) => balances.reduce((sum, b) => sum + b.cents, 0);

  return {
    rows,
    pot: potTotal,
    counted,
    difference: counted - potTotal,
    payments,
    unaccountedCents: sumCents(debtors) - sumCents(creditors),
  };
}
