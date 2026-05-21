import { redirect } from "next/navigation";
import { CalendarItemStatusForm } from "@/components/content-calendar/CalendarItemStatusForm";
import { GenerateMonthlyPlanForm } from "@/components/content-calendar/GenerateMonthlyPlanForm";
import {
  WebsiteBadge,
  WebsiteHero,
  WebsiteMetric,
  WebsitePage,
  WebsiteSection,
  websiteStyles,
} from "@/components/website-ui/WebsitePage";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function itemTypeLabel(value: string | null | undefined) {
  return String(value ?? "other").replaceAll("_", " ");
}

export default async function ContentCalendarPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: plansData } = await supabase
    .from("content_calendar_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("plan_month", { ascending: false })
    .limit(6);

  const plans = (plansData ?? []) as Array<Record<string, any>>;
  const activePlan = plans[0] ?? null;

  const { data: itemsData } = activePlan
    ? await supabase
        .from("content_calendar_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_id", activePlan.id)
        .order("scheduled_date", { ascending: true })
    : { data: [] };

  const items = (itemsData ?? []) as Array<Record<string, any>>;
  const campaigns = items.filter((item) => item.item_type === "weekly_campaign").length;
  const planned = items.filter((item) => item.status === "planned").length;
  const approved = items.filter((item) => item.status === "approved").length;
  const published = items.filter((item) => item.status === "published").length;

  const itemsByWeek = new Map<number, Array<Record<string, any>>>();

  for (const item of items) {
    const week = Number(item.week_number ?? 1);
    const existing = itemsByWeek.get(week) ?? [];
    existing.push(item);
    itemsByWeek.set(week, existing);
  }

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Strategic Content Calendar"
        title="Plan the month before creating the assets."
        description="Generate one distinct campaign per week, then use the calendar to feed blog posts, authority content, social posts, video concepts, outreach, and What-If Stories."
        primaryAction={{ label: "Generate Plan", href: "#generate-plan" }}
        secondaryAction={{ label: "Review Assets", href: "/approvals" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Active Plan"
          value={activePlan?.month_label ?? "None"}
          description={activePlan?.monthly_theme ?? "Generate a monthly plan to begin."}
          dot="blue"
        />
        <WebsiteMetric
          label="Weekly Campaigns"
          value={campaigns}
          description="One distinct campaign per week."
          dot="gold"
        />
        <WebsiteMetric
          label="Planned Items"
          value={planned}
          description="Content waiting to be created."
          dot="purple"
        />
        <WebsiteMetric
          label="Published"
          value={published}
          description="Content marked as published."
          dot="green"
        />
      </section>

      <div id="generate-plan">
        <GenerateMonthlyPlanForm />
      </div>

      {activePlan ? (
        <WebsiteSection
          eyebrow={activePlan.month_label}
          title={activePlan.monthly_theme}
          description="This is the current monthly strategic plan. Each week has a campaign theme and supporting content items."
        >
          <div className={websiteStyles.cardGrid}>
            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>Business goal</h3>
              <p className={websiteStyles.cardText}>
                {activePlan.business_goal ?? "No business goal provided."}
              </p>
            </article>

            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>Audience</h3>
              <p className={websiteStyles.cardText}>
                {activePlan.target_audience ?? "No audience provided."}
              </p>
            </article>

            <article className={websiteStyles.card}>
              <h3 className={websiteStyles.cardTitle}>Offer focus</h3>
              <p className={websiteStyles.cardText}>
                {activePlan.offer_focus ?? "No offer focus provided."}
              </p>
            </article>
          </div>
        </WebsiteSection>
      ) : null}

      <WebsiteSection
        eyebrow="Calendar"
        title="Monthly content plan"
        description="Review and update planned content items by week. The next sprint will turn these items into real generated assets."
      >
        {items.length ? (
          <div className={websiteStyles.cardGrid}>
            {[1, 2, 3, 4].map((weekNumber) => {
              const weekItems = itemsByWeek.get(weekNumber) ?? [];

              return (
                <article key={weekNumber} className={websiteStyles.card}>
                  <h3 className={websiteStyles.cardTitle}>Week {weekNumber}</h3>
                  <p className={websiteStyles.cardMeta}>
                    {weekItems.length} planned item{weekItems.length === 1 ? "" : "s"}
                  </p>

                  <div className="grid gap-3">
                    {weekItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                      >
                        <div className="mb-2 flex flex-wrap gap-2">
                          <WebsiteBadge status={item.status ?? "planned"} />
                          <span className={websiteStyles.badge}>
                            {itemTypeLabel(item.item_type)}
                          </span>
                          {item.platform ? (
                            <span className={websiteStyles.badge}>{item.platform}</span>
                          ) : null}
                          <span className={websiteStyles.badge}>
                            {formatDate(item.scheduled_date)}
                          </span>
                        </div>

                        <h4 className="font-['Lato'] text-base font-black text-slate-950">
                          {item.title}
                        </h4>

                        {item.description ? (
                          <p className={websiteStyles.cardText}>{item.description}</p>
                        ) : null}

                        {item.cta ? (
                          <p className={websiteStyles.cardText}>
                            <strong>CTA:</strong> {item.cta}
                          </p>
                        ) : null}

                        <CalendarItemStatusForm
                          itemId={item.id}
                          currentStatus={item.status ?? "planned"}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No content calendar items yet. Generate a monthly plan to create one distinct campaign per week.
          </div>
        )}
      </WebsiteSection>

      <WebsiteSection
        eyebrow="Recent Plans"
        title="Monthly planning history"
        description="Previous content plans are kept so you can reuse themes, compare months, and build a repeatable content operating rhythm."
      >
        {plans.length ? (
          <div className={websiteStyles.cardGrid}>
            {plans.map((plan) => (
              <article key={plan.id} className={websiteStyles.card}>
                <WebsiteBadge status={plan.status ?? "planned"} />
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {plan.month_label}
                </h3>
                <p className={websiteStyles.cardText}>{plan.monthly_theme}</p>
                <p className={websiteStyles.cardMeta}>
                  Goal: {plan.business_goal ?? "No goal provided"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>
            No monthly plans yet.
          </div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
