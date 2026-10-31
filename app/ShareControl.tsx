"use client";

import { useMemo, useState } from "react";

import { type EditCodeState, ShareSheet } from "@/app/components/ShareSheet";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { rememberKey, watchKeyFor } from "@/lib/infra/joined-games-storage";
import { createSharedGame, requestEditCode } from "@/lib/infra/shared-game-client";
import { qrModules } from "@/lib/qr";
import { keysFor, type LinkKind, shareLink } from "@/lib/share-links";
import type { CreateGameRequest, Role } from "@/lib/shared-game";

export type ShareControlProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A game already on the server, with the key this device holds; `null` for a game not yet shared. */
  shared: { id: string; role: Role; key: string } | null;
  /** For a game not yet shared: what to send when the person presses "Create the link". */
  makeRequest?: () => CreateGameRequest;
  /** Where to go after sharing; the browser's own navigation by default. */
  navigate?: (url: string) => void;
};

const CREATE_PROBLEMS = {
  off: "Sharing isn't available right now.",
  busy: "Sharing is busy. Please try again in a few minutes.",
  error: "The link couldn't be created. Check your connection and try again.",
} as const;

const CODE_PROBLEMS = {
  unavailable: "This game isn't available any more.",
  busy: "Too many codes were asked for. Please wait a moment and try again.",
  error: "The code couldn't be created. Please try again.",
} as const;

const goTo = (url: string) => {
  window.location.assign(url);
};

/**
 * Everything behind the Share button: the sheet, creating the shared game from a solo one
 * (REQ-0003-01, -22), the link for the chosen kind, copying, the device's share menu, and the edit
 * code (REQ-0003-08). The kind is Watch only each time the sheet opens (REQ-0003-03).
 */
export function ShareControl({
  open,
  onOpenChange,
  shared,
  makeRequest,
  navigate = goTo,
}: ShareControlProps) {
  const [kind, setKind] = useState<LinkKind>("watch");
  const [wasOpen, setWasOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState<EditCodeState>({ kind: "hidden" });

  // Each time the sheet opens it starts again at Watch only, with nothing copied or shown.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKind("watch");
      setCopied(false);
      setCode({ kind: "hidden" });
      setProblem(null);
    }
  }

  const keys = shared ? keysFor(shared.role, shared.key, watchKeyFor(shared.id)) : null;
  const key = keys ? keys[kind] : null;
  const link =
    open && shared && key && typeof window !== "undefined"
      ? shareLink(window.location.origin, shared.id, key)
      : null;
  const modules = useMemo(() => (link ? qrModules(link) : null), [link]);

  const create = async () => {
    if (!makeRequest || creating) return;
    setCreating(true);
    setProblem(null);
    const outcome = await createSharedGame(makeRequest());
    if (outcome.kind === "created") {
      // The host holds both keys, so the device can offer either link and edit its own game.
      rememberKey(outcome.id, outcome.editKey, undefined, outcome.watchKey);
      navigate(`/g/${outcome.id}?share=1`);
      return;
    }
    setProblem(CREATE_PROBLEMS[outcome.kind]);
    setCreating(false);
  };

  const showCode = async () => {
    if (!shared) return;
    setCode({ kind: "working" });
    const outcome = await requestEditCode({ id: shared.id, key: shared.key });
    setCode(
      outcome.kind === "issued"
        ? { kind: "shown", code: outcome.code }
        : { kind: "failed", text: CODE_PROBLEMS[outcome.kind] },
    );
  };

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <ShareSheet
      open={open}
      onClose={() => {
        onOpenChange(false);
      }}
      stage={shared ? "ready" : creating ? "creating" : "intro"}
      problem={problem}
      onCreate={() => {
        void create();
      }}
      kind={kind}
      onKindChange={(next) => {
        setKind(next);
        setCopied(false);
      }}
      link={link}
      modules={modules}
      available={{ watch: Boolean(keys?.watch), edit: Boolean(keys?.edit) }}
      copied={copied}
      onCopy={() => {
        if (!link) return;
        void copyToClipboard(link).then(setCopied);
      }}
      {...(canNativeShare && link
        ? {
            onNativeShare: () => {
              void navigator.share({ title: "Chip Ledger game", url: link }).catch(() => undefined);
            },
          }
        : {})}
      {...(shared?.role === "edit"
        ? {
            editCode: {
              state: code,
              onShow: () => {
                void showCode();
              },
            },
          }
        : {})}
    />
  );
}
