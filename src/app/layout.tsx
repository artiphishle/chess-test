import './globals.css';
import './branding.css';

import type { ReactNode } from 'react';

export const metadata = {
  title: 'GrossMeister | Schach spielen',
  description:
    'GrossMeister: Schachpartien mit frei konfigurierbaren Brettern und Choice Coins. Spiele anonym gegen andere.',
  applicationName: 'GrossMeister',
  icons: { icon: '/brand/symbol-1.svg' },
};

/*** Provide the document root and shared accessible style layer. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
