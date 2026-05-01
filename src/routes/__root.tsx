import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Toaster } from '../components/ui/sonner';
import Footer from '../components/Footer';
import Header from '../components/Header';
import NotFoundPage from '../components/NotFoundPage';
import RootErrorPage from '../components/RootErrorPage';
import { hydrateAuthSession, useAuthHydrating, useAuthSession } from '../lib/auth';
import { queryClient } from '../lib/query-client';

import appCss from '../styles.css?url';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Eventy',
      },
      {
        name: 'description',
        content:
          'Event discovery and organizer tooling for modern live experiences.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: ({ error }) => <RootErrorPage error={error} />,
});

function AuthSessionBootstrap() {
  const session = useAuthSession();
  const isHydrating = useAuthHydrating();

  useEffect(() => {
    hydrateAuthSession().catch(() => undefined);
  }, []);

  if (!isHydrating || session) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-background/75 backdrop-blur-md">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-primary/20 bg-card/95 px-7 py-6 shadow-xl">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
            <LoaderCircle className="size-4 animate-spin" />
          </span>
          <div className="space-y-1">
            <p className="font-serif text-base font-semibold tracking-tight text-foreground">
              Eventy
            </p>
            <p className="text-sm text-muted-foreground">
              Restoring your session...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const hideSiteChrome = pathname.startsWith('/admin');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased wrap-anywhere selection:bg-primary/20 selection:text-foreground">
        <QueryClientProvider client={queryClient}>
          <AuthSessionBootstrap />
          {hideSiteChrome ? null : <Header />}
          {children}
          {hideSiteChrome ? null : <Footer />}
          <Toaster />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  );
}
