const MAP: Record<string, { label: string; cls: string }> = {
  PLACED: { label: "Placed", cls: "badge-gray" },
  CONFIRMED: { label: "Confirmed", cls: "badge-amber" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", cls: "badge-amber" },
  DELIVERED: { label: "Delivered", cls: "badge-green" },
  CANCELLED: { label: "Cancelled", cls: "badge-red" },
  FAILED: { label: "Failed", cls: "badge-red" },
  ACTIVE: { label: "Active", cls: "badge-green" },
  PAUSED: { label: "Paused", cls: "badge-amber" },
  EXPIRED: { label: "Expired", cls: "badge-gray" },
  PENDING: { label: "Pending", cls: "badge-amber" },
  PAID: { label: "Paid", cls: "badge-green" },
  OVERDUE: { label: "Overdue", cls: "badge-red" },
  SCHEDULED: { label: "Scheduled", cls: "badge-gray" },
  SKIPPED: { label: "Skipped", cls: "badge-amber" },
  NOT_DELIVERED: { label: "Not delivered", cls: "badge-red" },
  ASSIGNED: { label: "Assigned", cls: "badge-gray" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = MAP[status] ?? { label: status.replace(/_/g, " "), cls: "badge-gray" };
  return <span className={entry.cls}>{entry.label}</span>;
}
