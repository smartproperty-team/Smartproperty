import SectionHeader from "../components/SectionHeader";

const values = [
  {
    title: "Transparency",
    description: "Live reporting and auditable data across every transaction.",
  },
  {
    title: "Automation",
    description: "Reduce manual work with intelligent workflows and approvals.",
  },
  {
    title: "Security",
    description: "Enterprise-grade security for every portfolio and tenant.",
  },
  {
    title: "Community",
    description:
      "Empower owners, managers, and tenants with clear communication.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <SectionHeader
        eyebrow="About us"
        title="Building the future of property management"
        subtitle="SmartProperty is a modern platform built for high-performing real estate teams."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-sm text-slate-400">
            SmartProperty was created to help property teams replace fragmented
            tools with a single operational command center. Our mission is to
            deliver clarity and confidence across every property lifecycle.
          </p>
          <p className="text-sm text-slate-400">
            We partner with owners, managers, and tenants to ensure every
            decision is supported by real-time data and simple workflows.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-blue-500/20 via-slate-950 to-purple-500/20 p-6">
          <p className="text-sm font-semibold text-white">Global footprint</p>
          <p className="mt-2 text-sm text-slate-400">
            42 cities, 18 countries, and growing with property teams who demand
            precision and reliability.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-white">2018</p>
              <p>Founded</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-white">120k+</p>
              <p>Active tenants</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-white">$420M</p>
              <p>Payments tracked</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-white">98%</p>
              <p>Client retention</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {values.map((value) => (
          <div
            key={value.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <p className="text-lg font-semibold text-white">{value.title}</p>
            <p className="mt-2 text-sm text-slate-400">{value.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
