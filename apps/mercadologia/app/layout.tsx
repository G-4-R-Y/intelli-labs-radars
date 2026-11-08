import type { Metadata } from "next";
export const metadata: Metadata = {title:"Intelli Labs | Observatório de Mercadologia",description:"Pesquisa, evidências e radar semanal em mercadologia."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
