"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(app)/analytics/Analytics.module.css";

export type AnalyticsGoalView = {
  id: string;
  name: string;
  description: string | null;
  eventName: string;
  goalType: string;
  isPrimary: boolean;
  isActive: boolean;
  defaultValue: number | null;
  currencyCode: string;
};

export type AnalyticsGoalEventOption = {
  name: string;
  label: string;
  category: string;
  description: string;
};

function responseError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = String((payload as { error?: unknown }).error ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

export function AnalyticsGoalsPanel({
  goals,
  eventOptions,
  canManage,
}: {
  goals: AnalyticsGoalView[];
  eventOptions: AnalyticsGoalEventOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const availableEvents = useMemo(
    () => eventOptions.filter((event) => !goals.some((goal) => goal.eventName === event.name)),
    [eventOptions, goals],
  );
  const [eventName, setEventName] = useState(availableEvents[0]?.name ?? "");
  const [name, setName] = useState(availableEvents[0]?.label ?? "");
  const [goalType, setGoalType] = useState(availableEvents[0]?.category ?? "conversion");
  const [defaultValue, setDefaultValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(goals.length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (availableEvents.some((event) => event.name === eventName)) return;
    const next = availableEvents[0];
    setEventName(next?.name ?? "");
    setName(next?.label ?? "");
    setGoalType(next?.category ?? "conversion");
  }, [availableEvents, eventName]);

  function chooseEvent(nextEventName: string) {
    setEventName(nextEventName);
    const option = eventOptions.find((event) => event.name === nextEventName);
    if (option) {
      setName(option.label);
      setGoalType(option.category);
    }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("new");
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName,
          name,
          goalType,
          defaultValue: defaultValue.trim() || null,
          isPrimary,
          currencyCode: "USD",
        }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) throw new Error(responseError(payload, "Goal creation failed."));
      setMessage({ type: "success", text: "Conversion goal created." });
      setDefaultValue("");
      setIsPrimary(false);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Goal creation failed.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function updateGoal(goal: AnalyticsGoalView, changes: Record<string, unknown>) {
    setBusyId(goal.id);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id, ...changes }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) throw new Error(responseError(payload, "Goal update failed."));
      setMessage({ type: "success", text: "Conversion goal updated." });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Goal update failed.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteGoal(goal: AnalyticsGoalView) {
    if (!window.confirm(`Delete the “${goal.name}” analytics goal?`)) return;
    setBusyId(goal.id);
    setMessage(null);

    try {
      const response = await fetch("/api/analytics/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: goal.id }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) throw new Error(responseError(payload, "Goal deletion failed."));
      setMessage({ type: "success", text: "Conversion goal deleted." });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Goal deletion failed.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Conversion goals</p>
          <h2>Define the outcomes that matter</h2>
          <p className={styles.panelCopy}>
            Goals turn tracked events into business outcomes. Mark one as primary to make it the account’s headline conversion.
          </p>
        </div>
        <span className={styles.panelPill}>{goals.filter((goal) => goal.isActive).length} active</span>
      </div>

      {message ? (
        <div className={message.type === "success" ? styles.setupSuccess : styles.setupError}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.goalLayout}>
        <div className={styles.goalList}>
          {goals.length ? (
            goals.map((goal) => (
              <article key={goal.id} className={styles.goalCard}>
                <div className={styles.goalCardTop}>
                  <div>
                    <span className={styles.goalType}>{goal.goalType}</span>
                    <h3>{goal.name}</h3>
                    <code>{goal.eventName}</code>
                  </div>
                  <div className={styles.goalBadges}>
                    {goal.isPrimary ? <span className={styles.primaryBadge}>Primary</span> : null}
                    <span className={goal.isActive ? styles.sourceActive : styles.sourcePending}>
                      {goal.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                <p>
                  {goal.description ||
                    eventOptions.find((event) => event.name === goal.eventName)?.description ||
                    "Tracked Marketing VIP outcome."}
                </p>
                <div className={styles.goalMeta}>
                  <span>
                    Default value: {goal.defaultValue === null ? "Not assigned" : `$${goal.defaultValue.toLocaleString()}`}
                  </span>
                </div>
                {canManage ? (
                  <div className={styles.setupActions}>
                    <button
                      type="button"
                      className={styles.setupSecondaryButton}
                      disabled={busyId === goal.id}
                      onClick={() => updateGoal(goal, { isActive: !goal.isActive })}
                    >
                      {goal.isActive ? "Pause" : "Activate"}
                    </button>
                    {!goal.isPrimary ? (
                      <button
                        type="button"
                        className={styles.setupTextButton}
                        disabled={busyId === goal.id}
                        onClick={() => updateGoal(goal, { isPrimary: true })}
                      >
                        Make Primary
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={busyId === goal.id}
                      onClick={() => deleteGoal(goal)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>
              <strong>No conversion goals yet.</strong>
              <p>Create the first goal so Marketing VIP can distinguish engagement from a meaningful business outcome.</p>
            </div>
          )}
        </div>

        <form className={styles.goalForm} onSubmit={createGoal}>
          <p className={styles.panelEyebrow}>Add a goal</p>
          <h3>Choose a tracked outcome</h3>
          {availableEvents.length ? (
            <>
              <label className={styles.setupLabel} htmlFor="goal-event">Event</label>
              <select
                id="goal-event"
                className={styles.setupInput}
                value={eventName}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => chooseEvent(event.target.value)}
                disabled={!canManage || busyId === "new"}
              >
                {availableEvents.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.label} — {option.name}
                  </option>
                ))}
              </select>

              <label className={styles.setupLabel} htmlFor="goal-name">Goal name</label>
              <input
                id="goal-name"
                className={styles.setupInput}
                value={name}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                disabled={!canManage || busyId === "new"}
              />

              <label className={styles.setupLabel} htmlFor="goal-type">Goal type</label>
              <select
                id="goal-type"
                className={styles.setupInput}
                value={goalType}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => setGoalType(event.target.value)}
                disabled={!canManage || busyId === "new"}
              >
                <option value="engagement">Engagement</option>
                <option value="lead">Lead</option>
                <option value="conversion">Conversion</option>
                <option value="revenue">Revenue</option>
              </select>

              <label className={styles.setupLabel} htmlFor="goal-value">Default value, optional</label>
              <input
                id="goal-value"
                className={styles.setupInput}
                type="number"
                min="0"
                step="0.01"
                value={defaultValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setDefaultValue(event.target.value)}
                disabled={!canManage || busyId === "new"}
                placeholder="500"
              />

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setIsPrimary(event.target.checked)}
                  disabled={!canManage || busyId === "new"}
                />
                Use as the primary conversion goal
              </label>

              <button
                type="submit"
                className={styles.setupPrimaryButton}
                disabled={!canManage || busyId === "new" || !eventName || !name.trim()}
              >
                {busyId === "new" ? "Creating…" : "Create Goal"}
              </button>
            </>
          ) : (
            <div className={styles.emptyState}>
              <strong>Every supported event has a goal.</strong>
              <p>Pause, reprioritize, or delete an existing goal to change the configuration.</p>
            </div>
          )}
          {!canManage ? <p className={styles.setupReadOnly}>Only account managers can change goals.</p> : null}
        </form>
      </div>
    </section>
  );
}
