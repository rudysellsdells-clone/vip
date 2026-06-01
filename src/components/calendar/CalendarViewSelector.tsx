"use client";

import { useRouter, useSearchParams } from "next/navigation";
import formStyles from "@/components/forms/VipForm.module.css";
import { CalendarViewMode } from "@/lib/calendar/view-range";

export function CalendarViewSelector({
  basePath,
  view,
  dateValue,
  monthValue,
}: {
  basePath: string;
  view: CalendarViewMode;
  dateValue: string;
  monthValue?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(next: {
    view?: CalendarViewMode;
    date?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", next.view ?? view);
    params.set("date", next.date ?? dateValue);

    if (monthValue && !params.get("month")) {
      params.set("month", monthValue);
    }

    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className={formStyles.form}>
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
    </div>
  );
}
