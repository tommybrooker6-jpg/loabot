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

module.exports = { parseDMY, formatDMY };
