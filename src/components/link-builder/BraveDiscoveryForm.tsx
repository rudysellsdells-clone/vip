"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

const TEMPLATE_QUERIES = [
  "marketing agency directory",
  "SEO agency directory",
  "web design agency directory",
  "digital marketing agency directory",
  "business directory marketing agency",
  "agency directory get listed",
  "marketing company directory",
  "professional services directory marketing",
];

export function BraveDiscoveryForm() {
  const router = useRouter();
  const [query, setQuery] = useState(TEMPLATE_QUERIES[0]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/link-builder/opportunities/discover", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to discover directory opportunities.");
      }

      setMessage(
        result.message ??
          `Discovery complete. Brave returned ${result.rawResultCount ?? 0} raw result(s), found ${result.discovered ?? 0} candidate(s), saved ${result.inserted ?? 0}, skipped ${result.skippedDuplicates ?? 0} duplicate(s).`
      );

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <form action={handleSubmit} className={formStyles.form}>
      <div className={formStyles.header}>
        <h2 className={formStyles.title}>Discover directory opportunities</h2>
        <p className={formStyles.description}>
          Use Brave Search to find directory, citation, association, and listing pages. VIP now keeps broader directory-intent matches so you can review them instead of missing useful opportunities.
        </p>
      </div>

      <div className={formStyles.row}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Search Query</span>
          <input
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={formStyles.input}
            placeholder="marketing agency directory"
          />
          <span className={formStyles.help}>
            Start broad. Queries like “marketing agency directory” often work better than “submit listing.”
          </span>
        </label>
      </div>

      <div className={[formStyles.row, formStyles.grid3].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Country</span>
          <input name="country" defaultValue="US" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Language</span>
          <input name="search_lang" defaultValue="en" className={formStyles.input} />
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Results</span>
          <select name="count" defaultValue="20" className={formStyles.select}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </label>
      </div>

      <div className={formStyles.row}>
        <span className={formStyles.label}>Quick query templates</span>
        <div className={formStyles.actions}>
          {TEMPLATE_QUERIES.map((template) => (
            <button
              key={template}
              type="button"
              className={formStyles.secondaryButton}
              onClick={() => setQuery(template)}
            >
              {template}
            </button>
          ))}
        </div>
      </div>

      <div className={formStyles.actions}>
        <button type="submit" disabled={running} className={formStyles.submit}>
          {running ? "Discovering..." : "Discover Opportunities"}
        </button>
        {message ? <p className={formStyles.message}>{message}</p> : null}
        {error ? <p className={formStyles.error}>{error}</p> : null}
      </div>
    </form>
  );
}
