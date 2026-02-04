const roles = [
  {
    title: "Senior Product Designer",
    location: "Remote · North America",
  },
  {
    title: "Full-stack Engineer",
    location: "Remote · Europe",
  },
  {
    title: "Customer Success Lead",
    location: "San Francisco, CA",
  },
];

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          Careers
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Join the SmartProperty team
        </h1>
        <p className="text-sm text-slate-400">
          Help us build the next generation of real estate operations tools.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {roles.map((role) => (
          <div
            key={role.title}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <div>
              <p className="text-sm font-semibold text-white">{role.title}</p>
              <p className="text-xs text-slate-400">{role.location}</p>
            </div>
            <button className="rounded-full border border-slate-700 px-4 py-2 text-xs text-white">
              View role
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
