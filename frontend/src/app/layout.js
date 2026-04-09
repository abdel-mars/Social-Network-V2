import { Nunito } from 'next/font/google';
import "./globals.css";
import Providers from "./Providers";

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
});

export const metadata = {
  title: "01Social",
  description: "A social network with a WiiU-inspired aesthetic",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={nunito.variable}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
