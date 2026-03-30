import { SignIn } from "@clerk/nextjs";
import { SiteFooter } from "@/components/SiteFooter";

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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <SignIn
          path={signInPath}
          routing="path"
          forceRedirectUrl={queue}
          signUpUrl={signUpPath}
          signUpForceRedirectUrl={queue}
        />
      </div>
      <SiteFooter />
    </div>
  );
}
