import { SignUp } from "@clerk/nextjs";
import { SiteFooter } from "@/components/SiteFooter";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const queue = `/${locale}/dashboard/applications`;
  const signInPath = `/${locale}/sign-in`;
  const signUpPath = `/${locale}/sign-up`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <SignUp
          path={signUpPath}
          routing="path"
          forceRedirectUrl={queue}
          signInUrl={signInPath}
          signInForceRedirectUrl={queue}
        />
      </div>
      <SiteFooter />
    </div>
  );
}
