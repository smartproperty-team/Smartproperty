import {
  ArrowRight,
  BarChart3,
  Building2,
  Shield,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import PropertyCard from "../components/PropertyCard";
import SectionHeader from "../components/SectionHeader";

const featured = [
  {
    title: "Skyline Residences",
    location: "San Francisco, CA",
    price: "$4,800/mo",
    beds: 3,
    baths: 2,
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Lakeview Loft",
    location: "Austin, TX",
    price: "$3,150/mo",
    beds: 2,
    baths: 2,
    image:
      "https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Willow Estate",
    location: "Seattle, WA",
    price: "$6,200/mo",
    beds: 4,
    baths: 3,
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  },
];

const stats = [
  { label: "Active Properties", value: "14,500+" },
  { label: "Verified Tenants", value: "120k" },
  { label: "Managed Payments", value: "$420M" },
  { label: "Global Cities", value: "42" },
];

export default function HomePage() {
  return (
    <div className="bg-slate-950">
      <section className="relative overflow-hidden hero-mesh">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),transparent_45%)]" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="noise-layer" />
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              SmartProperty Platform
            </p>
            <h1 className="text-4xl font-semibold text-white md:text-6xl">
              Run your real estate operations from a single intelligent
              workspace.
            </h1>
            <p className="text-base text-slate-300 md:text-lg">
              Manage property listings, tenants, leases, payments, and
              maintenance with real-time insights, automation, and secure
              workflows.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white"
              >
                Browse listings
              </Link>
            </div>
            <div className="grid gap-4 pt-6 md:grid-cols-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <p className="text-xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-300">
                    Portfolio Pulse
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    $84,320
                  </p>
                  <p className="text-xs text-slate-400">
                    Monthly revenue · +12.4% growth
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Healthy
                </span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">
                    Occupancy Rate
                  </p>
                  <p className="text-3xl font-semibold text-blue-400">98.4%</p>
                  <p className="text-xs text-slate-400">
                    Portfolio performance this month
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">
                    Pending Tasks
                  </p>
                  <p className="text-3xl font-semibold text-purple-400">26</p>
                  <p className="text-xs text-slate-400">
                    Maintenance and lease approvals
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                <p className="text-sm font-semibold text-white">
                  Smart Insights
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  AI-driven recommendations highlight pricing adjustments and
                  vacancy risk zones to keep your portfolio healthy.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <Building2 className="h-6 w-6 text-blue-400" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Unified Inventory
                </p>
                <p className="text-xs text-slate-400">
                  Track all assets, leases, and pipelines in one secure hub.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <Sparkles className="h-6 w-6 text-purple-400" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Automated Workflows
                </p>
                <p className="text-xs text-slate-400">
                  Reduce manual operations with intelligent approvals and
                  alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeader
          eyebrow="Featured listings"
          title="Premium homes across top markets"
          subtitle="Curated properties with verified data, 3D tours, and instant leasing tools."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <PropertyCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Operations"
              title="Everything your team needs to scale"
              subtitle="From onboarding tenants to handling maintenance, SmartProperty keeps teams aligned with real-time dashboards."
            />
            <div className="space-y-4">
              {[
                {
                  title: "Payments & billing",
                  description:
                    "Automated invoices, reminders, and reconciliation with Stripe integration.",
                },
                {
                  title: "Lease lifecycle",
                  description:
                    "Create, sign, and renew leases with workflows and stored documents.",
                },
                {
                  title: "Maintenance tickets",
                  description:
                    "Collect requests, assign vendors, and track cost insights in one view.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Monthly Revenue</p>
                  <p className="text-3xl font-semibold text-white">$84,320</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  +12.4%
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-white">312</p>
                  <p>Occupied units</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-white">18</p>
                  <p>New leases</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <p className="text-white">6</p>
                  <p>Open tickets</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <Shield className="h-6 w-6 text-blue-400" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Security first
                </p>
                <p className="text-xs text-slate-400">
                  Role-based permissions, audit logs, and data encryption.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <BarChart3 className="h-6 w-6 text-purple-400" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Insightful analytics
                </p>
                <p className="text-xs text-slate-400">
                  Live dashboards for occupancy, revenue, and tenant health.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-500/20 via-slate-950 to-purple-500/20 p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                Get started
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Build a smarter portfolio today.
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Start with a free trial, invite your team, and launch your first
                property listing in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900"
              >
                Start free trial
              </Link>
              <Link
                to="/contact"
                className="rounded-full border border-slate-500 px-6 py-3 text-sm font-semibold text-white"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
