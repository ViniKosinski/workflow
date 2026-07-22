import type { Metadata } from "next";
import "./globals.css";
import { ActiveOrganizationProvider } from "@/modules/organizations/presentation/components/ActiveOrganizationProvider";

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
      <body><ActiveOrganizationProvider>{children}</ActiveOrganizationProvider></body>
    </html>
  );
}
