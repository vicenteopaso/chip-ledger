import Link from "next/link";

import { buttonClasses } from "@/app/components/Button";
import { Lede, PageTitle } from "@/app/components/Typography";

/**
 * The one page for every game that cannot be opened: a wrong link, a deleted game, an expired one.
 * It says nothing that would tell them apart (SPEC-0003 REQ-0003-26).
 */
export function GameUnavailable() {
  return (
    <>
      <PageTitle>This game isn&rsquo;t available</PageTitle>
      <Lede>
        The link may be wrong, or the game may have ended or been deleted. Ask the host for a new
        link, or start a game of your own.
      </Lede>
      <Link
        href="/"
        className={`${buttonClasses("primary")} inline-flex w-full items-center justify-center no-underline`}
      >
        Start a new game
      </Link>
    </>
  );
}
