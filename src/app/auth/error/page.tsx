type AuthErrorPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const message = params.message ?? "The sign-in link could not be verified.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-950 shadow-xl">
        <h1 className="text-2xl font-bold">Sign-in link problem</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        >
          Try again
        </a>
      </section>
    </main>
  );
}
