export const RECORD_TYPES = ["income", "expense"] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

export function isRecordType(value: unknown): value is RecordType {
  return typeof value === "string" && RECORD_TYPES.includes(value as RecordType);
}

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

export function parseMonth(month: string | null) {
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return null;
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const [year, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));

  return { month, start, end };
}

export function parseISODate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function parseIdFromString(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
