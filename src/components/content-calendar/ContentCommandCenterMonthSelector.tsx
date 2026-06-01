"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import formStyles from "@/components/forms/VipForm.module.css";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ContentCommandCenterMonthSelector({
  month,
}: {
  month: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(month || currentMonthValue());

  function go() {
    router.push(`/content-calendar?month=${encodeURIComponent(value)}`);
  }

  return (
    <div className={formStyles.form}>
      <div className={formStyles.header}>
        <h3 className={formStyles.title}>Command center month</h3>
        <p className={formStyles.description}>
          Choose the campaign month you want to review.
        </p>
      </div>

      <div className={[formStyles.row, formStyles.grid2].join(" ")}>
        <label className={formStyles.field}>
          <span className={formStyles.label}>Month</span>
          <input
            type="month"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={formStyles.input}
          />
        </label>

        <div className={formStyles.actions} style={{ alignSelf: "end" }}>
          <button type="button" onClick={go} className={formStyles.submit}>
            View Month
          </button>
        </div>
      </div>
    </div>
  );
}
