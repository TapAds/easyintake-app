import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
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
      <SignUp
        path={signUpPath}
        routing="path"
        forceRedirectUrl={queue}
        signInUrl={signInPath}
        signInForceRedirectUrl={queue}
      />
    </div>
  );
}
