function parseHash(hash) {
  const clean = (hash || '#/').replace(/^#/, '');
  const parts = clean.split('/').filter(Boolean); // e.g. ['app','diet']
  const section = parts[0] || '';
  const sub = parts.slice(1).join('/');
  return { section, sub };
}

// Re-keying on the route triggers the fade-up entrance animation on every navigation.
function PageTransition({ routeKey, children }) {
  return <div key={routeKey} className="animate-fade-up">{children}</div>;
}

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white animate-pulse-glow">
          <FlameIcon size={24} />
        </div>
        <Spinner className="h-5 w-5 text-brand-500" />
      </div>
    </div>
  );
}

function RootApp() {
  const { user, loading } = useAuth();
  const hash = useHash();

  if (loading) return <FullScreenLoader />;

  const { section, sub } = parseHash(hash);

  if (!user) {
    return <PageTransition routeKey={section === 'signup' ? 'signup' : 'login'}>{section === 'signup' ? <Signup /> : <Login />}</PageTransition>;
  }

  if (section === 'admin') {
    if (user.role !== 'admin') { navigate('#/app'); return null; }
    const Page = window.App.adminRoutes[sub] || window.App.adminRoutes[''];
    return <AdminLayout hash={hash}><PageTransition routeKey={hash}><Page /></PageTransition></AdminLayout>;
  }

  // Default: the "app" (user) area — covers '#/app', unknown sections, and login/signup while already authenticated.
  if (user.role === 'admin' && section !== 'app') { navigate('#/admin'); return null; }
  const Page = window.App.userRoutes[sub] || window.App.userRoutes[''];
  return <UserLayout hash={hash}><PageTransition routeKey={hash}><Page /></PageTransition></UserLayout>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  </ThemeProvider>
);
