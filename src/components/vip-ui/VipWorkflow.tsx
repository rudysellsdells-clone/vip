export function VipWorkflowRail({
  steps,
}: {
  steps: Array<{
    label: string;
    description: string;
    state?: "complete" | "active" | "idle";
  }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const state = step.state ?? "idle";
        return (
          <div
            key={step.label}
            className={[
              "rounded-2xl border p-4",
              state === "complete"
                ? "border-emerald-200 bg-emerald-50"
                : state === "active"
                  ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-white/80",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "grid h-9 w-9 place-items-center rounded-xl text-xs font-black",
                  state === "complete"
                    ? "bg-emerald-600 text-white"
                    : state === "active"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {index + 1}
              </div>
              <h3 className="font-black text-slate-950">{step.label}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
          </div>
        );
      })}
    </div>
  );
}
