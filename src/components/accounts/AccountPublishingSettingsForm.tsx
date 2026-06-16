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

type PublishingSettings = {
  linkedin_page_name?: string | null;
  linkedin_company_id?: string | null;
  facebook_page_name?: string | null;
  facebook_page_id?: string | null;
  primary_booking_url?: string | null;
  galaxyai_style?: string | null;
  default_hashtags?: string | null;
};

export function AccountPublishingSettingsForm({
  accountId,
  settings,
}: {
  accountId: string;
  settings: PublishingSettings | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error" | "idle">("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setMessage("Saving publishing settings...");
    setTone("idle");

    const response = await fetch(`/api/accounts/${accountId}/publishing-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkedinPageName: formData.get("linkedinPageName"),
        linkedinCompanyId: formData.get("linkedinCompanyId"),
        facebookPageName: formData.get("facebookPageName"),
        facebookPageId: formData.get("facebookPageId"),
        primaryBookingUrl: formData.get("primaryBookingUrl"),
        galaxyAiStyle: formData.get("galaxyAiStyle"),
        defaultHashtags: formData.get("defaultHashtags"),
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error ?? "Unable to save publishing settings.");
      setTone("error");
      return;
    }

    setMessage("Publishing settings saved.");
    setTone("success");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={onSubmit} className={accountFormCardClass}>
      <div className={accountFormGridClass}>
        <Field label="LinkedIn Page Name" name="linkedinPageName" defaultValue={settings?.linkedin_page_name} />
        <Field label="LinkedIn Organization ID" name="linkedinCompanyId" defaultValue={settings?.linkedin_company_id} placeholder="Example: 12345678 or urn:li:organization:12345678" />
        <Field label="Facebook Page Name" name="facebookPageName" defaultValue={settings?.facebook_page_name} />
        <Field label="Facebook Page ID" name="facebookPageId" defaultValue={settings?.facebook_page_id} />
        <Field label="Primary booking / CTA URL" name="primaryBookingUrl" defaultValue={settings?.primary_booking_url} placeholder="https://example.com/contact" />
        <Field label="Default hashtags" name="defaultHashtags" defaultValue={settings?.default_hashtags} placeholder="#LocalSEO #LeadGeneration" />

        <label className={accountWideFieldLabelClass}>
          GalaxyAI creative style
          <textarea
            name="galaxyAiStyle"
            defaultValue={settings?.galaxyai_style ?? ""}
            rows={4}
            placeholder="Clean, polished short-form social video. Business-focused visuals. No exaggerated claims."
            className={accountTextareaClass}
          />
        </label>
      </div>

      <div className={accountButtonRowClass}>
        <p className="max-w-3xl text-xs text-slate-500">
          These settings let VIP keep publishing destinations and creative execution separate by account. LinkedIn requires the actual organization ID, not just the page name.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save Publishing Settings"}
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
