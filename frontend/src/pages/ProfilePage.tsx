export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-slate-400">
          Manage your personal details and preferences.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400">
              First name
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white"
              defaultValue="Alex"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400">
              Last name
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white"
              defaultValue="Morgan"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white"
              defaultValue="alex@smartproperty.io"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400">
              Phone
            </label>
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white"
              defaultValue="+1 (415) 555-0188"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white">
            Save changes
          </button>
          <button className="rounded-full border border-slate-700 px-6 py-2 text-sm text-white">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
