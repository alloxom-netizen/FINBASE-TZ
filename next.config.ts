import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "@google-cloud/storage", "@google-cloud/firestore", "@anthropic-ai/sdk"],
};

export default withNextIntl(nextConfig);
