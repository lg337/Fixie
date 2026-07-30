const DATE_FIELD_CANDIDATES = [
  "RequestDate",
  "RequestCreatedAt",
  "CreatedAt",
  "createdAt",
  "created_at",
  "DateCreated",
  "RequestUpdatedAt",
  "UpdatedAt",
  "updatedAt",
  "updated_at",
];

export function formatRequestDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(safeDate);
}

export function getRequestDateLabel(request = {}) {
  const dateValue = DATE_FIELD_CANDIDATES.map((field) => request[field]).find(Boolean);
  return formatRequestDate(dateValue || new Date());
}

export function stampNewRequestNotes(notes, date = new Date()) {
  const cleanNotes = String(notes || "").trim();
  const dateLine = `Request date: ${formatRequestDate(date)}`;

  return cleanNotes.startsWith("Request date:") ? cleanNotes : [dateLine, cleanNotes].filter(Boolean).join("\n\n");
}

export function appendDatedRequestUpdate(notes, updateText, date = new Date()) {
  const cleanNotes = String(notes || "").trim();
  const cleanUpdate = String(updateText || "").trim();
  if (!cleanUpdate) return cleanNotes;

  return [cleanNotes, `Update (${formatRequestDate(date)}): ${cleanUpdate}`].filter(Boolean).join("\n\n");
}

export function formatDatedPlannerSection(label, value, date = new Date()) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "";

  return `${label} (${formatRequestDate(date)}):\n${cleanValue}`;
}

export function getRequestSummary(request = {}, fallback = "Request") {
  if (request.RequestTitle) return request.RequestTitle;

  const firstDetailLine = String(request.RequestNotes || "")
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line &&
        !line.startsWith("Request date:") &&
        !line.startsWith("Included date:") &&
        !line.startsWith("Update (")
    );

  return firstDetailLine || fallback;
}
