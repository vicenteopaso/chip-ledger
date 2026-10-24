import Image from "next/image";

import { Chip } from "@/app/components/Chip";
import { DraftInput } from "@/app/components/DraftInput";
import { CHIP_LABELS } from "@/lib/chips";
import type { Chip as ChipData, Player } from "@/lib/game";
import { parseCount } from "@/lib/money";
import type { PhotoStatus } from "@/lib/photo-count";

export type PhotoState = { status?: PhotoStatus; thumbnailUrl?: string; busy: boolean };

export type PlayerCashCardProps = {
  player: Player;
  name: string;
  value: string;
  chips: readonly ChipData[];
  /** Present only when photo counting is enabled (REQ-0001-13). */
  photo?: PhotoState;
  onCountChange: (chipId: string, count: number | null) => void;
  onPhoto: (file: File) => void;
};

const STATUS_TONE: Record<PhotoStatus["kind"], string> = {
  busy: "text-warn-ink",
  info: "text-text-muted",
  error: "text-danger",
};

const formatCount = (count: number | null) => (count === null ? "" : String(count));
const parseOptionalCount = (text: string) => (text.trim() === "" ? null : parseCount(text));

/** One player's chip counts on Cash out, with optional photo counting (REQ-0001-10, -14). */
export function PlayerCashCard({
  player,
  name,
  value,
  chips,
  photo,
  onCountChange,
  onPhoto,
}: PlayerCashCardProps) {
  const headingId = `card-${player.id}-name`;
  return (
    <section
      className="my-3.5 rounded-2xl border border-border bg-surface p-3.5"
      aria-labelledby={headingId}
    >
      <header className="flex items-baseline justify-between gap-2.5">
        <h2 id={headingId} className="text-2xl font-extrabold">
          {name}
        </h2>
        <span className="text-2xl font-extrabold">{value}</span>
      </header>
      {photo && (
        <>
          <div className="my-2.5 flex items-center gap-2.5">
            <label
              className={`inline-flex items-center justify-center gap-2 rounded-md border-control border-accent px-4 py-3 text-base font-semibold text-accent focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus ${photo.busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            >
              {photo.busy ? "Counting…" : photo.thumbnailUrl ? "Retake photo" : "Take photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={photo.busy}
                aria-label={`Take a photo of ${name}'s chips`}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onPhoto(file);
                }}
              />
            </label>
            {photo.thumbnailUrl && (
              <Image
                className="size-13 rounded-sm border border-border object-cover"
                src={photo.thumbnailUrl}
                alt={`Photo of ${name}'s chips`}
                width={52}
                height={52}
                unoptimized
              />
            )}
          </div>
          <p
            role="status"
            className={`mb-1.5 text-sm ${photo.status ? STATUS_TONE[photo.status.kind] : ""}`}
          >
            {photo.status?.text}
          </p>
        </>
      )}
      <div className="count-grid grid gap-2">
        {chips.map((chip) => (
          <label
            key={chip.id}
            className="flex items-center gap-2 rounded-md bg-sunk px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent"
          >
            <Chip color={chip.color} size="sm" />
            <DraftInput
              className="w-full min-w-0 border-0 bg-transparent py-1.5 text-right text-xl font-semibold focus:outline-none"
              inputMode="numeric"
              placeholder="0"
              aria-label={`${CHIP_LABELS[chip.color]} chips for ${name}`}
              value={player.counts[chip.id] ?? null}
              format={formatCount}
              parse={parseOptionalCount}
              onValueChange={(count) => {
                onCountChange(chip.id, count);
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
