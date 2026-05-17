type VipWorkflowStep = {
  label: string;
  description: string;
  active?: boolean;
  complete?: boolean;
};

export function VipWorkflowSteps({ steps }: { steps: VipWorkflowStep[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={[
            "rounded-2xl border p-4",
            step.active
              ? "border-sky-200 bg-sky-50"
              : step.complete
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "grid h-8 w-8 place-items-center rounded-xl text-xs font-black",
                step.active
                  ? "bg-sky-600 text-white"
                  : step.complete
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600",
              ].join(" ")}
            >
              {index + 1}
            </div>
            <h3 className="font-black text-slate-950">{step.label}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
