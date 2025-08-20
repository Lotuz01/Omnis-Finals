import type { Metadata } from "next";
import "./globals.css";
import AppWrapper from './AppWrapper';

export const metadata: Metadata = {
  title: "Sistema OMNIS",
  description: "Gerado por criar próximo aplicativo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  );
}
