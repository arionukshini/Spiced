const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readAlbumDate(response: unknown, uri: string): unknown {
  if (!isRecord(response) || !isRecord(response.data)) return undefined;
  const album = response.data.albumUnion;
  if (!isRecord(album) || album.__typename !== "Album" || album.uri !== uri) return undefined;
  return album.date;
}

export function formatReleaseDate(date: unknown): { year: string; label: string } | undefined {
  if (!isRecord(date) || typeof date.isoString !== "string") return undefined;
  const parts = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T.*)?$/.exec(date.isoString);
  if (!parts) return undefined;
  const [, year, monthText, dayText] = parts;
  if (!year || Number(year) === 0) return undefined;
  if (date.precision === "YEAR") return { year, label: year };

  const month = Number(monthText);
  const monthName = months[month - 1];
  if (!monthName) return undefined;
  if (date.precision === "MONTH") return { year, label: `${monthName} ${year}` };
  if (date.precision !== "DAY") return undefined;

  const day = Number(dayText);
  const numericYear = Number(year);
  const leapYear = numericYear % 4 === 0 && (numericYear % 100 !== 0 || numericYear % 400 === 0);
  const daysInMonth = month === 2 ? (leapYear ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth) return undefined;

  const lastTwo = day % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return { year, label: `${day}${suffix} ${monthName} ${year}` };
}
