import "./globals.css";

export const metadata = { title: "Agent Workers", description: "Orquestração multiagente" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
