import Image from "next/image";
import Link from "next/link";

const workflowSteps = [
  "Brand Inputs",
  "Monthly Strategy",
  "Content Creation",
  "VIP Content Score",
  "Approval + Publishing",
];

const problemCards = [
  {
    icon: "✦",
    title: "You do not need more random drafts",
    description:
      "Most AI tools create content, but they still leave you with planning, editing, approvals, and publishing.",
  },
  {
    icon: "↻",
    title: "Your business needs consistency",
    description:
      "Social, blog, email, and video work best when they follow one strategy and one brand voice.",
  },
  {
    icon: "✓",
    title: "You need confidence before publishing",
    description:
      "Marketing VIP checks each asset against your approved brand inputs before it goes live.",
  },
];

const includedItems = [
  "Brand input setup",
  "Marketing strategy",
  "Monthly content calendar",
  "Social post creation",
  "Blog content creation",
  "Email campaigns",
  "Video scripts",
  "VIP Content Score",
  "Approval workflow",
  "Publishing setup",
  "Performance visibility",
  "Ongoing support",
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
    <main className="min-h-screen overflow-hidden bg-[#f5f9fc] text-slate-950">
      <section className="relative border-b border-[#d9edf8] bg-white">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#0d4d80] via-[#25aee4] to-[#7fd6f6]" />
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-6 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              width={260}
              height={87}
              priority
              className="h-auto w-[210px] sm:w-[250px]"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-full border border-[#b9d9ea] bg-white px-4 py-2.5 text-sm font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4] hover:text-[#072e4f] sm:inline-flex"
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
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#eff8fd_48%,#dff3fb_100%)]">
        <div className="absolute left-[-12rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#25aee4]/18 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#0d4d80]/12 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-20">
          <div>
            <p className="inline-flex rounded-full border border-[#b9d9ea] bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#0d4d80] shadow-sm">
              Managed AI Marketing Platform
            </p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[#0b2f4e] sm:text-6xl lg:text-7xl">
              Your AI marketing team in a box.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-700 sm:text-xl">
              Marketing VIP plans, creates, scores, approves, and publishes brand-aligned marketing content for your business every month.
            </p>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">
              Built by Web Search Professionals for service businesses that need consistent marketing without hiring a full internal content team.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[#0d4d80] px-7 py-4 text-base font-black text-white shadow-xl shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63]"
              >
                Enter Marketing VIP
              </Link>
              <a
                href="https://www.web-search-pros.com/contact-us/"
                className="inline-flex items-center justify-center rounded-2xl border border-[#b9d9ea] bg-white px-7 py-4 text-base font-black text-[#0d4d80] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4] hover:text-[#072e4f]"
              >
                Book your setup call
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-black text-[#0d4d80]">
              <span className="rounded-full border border-[#d9edf8] bg-white px-4 py-2 shadow-sm">✓ One setup</span>
              <span className="rounded-full border border-[#d9edf8] bg-white px-4 py-2 shadow-sm">✓ One platform</span>
              <span className="rounded-full border border-[#d9edf8] bg-white px-4 py-2 shadow-sm">✓ One monthly workflow</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-[#25aee4]/20 blur-3xl" />
            <div className="relative rounded-[2rem] border border-[#c6e5f4] bg-white p-5 shadow-2xl shadow-[#0d4d80]/16">
              <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0b2f4e_0%,#0d4d80_52%,#148ac0_100%)] p-5 text-white">
                <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-[#9fe4ff]">
                      Marketing VIP Workflow
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">
                      From brand inputs to published marketing
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-black text-white">
                    Account-safe
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {workflowSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/10 p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-[#0d4d80]">
                        {index + 1}
                      </span>
                      <span className="text-sm font-black sm:text-base">{step}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-[#9fe4ff]/30 bg-white/12 p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9fe4ff]">
                        VIP Content Score
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-white/78">
                        Every asset is checked against your voice, audience, offer, CTA, channel, and campaign goal.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-black tracking-[-0.08em]">92</p>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9fe4ff]">Ready</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">The real problem</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight tracking-[-0.04em] text-[#0b2f4e] sm:text-5xl">
              AI content is easy. On-brand marketing execution is not.
            </h2>
            <p className="text-base font-medium leading-7 text-slate-600">
              Marketing VIP is not another blank prompt box. It is a guided operating system for monthly strategy, content creation, quality scoring, approvals, and publishing confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {problemCards.map((card) => (
              <div key={card.title} className="rounded-[1.75rem] border border-[#d9edf8] bg-[#f7fbff] p-6 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0d4d80] text-xl font-black text-white">
                  {card.icon}
                </span>
                <h3 className="mt-5 text-xl font-black tracking-tight text-[#0b2f4e]">{card.title}</h3>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f9fc] px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="rounded-[2rem] border border-[#c6e5f4] bg-white p-7 shadow-xl shadow-[#0d4d80]/8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#25aee4]">What is included</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-[#0b2f4e]">
              Everything your monthly marketing needs, in one managed platform.
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-slate-600">
              The platform keeps strategy, calendar planning, content production, scoring, approvals, and publishing in one connected workflow.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex rounded-2xl bg-[#0d4d80] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#0d4d80]/20 transition hover:-translate-y-0.5 hover:bg-[#083b63]"
            >
              Go to login
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {includedItems.map((item) => (
              <div key={item} className="rounded-2xl border border-[#d9edf8] bg-white px-5 py-4 text-sm font-black text-[#0d4d80] shadow-sm">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-[linear-gradient(135deg,#0b2f4e_0%,#0d4d80_48%,#1a9ed3_100%)] p-7 text-white shadow-2xl shadow-[#0d4d80]/20 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#9fe4ff]">Built for service businesses</p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                Consistent marketing for growth-focused teams.
              </h2>
              <p className="mt-4 text-base font-medium leading-7 text-white/76">
                Use Marketing VIP to keep campaigns moving even when the owner, team, or client is busy running the business.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCases.map((item) => (
                <div key={item} className="rounded-2xl border border-white/14 bg-white/10 px-5 py-4 text-sm font-black text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d9edf8] bg-[#f5f9fc] px-6 py-8 sm:px-8 lg:px-10">
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
