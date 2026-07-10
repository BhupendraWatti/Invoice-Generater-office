import '../styles/globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DocFlow Workspace Studio',
  description: 'High performance enterprise document management workspace',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-on-background bg-background h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
