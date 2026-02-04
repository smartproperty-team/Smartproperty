export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Configure notifications, security, and workspace preferences.
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
              Email alerts
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700"
                defaultChecked
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
              SMS alerts
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm font-semibold text-white">Security</p>
            <div className="mt-3 text-sm text-slate-400">
              Enable two-factor authentication for additional account security.
            </div>
            <button className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-xs text-white">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
