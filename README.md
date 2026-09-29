# FPS LAB — LOA Bot

A self-contained Discord bot that runs the whole LOA (Leave of Absence) workflow:

1. Staff with an allowed role click **Request LOA** on a panel you post.
2. They fill in **Start Date**, **End Date**, and **Reason** in a popup form.
3. The request is posted in a review channel with **Approve** / **Deny** buttons that only your approver roles can use — the message pings just those roles.
4. **Approve** clears the request out of the review channel immediately, gives the requester the **LOA** role, and logs a permanent **✅ LOA Approved** entry. **Deny** first pops up a small form asking the approver for an (optional) reason, then clears the request and logs a **❌ LOA Denied** entry with that reason — the requester gets DMed the reason too.
5. Two things happen in the log channel throughout: a pinned **Active LOAs** board (one message, always edited in place) shows who's currently out, and every decision/completion gets its own permanent entry — nothing sits around in the review channel after a decision.
6. When the end date passes, the bot automatically removes the LOA role, updates the active board, and posts a **🏁 LOA Completed** log entry — including both the originally requested duration and the *actual* time they held the LOA role (from approval to role removal), so early endings don't get counted as the full requested length.
7. If a staff member's LOA role is instead removed manually (an admin dragging it off in Discord, rather than waiting it out), the bot notices immediately and ends that LOA right then — same board update and completion log, marked "Ended early," with the actual (shorter) time tracked accurately.
8. Anyone can run **`/loa-history`** to see their own past requests (dates, status, reason, actual time served); approvers can look up anyone else's with `/loa-history @user`.

Everything — which roles can request, which roles can approve, and which role gets assigned — is configured live in Discord via `/loa-setup`, no code editing required.

## 1. Create the bot application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it — this is your `DISCORD_TOKEN`.
3. On the same page, turn **on** the **Server Members Intent** toggle (required so the bot can look up members and assign roles).
4. Under **OAuth2 → General**, copy the **Client ID** — this is your `CLIENT_ID`.

## 2. Invite it to FPS LAB

Under **OAuth2 → URL Generator**, select:
- Scopes: `bot`, `applications.commands`
- Bot permissions: `Manage Roles`, `Send Messages`, `Embed Links`, `Use Application Commands`, `Manage Messages` (needed to pin the active-LOA board)

Open the generated URL and add the bot to your server.

**Important:** In **Server Settings → Roles**, drag the bot's own role **above** the LOA role (and above any role it might ever need to touch). Discord only lets a bot manage roles positioned below its own highest role.

## 3. Install and configure

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
```
DISCORD_TOKEN=...
CLIENT_ID=...
GUILD_ID=...   # optional: your server's ID, makes commands appear instantly while testing
```

Register the slash commands, then start the bot:
```bash
npm run deploy
npm start
```

## 4. Use it in Discord

- Run **`/loa-setup`** once (requires Manage Server permission). It replies with a private menu:
  - Select the role(s) allowed to **request** an LOA
  - Select the role(s) allowed to **approve/deny** an LOA
  - Select the **LOA** role to assign on approval
  - Select the **channel** where requests get posted for review
  - Select the **channel** for the active-LOA board + permanent approval log
  Each selection saves immediately — re-run `/loa-setup` any time to change them.
- Run **`/loa-panel`** in whichever channel staff should see the request button. This posts the public embed with the **Request LOA** button.
- Run **`/loa-history`** any time to check LOA history — no setup needed. Everyone can check their own; approver roles can also check anyone else's with `/loa-history @user`.

From there the flow is fully automatic: request → review channel → approve/deny → role granted → auto-removed when the LOA ends.

## Notes

- Data (config + request history) is stored locally in `data/db.json`, created automatically on first run. Back this up if you move hosts.
- Denied/approved requests keep their embed as a record; buttons are removed after a decision so they can't be actioned twice.
- Dates are entered as `DD/MM/YYYY` in the popup form (e.g. `01/10/2026`) — the bot validates it's a real calendar date and that the end date isn't before the start date. Everything is stored and compared internally in a sortable format, so the day-first display never affects the automatic expiry check.
- This bot handles everything itself (no webhook), so the earlier "buttons don't work through a webhook" limitation doesn't apply — the Approve/Deny/Request buttons are all backed by this bot's own interaction handling.
