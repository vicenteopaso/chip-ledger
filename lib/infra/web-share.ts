import { logWarning } from "@/lib/error-logging";

/**
 * The browser's share menu (WhatsApp, Messenger, mail, and so on) where it has one. It is missing
 * on most desktop browsers and outside secure contexts, so callers ask first and offer a button
 * only when it exists.
 */
type Sharer = { share: (data: { title?: string; text?: string; url?: string }) => Promise<void> };

function browserSharer(): Sharer | undefined {
  if (typeof navigator === "undefined") return undefined;
  const candidate = navigator as Partial<Sharer>;
  return typeof candidate.share === "function" ? navigator : undefined;
}

export function canShare(sharer: Sharer | undefined = browserSharer()): boolean {
  return sharer !== undefined;
}

export type ShareOutcome = "shared" | "cancelled" | "failed";

/** Opens the share menu with some text. Closing it without choosing is `cancelled`, not a failure. */
export async function shareText(
  data: { title: string; text: string },
  sharer: Sharer | undefined = browserSharer(),
): Promise<ShareOutcome> {
  if (!sharer) return "failed";
  try {
    await sharer.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    logWarning("The share menu refused to open", {
      context: "web-share",
      reason: error instanceof Error ? error.name : "unknown",
    });
    return "failed";
  }
}
