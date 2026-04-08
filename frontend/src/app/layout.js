import { Archivo } from 'next/font/google';
import "./globals.css";

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-archivo',
});

export const metadata = {
  title: "Social Network",
  description: "A clean and minimal social network app",
};

// layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={archivo.variable}>
        {children}
      </body>
    </html>
  );
}
