import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignUp
        afterSignUpUrl={`/${locale}/dashboard/queue`}
        signInUrl={`/${locale}/sign-in`}
      />
    </div>
  );
}
