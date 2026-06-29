import Link from "next/link";
import styles from "./page.module.css";

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
    description:
      "Create trust-building content that explains expertise clearly and consistently.",
  },
  {
    title: "Home Services",
    description:
      "Turn seasonal needs, local proof, and service offers into steady monthly campaigns.",
  },
  {
    title: "Healthcare + Wellness",
    description:
      "Maintain consistent voice and careful message control across every channel.",
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
    description:
      "Support consistent brand messaging across locations and local markets.",
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

const scoreRows = [
  ["Brand Voice Alignment", 92],
  ["Message Clarity", 86],
  ["Audience Fit", 88],
  ["Channel Fit", 90],
  ["CTA Strength", 78],
  ["Publish Readiness", 91],
] as const;

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" aria-label="Web Search Professionals home">
            <img className={styles.logo} src="/wsp-logo.png" alt="Web Search Professionals" />
          </Link>

          <nav className={styles.nav} aria-label="Marketing VIP sections">
            <a href="#how-it-works">How It Works</a>
            <a href="#included">What&apos;s Included</a>
            <a href="#score">VIP Content Score</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <Link href="/login" className={styles.headerCta}>
            Sign in
          </Link>
        </div>
      </header>

      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Managed AI Marketing Platform</p>
            <h1 className={styles.heroTitle}>Your AI marketing team in a box</h1>
            <p className={styles.lead}>
              Marketing VIP is a managed AI marketing platform from Web Search Professionals
              that plans, creates, scores, approves, and helps publish brand-aligned marketing
              content for your business every month.
            </p>
            <p className={styles.bodyText}>
              We set up the system, connect the workflow, organize your brand inputs, and give
              your team a clear path from monthly strategy to publish-ready content.
            </p>

            <div className={styles.buttonRow}>
              <Link href="https://www.web-search-pros.com/contact-us/" className={styles.primaryButton}>
                Book Your Setup Call
              </Link>
              <Link href="/login" className={styles.secondaryButton}>
                Enter Marketing VIP
              </Link>
            </div>

            <div className={styles.pillRow}>
              <span className={styles.pill}>✓ One setup</span>
              <span className={styles.pill}>✓ One platform</span>
              <span className={styles.pill}>✓ One monthly workflow</span>
            </div>
          </div>

          <aside className={styles.workflowPanel} aria-label="Marketing VIP workflow preview">
            <p className={styles.panelLabel}>Marketing VIP Workflow</p>
            <h2 className={styles.panelTitle}>From brand inputs to approved content</h2>
            <div className={styles.workflowList}>
              {workflowSteps.slice(0, 5).map((step) => (
                <div key={step.number} className={styles.workflowMini}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.sectionSoft}>
        <div className={styles.sectionInner}>
          <div>
            <p className={styles.eyebrow}>The real problem</p>
            <h2 className={`${styles.sectionTitle} ${styles.wideTitle}`}>
              AI content is easy. On-brand marketing execution is not.
            </h2>
          </div>

          <div className={styles.cardGrid3}>
            {[
              [
                "✦",
                "You do not need more random drafts",
                "Most AI tools create content, but they still leave you with planning, editing, approvals, and publishing.",
              ],
              [
                "↻",
                "Your business needs consistency",
                "Social, blog, email, and video work best when they follow one strategy and one recognizable brand voice.",
              ],
              [
                "✓",
                "You need confidence before publishing",
                "Marketing VIP checks each asset against approved brand inputs before it moves toward publishing.",
              ],
            ].map(([icon, title, description]) => (
              <article key={title} className={styles.card}>
                <span className={styles.cardIcon}>{icon}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={styles.sectionWhite}>
        <div className={`${styles.twoColumn} ${styles.twoColumnReverse}`}>
          <div className={styles.workflowLarge}>
            <div className={styles.workflowGrid}>
              {workflowSteps.map((step) => (
                <article key={step.number} className={styles.workflowCard}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <p className={styles.eyebrow}>How it works</p>
            <h2 className={`${styles.sectionTitle} ${styles.wideTitle}`}>
              From brand inputs to published marketing in one guided workflow
            </h2>
            <p className={styles.bodyText}>
              The workflow is intentionally structured: strategy first, content second,
              quality review before approval, and publishing only after the team has confidence.
            </p>
          </div>
        </div>
      </section>

      <section id="score" className={styles.sectionBlueTint}>
        <div className={styles.twoColumn}>
          <div>
            <p className={styles.eyebrow}>VIP Content Score</p>
            <h2 className={styles.sectionTitle}>Every asset is scored before it goes live</h2>
            <p className={styles.bodyText}>
              Marketing VIP does not score your brand. Your brand inputs become the standard.
              The platform scores content against your voice, audience, message, offer, CTA,
              channel, and campaign goal.
            </p>
            <div className={styles.buttonRow}>
              <Link href="https://www.web-search-pros.com/contact-us/" className={styles.primaryButton}>
                Request a VIP Content Audit
              </Link>
            </div>
          </div>

          <aside className={styles.scorePanel}>
            <div className={styles.scoreHeader}>
              <div>
                <p className={styles.panelLabel}>Publish readiness</p>
                <p className={styles.scoreNumber}>87</p>
              </div>
              <p className={styles.scoreTotal}>/ 100</p>
            </div>

            <div className={styles.scoreRows}>
              {scoreRows.map(([label, value]) => (
                <div key={label}>
                  <div className={styles.scoreLabel}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className={styles.callout}>
              Suggested improvement: make the CTA more specific by replacing “Learn more” with
              “Book your free consultation this week.”
            </p>
          </aside>
        </div>
      </section>

      <section id="included" className={styles.sectionWhite}>
        <div className={styles.sectionInner}>
          <p className={styles.eyebrow}>What&apos;s included</p>
          <h2 className={`${styles.sectionTitle} ${styles.wideTitle}`}>
            Everything your monthly marketing needs, in one managed platform
          </h2>

          <div className={styles.includedGrid}>
            {includedItems.map((item) => (
              <div key={item} className={styles.includedItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className={styles.sectionSoft}>
        <div className={styles.twoColumn}>
          <div>
            <p className={styles.eyebrow}>Simple pricing</p>
            <h2 className={styles.sectionTitle}>One platform. One setup. One monthly price.</h2>
            <p className={styles.bodyText}>
              Web Search Professionals sets up the system, configures the workflow, calibrates
              the score, and helps your business run a consistent monthly marketing engine.
            </p>
          </div>

          <article className={styles.priceCard}>
            <h3>Marketing VIP Managed Platform</h3>
            <p className={styles.priceValue}>$2,500</p>
            <p className={styles.priceLabel}>one-time setup</p>
            <div className={styles.divider} />
            <p className={styles.priceValue}>$799</p>
            <p className={styles.priceLabel}>per month</p>
            <ul>
              <li>✓ Brand input workshop and platform configuration</li>
              <li>✓ Monthly strategy, calendar, and asset generation</li>
              <li>✓ Quality scoring, approval workflow, and publishing support</li>
            </ul>
            <Link href="https://www.web-search-pros.com/contact-us/" className={styles.fullButton}>
              Book Your Setup Call
            </Link>
          </article>
        </div>
      </section>

      <section className={styles.sectionWhite}>
        <div className={styles.twoColumn}>
          <div>
            <p className={styles.eyebrow}>Authority content add-on</p>
            <h2 className={styles.sectionTitle}>What-If Papers for authority-building content</h2>
            <p className={styles.bodyText}>
              Marketing VIP can create short hypothetical mini case studies your business can
              share with prospects. They explain realistic situations and make your value easier
              to understand.
            </p>
          </div>

          <div className={styles.cardGrid1}>
            {[
              ["Mini case-study format", "A clear hypothetical scenario that helps prospects visualize a better outcome."],
              ["No client data required", "Create persuasive authority content without revealing private client information."],
              ["Sales-ready asset", "Use What-If Papers in email follow-up, proposals, landing pages, and sales conversations."],
            ].map(([title, description]) => (
              <article key={title} className={styles.card}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionBlueTint}>
        <div className={styles.sectionInner}>
          <p className={styles.eyebrow}>Comparison</p>
          <h2 className={styles.sectionTitle}>Not another AI writing tool</h2>

          <div className={styles.cardGrid2}>
            <article className={styles.compareCard}>
              <h3>Typical AI Tools</h3>
              <ul>
                <li>Generate individual pieces of content</li>
                <li>Require manual prompting</li>
                <li>Do not connect strategy to publishing</li>
                <li>Leave editing and approvals to you</li>
                <li>Often create generic content</li>
              </ul>
            </article>
            <article className={`${styles.compareCard} ${styles.highlight}`}>
              <h3>Marketing VIP</h3>
              <ul>
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

      <section className={styles.sectionWhite}>
        <div className={styles.sectionInner}>
          <p className={styles.eyebrow}>Use cases</p>
          <h2 className={`${styles.sectionTitle} ${styles.wideTitle}`}>
            Built for service businesses that need consistent marketing
          </h2>

          <div className={styles.useCaseGrid}>
            {useCases.map((item) => (
              <article key={item.title} className={styles.useCaseCard}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className={styles.sectionBlueTint}>
        <div className={styles.faqGrid}>
          <div>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 className={styles.sectionTitle}>Questions before we set it up?</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((item) => (
              <article key={item.question} className={styles.faqCard}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionWhite}>
        <div className={styles.sectionInner}>
          <div className={styles.finalCta}>
            <h2 className={styles.ctaTitle}>Ready to build your AI marketing team in a box?</h2>
            <p className={`${styles.bodyText} ${styles.centerText}`}>
              Web Search Professionals will set up Marketing VIP around your brand, connect your
              workflow, and help you publish consistent, brand-aligned marketing every month.
            </p>
            <div className={styles.buttonRow} style={{ justifyContent: "center" }}>
              <Link href="https://www.web-search-pros.com/contact-us/" className={styles.primaryButton}>
                Book Your Setup Call
              </Link>
              <Link href="/login" className={styles.secondaryButton}>
                Sign in to Marketing VIP
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <img className={styles.footerLogo} src="/wsp-logo.png" alt="Web Search Professionals" />
          <p>AI-first marketing systems for growth-focused service businesses.</p>
        </div>
      </footer>
    </main>
  );
}
