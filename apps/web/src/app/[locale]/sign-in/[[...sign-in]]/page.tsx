import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn
        afterSignInUrl={`/${locale}/dashboard/queue`}
        signUpUrl={`/${locale}/sign-up`}
      />
    </div>
  );
}
