function getDefaultTimezone() {
  return 'America/Sao_Paulo';
}

function resolveStoreTimezone(loja) {
  return loja?.timezone || getDefaultTimezone();
}

function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeTimezone(timezone) {
  return isValidTimezone(timezone) ? timezone : getDefaultTimezone();
}

function getTimezoneOffsetParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedTimeToUtc(dateInput, timezone) {
  const date = new Date(dateInput);
  const tz = normalizeTimezone(timezone);
  const parts = getTimezoneOffsetParts(date, tz);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const diff = asUTC - date.getTime();
  return new Date(date.getTime() - diff);
}

function buildUtcDateForStore(dateValue, timezone, endOfDay = false) {
  const base = new Date(dateValue);
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`;
  return zonedTimeToUtc(iso, timezone);
}

function getDateKeyInTimezone(dateInput, timezone) {
  const date = new Date(dateInput);
  const tz = normalizeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

module.exports = {
  getDefaultTimezone,
  resolveStoreTimezone,
  isValidTimezone,
  normalizeTimezone,
  zonedTimeToUtc,
  buildUtcDateForStore,
  getDateKeyInTimezone,
};
