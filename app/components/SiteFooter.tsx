export type SiteFooterProps = {
  /** The year to show; the page passes the year of the request (REQ-0001-31). */
  year: number;
  holders: string;
};

/** Copyright line at the end of the page. Leaves room for the fixed bottom bar. */
export function SiteFooter({ year, holders }: SiteFooterProps) {
  return (
    <footer className="mx-auto max-w-app px-4 pt-2 pb-33 text-sm text-text-muted">
      <p>{`© ${String(year)} ${holders}`}</p>
    </footer>
  );
}
