import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileNav } from '@/components/layout/MobileNav';

import { GlobalModals } from '@/components/modals/GlobalModals';

export const viewport: Viewport = {
  themeColor: '#16164f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'MOP-SG | Mi Operación Personal — Seamos Genios',
  description:
    'Sistema operativo ejecutivo para la gestión de tiempo, hitos de lanzamiento, entregables por área y radar de atrasos de Seamos Genios.',
  applicationName: 'MOP-SG',
  authors: [{ name: 'Seamos Genios' }],
  generator: 'Next.js',
  keywords: [
    'seamos genios',
    'operación ejecutiva',
    'playtest',
    'gestor de entregas',
    'radar de atrasos',
    'disponibilidad real',
  ],
  creator: 'Seamos Genios',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'MOP-SG — Mi Operación Personal',
    description:
      'Control de decisiones, tiempo libre real, hitos del Playtest y radar de cuellos de botella para Seamos Genios.',
    siteName: 'MOP-SG',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MOP-SG — Mi Operación Personal',
    description:
      'Control de decisiones, tiempo libre real, hitos del Playtest y radar de cuellos de botella para Seamos Genios.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('mopsg_theme');
                  var isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex bg-[var(--paper)] text-[var(--ink)] antialiased selection:bg-[#c5c5ff] selection:text-[#1a1a5e]">
        {/* Sidebar institucional para pantallas medianas y grandes */}
        <Sidebar />

        {/* Área de contenido principal */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <TopHeader />
          <main className="flex-1 p-4 sm:p-5 lg:p-6 pb-20 md:pb-6 max-w-[1560px] w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Barra de navegación inferior móvil */}
        <MobileNav />

        {/* Modales globales de la aplicación (Client Component diferido) */}
        <GlobalModals />
      </body>
    </html>
  );
}
