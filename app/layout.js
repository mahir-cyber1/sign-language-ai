import "./globals.css";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://sign-language-ai-ten.vercel.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Gebärdensprache KI",
  description: "Gebärden erkennen, übersetzen und trainieren",
  applicationName: "Gebärdensprache KI",
  icons: { icon: "/sign-icon.svg", apple: "/sign-icon.svg" },
  openGraph: {
    title: "Gebärdensprache KI",
    description: "Gebärden erkennen, übersetzen und trainieren",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Gebärdensprache KI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gebärdensprache KI",
    description: "Gebärden erkennen, übersetzen und trainieren",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return <html lang="de"><body>{children}</body></html>;
}
