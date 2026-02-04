import { Link, useParams } from "react-router-dom";

export default function PropertyDetailPage() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
            Property {id}
          </p>
          <h1 className="text-3xl font-semibold text-white">
            The Waterfront Collection
          </h1>
          <p className="text-sm text-slate-400">Miami, FL · 4 Beds · 4 Baths</p>
        </div>
        <Link
          to="/properties"
          className="rounded-full border border-slate-800 px-4 py-2 text-sm text-white"
        >
          Back to listings
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <img
              className="h-64 w-full rounded-2xl object-cover"
              src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1000&q=80"
              alt="Property"
            />
            <div className="grid gap-4">
              <img
                className="h-36 w-full rounded-2xl object-cover"
                src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80"
                alt="Property"
              />
              <img
                className="h-36 w-full rounded-2xl object-cover"
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80"
                alt="Property"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-xl font-semibold text-white">Overview</h2>
            <p className="mt-3 text-sm text-slate-400">
              This waterfront residence offers expansive views, designer
              interiors, and private amenities. Located in the heart of the
              marina district with concierge services, rooftop lounge, and smart
              access control.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                "Private balcony",
                "Smart access",
                "Concierge",
                "2 parking spots",
                "Pet friendly",
                "EV charging",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-xl font-semibold text-white">Neighborhood</h2>
            <p className="mt-3 text-sm text-slate-400">
              Walk to the marina, retail district, and top-rated restaurants.
              Ideal for professionals who value lifestyle and convenience.
            </p>
            <div className="mt-4 h-48 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60" />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-3xl font-semibold text-white">$12,400 / mo</p>
            <p className="text-xs text-slate-400">Available from March 2026</p>
            <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3 text-sm font-semibold text-white">
              Schedule a tour
            </button>
            <button className="mt-3 w-full rounded-xl border border-slate-700 py-3 text-sm text-white">
              Apply now
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm font-semibold text-white">Property Manager</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-800" />
              <div>
                <p className="text-sm font-semibold text-white">
                  Kara Mitchell
                </p>
                <p className="text-xs text-slate-400">Senior Leasing Agent</p>
              </div>
            </div>
            <button className="mt-4 w-full rounded-xl border border-slate-700 py-2 text-sm text-white">
              Message agent
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
