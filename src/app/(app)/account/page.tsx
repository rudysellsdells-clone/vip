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
import accountStyles from "@/components/accounts/AccountForms.module.css";
import { createClient } from "@/lib/supabase/server";
import { untypedSupabase } from "@/lib/supabase/untyped";

type SeatRow = Record<string, any>;
type ProfileRow = Record<string, any> | null;

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

function accountRole(profile: ProfileRow) {
  return String(profile?.account_role ?? "owner");
}

function ownerUserId(profile: ProfileRow, fallbackUserId: string) {
  const owner = String(profile?.account_owner_id ?? "").trim();
  return owner || fallbackUserId;
}

function canManageSeats(profile: ProfileRow, currentUserId: string) {
  const role = accountRole(profile);
  const ownerId = ownerUserId(profile, currentUserId);
  return role === "owner" && ownerId === currentUserId;
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

  const ownerId = ownerUserId(profile, user.id);
  const role = accountRole(profile);
  const isOwner = canManageSeats(profile, user.id);

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", ownerId)
    .maybeSingle();

  const { data: seatsData, error: seatsError } = await supabase
    .from("account_seats")
    .select("*")
    .eq("owner_user_id", ownerId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  const seats = (seatsData ?? []) as SeatRow[];
  const pendingSeats = seats.filter((seat) => seat.status === "pending").length;
  const activeSeats = seats.filter((seat) => seat.status === "active").length;

  return (
    <WebsitePage>
      <div className={accountStyles.accountPage}>
      <WebsiteHero
        eyebrow="Account"
        title="Manage your VIP account and seats."
        description="Use your owner account to create team seats, invite collaborators, and prepare VIP for multi-user review and approval workflows."
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
          label="Account Role"
          value={roleLabel(role)}
          description={isOwner ? "This account can create and manage seats." : "This account belongs to an owner account."}
          dot="gold"
        />
        <WebsiteMetric
          label="Seats"
          value={seats.length}
          description="Active or pending seats attached to the owner account."
          dot="purple"
        />
        <WebsiteMetric
          label="Active"
          value={activeSeats}
          description={`${pendingSeats} pending seat(s).`}
          dot="green"
        />
      </section>

      <section className={websiteStyles.twoColumn}>
        <WebsiteSection
          eyebrow="Owner"
          title="Owner account"
          description="This is the account that owns the VIP workspace and can create additional accounts."
        >
          <article className={websiteStyles.card}>
            <div className="flex flex-wrap gap-2">
              <WebsiteBadge status={isOwner ? "owner" : "member"} />
              <span className={websiteStyles.badge}>{roleLabel(role)}</span>
            </div>
            <h3 className={websiteStyles.cardTitle} style={{ marginTop: 16 }}>
              {ownerProfile?.full_name ?? profile?.full_name ?? user.email ?? "VIP Owner"}
            </h3>
            <p className={websiteStyles.cardText}>
              <strong>Owner email:</strong> {ownerProfile?.email ?? user.email ?? "Not available"}
            </p>
            <p className={websiteStyles.cardText}>
              <strong>Your email:</strong> {user.email ?? profile?.email ?? "Not available"}
            </p>
            <p className={websiteStyles.cardText}>
              <strong>Timezone:</strong> {profile?.timezone ?? "America/Chicago"}
            </p>
            <p className={websiteStyles.cardMeta}>
              Profile created {formatDate(profile?.created_at)}
            </p>
          </article>
        </WebsiteSection>

        <WebsiteSection
          eyebrow="Seats"
          title="Create accounts"
          description={
            isOwner
              ? "Add teammates as admins, editors, reviewers, or viewers. VIP will attempt a Supabase invite when admin credentials are configured."
              : "Only the owner account can create or remove seats."
          }
        >
          {isOwner ? (
            <AddSeatForm />
          ) : (
            <div className={websiteStyles.empty}>
              You are signed in as a {roleLabel(role)}. Ask the owner account to add or change seats.
            </div>
          )}
        </WebsiteSection>
      </section>

      <WebsiteSection
        eyebrow="Team"
        title="Current seats"
        description="Seats are stored under the owner account. Removed seats stay out of the active list but preserve audit history."
      >
        {seatsError ? (
          <div className={websiteStyles.empty}>
            Account seats are not available yet. Run the Phase 3 owner account database migration, then refresh this page.
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
                {isOwner ? (
                  <div className={websiteStyles.actionRow} style={{ marginTop: 14 }}>
                    <RemoveSeatButton seatId={seat.id} email={seat.email} />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={websiteStyles.empty}>No seats added yet.</div>
        )}
      </WebsiteSection>
      </div>
    </WebsitePage>
  );
}
