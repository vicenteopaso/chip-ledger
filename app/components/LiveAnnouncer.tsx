export type LiveAnnouncerProps = { message: string };

/**
 * The page's single polite live region (REQ-0002-07). Rendered from the first paint so screen
 * readers register it before anything is announced; the container sets the text.
 */
export function LiveAnnouncer({ message }: LiveAnnouncerProps) {
  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}
