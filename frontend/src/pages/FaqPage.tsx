const faqs = [
  {
    question: "How fast can I onboard my portfolio?",
    answer:
      "Most teams onboard within 48 hours with guided data migration and templates.",
  },
  {
    question: "Do you support payment automation?",
    answer:
      "Yes. Automated invoices, reminders, and Stripe payment tracking are built in.",
  },
  {
    question: "Is tenant data secure?",
    answer:
      "We use encryption, RBAC, and audit logs to keep your data safe and compliant.",
  },
  {
    question: "Can I customize workflows?",
    answer:
      "Yes. Configure approvals, notifications, and automated tasks per property type.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          FAQ
        </p>
        <h1 className="text-3xl font-semibold text-white">Common questions</h1>
        <p className="text-sm text-slate-400">
          Everything you need to know about SmartProperty and how it helps your
          team.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <p className="text-sm font-semibold text-white">{faq.question}</p>
            <p className="mt-2 text-sm text-slate-400">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
