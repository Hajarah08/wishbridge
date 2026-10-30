const steps = [
  { icon: "✍️", title: "Share a wish", body: "Describe what you'd love — an item, an experience, a learning goal. Use a username or stay anonymous." },
  { icon: "🛡️", title: "We review it", body: "Moderators check every wish against our community guidelines before anyone else can see it." },
  { icon: "🔎", title: "Someone discovers it", body: "Kind people browse wishes by category, country and progress, then offer to help." },
  { icon: "🤝", title: "You decide", body: "Accept or decline offers. Coordinate privately — addresses are never shared automatically." },
  { icon: "🎁", title: "Both confirm", body: "A wish is marked fulfilled only after the giver reports delivery and the wisher confirms receipt." },
];

export function HowItWorksSteps() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ivory-300/70">
          <span className="absolute right-4 top-4 font-display text-sm font-semibold text-plum-200">0{i + 1}</span>
          <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-coral-50 text-xl">{s.icon}</span>
          <h3 className="mt-3 font-display text-lg font-semibold text-plum-900">{s.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}
