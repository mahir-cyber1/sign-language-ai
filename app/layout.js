import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mercan-check-psi.vercel.app"),
  title: "Gebärdensprache KI",
  description: "Gebärden erkennen, übersetzen und trainieren",
  applicationName: "Gebärdensprache KI",
  icons: { icon: "/sign-icon.svg", apple: "/sign-icon.svg" },
};

export default function RootLayout({ children }) {
  return <html lang="de"><body>{children}</body></html>;
}
