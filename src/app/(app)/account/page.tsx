import { redirect } from "next/navigation";
import { AddSeatForm } from "@/components/account/AddSeatForm";
import { RemoveSeatButton } from "@/components/account/RemoveSeatButton";
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

type SeatRow = Record<string, any>;

function formatDate(value: unknown) {
  if (!value) return "Not set";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function roleLabel(value: unknown) {
  return String(value ?? "viewer").replaceAll("_", " ");
}

export default async function AccountPage() {
  const supabase = untypedSupabase(await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: seatsData, error: seatsError } = await supabase
    .from("account_seats")
    .select("*")
    .eq("owner_user_id", user.id)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  const seats = (seatsData ?? []) as SeatRow[];
  const pendingSeats = seats.filter((seat) => seat.status === "pending").length;
  const activeSeats = seats.filter((seat) => seat.status === "active").length;

  return (
    <WebsitePage>
      <WebsiteHero
        eyebrow="Account"
        title="Manage your VIP account and seats."
        description="Review the signed-in account, add collaborators, and prepare VIP for team-based review and approval workflows."
        primaryAction={{ label: "Settings", href: "/settings" }}
        secondaryAction={{ label: "Dashboard", href: "/dashboard" }}
      />

      <section className={websiteStyles.metricsGrid}>
        <WebsiteMetric
          label="Signed In"
          value={user.email ?? "User"}
          description="Current authenticated account."
          dot="blue"
        />
        <WebsiteMetric
          label="Seats"
          value={seats.length}
          description="Active or pending seats attached to this account."
          dot="gold"
        />
        <WebsiteMetric
          label="Pending"
          value={pendingSeats}
          description="Seats waiting for invitation acceptance or manual onboarding."
          dot="purple"
        />
        <WebsiteMetric
          label="Active"
          value={activeSeats}
          description="Seats marked active in VIP."
          dot="green"
        />
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Profile"
          title="Account profile"
          description="This is the user profile VIP uses for ownership and row-level filtering."
        >
          <article className={websiteStyles.card}>
            <h3 className={websiteStyles.cardTitle}>{profile?.full_name ?? user.email ?? "VIP user"}</h3>
            <p className={websiteStyles.cardText}>
              <strong>Email:</strong> {user.email ?? profile?.email ?? "Not available"}
            </p>
            <p className={websiteStyles.cardText}>
              <strong>Timezone:</strong> {profile?.timezone ?? "Not set"}
            </p>
            <p className={websiteStyles.cardMeta}>
              Profile created {formatDate(profile?.created_at)}
            </p>
          </article>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Seats"
          title="Add team members"
          description="Start building the account layer for reviewers, editors, admins, and viewers."
        >
          <AddSeatForm />
        </WebsiteSection>
      </section>

      <WebsiteSection
        eyebrow="Team"
        title="Current seats"
        description="Seats are stored as account records. Use this to stage account access before deeper permissions and billing controls are added."
      >
        {seatsError ? (
          <div className={websiteStyles.empty}>
            Account seats are not available yet. Run the Phase 3 account seats database migration, then refresh this page.
            <br />
            <br />
            <strong>Database message:</strong> {seatsError.message}
          </div>
        ) : seats.length ? (
          <div className={websiteStyles.cardGrid}>
            {seats.map((seat) => (
              <article key={seat.id} className={websiteStyles.card}>
                <div className="flex flex-wrap gap-2">
                  <WebsiteBadge status={seat.status ?? "pending"} />
                  <span className={websiteStyles.badge}>{roleLabel(seat.role)}</span>
                </div>
                <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
                  {seat.full_name || seat.email}
                </h3>
                <p className={websiteStyles.cardText}>{seat.email}</p>
                <p className={websiteStyles.cardMeta}>Invited {formatDate(seat.invited_at ?? seat.created_at)}</p>
                <div className={websiteStyles.actionRow} style={{ marginTop: 14 }}>
                  <RemoveSeatButton seatId={seat.id} email={seat.email} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No seats added yet.</div>
        )}
      </WebsiteSection>
    </WebsitePage>
  );
}
