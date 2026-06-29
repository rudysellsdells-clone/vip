import Image from "next/image";
import Link from "next/link";

const workflowSteps = [
  {
    eyebrow: "01",
    title: "Brand Input Setup",
    description: "Voice, audience, offers, services, proof points, tone, and publishing rules are organized first.",
  },
  {
    eyebrow: "02",
    title: "Strategy + Messages",
    description: "Monthly positioning, key messages, content themes, and channel priorities are planned together.",
  },
  {
    eyebrow: "03",
    title: "Content Calendar",
    description: "A structured plan across social, blog, email, and video keeps your marketing consistent.",
  },
  {
    eyebrow: "04",
    title: "Content Creation",
    description: "VIP creates posts, blogs, scripts, emails, captions, hooks, and CTAs from approved inputs.",
  },
  {
    eyebrow: "05",
    title: "VIP Content Score",
    description: "Each asset is reviewed against voice, audience, message, offer, CTA, and channel fit.",
  },
  {
    eyebrow: "06",
    title: "Approval + Publishing",
    description: "Review, improve, approve, schedule, and publish from one workspace-aware workflow.",
  },
];

const problemCards = [
  {
    icon: "✦",
    title: "You do not need more random drafts",
    description: "Most AI tools create content, but they still leave you with planning, editing, approvals, and publishing.",
  },
  {
    icon: "↻",
    title: "Your business needs consistency",
    description: "Social, blog, email, and video work best when they follow one strategy and one brand voice.",
  },
  {
    icon: "✓",
    title: "You need confidence before publishing",
    description: "Marketing VIP checks each asset against your approved brand inputs before it goes live.",
  },
];

const includedItems = [
  "Brand input setup",
  "Marketing strategy",
  "Key messages",
  "Monthly content calendar",
  "Social post creation",
  "Blog content creation",
  "Email campaigns",
  "Video scripts",
  "VIP Content Score",
  "Improvement suggestions",
  "Approval workflow",
  "Publishing setup",
  "Performance visibility",
  "Ongoing support",
];

const scoreRows = [
  ["Brand Voice Alignment", "92"],
  ["Message Clarity", "86"],
  ["Audience Fit", "88"],
  ["Channel Fit", "90"],
  ["CTA Strength", "78"],
  ["Publish Readiness", "91"],
];

const useCases = [
  "Professional Services",
  "Home Services",
  "Healthcare + Wellness",
  "Consultants + B2B",
  "Local Service Businesses",
  "Multi-Location SMBs",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f9fd] text-slate-950">
      <header className="border-b border-[#d8ebf5] bg-white">
        <div className="h-2 bg-gradient-to-r from-[#0d4d80] via-[#25aee4] to-[#7fd6f6]" />
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center">
            <Image
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              width={260}
              height={87}
              priority
              className="h-auto w-[205px] sm:w-[245px]"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-extrabold text-slate-600 lg:flex">
            <a href="#how-it-works" className="transition hover:text-[#0d4d80]">How it works</a>
            <a href="#score" className="transition hover:text-[#0d4d80]">VIP Content Score</a>
            <a href="#included" className="transition hover:text-[#0d4d80]">What's included</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-full border border-[#b9d9ea] bg-white px-4 py-2.5 text-sm font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4] sm:inline-flex"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#0d4d80] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[#25aee4]/15 blur-3xl" />
        <div className="absolute bottom-[-13rem] right-[-9rem] h-[32rem] w-[32rem] rounded-full bg-[#0d4d80]/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[#b9d9ea] bg-[#f4f9fd] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0d4d80]">
              Managed AI Marketing Platform
            </p>
            <h1 className="mt-7 text-5xl font-black leading-[0.96] tracking-[-0.055em] text-[#082f51] sm:text-6xl lg:text-7xl">
              Your AI marketing team in a box.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-700 sm:text-xl">
              Marketing VIP plans, creates, scores, approves, and helps publish brand-aligned marketing content for your business every month.
            </p>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Built by Web Search Professionals for service businesses that need consistent marketing without hiring and managing a full internal content team.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[#0d4d80] px-7 py-4 text-base font-black text-white shadow-xl shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63]"
              >
                Enter Marketing VIP
              </Link>
              <a
                href="https://www.web-search-pros.com/contact-us/"
                className="inline-flex items-center justify-center rounded-2xl border border-[#b9d9ea] bg-white px-7 py-4 text-base font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4]"
              >
                Book your setup call
              </a>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {[
                "One setup",
                "One platform",
                "One monthly workflow",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[#d9edf8] bg-[#f7fbff] px-4 py-3 text-sm font-black text-[#0d4d80]">
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d8ebf5] bg-[#f8fcff] p-4 shadow-2xl shadow-[#0d4d80]/12 sm:p-6">
            <div className="rounded-[1.5rem] border border-[#d9edf8] bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#d9edf8] pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#25aee4]">Marketing VIP Workflow</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#082f51]">From input to approved content</h2>
                </div>
                <span className="rounded-full bg-[#e8f7fd] px-3 py-1 text-xs font-black text-[#0d4d80]">Ready</span>
              </div>

              <div className="mt-5 space-y-3">
                {workflowSteps.slice(0, 5).map((step) => (
                  <div key={step.title} className="flex items-center gap-3 rounded-2xl border border-[#d9edf8] bg-[#f7fbff] p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d4d80] text-xs font-black text-white">
                      {step.eyebrow}
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#082f51]">{step.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#b9d9ea] bg-[#eaf7fd] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0d4d80]">VIP Content Score</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">Quality checks before content reaches publishing.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-black tracking-[-0.08em] text-[#0d4d80]">92</p>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#148ac0]">Ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8ebf5] bg-[#f4f9fd] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">The real problem</p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
                AI content is easy. On-brand marketing execution is not.
              </h2>
            </div>
            <p className="text-base font-medium leading-7 text-slate-600">
              Marketing VIP is not another blank prompt box. It is a guided operating system for monthly strategy, content creation, quality scoring, approvals, and publishing confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {problemCards.map((card) => (
              <div key={card.title} className="rounded-[1.75rem] border border-[#d9edf8] bg-white p-7 shadow-sm shadow-[#0d4d80]/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7fd] text-xl font-black text-[#0d4d80]">
                  {card.icon}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-tight text-[#082f51]">{card.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">How it works</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              From brand inputs to published marketing in one guided workflow
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {workflowSteps.map((step) => (
              <article key={step.title} className="rounded-[1.75rem] border border-[#d9edf8] bg-[#f8fcff] p-7 shadow-sm">
                <p className="text-sm font-black text-[#25aee4]">{step.eyebrow}</p>
                <h3 className="mt-4 text-xl font-black tracking-tight text-[#082f51]">{step.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="score" className="border-y border-[#d8ebf5] bg-[#f4f9fd] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-[2rem] border border-[#c6e5f4] bg-white p-8 shadow-xl shadow-[#0d4d80]/8">
            <div className="flex items-end justify-between gap-6 border-b border-[#d9edf8] pb-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">VIP Content Score</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[#082f51]">Every asset is scored before it goes live</h2>
              </div>
              <div className="text-right">
                <p className="text-6xl font-black tracking-[-0.08em] text-[#0d4d80]">87</p>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#148ac0]">/100</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {scoreRows.map(([label, score]) => (
                <div key={label} className="rounded-2xl border border-[#d9edf8] bg-[#f8fcff] p-4">
                  <div className="flex items-center justify-between gap-4 text-sm font-black text-[#082f51]">
                    <span>{label}</span>
                    <span className="text-[#0d4d80]">{score}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dceff8]">
                    <div className="h-full rounded-full bg-[#25aee4]" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">Publishing confidence</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              Your brand inputs become the standard.
            </h2>
            <p className="mt-5 text-base font-medium leading-7 text-slate-600">
              Marketing VIP checks content against your voice, audience, message, offer, CTA, channel, and campaign goal so your content is not just created — it is ready to represent your business.
            </p>
            <div className="mt-7 rounded-[1.5rem] border border-[#d9edf8] bg-white p-5 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
              Suggested improvement example: replace a generic CTA like “Learn more” with a more specific action, such as “Book your free consultation this week.”
            </div>
          </div>
        </div>
      </section>

      <section id="included" className="bg-white px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">What's included</p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
                Everything your monthly marketing needs.
              </h2>
              <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                Strategy, content, review, scoring, approvals, publishing prep, and reporting visibility are connected in one system.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {includedItems.map((item) => (
                <div key={item} className="rounded-2xl border border-[#d9edf8] bg-[#f8fcff] p-4 text-sm font-black text-[#082f51] shadow-sm">
                  <span className="mr-2 text-[#25aee4]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8ebf5] bg-[#f4f9fd] px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">Use cases</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              Built for service businesses that need consistent marketing
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase) => (
              <div key={useCase} className="rounded-[1.5rem] border border-[#d9edf8] bg-white p-6 text-lg font-black text-[#082f51] shadow-sm">
                {useCase}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto max-w-6xl rounded-[2.25rem] border border-[#c6e5f4] bg-[#eaf7fd] p-8 text-center shadow-xl shadow-[#0d4d80]/8 sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d4d80]">Start here</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
            Ready to build your AI marketing team in a box?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-700">
            Web Search Professionals will set up Marketing VIP around your brand, connect your channels, and help you publish consistent, brand-aligned marketing every month.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center rounded-2xl bg-[#0d4d80] px-7 py-4 font-black text-white shadow-lg shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63]">
              Sign in to Marketing VIP
            </Link>
            <a href="https://www.web-search-pros.com/contact-us/" className="inline-flex items-center justify-center rounded-2xl border border-[#b9d9ea] bg-white px-7 py-4 font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4]">
              Book your setup call
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d9edf8] bg-[#f4f9fd] px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/wsp-logo.png"
            alt="Web Search Professionals"
            width={190}
            height={64}
            className="h-auto w-[170px]"
          />
          <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-600">
            <a href="https://www.web-search-pros.com/privacy-policy/" className="hover:text-[#0d4d80]">Privacy Policy</a>
            <a href="https://www.web-search-pros.com/contact-us/" className="hover:text-[#0d4d80]">Contact</a>
            <Link href="/login" className="hover:text-[#0d4d80]">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
