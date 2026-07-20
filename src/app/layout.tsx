import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow",
  description: "Plataforma para gerenciamento de processos empresariais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
