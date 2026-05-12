import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rudys VIP",
  description: "Rudy's digital business clone project foundation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
