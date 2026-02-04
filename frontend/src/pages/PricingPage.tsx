import SectionHeader from "../components/SectionHeader";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    description: "For small landlords and boutique portfolios.",
    features: ["Up to 10 properties", "Tenant messaging", "Basic analytics"],
  },
  {
    name: "Growth",
    price: "$79",
    description: "For growing teams with automation needs.",
    features: [
      "Up to 100 properties",
      "Automated billing",
      "Maintenance workflows",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large portfolios and regional teams.",
    features: [
      "Unlimited properties",
      "Custom integrations",
      "Dedicated success team",
      "Advanced security",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <SectionHeader
        eyebrow="Pricing"
        title="Plans that scale with your portfolio"
        subtitle="Flexible options with predictable pricing and premium support."
        align="center"
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-3xl border p-6 ${
              tier.featured
                ? "border-blue-500/60 bg-gradient-to-br from-blue-500/20 to-slate-950"
                : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
              {tier.name}
            </p>
            <p className="mt-4 text-4xl font-semibold text-white">
              {tier.price}
            </p>
            <p className="mt-2 text-sm text-slate-400">{tier.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="mt-6 w-full rounded-full bg-white/90 py-2 text-sm font-semibold text-slate-900">
              Choose plan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
