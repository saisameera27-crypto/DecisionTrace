import { ReactNode } from 'react';

export const metadata = {
  title: 'Decision Trace',
  description: 'Decision analysis application',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
