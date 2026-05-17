export const COMMERCIAL_SERVICE_LINES = [
  {
    name: "AIO — AI Optimization",
    short_name: "AIO",
    description:
      "Help businesses improve how they appear in AI-generated answers, AI search experiences, and emerging answer engines.",
    primary_outcome:
      "Increase visibility where prospects are using AI tools to research vendors and solutions.",
    sort_order: 10,
  },
  {
    name: "SEO — Search Engine Optimization",
    short_name: "SEO",
    description:
      "Improve organic search visibility, keyword positioning, technical health, and content relevance.",
    primary_outcome:
      "Grow qualified organic traffic and improve the business's ability to be found online.",
    sort_order: 20,
  },
  {
    name: "Web Development",
    short_name: "Web",
    description:
      "Build or improve websites so they are faster, clearer, more useful, and easier to convert.",
    primary_outcome:
      "Create a stronger website that builds trust and turns visitors into sales conversations.",
    sort_order: 30,
  },
  {
    name: "Content Creation",
    short_name: "Content",
    description:
      "Create strategic content for websites, blogs, emails, social posts, videos, and campaigns.",
    primary_outcome:
      "Build authority, educate prospects, and support consistent lead generation.",
    sort_order: 40,
  },
  {
    name: "Performance Marketing / Paid Ads",
    short_name: "Paid Ads",
    description:
      "Plan, launch, and improve paid campaigns focused on measurable business outcomes.",
    primary_outcome:
      "Generate qualified traffic, leads, and sales opportunities with clearer campaign tracking.",
    sort_order: 50,
  },
  {
    name: "Marketing Automation",
    short_name: "Automation",
    description:
      "Create follow-up systems, campaign workflows, email sequences, and automation processes.",
    primary_outcome:
      "Reduce manual follow-up and keep prospects moving toward the next sales step.",
    sort_order: 60,
  },
  {
    name: "Local Visibility / Local SEO",
    short_name: "Local SEO",
    description:
      "Improve local search visibility, local listings, Google Business Profile presence, and nearby discovery.",
    primary_outcome:
      "Help local prospects find and trust the business when they are ready to buy.",
    sort_order: 70,
  },
  {
    name: "Website Health, Speed, and Conversion Improvements",
    short_name: "Website Health",
    description:
      "Audit and improve site performance, technical issues, user experience, speed, and conversion paths.",
    primary_outcome:
      "Make the website faster, clearer, and more likely to convert visitors into leads.",
    sort_order: 80,
  },
];

export const COMMERCIAL_BUYER_SEGMENTS = [
  {
    name: "Contractors",
    description:
      "Residential and commercial contractors who need consistent local visibility, trust-building content, and better lead flow.",
    common_pains: [
      "Inconsistent lead flow",
      "Weak local search visibility",
      "Website does not clearly explain services",
      "Too much dependence on referrals",
      "Difficulty standing out from other contractors",
    ],
    desired_outcomes: [
      "More qualified local leads",
      "Better Google visibility",
      "Clearer service pages",
      "More estimate requests",
      "A website that builds trust quickly",
    ],
    objections: [
      "I already get referrals",
      "Marketing has not worked before",
      "I do not have time to manage content",
      "I am not sure what SEO actually does",
    ],
    sort_order: 10,
  },
  {
    name: "Mid-sized manufacturers",
    description:
      "Manufacturers that need better digital visibility, clearer capabilities messaging, and stronger lead generation from technical buyers.",
    common_pains: [
      "Website does not explain capabilities clearly",
      "Hard to generate qualified RFQs online",
      "Outdated content",
      "Limited visibility for specialized services",
      "Sales process depends heavily on existing relationships",
    ],
    desired_outcomes: [
      "More qualified RFQs",
      "Clearer capabilities pages",
      "Better visibility for niche services",
      "Stronger credibility with buyers",
      "Better support for sales teams",
    ],
    objections: [
      "Our buyers already know us",
      "Our industry is too technical",
      "We do not need social media",
      "Marketing feels hard to measure",
    ],
    sort_order: 20,
  },
  {
    name: "Machine shops",
    description:
      "Precision machining and fabrication businesses that need to show capabilities, quality, industries served, and technical credibility.",
    common_pains: [
      "Low online visibility for machining services",
      "Website does not show equipment or capabilities well",
      "Not enough qualified quote requests",
      "Hard to differentiate from other shops",
      "Technical buyers need proof before contacting",
    ],
    desired_outcomes: [
      "More quote requests",
      "Better capabilities presentation",
      "More visibility for specialized machining",
      "Clearer proof of quality and experience",
      "Better fit leads",
    ],
    objections: [
      "We are already busy",
      "Most work comes from relationships",
      "Our services are too specialized for marketing",
      "We do not have time to create content",
    ],
    sort_order: 30,
  },
  {
    name: "Dental practices",
    description:
      "Dental offices that need stronger local search presence, patient trust, service visibility, and appointment generation.",
    common_pains: [
      "Competition from nearby practices",
      "Not enough new patient appointments",
      "Weak visibility for high-value services",
      "Website feels outdated",
      "Reviews and local presence are inconsistent",
    ],
    desired_outcomes: [
      "More new patient calls",
      "Better local search visibility",
      "Improved trust with prospective patients",
      "More visibility for implants, cosmetic, and specialty services",
      "Clearer appointment CTAs",
    ],
    objections: [
      "We already have a website",
      "We tried SEO before",
      "We rely on patient referrals",
      "We are cautious about marketing claims",
    ],
    sort_order: 40,
  },
  {
    name: "Legal firms",
    description:
      "Law firms that need local visibility, practice area authority, trust-building content, and qualified consultation requests.",
    common_pains: [
      "Competitive local search results",
      "Weak practice area pages",
      "Not enough qualified consultation requests",
      "Difficulty communicating expertise clearly",
      "Content sounds generic or overly legalistic",
    ],
    desired_outcomes: [
      "More qualified consultations",
      "Better local visibility",
      "Stronger practice area authority",
      "Clearer website messaging",
      "More trust before the first call",
    ],
    objections: [
      "Legal marketing must be careful",
      "We do not want generic content",
      "We have tried agencies before",
      "It is hard to measure quality of leads",
    ],
    sort_order: 50,
  },
];

export const COMMERCIAL_OFFERS = [
  {
    name: "AI Visibility Audit",
    service_line_name: "AIO — AI Optimization",
    description:
      "A focused audit showing how a business appears across AI search, answer engines, organic search signals, and website authority indicators.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "audit",
    primary_cta: "Book an AI Visibility Audit",
    outcome:
      "Give the business a clear picture of how visible and credible it is in AI-assisted discovery.",
    price_notes: "Position as an entry-point audit that can lead to a project or monthly retainer.",
  },
  {
    name: "Local Visibility Booster",
    service_line_name: "Local Visibility / Local SEO",
    description:
      "A local search improvement package focused on Google Business Profile, local pages, citations, reviews, and nearby search visibility.",
    target_buyer_segments: ["Contractors", "Dental practices", "Legal firms"],
    offer_type: "project",
    primary_cta: "Improve Local Visibility",
    outcome:
      "Help local buyers find, trust, and contact the business when they are ready to act.",
    price_notes: "Good fit as a project with optional monthly local SEO support.",
  },
  {
    name: "Website Health and Speed Pack",
    service_line_name: "Website Health, Speed, and Conversion Improvements",
    description:
      "A practical website improvement package focused on speed, technical health, user experience, clarity, and conversion paths.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "project",
    primary_cta: "Run a Website Health Check",
    outcome:
      "Make the website faster, clearer, and more effective at turning visitors into leads.",
    price_notes: "Strong diagnostic offer before larger website or SEO work.",
  },
  {
    name: "Lead Gen Accelerator",
    service_line_name: "Performance Marketing / Paid Ads",
    description:
      "A campaign package for generating qualified leads through paid traffic, landing pages, conversion tracking, and follow-up strategy.",
    target_buyer_segments: ["Contractors", "Dental practices", "Legal firms"],
    offer_type: "hybrid",
    primary_cta: "Launch a Lead Gen Campaign",
    outcome:
      "Create a measurable campaign system that drives qualified inquiries and sales conversations.",
    price_notes: "Can be sold as a campaign setup plus ongoing management.",
  },
  {
    name: "Authority Content Engine",
    service_line_name: "Content Creation",
    description:
      "A content system for service pages, blog posts, social posts, emails, and video scripts that build authority and trust.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "retainer",
    primary_cta: "Build an Authority Content Plan",
    outcome:
      "Create consistent educational content that supports SEO, AI visibility, trust, and sales follow-up.",
    price_notes: "Best positioned as a monthly content retainer.",
  },
  {
    name: "SEO Growth Retainer",
    service_line_name: "SEO — Search Engine Optimization",
    description:
      "A monthly SEO improvement program focused on technical SEO, content, rankings, visibility, and conversion support.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "retainer",
    primary_cta: "Start an SEO Growth Plan",
    outcome:
      "Improve search visibility and create a steady foundation for organic lead generation.",
    price_notes: "Monthly retainer with clear reporting and priorities.",
  },
  {
    name: "Website Conversion Sprint",
    service_line_name: "Web Development",
    description:
      "A focused sprint to improve website messaging, layout, calls-to-action, service pages, and conversion flow.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "project",
    primary_cta: "Improve Website Conversions",
    outcome:
      "Make the website clearer, more persuasive, and more likely to generate qualified leads.",
    price_notes: "Great project offer before a full rebuild or ongoing marketing retainer.",
  },
  {
    name: "Marketing Automation Starter",
    service_line_name: "Marketing Automation",
    description:
      "A starter automation package for lead follow-up, email sequences, internal notifications, and simple sales workflow support.",
    target_buyer_segments: [
      "Contractors",
      "Mid-sized manufacturers",
      "Machine shops",
      "Dental practices",
      "Legal firms",
    ],
    offer_type: "project",
    primary_cta: "Set Up Marketing Automation",
    outcome:
      "Help the business respond faster, follow up consistently, and reduce missed opportunities.",
    price_notes: "Can lead into ongoing automation support.",
  },
] as const;
