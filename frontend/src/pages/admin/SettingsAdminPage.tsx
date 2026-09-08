import { useEffect, useState } from "react";
import { useBusinessSettings, useUpdateBusinessSettings, type BusinessSettings } from "../../lib/adminHooks";
import { Spinner, FullPageSpinner } from "../../components/ui/Spinner";

export function SettingsAdminPage() {
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const [form, setForm] = useState<Partial<BusinessSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading || !form.timezone) return <FullPageSpinner />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await updateSettings.mutateAsync(form);
    setSaved(true);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-ink-900">Business settings</h1>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Delivery radius (km)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={form.deliveryRadiusKm ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusKm: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label">Timezone</label>
            <input className="input" value={form.timezone ?? ""} disabled />
          </div>
          <div>
            <label className="label">Business latitude</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={form.businessLatitude ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, businessLatitude: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label">Business longitude</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={form.businessLongitude ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, businessLongitude: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label">Same-day order cutoff</label>
            <input
              type="time"
              className="input"
              value={form.sameDayOrderCutoff ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sameDayOrderCutoff: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Skip deadline (previous day)</label>
            <input
              type="time"
              className="input"
              value={form.skipDeadlineTime ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, skipDeadlineTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Delivery window start</label>
            <input
              type="time"
              className="input"
              value={form.deliveryStartTime ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deliveryStartTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Delivery window end</label>
            <input
              type="time"
              className="input"
              value={form.deliveryEndTime ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, deliveryEndTime: e.target.value }))}
            />
          </div>
        </div>

        {saved && <p className="rounded-lg bg-moss-50 px-3 py-2 text-sm text-moss-700">Settings saved.</p>}

        <button type="submit" className="btn-primary" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? <Spinner className="h-4 w-4" /> : "Save settings"}
        </button>
      </form>
    </div>
  );
}
