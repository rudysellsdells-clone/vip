"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import accountStyles from "@/components/accounts/AccountForms.module.css";

function colorListToText(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join("\n");
  }

  return String(value ?? "");
}

type BrandProfile = {
  company_name?: string | null;
  website_url?: string | null;
  primary_cta?: string | null;
  phone?: string | null;
  target_audience?: string | null;
  tone?: string | null;
  service_areas?: string | null;
  core_offers?: string | null;
  approved_hashtags?: string | null;
  notes?: string | null;
  logo_url?: string | null;
  logo_file_name?: string | null;
  brand_colors?: string[] | null;
};

export function AccountBrandProfileForm({
  accountId,
  profile,
}: {
  accountId: string;
  profile: BrandProfile | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "idle">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setMessage("Saving brand profile...");
    setTone("idle");

    const response = await fetch(`/api/accounts/${accountId}/brand-profile`, {
      method: "PUT",
      body: formData,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save brand profile.");
      setTone("error");
      return;
    }

    setMessage("Brand profile saved.");
    setTone("success");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className={accountStyles.formCard} encType="multipart/form-data">
      <div className={accountStyles.formGrid}>
        <Field label="Company / brand name" name="companyName" defaultValue={profile?.company_name} />
        <Field label="Website" name="websiteUrl" defaultValue={profile?.website_url} placeholder="https://example.com" />
        <Field label="Primary CTA" name="primaryCta" defaultValue={profile?.primary_cta} placeholder="Schedule a consultation" />
        <Field label="Phone" name="phone" defaultValue={profile?.phone} />
        <TextArea label="Target audience" name="targetAudience" defaultValue={profile?.target_audience} />
        <TextArea label="Tone of voice" name="tone" defaultValue={profile?.tone} placeholder="Practical, credible, professional, helpful..." />
        <TextArea label="Service areas" name="serviceAreas" defaultValue={profile?.service_areas} />
        <TextArea label="Core offers" name="coreOffers" defaultValue={profile?.core_offers} />
        <TextArea label="Approved hashtags" name="approvedHashtags" defaultValue={profile?.approved_hashtags} placeholder="#LocalSEO #LeadGeneration" />
        <TextArea
          label="Brand colors"
          name="brandColors"
          defaultValue={colorListToText(profile?.brand_colors)}
          placeholder="#0B4A7A&#10;#F59E0B&#10;Navy&#10;White"
          help="Add as many colors as needed. Use one per line or separate with commas. Hex codes, RGB values, and color names are okay."
          wide
        />
        <LogoField logoUrl={profile?.logo_url} logoFileName={profile?.logo_file_name} />
        <TextArea label="Notes" name="notes" defaultValue={profile?.notes} wide />
      </div>

      <div className={accountStyles.buttonRow}>
        <p className={accountStyles.helperText}>
          VIP will use this as the account-level memory for campaign generation, content tone, visual direction, and creative direction as Phase 3 continues.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Brand Profile"}
        </button>
      </div>

      {message ? (
        <p className={tone === "error" ? "text-sm font-semibold text-red-700" : "text-sm font-semibold text-emerald-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <label className={accountStyles.field}>
      <span className={accountStyles.label}>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={accountStyles.input}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  help,
  wide = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  help?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? accountStyles.wideField : accountStyles.field}>
      <span className={accountStyles.label}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={wide ? 4 : 3}
        className={accountStyles.textarea}
      />
      {help ? <span className={accountStyles.helperText}>{help}</span> : null}
    </label>
  );
}

function LogoField({
  logoUrl,
  logoFileName,
}: {
  logoUrl?: string | null;
  logoFileName?: string | null;
}) {
  return (
    <label className={accountStyles.wideField}>
      <span className={accountStyles.label}>Brand logo</span>
      {logoUrl ? (
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Current brand logo"
            className="max-h-20 max-w-48 rounded-lg bg-white object-contain p-2 shadow-sm"
          />
          <div>
            <p className="text-sm font-bold text-slate-900">Current logo saved</p>
            {logoFileName ? <p className="text-xs text-slate-500">{logoFileName}</p> : null}
          </div>
        </div>
      ) : null}
      <input
        type="file"
        name="logo"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className={accountStyles.input}
      />
      <span className={accountStyles.helperText}>
        Upload a PNG, JPG, WEBP, SVG, or GIF logo. Leave this blank to keep the current logo.
      </span>
    </label>
  );
}
