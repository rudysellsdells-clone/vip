import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const workflowSteps = [
  {
    eyebrow: "01",
    title: "Brand Input Setup",
    description:
      "Voice, audience, services, offers, proof points, tone, and publishing rules are organized first.",
  },
  {
    eyebrow: "02",
    title: "Monthly Strategy",
    description:
      "Campaign themes, channel priorities, key messages, and timing are planned before content is created.",
  },
  {
    eyebrow: "03",
    title: "Content Calendar",
    description:
      "A complete monthly plan across blog, social, email, video, and authority-building assets.",
  },
  {
    eyebrow: "04",
    title: "Content Creation",
    description:
      "Posts, emails, blogs, scripts, captions, hooks, and CTAs are generated from approved brand inputs.",
  },
  {
    eyebrow: "05",
    title: "VIP Content Score",
    description:
      "Every asset is checked against brand voice, audience fit, message clarity, CTA strength, and publish readiness.",
  },
  {
    eyebrow: "06",
    title: "Approval + Publishing",
    description:
      "Review, revise, approve, schedule, and publish from one guided workflow.",
  },
];

const problemCards = [
  {
    title: "You do not need more random drafts",
    description:
      "Most AI tools generate content, but they still leave strategy, editing, approvals, and publishing on your desk.",
  },
  {
    title: "Your business needs consistent execution",
    description:
      "Social, blog, email, and video work best when they follow one clear strategy and one recognizable brand voice.",
  },
  {
    title: "You need confidence before publishing",
    description:
      "Marketing VIP checks generated content before it moves into approval and publishing.",
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
  "Website/blog integration",
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
  {
    title: "Professional Services",
    description: "Create trust-building content that explains expertise clearly and consistently.",
  },
  {
    title: "Home Services",
    description: "Turn seasonal needs, local proof, and service offers into steady monthly campaigns.",
  },
  {
    title: "Healthcare + Wellness",
    description: "Maintain consistent voice and careful message control across every channel.",
  },
  {
    title: "Consultants + B2B",
    description: "Build thought leadership, email nurture, blog content, and LinkedIn presence.",
  },
  {
    title: "Local Service Businesses",
    description: "Keep marketing active even when the owner is busy running operations.",
  },
  {
    title: "Multi-Location SMBs",
    description: "Support consistent brand messaging across locations and local markets.",
  },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-black uppercase tracking-[0.24em] text-[#148ac0]">
      {children}
    </p>
  );
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-[#0b5d95] px-8 py-4 text-base font-black text-white shadow-lg shadow-[#0b5d95]/20 transition hover:-translate-y-0.5 hover:bg-[#084a78]"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-[#b9d9ea] bg-white px-8 py-4 text-base font-black text-[#0b5d95] shadow-sm transition hover:-translate-y-0.5 hover:border-[#25aee4] hover:bg-[#f7fcff]"
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#d9edf8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10 lg:px-12">
          <Link href="/" className="flex items-center">
            <Image
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              width={260}
              height={87}
              priority
              className="h-auto w-[205px] sm:w-[250px]"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-extrabold text-slate-600 lg:flex">
            <a href="#how-it-works" className="transition hover:text-[#0b5d95]">
              How It Works
            </a>
            <a href="#included" className="transition hover:text-[#0b5d95]">
              What's Included
            </a>
            <a href="#score" className="transition hover:text-[#0b5d95]">
              VIP Content Score
            </a>
            <a href="#use-cases" className="transition hover:text-[#0b5d95]">
              Use Cases
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-[#0b5d95] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0b5d95]/20 transition hover:-translate-y-0.5 hover:bg-[#084a78]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute left-[-8rem] top-[-9rem] h-[26rem] w-[26rem] rounded-full bg-[#25aee4]/12 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[#0b5d95]/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 px-6 py-24 sm:px-10 sm:py-28 lg:grid-cols-[1.04fr_0.96fr] lg:px-12 lg:py-32">
          <div>
            <SectionLabel>Managed AI Marketing Platform</SectionLabel>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#082f51] sm:text-6xl lg:text-7xl">
              Your AI marketing team in a box
            </h1>
            <p className="mt-8 max-w-2xl text-xl font-semibold leading-9 text-slate-700">
              Marketing VIP plans, creates, scores, approves, and helps publish brand-aligned marketing content for your business every month.
            </p>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600">
              We set up the system, connect the workflow, organize your brand inputs, and give your team a guided path from monthly strategy to approved content.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <PrimaryButton href="/login">Enter Marketing VIP</PrimaryButton>
              <SecondaryButton href="https://www.web-search-pros.com/contact-us/">
                Book Your Setup Call
              </SecondaryButton>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {["One setup", "One platform", "One monthly workflow"].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-[#d9edf8] bg-[#f8fcff] px-6 py-5 text-base font-black text-[#0b5d95] shadow-sm"
                >
                  <span className="mr-2 text-[#25aee4]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[#d9edf8] bg-[#f8fcff] p-5 shadow-2xl shadow-[#0b5d95]/10 sm:p-7">
            <div className="rounded-[2rem] border border-[#d9edf8] bg-white p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-[#e6f2f8] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#148ac0]">
                    Marketing VIP Workflow
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-[#082f51]">
                    From brand inputs to approved content
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-[#b9d9ea] bg-[#eef9ff] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#0b5d95]">
                  Ready
                </span>
              </div>

              <div className="mt-7 grid gap-4">
                {workflowSteps.slice(0, 5).map((step) => (
                  <div
                    key={step.title}
                    className="grid gap-4 rounded-3xl border border-[#e0f0f8] bg-white p-5 shadow-sm sm:grid-cols-[3.5rem_1fr]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef9ff] text-sm font-black text-[#0b5d95]">
                      {step.eyebrow}
                    </span>
                    <div>
                      <p className="text-base font-black text-[#082f51]">{step.title}</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9edf8] bg-[#f6fbff] px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <SectionLabel>The real problem</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              AI content is easy. On-brand marketing execution is not.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {problemCards.map((card, index) => (
              <article
                key={card.title}
                className="rounded-[2rem] border border-[#d9edf8] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0b5d95]/10"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef9ff] text-xl font-black text-[#0b5d95]">
                  {index + 1}
                </div>
                <h3 className="mt-8 text-2xl font-black tracking-tight text-[#082f51]">
                  {card.title}
                </h3>
                <p className="mt-4 text-base font-medium leading-8 text-slate-600">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <SectionLabel>How it works</SectionLabel>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
                From brand inputs to published marketing in one guided workflow
              </h2>
              <p className="mt-6 text-lg font-medium leading-8 text-slate-600">
                The workflow is intentionally structured: strategy first, content second, quality review before publishing.
              </p>
            </div>

            <div className="grid gap-5">
              {workflowSteps.map((step) => (
                <article
                  key={step.title}
                  className="grid gap-5 rounded-[2rem] border border-[#d9edf8] bg-[#f8fcff] p-6 shadow-sm sm:grid-cols-[5rem_1fr] sm:p-8"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#b9d9ea] bg-white text-lg font-black text-[#0b5d95] shadow-sm">
                    {step.eyebrow}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-[#082f51]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base font-medium leading-8 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="score" className="border-y border-[#d9edf8] bg-[#f6fbff] px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <SectionLabel>VIP Content Score</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              Every asset is scored before it goes live
            </h2>
            <p className="mt-6 text-lg font-medium leading-8 text-slate-600">
              Marketing VIP does not score your brand. Your brand inputs become the standard. The platform scores content against your voice, audience, message, offer, CTA, channel, and campaign goal.
            </p>
            <div className="mt-9">
              <SecondaryButton href="https://www.web-search-pros.com/contact-us/">
                Request a VIP Content Audit
              </SecondaryButton>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[#d9edf8] bg-white p-6 shadow-2xl shadow-[#0b5d95]/10 sm:p-8">
            <div className="flex flex-col gap-5 border-b border-[#e6f2f8] pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#148ac0]">
                  VIP Content Score
                </p>
                <p className="mt-3 text-xl font-black text-[#082f51]">
                  Publish readiness snapshot
                </p>
              </div>
              <div className="rounded-[2rem] border border-[#b9d9ea] bg-[#eef9ff] px-7 py-5 text-center">
                <p className="text-6xl font-black tracking-[-0.08em] text-[#0b5d95]">87</p>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#148ac0]">/ 100</p>
              </div>
            </div>

            <div className="mt-7 grid gap-4">
              {scoreRows.map(([label, score]) => (
                <div key={label} className="rounded-3xl border border-[#e0f0f8] bg-[#f8fcff] p-5">
                  <div className="flex items-center justify-between gap-4 text-base font-black text-[#082f51]">
                    <span>{label}</span>
                    <span className="text-[#0b5d95]">{score}</span>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-[#e7f4fb]">
                    <div
                      className="h-3 rounded-full bg-[#25aee4]"
                      style={{ width: `${Math.min(Number(score), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-3xl border border-[#d9edf8] bg-[#fffdf6] p-5 text-sm font-semibold leading-7 text-slate-700">
              Suggested improvement: make the CTA more specific by replacing “Learn more” with “Book your free consultation this week.”
            </div>
          </div>
        </div>
      </section>

      <section id="included" className="bg-white px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>What's included</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              Everything your monthly marketing needs, in one managed platform
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {includedItems.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-[#d9edf8] bg-[#f8fcff] p-6 text-base font-black text-[#082f51] shadow-sm"
              >
                <span className="mr-3 text-[#25aee4]">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="border-y border-[#d9edf8] bg-[#f6fbff] px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <SectionLabel>Use cases</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
              Built for service businesses that need consistent marketing
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase) => (
              <article key={useCase.title} className="rounded-[2rem] border border-[#d9edf8] bg-white p-8 shadow-sm">
                <h3 className="text-2xl font-black tracking-tight text-[#082f51]">
                  {useCase.title}
                </h3>
                <p className="mt-4 text-base font-medium leading-8 text-slate-600">
                  {useCase.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:px-10 lg:px-12">
        <div className="mx-auto w-full max-w-7xl rounded-[2.5rem] border border-[#d9edf8] bg-[#f8fcff] p-8 text-center shadow-xl shadow-[#0b5d95]/8 sm:p-12 lg:p-16">
          <SectionLabel>Start here</SectionLabel>
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] text-[#082f51] sm:text-5xl">
            Ready to build your AI marketing team in a box?
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-8 text-slate-600">
            Web Search Professionals will set up Marketing VIP around your brand, connect your workflow, and help you publish consistent, brand-aligned marketing every month.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <PrimaryButton href="/login">Sign in to Marketing VIP</PrimaryButton>
            <SecondaryButton href="https://www.web-search-pros.com/contact-us/">
              Book Your Setup Call
            </SecondaryButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d9edf8] bg-white px-6 py-10 sm:px-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/wsp-logo.png"
            alt="Web Search Professionals"
            width={220}
            height={74}
            className="h-auto w-[200px]"
          />
          <p className="text-sm font-semibold text-slate-500">
            AI-first marketing systems for growth-focused service businesses.
          </p>
        </div>
      </footer>
    </main>
  );
}
