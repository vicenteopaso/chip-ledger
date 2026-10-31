import { QR_BORDER } from "@/lib/qr";

export type QrCodeProps = {
  /** The dark modules of the code, row by row. */
  modules: readonly (readonly boolean[])[];
  /** The text alternative: it points to the link written out below and to Copy link (REQ-0003-28). */
  label: string;
};

/** One path for all dark modules, a run of them per row, so the SVG stays small. */
function pathOf(modules: QrCodeProps["modules"]): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      parts.push(
        `M${String(x + QR_BORDER)} ${String(y + QR_BORDER)}h${String(end - x)}v1h-${String(end - x)}z`,
      );
      x = end;
    }
  });
  return parts.join("");
}

/**
 * A QR code as inline SVG: dark modules on a light plate with the standard quiet zone, in every
 * theme, because a scanner needs that contrast (SPEC-0003 REQ-0003-28). Drawn here from the module
 * grid, so no image is fetched and the link never leaves the page.
 */
export function QrCode({ modules, label }: QrCodeProps) {
  const size = (modules[0]?.length ?? 0) + QR_BORDER * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      className="mx-auto block size-56 max-w-full rounded-md"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} className="fill-qr-paper" />
      <path d={pathOf(modules)} className="fill-qr-ink" />
    </svg>
  );
}
