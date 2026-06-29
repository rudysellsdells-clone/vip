import Link from "next/link";

const proofPoints = [
  {
    value: "Plan",
    label: "Strategy, campaigns, and content calendars stay tied to the right workspace.",
  },
  {
    value: "Review",
    label: "Assets move through quality, approvals, and revision loops before publishing.",
  },
  {
    value: "Publish",
    label: "Approved content flows into preflight, schedule, and execution controls.",
  },
];

const workflowCards = [
  {
    title: "Account-aware workspaces",
    description:
      "Keep client content, campaigns, calendars, quality reviews, and publishing queues separated cleanly.",
  },
  {
    title: "Content command center",
    description:
      "Move from monthly planning to approval-ready assets without jumping between disconnected tools.",
  },
  {
    title: "Publishing preflight",
    description:
      "Review destinations, payloads, and blockers before anything leaves the platform.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#061826] text-white">
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_15%_15%,rgba(245,182,66,0.22),transparent_30rem),radial-gradient(circle_at_85%_10%,rgba(14,116,144,0.32),transparent_28rem),linear-gradient(135deg,#061826_0%,#08263d_48%,#0f172a_100%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5b642] text-lg font-black text-[#061826] shadow-lg shadow-[#f5b642]/25">
              VIP
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.28em] text-white">
                Marketing VIP
              </span>
              <span className="block text-xs font-semibold text-white/55">
                Powered by Web Search Pros
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-white/35 hover:bg-white/10 sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#f5b642] px-5 py-2.5 text-sm font-black text-[#061826] shadow-lg shadow-[#f5b642]/20 transition hover:-translate-y-0.5 hover:bg-[#ffd56f]"
            >
              Sign in
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#f5b642]/30 bg-[#f5b642]/10 px-4 py-2 text-sm font-bold text-[#ffd56f] shadow-lg shadow-[#f5b642]/10">
              AI-powered content operations for serious brands
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              One command center for strategy, content, approvals, and publishing.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/72 sm:text-xl">
              Marketing VIP helps replace scattered content workflows with a clean, account-aware system for planning campaigns, generating assets, reviewing quality, approving work, and sending content live with confidence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[#f5b642] px-7 py-4 text-base font-black text-[#061826] shadow-2xl shadow-[#f5b642]/20 transition hover:-translate-y-0.5 hover:bg-[#ffd56f]"
              >
                Enter Marketing VIP
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
              >
                Open dashboard
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div
                  key={item.value}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 backdrop-blur"
                >
                  <p className="text-2xl font-black text-[#ffd56f]">{item.value}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#f5b642]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.08] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#071d2e]/90 p-5">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ffd56f]">
                      Live workflow
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                      Marketing command center
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                    Account-safe
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {workflowCards.map((card, index) => (
                    <div
                      key={card.title}
                      className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-[#f5b642]/35 hover:bg-white/[0.09]"
                    >
                      <div className="flex gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5b642] text-sm font-black text-[#061826]">
                          0{index + 1}
                        </span>
                        <div>
                          <h3 className="text-base font-black text-white">{card.title}</h3>
                          <p className="mt-1 text-sm font-medium leading-6 text-white/60">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#f5b642]/20 bg-[#f5b642]/10 p-4">
                  <p className="text-sm font-black text-[#ffd56f]">Next best action</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/70">
                    Sign in, choose a workspace, review approved assets, then move safely into publishing preflight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
