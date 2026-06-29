import Link from "next/link";

const workflowSteps = [
  {
    number: "01",
    title: "Brand Input Setup",
    description:
      "Voice, audience, services, offers, proof points, tone, and publishing rules become the foundation for every asset.",
  },
  {
    number: "02",
    title: "Strategy + Messages",
    description:
      "Campaign themes, key messages, channel priorities, and monthly goals are organized before content is created.",
  },
  {
    number: "03",
    title: "Monthly Plan",
    description:
      "A structured content calendar keeps blog, social, email, video, and authority assets moving together.",
  },
  {
    number: "04",
    title: "Content Creation",
    description:
      "Posts, emails, blogs, scripts, captions, hooks, and CTAs are generated from approved brand inputs.",
  },
  {
    number: "05",
    title: "VIP Content Score",
    description:
      "Each asset is checked against voice, audience fit, message clarity, CTA strength, and publish readiness.",
  },
  {
    number: "06",
    title: "Approval + Publishing",
    description:
      "Review, revise, approve, schedule, and publish from one guided workspace-aware workflow.",
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

const faqs = [
  {
    question: "Is Marketing VIP just another AI writing tool?",
    answer:
      "No. Marketing VIP is built around strategy, brand inputs, quality review, approval, and publishing. It is closer to a managed marketing operating system than a blank AI prompt box.",
  },
  {
    question: "Does content publish automatically?",
    answer:
      "The workflow is approval-first. Assets can be reviewed, revised, approved, scheduled, and sent through publishing controls before they go live.",
  },
  {
    question: "Who is this best for?",
    answer:
      "Marketing VIP is designed for growth-focused service businesses that need consistent content but do not want to hire or manage a full internal marketing team.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-[92%] max-w-[76rem] items-center justify-between gap-6 py-5">
          <Link href="/" className="flex items-center gap-4">
            <img
              src="/wsp-logo.png"
              alt="Web Search Professionals"
              className="h-14 w-auto max-w-[48vw] object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-black text-slate-700 lg:flex">
            <a href="#how-it-works" className="transition hover:text-[#0b4a7a]">
              How It Works
            </a>
            <a href="#included" className="transition hover:text-[#0b4a7a]">
              What&apos;s Included
            </a>
            <a href="#score" className="transition hover:text-[#0b4a7a]">
              VIP Content Score
            </a>
            <a href="#pricing" className="transition hover:text-[#0b4a7a]">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-[#0b4a7a]">
              FAQ
            </a>
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#0b4a7a] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0b4a7a]/15 transition hover:-translate-y-0.5 hover:bg-[#083b62]"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="bg-white">
        <div className="mx-auto grid w-[92%] max-w-[76rem] items-center gap-[8%] py-[clamp(4rem,9vw,8rem)] lg:grid-cols-[52%_40%]">
          <div>
            <p className="inline-flex rounded-full border border-[#cfe3f6] bg-[#eef7ff] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0b4a7a]">
              Managed AI Marketing Platform
            </p>
            <h1 className="mt-8 max-w-[12ch] text-[clamp(3rem,8vw,6.8rem)] font-black leading-[0.93] tracking-[-0.06em] text-slate-950">
              Your AI marketing team in a box
            </h1>
            <p className="mt-8 max-w-[46rem] text-[clamp(1.1rem,2vw,1.35rem)] font-semibold leading-9 text-slate-700">
              Marketing VIP is a managed AI marketing platform from Web Search Professionals that plans, creates, scores, approves, and helps publish brand-aligned marketing content for your business every month.
            </p>
            <p className="mt-5 max-w-[44rem] text-base font-medium leading-8 text-slate-600">
              We set it up, connect your channels, generate your marketing, score every asset against your brand inputs, and give your team a guided path from monthly strategy to publish-ready content.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="https://www.web-search-pros.com/contact-us/"
                className="inline-flex items-center justify-center rounded-full bg-[#0b4a7a] px-8 py-4 text-base font-black text-white shadow-xl shadow-[#0b4a7a]/20 transition hover:-translate-y-0.5 hover:bg-[#083b62]"
              >
                Book Your Setup Call
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[#0b4a7a]/20 bg-white px-8 py-4 text-base font-black text-[#0b4a7a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b4a7a]/40 hover:bg-[#eef7ff]"
              >
                Enter Marketing VIP
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm font-black text-slate-700">
              <span className="rounded-full bg-[#eef7ff] px-4 py-2">✓ One setup</span>
              <span className="rounded-full bg-[#eef7ff] px-4 py-2">✓ One platform</span>
              <span className="rounded-full bg-[#eef7ff] px-4 py-2">✓ One monthly workflow</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dbeaf7] bg-[#f7fbff] p-[clamp(1.25rem,3vw,2.5rem)] shadow-2xl shadow-slate-200/70">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">
              Marketing VIP Workflow
            </p>
            <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.5rem)] font-black leading-tight text-slate-950">
              Brand inputs to approved content
            </h2>
            <div className="mt-8 space-y-4">
              {workflowSteps.slice(0, 5).map((step) => (
                <div key={step.number} className="flex gap-4 rounded-3xl border border-[#dbeaf7] bg-white p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5b642] text-sm font-black text-slate-950">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbeaf7] bg-[#eef7ff]">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="max-w-[48rem]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">The real problem</p>
            <h2 className="mt-4 text-[clamp(2.3rem,5vw,4.5rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              AI content is easy. On-brand marketing execution is not.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ["You do not need more random drafts", "Most AI tools create content, but they still leave you with planning, editing, approvals, and publishing."],
              ["Your business needs consistency", "Social, blog, email, and video work best when they follow one strategy and one brand voice."],
              ["You need confidence before publishing", "Marketing VIP checks each asset against approved brand inputs before it moves toward publishing."],
            ].map(([title, description], index) => (
              <article key={title} className="rounded-[2rem] border border-[#dbeaf7] bg-white p-[clamp(1.5rem,3vw,2.5rem)] shadow-xl shadow-slate-200/60">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef7ff] text-lg font-black text-[#0b4a7a]">
                  {index + 1}
                </span>
                <h3 className="mt-7 text-2xl font-black text-slate-950">{title}</h3>
                <p className="mt-4 text-base font-medium leading-8 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="grid gap-[8%] lg:grid-cols-[38%_54%]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">How it works</p>
              <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
                From brand inputs to published marketing in one guided workflow
              </h2>
              <p className="mt-6 text-base font-medium leading-8 text-slate-600">
                The system is intentionally structured: strategy first, content second, quality review before approval, and publishing only after the team has confidence.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {workflowSteps.map((step) => (
                <article key={step.number} className="rounded-[1.75rem] border border-[#dbeaf7] bg-[#f7fbff] p-6">
                  <span className="text-sm font-black text-[#0b4a7a]">{step.number}</span>
                  <h3 className="mt-4 text-xl font-black text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="score" className="bg-[#f7fbff]">
        <div className="mx-auto grid w-[92%] max-w-[76rem] items-center gap-[8%] py-[clamp(4rem,8vw,7rem)] lg:grid-cols-[48%_44%]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">VIP Content Score</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Every asset is scored before it goes live
            </h2>
            <p className="mt-6 text-base font-medium leading-8 text-slate-600">
              Marketing VIP does not score your brand. Your brand inputs become the standard. The platform scores content against your voice, audience, message, offer, CTA, channel, and campaign goal.
            </p>
            <Link
              href="https://www.web-search-pros.com/contact-us/"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#0b4a7a] px-7 py-4 text-base font-black text-white shadow-lg shadow-[#0b4a7a]/15 transition hover:-translate-y-0.5 hover:bg-[#083b62]"
            >
              Request a VIP Content Audit
            </Link>
          </div>

          <div className="rounded-[2rem] border border-[#dbeaf7] bg-white p-[clamp(1.5rem,3vw,2.75rem)] shadow-2xl shadow-slate-200/70">
            <div className="flex items-end justify-between gap-5 border-b border-slate-200 pb-6">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0b4a7a]">Publish readiness</p>
                <p className="mt-2 text-6xl font-black tracking-[-0.06em] text-slate-950">87</p>
              </div>
              <p className="pb-2 text-2xl font-black text-slate-400">/ 100</p>
            </div>
            <div className="mt-6 space-y-5">
              {[
                ["Brand Voice Alignment", "92"],
                ["Message Clarity", "86"],
                ["Audience Fit", "88"],
                ["Channel Fit", "90"],
                ["CTA Strength", "78"],
                ["Publish Readiness", "91"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between gap-4 text-sm font-black text-slate-700">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-full bg-slate-100">
                    <div className="h-3 rounded-full bg-[#f5b642]" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-7 rounded-3xl border border-[#f5e1aa] bg-[#fff8e8] p-5 text-sm font-semibold leading-7 text-slate-700">
              Suggested improvement: make the CTA more specific by replacing “Learn more” with “Book your free consultation this week.”
            </p>
          </div>
        </div>
      </section>

      <section id="included" className="bg-white">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="max-w-[50rem]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">What&apos;s included</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Everything your monthly marketing needs, in one managed platform
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {includedItems.map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-3xl border border-[#dbeaf7] bg-[#f7fbff] p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b4a7a] text-sm font-black text-white">
                  ✓
                </span>
                <span className="font-black text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-[#dbeaf7] bg-[#eef7ff]">
        <div className="mx-auto grid w-[92%] max-w-[76rem] gap-[8%] py-[clamp(4rem,8vw,7rem)] lg:grid-cols-[44%_48%]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">Simple pricing</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              One platform. One setup. One monthly price.
            </h2>
            <p className="mt-6 text-base font-medium leading-8 text-slate-600">
              Web Search Professionals sets up the system, configures the workflow, calibrates the score, and helps your business run a consistent monthly marketing engine.
            </p>
          </div>
          <article className="rounded-[2rem] border border-[#dbeaf7] bg-white p-[clamp(1.5rem,3vw,2.75rem)] shadow-2xl shadow-slate-200/70">
            <h3 className="text-2xl font-black text-slate-950">Marketing VIP Managed Platform</h3>
            <p className="mt-5 text-5xl font-black tracking-[-0.05em] text-slate-950">$2,500</p>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-[#0b4a7a]">one-time setup</p>
            <div className="my-8 h-px bg-slate-200" />
            <p className="text-5xl font-black tracking-[-0.05em] text-slate-950">$799</p>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-[#0b4a7a]">per month</p>
            <ul className="mt-8 grid gap-3 text-sm font-semibold leading-7 text-slate-700">
              <li>✓ Brand input workshop and platform configuration</li>
              <li>✓ Monthly strategy, calendar, and asset generation</li>
              <li>✓ Quality scoring, approval workflow, and publishing support</li>
            </ul>
            <Link
              href="https://www.web-search-pros.com/contact-us/"
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#0b4a7a] px-7 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#083b62]"
            >
              Book Your Setup Call
            </Link>
          </article>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid w-[92%] max-w-[76rem] gap-[8%] py-[clamp(4rem,8vw,7rem)] lg:grid-cols-[48%_44%]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">Authority content add-on</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              What-If Papers for authority-building content
            </h2>
            <p className="mt-6 text-base font-medium leading-8 text-slate-600">
              Marketing VIP can create short hypothetical mini case studies your business can share with prospects. They help explain a realistic situation, show what could happen with the right strategy, and make your value easier to understand.
            </p>
          </div>
          <div className="grid gap-5">
            {[
              ["Mini case-study format", "A clear hypothetical scenario that helps prospects visualize a better outcome."],
              ["No client data required", "Create persuasive authority content without revealing private client information."],
              ["Sales-ready asset", "Use What-If Papers in email follow-up, proposals, landing pages, and sales conversations."],
            ].map(([title, description]) => (
              <article key={title} className="rounded-[1.75rem] border border-[#dbeaf7] bg-[#f7fbff] p-6">
                <h3 className="text-xl font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7fbff]">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="max-w-[50rem]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">Comparison</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Not another AI writing tool
            </h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-[clamp(1.5rem,3vw,2.5rem)]">
              <h3 className="text-2xl font-black text-slate-950">Typical AI Tools</h3>
              <ul className="mt-6 space-y-4 text-base font-semibold leading-8 text-slate-600">
                <li>Generate individual pieces of content</li>
                <li>Require manual prompting</li>
                <li>Do not connect strategy to publishing</li>
                <li>Leave editing and approvals to you</li>
                <li>Often create generic content</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-[#cfe3f6] bg-white p-[clamp(1.5rem,3vw,2.5rem)] shadow-2xl shadow-slate-200/60">
              <h3 className="text-2xl font-black text-[#0b4a7a]">Marketing VIP</h3>
              <ul className="mt-6 space-y-4 text-base font-semibold leading-8 text-slate-700">
                <li>✓ Builds a monthly marketing system</li>
                <li>✓ Starts from your brand inputs</li>
                <li>✓ Creates strategy, content, and campaigns</li>
                <li>✓ Scores each asset before publishing</li>
                <li>✓ Connects approval and publishing workflows</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="max-w-[48rem]">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">Use cases</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Built for service businesses that need consistent marketing
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="rounded-[1.75rem] border border-[#dbeaf7] bg-[#f7fbff] p-6">
                <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f7fbff]">
        <div className="mx-auto grid w-[92%] max-w-[76rem] gap-[8%] py-[clamp(4rem,8vw,7rem)] lg:grid-cols-[38%_54%]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0b4a7a]">FAQ</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.25rem)] font-black leading-tight tracking-[-0.04em] text-slate-950">
              Questions before we set it up?
            </h2>
          </div>
          <div className="space-y-5">
            {faqs.map((item) => (
              <article key={item.question} className="rounded-[1.75rem] border border-[#dbeaf7] bg-white p-6">
                <h3 className="text-xl font-black text-slate-950">{item.question}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-[92%] max-w-[76rem] py-[clamp(4rem,8vw,7rem)]">
          <div className="rounded-[2.5rem] border border-[#dbeaf7] bg-[#eef7ff] p-[clamp(2rem,5vw,4rem)] text-center shadow-2xl shadow-slate-200/60">
            <h2 className="mx-auto max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)] font-black leading-tight tracking-[-0.05em] text-slate-950">
              Ready to build your AI marketing team in a box?
            </h2>
            <p className="mx-auto mt-6 max-w-[45rem] text-base font-medium leading-8 text-slate-600">
              Web Search Professionals will set up Marketing VIP around your brand, connect your workflow, and help you publish consistent, brand-aligned marketing every month.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="https://www.web-search-pros.com/contact-us/"
                className="inline-flex items-center justify-center rounded-full bg-[#0b4a7a] px-8 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#083b62]"
              >
                Book Your Setup Call
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[#0b4a7a]/20 bg-white px-8 py-4 text-base font-black text-[#0b4a7a] transition hover:-translate-y-0.5 hover:border-[#0b4a7a]/40"
              >
                Sign in to Marketing VIP
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-[92%] max-w-[76rem] flex-col gap-5 py-10 text-sm font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
          <img src="/wsp-logo.png" alt="Web Search Professionals" className="h-12 w-auto object-contain" />
          <p>AI-first marketing systems for growth-focused service businesses.</p>
        </div>
      </footer>
    </main>
  );
}
