"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/app/components/Button";
import { DraftInput } from "@/app/components/DraftInput";
import { FIELD } from "@/app/components/Field";
import { Select } from "@/app/components/Select";
import { Card } from "@/app/components/Surfaces";
import { activePlayers, type GameState, playerName } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import { parseMoney, toMinor } from "@/lib/money";

export type SellChipsProps = {
  game: GameState;
  dispatch: (action: GameAction) => void;
};

const LABEL = "mb-1 block text-md font-semibold text-text-muted";

/**
 * Records a sale of chips from one player to another for an amount, in place (SPEC-0004
 * REQ-0004-03, -11). Opening moves focus to the seller; saving or cancelling returns it to the
 * button. A refused sale is explained in text next to the fields.
 */
export function SellChips({ game, dispatch }: SellChipsProps) {
  const players = activePlayers(game);
  const ids = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sellerRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  /** Set when the person opened or closed the form here, so focus never moves on first render. */
  const moveFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (open ? sellerRef : triggerRef).current?.focus();
  }, [open]);

  const toggle = (next: boolean) => {
    moveFocus.current = true;
    setError(null);
    setOpen(next);
  };

  if (!open) {
    return (
      <div className="mt-4">
        <Button
          ref={triggerRef}
          variant="secondary"
          onClick={() => {
            setSellerId(players[0]?.id ?? "");
            setBuyerId(players[1]?.id ?? "");
            setAmount(0);
            toggle(true);
          }}
        >
          Sell chips
        </Button>
      </div>
    );
  }

  const submit = () => {
    if (sellerId === buyerId) {
      setError("Choose two different players.");
      return;
    }
    if (toMinor(amount, game.currency) <= 0) {
      setError("Enter an amount greater than zero.");
      amountRef.current?.focus();
      return;
    }
    dispatch({ type: "sellChips", sellerId, buyerId, amount });
    toggle(false);
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") toggle(false);
  };

  const options = players.map((player) => (
    <option key={player.id} value={player.id}>
      {playerName(game, player)}
    </option>
  ));

  return (
    <Card as="section" aria-labelledby={`${ids}-title`} className="mt-4">
      <h2 id={`${ids}-title`} className="mb-3 text-2xl font-semibold">
        Sell chips
      </h2>
      <p className="mb-3 text-md text-text-muted">
        One player sells chips to another for money. The pot stays the same.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${ids}-seller`} className={LABEL}>
            Seller
          </label>
          <Select
            id={`${ids}-seller`}
            ref={sellerRef}
            onKeyDown={closeOnEscape}
            value={sellerId}
            onChange={(event) => {
              setSellerId(event.target.value);
              setError(null);
            }}
          >
            {options}
          </Select>
        </div>
        <div>
          <label htmlFor={`${ids}-buyer`} className={LABEL}>
            Buyer
          </label>
          <Select
            id={`${ids}-buyer`}
            onKeyDown={closeOnEscape}
            value={buyerId}
            onChange={(event) => {
              setBuyerId(event.target.value);
              setError(null);
            }}
          >
            {options}
          </Select>
        </div>
        <div>
          <label htmlFor={`${ids}-amount`} className={LABEL}>
            Amount
          </label>
          <DraftInput
            id={`${ids}-amount`}
            ref={amountRef}
            onKeyDown={closeOnEscape}
            className={`${FIELD} w-full px-3 text-body`}
            inputMode="decimal"
            value={amount}
            format={(value) => (value === 0 ? "" : String(value))}
            parse={(text) => parseMoney(text, game.currency)}
            aria-invalid={error !== null && toMinor(amount, game.currency) <= 0}
            aria-describedby={error ? `${ids}-error` : undefined}
            onValueChange={(value) => {
              setAmount(value);
              setError(null);
            }}
          />
        </div>
      </div>
      {error && (
        <p id={`${ids}-error`} role="alert" className="mt-3 text-md font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <Button variant="primary" onKeyDown={closeOnEscape} onClick={submit}>
          Record sale
        </Button>
        <Button
          variant="link"
          onKeyDown={closeOnEscape}
          onClick={() => {
            toggle(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
}
