const posts = [
  {
    title: "2026 Rental Market Trends",
    summary: "Key insights to help you adjust pricing strategies for Q2.",
    date: "Feb 1, 2026",
  },
  {
    title: "5 Automation Plays for Property Managers",
    summary:
      "Reduce manual work and boost tenant satisfaction with these workflows.",
    date: "Jan 22, 2026",
  },
  {
    title: "How Smart Leasing Boosts Occupancy",
    summary: "Tactics for improving occupancy rates using digital experiences.",
    date: "Jan 10, 2026",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          Blog
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Insights for modern teams
        </h1>
        <p className="text-sm text-slate-400">
          Property operations, market signals, and product updates.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <p className="text-xs text-slate-500">{post.date}</p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{post.summary}</p>
            <button className="mt-4 text-xs font-semibold text-blue-400">
              Read more
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
