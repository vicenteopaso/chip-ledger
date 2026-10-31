import { encode } from "uqr";

/** Quiet zone, in modules, around the code: four, as the QR standard asks. */
export const QR_BORDER = 4;

/**
 * The dark and light modules of a QR code for some text, row by row (`true` is dark), with no
 * border. Medium error correction survives a smudge or a glare spot on a phone screen. The text
 * is a link that carries a key, so it is encoded here and nowhere else: never logged or sent.
 */
export function qrModules(text: string): boolean[][] {
  return encode(text, { ecc: "M", border: 0 }).data;
}
