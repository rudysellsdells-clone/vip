"use client";

import { useState, type ChangeEvent } from "react";
import type { UtmTaxonomySettings } from "@/lib/analytics/utm-taxonomy";

type Props = {
  accountId: string;
  canManage: boolean;
  initialSettings: UtmTaxonomySettings;
};

export function UtmTaxonomyPanel({ accountId, canManage, initialSettings }: Props) {
  const [emailSource, setEmailSource] = useState(initialSettings.default_email_source ?? "email");
  const [websiteSource, setWebsiteSource] = useState(
    initialSettings.default_website_source ?? "website",
  );
  const [smsSource, setSmsSource] = useState(initialSettings.default_sms_source ?? "sms");
  const [includeAudienceTerm, setIncludeAudienceTerm] = useState(
    initialSettings.include_audience_term !== false,
  );
  const [appendSocial, setAppendSocial] = useState(
    initialSettings.append_link_to_social !== false,
  );
  const [appendEmail, setAppendEmail] = useState(
    initialSettings.append_link_to_email !== false,
  );
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/analytics/utm-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          defaultEmailSource: emailSource,
          defaultWebsiteSource: websiteSource,
          defaultSmsSource: smsSource,
          includeAudienceTerm,
          appendLinkToSocial: appendSocial,
          appendLinkToEmail: appendEmail,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save UTM taxonomy settings.");
      setStatus("UTM taxonomy settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save UTM taxonomy settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none focus:border-blue-500";

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-bold text-slate-800">
          Email source
          <input
            className={inputClass}
            value={emailSource}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmailSource(event.target.value)}
            disabled={!canManage}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Examples: email, mautic, hubspot, mailchimp, gmail.
          </span>
        </label>

        <label className="text-sm font-bold text-slate-800">
          Website source
          <input
            className={inputClass}
            value={websiteSource}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setWebsiteSource(event.target.value)}
            disabled={!canManage}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Used for website and WordPress attribution metadata.
          </span>
        </label>

        <label className="text-sm font-bold text-slate-800">
          SMS source
          <input
            className={inputClass}
            value={smsSource}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSmsSource(event.target.value)}
            disabled={!canManage}
          />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Examples: sms, twilio, simpletexting.
          </span>
        </label>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeAudienceTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setIncludeAudienceTerm(event.target.checked)}
            disabled={!canManage}
            className="mt-1"
          />
          <span>
            <strong className="block text-slate-950">Use the audience as utm_term</strong>
            Add the campaign buyer segment when a useful audience distinction exists.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={appendSocial}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setAppendSocial(event.target.checked)}
            disabled={!canManage}
            className="mt-1"
          />
          <span>
            <strong className="block text-slate-950">Append tracked links to social copy</strong>
            When approved social copy does not already contain the destination URL, VIP adds it to the outbound payload.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={appendEmail}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setAppendEmail(event.target.checked)}
            disabled={!canManage}
            className="mt-1"
          />
          <span>
            <strong className="block text-slate-950">Append tracked links to email drafts</strong>
            When approved email copy does not already contain the destination URL, VIP adds it to the draft payload.
          </span>
        </label>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="rounded-xl bg-[#0b4a7a] px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save taxonomy settings"}
          </button>
          {status ? <p className="text-sm font-semibold text-slate-600">{status}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          You can review this taxonomy, but only an account owner or administrator can change it.
        </p>
      )}
    </div>
  );
}
