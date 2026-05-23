export function activeRecordsOnly(query: any) {
  return query.is("archived_at", null);
}

export function archivedRecordsOnly(query: any) {
  return query.not("archived_at", "is", null);
}

export function ensureNotArchived(row: Record<string, any> | null | undefined, label = "Record") {
  if (!row) {
    throw new Error(`${label} not found.`);
  }

  if (row.archived_at) {
    throw new Error(`${label} is archived and cannot be used in this workflow.`);
  }

  return row;
}
