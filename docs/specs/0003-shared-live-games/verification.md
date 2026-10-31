# Real-device check: shared games (T-34)

A short manual check on real phones against a Vercel preview, for the things a browser test cannot show: a camera scanning the QR code, real radios going offline, and a screen reader. It takes about 20 minutes with three phones (or two phones and a laptop). Write what you saw in the PR or in a comment, with a screenshot where it helps.

**Before you start.** Open the preview URL from the PR (the preview must have the Upstash variables, which the Preview environment has). Phone A is the host; phones B and C are guests. Give each phone its own name below so you can tell them apart.

## 1. Sharing and the QR code (AC-0003-02, -04, -17)

1. On phone A, play to Setup, enter four names, press **Share**. The sheet must say what is kept and for how long and send nothing yet.
2. Press **Create the link**. The sheet shows a QR code, the link as text, **Copy link**, **Share**, and **Watch only** selected.
3. Phone B: open the camera and scan the QR code. It opens the game with the names, read-only, and says "Watch only".
4. On phone A choose **Can edit**; the QR code and link change. Phone C scans the new code and can edit.
5. On phone A press **Share** and send the watch link to phone B with the phone's share menu. It arrives and opens.

## 2. Live edits both ways (AC-0003-06, -10, -11)

1. On phones A and C, press **+** for the same player at the same moment. Both phones, and watcher B, end with the same count within a few seconds.
2. On phone A type in a name field while phone C changes another field. A's typing is not interrupted.
3. Watcher B sees **Live** and the number of devices.

## 3. Airplane mode (AC-0003-11)

1. Put phone C in airplane mode. Press **+** a few times. The count changes at once and the page says its changes will sync.
2. Turn airplane mode off. Within about half a minute the page says **Live** again and phones A and B show the same count.

## 4. Edit code (AC-0003-07, -08)

1. On phone A open **Share**, press **Show edit code**.
2. On watcher B press **I have an edit code**, type it, **Join as editor**. B can now edit.
3. On phone A press **New code**. Try the old code on a fresh watcher: "That code didn't work."

## 5. Screen reader on a watcher (AC-0003-23)

With VoiceOver or TalkBack on phone B (watching): when phone A presses **+** for a player, B announces the change once ("Ana: 2 buy-ins, pot ..."), not on every keystroke. The role ("Watch only") is read as text, and the Share sheet announces its heading and the QR code's alternative, which mentions the link and Copy link.

## 6. Games, new game and delete (AC-0003-13, -14, -16)

1. On phone B open **Games**: this game and its own game are listed. Open the other, then back; each opens on the step you left it.
2. On phone A, at Settle press **New game, same players**. A opens a private game; B and C still show the shared game unchanged.
3. On phone C (an editor) open **Games**, **Delete for everyone**, confirm. Phone B shows "This game isn't available".

## What to record

For each numbered step: passed, or what went wrong (and on which phone, browser and operating system). Anything that fails becomes an issue, and the spec stays as it is until it is understood.
