import { logWarning } from "@/lib/error-logging";

/**
 * The DOM types declare `navigator.clipboard` as always present, but browsers omit it outside
 * secure contexts (for example a phone opening the app over a LAN address).
 */
function browserClipboard(): Clipboard | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as { clipboard?: Clipboard }).clipboard;
}

/** Copies text; resolves `false` when the clipboard is unavailable or refuses (REQ-0001-22). */
export async function copyToClipboard(
  text: string,
  clipboard: Clipboard | undefined = browserClipboard(),
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch (error) {
    logWarning("Clipboard write failed; showing the text instead", {
      context: "clipboard",
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}
