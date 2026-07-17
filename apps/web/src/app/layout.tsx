import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Menu",
  description: "Scan and browse our menu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
