import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-ink-100 bg-cream-50/60 px-6 py-14 text-center">
      {icon && <div className="text-moss-400">{icon}</div>}
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-400">{description}</p>}
      {action}
    </div>
  );
}
