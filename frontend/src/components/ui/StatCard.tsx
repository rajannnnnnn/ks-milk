import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "moss",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "moss" | "clay";
}) {
  return (
    <div className="card p-5">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
          accent === "moss" ? "bg-moss-100 text-moss-700" : "bg-clay-100 text-clay-700"
        }`}
      >
        <Icon size={18} />
      </div>
      <p className="text-2xl font-semibold text-ink-900">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
