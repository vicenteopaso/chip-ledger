export type SiteFooterProps = {
  /** The year to show; the page passes the year of the request (REQ-0001-31). */
  year: number;
  holders: string;
};

/** Copyright line, shown in the fixed bottom bar under the step's buttons (REQ-0001-31). */
export function SiteFooter({ year, holders }: SiteFooterProps) {
  return (
    <footer className="text-sm whitespace-nowrap text-text-muted">
      <p>{`© ${String(year)} ${holders}`}</p>
    </footer>
  );
}
