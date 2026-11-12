import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPal AI Hackathon — Phase 1 Foundation",
  description: "Governed AI Autonomous Commerce & PayPal Payment Rails Foundation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
