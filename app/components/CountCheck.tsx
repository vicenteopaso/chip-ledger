import { Chip } from "@/app/components/Chip";
import { Notice } from "@/app/components/Notice";
import { SectionTitle } from "@/app/components/Typography";
import type { GameState } from "@/lib/game";
import type { MoneyFormatter } from "@/lib/money";
import { countCheckRows, countCheckSummary } from "@/lib/summaries";

export type CountCheckProps = { game: GameState; money: MoneyFormatter };

/** Counted chips against chips issued, per color, and against the pot (REQ-0001-12). */
export function CountCheck({ game, money }: CountCheckProps) {
  return (
    <>
      <SectionTitle>Check the count</SectionTitle>
      <table className="mt-1.5 w-full border-collapse text-md">
        <caption className="sr-only">Chips counted against chips issued, by color</caption>
        <tbody>
          {countCheckRows(game).map((row) => (
            <tr key={row.chipId} className="border-b border-border">
              <td className="w-10 py-2">
                <Chip color={row.color} />
              </td>
              <td className="py-2">{row.label}</td>
              <td className={`py-2 text-right ${row.mismatch ? "font-semibold text-danger" : ""}`}>
                {`${String(row.counted)} of ${String(row.issued)}`}
                {/* In words too, not by color and weight alone (REQ-0002-14). */}
                {row.note && <span className="text-md">{` · ${row.note}`}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Announced by the page's live region when the message changes (REQ-0002-07). */}
      <Notice notice={countCheckSummary(game, money)} />
    </>
  );
}
