"use client";

import { useRouter } from "next/navigation";
import formStyles from "@/components/forms/VipForm.module.css";

export function ReviewMonthSelector({
  value,
  options,
}: {
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  const router = useRouter();

  function handleChange(nextValue: string) {
    router.push(`/content-calendar/monthly-review?month=${encodeURIComponent(nextValue)}`);
  }

  return (
    <label className={formStyles.field}>
      <span className={formStyles.label}>Review Month</span>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className={formStyles.select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
