import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const queue = `/${locale}/dashboard/queue`;
  const signInPath = `/${locale}/sign-in`;
  const signUpPath = `/${locale}/sign-up`;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SignIn
        path={signInPath}
        routing="path"
        forceRedirectUrl={queue}
        signUpUrl={signUpPath}
        signUpForceRedirectUrl={queue}
      />
    </div>
  );
}
