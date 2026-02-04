import SectionHeader from "../components/SectionHeader";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <SectionHeader
        eyebrow="Contact"
        title="Let’s build your next portfolio together"
        subtitle="Reach our team for demos, pricing, or support."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <form className="space-y-4">
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
              placeholder="Full name"
            />
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
              placeholder="Work email"
            />
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
              placeholder="Company"
            />
            <textarea
              className="h-32 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
              placeholder="Tell us about your portfolio..."
            />
            <button className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3 text-sm font-semibold text-white">
              Send message
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-sm font-semibold text-white">Headquarters</p>
            <p className="mt-2 text-sm text-slate-400">
              500 Market St, San Francisco, CA
            </p>
            <p className="mt-2 text-sm text-slate-400">
              support@smartproperty.io
            </p>
            <p className="mt-2 text-sm text-slate-400">+1 (415) 555-0132</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-sm font-semibold text-white">Office hours</p>
            <p className="mt-2 text-sm text-slate-400">
              Mon - Fri · 8:00 AM - 7:00 PM
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Saturday · 9:00 AM - 3:00 PM
            </p>
          </div>
          <div className="h-48 rounded-3xl border border-dashed border-slate-700 bg-slate-950/60" />
        </div>
      </div>
    </div>
  );
}
