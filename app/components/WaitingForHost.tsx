import { Lede, PageTitle } from "@/app/components/Typography";

/** Shown until an editor starts the game; the page moves on by itself (REQ-0003-15). */
export function WaitingForHost() {
  return (
    <>
      <PageTitle>Waiting for the host</PageTitle>
      <Lede>
        The game hasn&rsquo;t started yet. This page updates by itself, so you can leave it open.
      </Lede>
    </>
  );
}
