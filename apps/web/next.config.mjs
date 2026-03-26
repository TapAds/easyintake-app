import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/sign-in", destination: "/en/sign-in", permanent: true },
      { source: "/sign-up", destination: "/en/sign-up", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
