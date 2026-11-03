import type { ReactNode } from 'react';
import './globals.css';

export const metadata={title:'Chess Test | Ankhorage',description:'Anonyme Schachpartien mit frei konfigurierbaren Brettgrössen, Startpositionen und Choice Coins.'};

/*** Provide the document root and shared accessible style layer. */
export default function RootLayout({children}:{children:ReactNode}){
  return <html lang="de"><body>{children}</body></html>;
}
