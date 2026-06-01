"use client";

import { useRouter, useSearchParams } from "next/navigation";
import formStyles from "@/components/forms/VipForm.module.css";
import { CalendarViewMode } from "@/lib/calendar/view-range";

function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CalendarViewSelector({
  basePath,
  view,
  dateValue,
  label = "Working View",
  description = "Switch between daily, weekly, and monthly views.",
  preserveParams = true,
}: {
  basePath: string;
  view: CalendarViewMode;
  dateValue: string;
  label?: string;
  description?: string;
  preserveParams?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(next: {
    view?: CalendarViewMode;
    date?: string;
  }) {
    const params = preserveParams
      ? new URLSearchParams(searchParams.toString())
      : new URLSearchParams();

    params.set("view", next.view ?? view);
    params.set("date", next.date ?? dateValue);

    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>{label}</h3>
        <p className={formStyles.description}>{description}</p>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>View</span>
          <select
            value={view}
            onChange={(event) => update({ view: event.target.value as CalendarViewMode })}
            className={formStyles.select}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </label>

        <label className={formStyles.field}>
          <span className={formStyles.label}>Date</span>
          <input
            type="date"
            value={dateValue}
            onChange={(event) => update({ date: event.target.value })}
            className={formStyles.input}
          />
        </label>
      </div>

      <div className={formStyles.actions}>
        <button
          type="button"
          className={formStyles.secondaryButton}
          onClick={() => update({ date: todayValue() })}
        >
          Today
        </button>
        <button
          type="button"
          className={formStyles.secondaryButton}
          onClick={() => update({ view: "day" })}
        >
          Daily
        </button>
        <button
          type="button"
          className={formStyles.secondaryButton}
          onClick={() => update({ view: "week" })}
        >
          Weekly
        </button>
        <button
          type="button"
          className={formStyles.secondaryButton}
          onClick={() => update({ view: "month" })}
        >
          Monthly
        </button>
      </div>
    </div>
  );
}
