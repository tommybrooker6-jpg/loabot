# FPS LAB — LOA Bot

A self-contained Discord bot that runs the whole LOA (Leave of Absence) workflow:

1. Staff with an allowed role click **Request LOA** on a panel you post.
2. They fill in **Start Date**, **End Date**, and **Reason** in a popup form.
3. The request is posted in a review channel with **Approve** / **Deny** buttons that only your approver roles can use.
4. On approval, the requester is automatically given the **LOA** role, the request disappears from the review channel, and two things happen in your log channel:
   - A pinned **Active LOAs** board (one message, always edited in place) updates to show who's currently out and until when.
   - A permanent, never-edited log entry is posted recording who requested it, who approved it, the dates, duration, and reason.
5. When the end date passes, the bot automatically removes the LOA role and updates the active board (count goes back down).

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

From there the flow is fully automatic: request → review channel → approve/deny → role granted → auto-removed when the LOA ends.

## Notes

- Data (config + request history) is stored locally in `data/db.json`, created automatically on first run. Back this up if you move hosts.
- Denied/approved requests keep their embed as a record; buttons are removed after a decision so they can't be actioned twice.
- Dates must be entered as `YYYY-MM-DD` in the popup form — the bot validates the format and that the end date isn't before the start date.
- This bot handles everything itself (no webhook), so the earlier "buttons don't work through a webhook" limitation doesn't apply — the Approve/Deny/Request buttons are all backed by this bot's own interaction handling.
