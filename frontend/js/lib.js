window.App = window.App || {};

// ---------------- API client ----------------
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.hash !== '#/login') location.hash = '#/login';
    }
    return Promise.reject(err);
  }
);
window.App.api = api;

// ---------------- Auth context ----------------
const AuthContext = React.createContext(null);
window.App.AuthContext = AuthContext;

function AuthProvider({ children }) {
  const [user, setUser] = React.useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => { setUser(data.user); localStorage.setItem('user', JSON.stringify(data.user)); })
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  };
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    location.hash = '#/login';
  };

  const value = { user, loading, login, signup, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function useAuth() { return React.useContext(AuthContext); }
window.App.AuthProvider = AuthProvider;
window.App.useAuth = useAuth;

// ---------------- Hash router ----------------
function useHash() {
  const [hash, setHash] = React.useState(location.hash || '#/');
  React.useEffect(() => {
    const onChange = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}
function navigate(to) { location.hash = to; }
window.App.useHash = useHash;
window.App.navigate = navigate;

function Link({ to, children, className = '', ...props }) {
  return <a href={`#${to}`} className={className} {...props}>{children}</a>;
}
window.App.Link = Link;

// ---------------- Theme (light/dark) ----------------
// The <head> script in index.html already applied the right class before first paint
// (avoids a flash of the wrong theme); this just keeps React state in sync with it.
const ThemeContext = React.createContext(null);
function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
    setTheme(next);
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
function useTheme() { return React.useContext(ThemeContext); }

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-500/10 ${className}`}
    >
      {theme === 'dark'
        ? <Icon path="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.71-.71M6.34 6.34l-.71-.71m12.02 0l-.71.71M6.34 17.66l-.71.71M12 7a5 5 0 100 10 5 5 0 000-10z" size={18} />
        : <Icon path="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" size={18} />}
    </button>
  );
}
window.App.ThemeProvider = ThemeProvider;
window.App.useTheme = useTheme;
window.App.ThemeToggle = ThemeToggle;

// ---------------- Socket.IO ----------------
function useSocket(handlers) {
  const ref = React.useRef(null);
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io('/', { auth: { token }, transports: ['websocket', 'polling'] });
    ref.current = socket;
    Object.keys(handlersRef.current || {}).forEach((event) => {
      socket.on(event, (...args) => handlersRef.current[event]?.(...args));
    });
    return () => socket.disconnect();
  }, []);
  return ref;
}
window.App.useSocket = useSocket;

// ---------------- Small inline icons (no icon library dependency) ----------------
function Icon({ path, size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}
const ICONS = {
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3 1.789 1.789 2.53 2.53 2 3z',
};
function FlameIcon(props) { return <Icon path={ICONS.flame} {...props} />; }
window.App.Icon = Icon;
window.App.FlameIcon = FlameIcon;

// ---------------- Shared UI ----------------
function PageHeader({ title, subtitle, action }) {
  return (
    <div className="glass-light sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b px-8 py-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = '', style, delay }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-up dark:border-slate-800 dark:bg-slate-900 dark:shadow-none ${className}`}
      style={delay !== undefined ? { animationDelay: `${delay}ms`, ...style } : style}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({ value, duration = 700, suffix = '' }) {
  const [display, setDisplay] = React.useState(0);
  const target = Number(value) || 0;
  React.useEffect(() => {
    let frame;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  const rounded = Number.isInteger(target) ? Math.round(display) : Math.round(display * 10) / 10;
  return <span>{rounded}{suffix}</span>;
}

function StatTile({ label, value, suffix = '', hint, tone = 'brand', delay }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  const isNumeric = typeof value === 'number';
  return (
    <Card className="group flex items-center gap-4" delay={delay}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold transition-transform duration-200 group-hover:scale-110 ${tones[tone]}`}>{label[0]}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{isNumeric ? <AnimatedNumber value={value} suffix={suffix} /> : value}</p>
        {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    red: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
  };
  return <span className={`inline-block animate-pop-in rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Button({ children, variant = 'primary', className = '', loading = false, disabled, ...props }) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md disabled:opacity-50',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-md disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <input className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`} {...props} />
    </label>
  );
}

function Select({ label, className = '', children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
      <select className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

function EmptyState({ title, subtitle, action }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>}
      {action}
    </Card>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`shimmer-bg animate-shimmer rounded-lg ${className}`} />;
}

function BarRow({ label, value, max, suffix = '', delay = 0 }) {
  const [pct, setPct] = React.useState(0);
  const target = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  React.useEffect(() => {
    const t = setTimeout(() => setPct(target), 50 + delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">{value}{suffix}</span>
    </div>
  );
}

function Sparkline({ points, height = 60 }) {
  if (!points.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 300;
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => `${i * step},${height - ((p - min) / range) * height}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible">
      <polyline points={coords} fill="none" stroke="#ff5a5f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="animate-draw-line" style={{ strokeDasharray: 1000 }} />
      {points.map((p, i) => (
        <circle key={i} cx={i * step} cy={height - ((p - min) / range) * height} r="3" fill="#d42129"
          className="animate-pop-in" style={{ animationDelay: `${800 + i * 60}ms` }} />
      ))}
    </svg>
  );
}

// ---------------- Toasts ----------------
const ToastContext = React.createContext(null);
let toastId = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = React.useCallback((message, opts = {}) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type: opts.type || 'info' }]);
    setTimeout(() => dismiss(id), opts.duration || 3500);
  }, [dismiss]);

  const toneStyles = {
    success: 'border-brand-200/60 text-brand-800 dark:text-brand-300',
    error: 'border-rose-200/60 text-rose-800 dark:text-rose-300',
    info: 'border-white/50 text-slate-700 dark:text-slate-200',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`glass-light animate-slide-in-right pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${toneStyles[t.type]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
function useToast() { return React.useContext(ToastContext); }

// ---------------- Modal / confirm / prompt dialogs (replaces window.confirm/prompt with animated UI) ----------------
const DialogContext = React.createContext(null);

function DialogProvider({ children }) {
  const [dialog, setDialog] = React.useState(null); // { message, kind: 'confirm'|'prompt', defaultValue, danger, resolve }
  const [closing, setClosing] = React.useState(false);

  const close = (result) => {
    setClosing(true);
    setTimeout(() => { dialog?.resolve(result); setDialog(null); setClosing(false); }, 150);
  };

  const confirmDialog = React.useCallback((message, opts = {}) => new Promise((resolve) => {
    setDialog({ kind: 'confirm', message, danger: opts.danger, confirmLabel: opts.confirmLabel || 'Confirm', resolve });
  }), []);

  const promptDialog = React.useCallback((message, defaultValue = '') => new Promise((resolve) => {
    setDialog({ kind: 'prompt', message, value: defaultValue, resolve });
  }), []);

  return (
    <DialogContext.Provider value={{ confirmDialog, promptDialog }}>
      {children}
      {dialog && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 ${closing ? 'animate-fade-in [animation-direction:reverse]' : 'animate-fade-in'}`}>
          <div className={`glass-light w-full max-w-sm rounded-xl border p-6 shadow-2xl ${closing ? 'animate-pop-in [animation-direction:reverse]' : 'animate-pop-in'}`}>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{dialog.message}</p>
            {dialog.kind === 'prompt' && (
              <input
                autoFocus
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={dialog.value}
                onChange={(e) => setDialog({ ...dialog, value: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && close(dialog.value)}
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(dialog.kind === 'prompt' ? null : false)}>Cancel</Button>
              <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(dialog.kind === 'prompt' ? dialog.value : true)}>
                {dialog.kind === 'prompt' ? 'OK' : dialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
function useDialog() { return React.useContext(DialogContext); }

window.App.PageHeader = PageHeader;
window.App.Card = Card;
window.App.StatTile = StatTile;
window.App.AnimatedNumber = AnimatedNumber;
window.App.Badge = Badge;
window.App.Button = Button;
window.App.Spinner = Spinner;
window.App.Input = Input;
window.App.Select = Select;
window.App.EmptyState = EmptyState;
window.App.Skeleton = Skeleton;
window.App.BarRow = BarRow;
window.App.Sparkline = Sparkline;
window.App.ToastProvider = ToastProvider;
window.App.useToast = useToast;
window.App.DialogProvider = DialogProvider;
window.App.useDialog = useDialog;
