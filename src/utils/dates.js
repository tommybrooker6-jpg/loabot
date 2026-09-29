// Parses a DD/MM/YYYY string typed by a user. Returns the equivalent
// ISO date (YYYY-MM-DD) for storage/sorting, or null if it isn't a real date.
function parseDMY(input) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  // Catches overflow like 31/02/2026 silently rolling into March.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

// Converts a stored ISO date (YYYY-MM-DD) back to DD/MM/YYYY for display.
function formatDMY(isoDate) {
  const [yyyy, mm, dd] = isoDate.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

// Formats the elapsed time between two ISO timestamps as e.g. "7d 3h" —
// used to show how long someone actually held the LOA role, not just the
// dates they originally requested.
function humanDuration(fromISO, toISO) {
  const ms = new Date(toISO) - new Date(fromISO);
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (!days && !hours) parts.push(`${minutes}m`);
  return parts.join(' ');
}

module.exports = { parseDMY, formatDMY, humanDuration };
