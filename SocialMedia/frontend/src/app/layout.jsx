import "./globals.css";
import Providers from "./providers";
import ClientLayout from "./Clientlayout";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
            <body className="w-full h-full bg-gray-900">

        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
