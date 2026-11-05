import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo";

/**
 * The link-preview image for every page (SPEC-0005 REQ-0005-18): the brand, what the app does, and
 * a sample of the Table pot and the Settle payments in the Card Room look. It never shows a real
 * game, so a shared game's link previews nothing private. Built once, at build time.
 *
 * The image renderer takes inline styles and literal colors, not the CSS tokens, so the dark
 * theme's token values are repeated here (styles/tokens.css): room, panel, line, text, muted,
 * brass, felt. The default font of `next/og` is Geist.
 */
export const alt = `${SITE.name}: ${SITE.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  room: "#0d0e10",
  panel: "#16181b",
  line: "#2c3036",
  text: "#edeae3",
  muted: "#9b9da1",
  brass: "#cdaa63",
  brassSoft: "#3a3222",
  avatar: "#23262b",
  felt: "#0f3a2b",
  feltMuted: "#cfe0d6",
  todo: "#6b7078",
} as const;

function Chip({ size: px }: { size: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14.75" fill="none" stroke={C.brass} strokeWidth="1.85" />
      <circle
        cx="16"
        cy="16"
        r="14.75"
        fill="none"
        stroke={C.brass}
        strokeWidth="3.7"
        strokeDasharray="3.7 7.88"
      />
      <circle cx="16" cy="16" r="6.75" fill={C.brass} />
    </svg>
  );
}

function Initial({ letter, brass = false }: { letter: string; brass?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 22,
        border: `3px solid ${C.panel}`,
        background: brass ? C.brassSoft : C.avatar,
        color: brass ? C.brass : C.text,
        fontSize: 20,
        marginLeft: brass ? -12 : 0,
      }}
    >
      {letter}
    </div>
  );
}

function Payment({
  from,
  to,
  amount,
  last = false,
}: {
  from: string;
  to: string;
  amount: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "18px 24px",
        borderBottom: last ? "none" : `2px solid ${C.line}`,
      }}
    >
      <div style={{ display: "flex" }}>
        <Initial letter={from.charAt(0)} />
        <Initial letter={to.charAt(0)} brass />
      </div>
      {/* One block per word: the image renderer measures mixed inline text badly. */}
      <div style={{ display: "flex", flexGrow: 1, marginLeft: 18, fontSize: 26 }}>
        <div style={{ display: "flex", color: C.text }}>{from}</div>
        <div style={{ display: "flex", color: C.muted, marginLeft: 10 }}>pays</div>
        <div style={{ display: "flex", color: C.text, marginLeft: 10 }}>{to}</div>
      </div>
      <div style={{ display: "flex", flexShrink: 0, marginLeft: 16, fontSize: 28, color: C.text }}>
        {amount}
      </div>
    </div>
  );
}

const STEPS = ["Setup", "Table", "Cash out", "Settle"] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: C.room,
        padding: 72,
        color: C.text,
      }}
    >
      {/* Left: brand, what it does, and the four steps. */}
      <div style={{ display: "flex", flexDirection: "column", width: 500, marginRight: 56 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Chip size={60} />
          <div style={{ display: "flex", marginLeft: 20, fontSize: 44, letterSpacing: -1 }}>
            {SITE.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 40,
            lineHeight: 1.25,
            letterSpacing: -0.5,
            color: C.text,
          }}
        >
          {SITE.description}
        </div>
        <div style={{ display: "flex", marginTop: "auto" }}>
          {STEPS.map((step, index) => (
            <div
              key={step}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                marginRight: index < 3 ? 16 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 5,
                  borderRadius: 3,
                  background: index < 3 ? C.brass : C.todo,
                }}
              />
              <div style={{ display: "flex", marginTop: 12, fontSize: 22, color: C.muted }}>
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: a sample pot on the felt, and the payments it settles into. */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: C.felt,
            borderRadius: 28,
            padding: "32px 36px",
          }}
        >
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: C.feltMuted }}>
            MONEY IN THE POT
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 92,
              letterSpacing: -3,
              color: "#ffffff",
            }}
          >
            €60.00
          </div>
          <div style={{ display: "flex", marginTop: 4, fontSize: 24, color: C.feltMuted }}>
            6 buy-ins so far.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 24,
            background: C.panel,
            border: `2px solid ${C.line}`,
            borderRadius: 24,
          }}
        >
          <Payment from="Ben" to="Carla" amount="€14.00" />
          <Payment from="Dev" to="Ana" amount="€2.00" last />
        </div>
      </div>
    </div>,
    size,
  );
}
