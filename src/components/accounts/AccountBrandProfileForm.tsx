"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  accountButtonRowClass,
  accountFormCardClass,
  accountFormGridClass,
  accountFieldLabelClass,
  accountInputClass,
  accountTextareaClass,
  accountWideFieldLabelClass,
} from "@/components/accounts/accountFormClasses";

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: formData.get("companyName"),
        websiteUrl: formData.get("websiteUrl"),
        primaryCta: formData.get("primaryCta"),
        phone: formData.get("phone"),
        targetAudience: formData.get("targetAudience"),
        tone: formData.get("tone"),
        serviceAreas: formData.get("serviceAreas"),
        coreOffers: formData.get("coreOffers"),
        approvedHashtags: formData.get("approvedHashtags"),
        notes: formData.get("notes"),
      }),
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
    <form onSubmit={onSubmit} className={accountFormCardClass}>
      <div className={accountFormGridClass}>
        <Field label="Company / brand name" name="companyName" defaultValue={profile?.company_name} />
        <Field label="Website" name="websiteUrl" defaultValue={profile?.website_url} placeholder="https://example.com" />
        <Field label="Primary CTA" name="primaryCta" defaultValue={profile?.primary_cta} placeholder="Schedule a consultation" />
        <Field label="Phone" name="phone" defaultValue={profile?.phone} />
        <TextArea label="Target audience" name="targetAudience" defaultValue={profile?.target_audience} />
        <TextArea label="Tone of voice" name="tone" defaultValue={profile?.tone} placeholder="Practical, credible, professional, helpful..." />
        <TextArea label="Service areas" name="serviceAreas" defaultValue={profile?.service_areas} />
        <TextArea label="Core offers" name="coreOffers" defaultValue={profile?.core_offers} />
        <TextArea label="Approved hashtags" name="approvedHashtags" defaultValue={profile?.approved_hashtags} placeholder="#LocalSEO #LeadGeneration" />
        <TextArea label="Notes" name="notes" defaultValue={profile?.notes} wide />
      </div>

      <div className={accountButtonRowClass}>
        <p className="max-w-3xl text-xs text-slate-500">
          VIP will use this as the account-level memory for campaign generation, content tone, and creative direction as Phase 3 continues.
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
    <label className={accountFieldLabelClass}>
      {label}
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={accountInputClass}
      />
    </label>
  );
}
function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  wide = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? accountWideFieldLabelClass : accountFieldLabelClass}>
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={3}
        className={accountTextareaClass}
      />
    </label>
  );
}
