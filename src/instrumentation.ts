export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // gpt-4.1-mini accepts only medium text verbosity. The bounded market scan
  // intentionally requests low verbosity, so use the GPT-5 mini research model
  // unless an explicit research-model override has already been configured.
  process.env.OPENAI_RESEARCH_MODEL ||= "gpt-5-mini";
}
