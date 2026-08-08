// `api`, `AuthContext`, `useAuth`, `useHash`, `navigate`, `Link`, `useSocket`, `FlameIcon`,
// and the shared UI components below all come from lib.js (loaded first) as global
// bindings — top-level let/const share one lexical scope across all classic <script>
// tags on the page, so re-declaring them here would throw a duplicate-declaration error.

// ================= Auth pages =================

function Login() {
  const { login } = useAuth();
  const [form, setForm] = React.useState({ email: '', password: '' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '#/admin' : '#/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated animate-gradient-shift flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 animate-pulse-glow"><FlameIcon size={26} /></div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Fitness Coach</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
        </div>
        <form onSubmit={submit} className="animate-pop-in space-y-4 glass-light rounded-xl border p-6 shadow-xl" style={{ animationDelay: '100ms' }}>
          {error && <p className="animate-slide-in-right rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" className="w-full" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">No account? <Link to="/signup" className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400">Sign up</Link></p>
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">Admin demo: admin@fitcoach.ai / Admin@123</p>
      </div>
    </div>
  );
}

function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = React.useState({ name: '', email: '', password: '' });
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate('#/app/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-animated animate-gradient-shift flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 animate-pulse-glow"><FlameIcon size={26} /></div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Create your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Start your personalized fitness journey</p>
        </div>
        <form onSubmit={submit} className="animate-pop-in space-y-4 glass-light rounded-xl border p-6 shadow-xl" style={{ animationDelay: '100ms' }}>
          {error && <p className="animate-slide-in-right rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" className="w-full" loading={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Already have an account? <Link to="/login" className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400">Sign in</Link></p>
      </div>
    </div>
  );
}

// ================= Layout =================

const USER_LINKS = [
  { to: '#/app', label: 'Dashboard' },
  { to: '#/app/onboarding', label: 'Body & Goals' },
  { to: '#/app/diet', label: 'Diet Plan' },
  { to: '#/app/workout', label: 'Workout Plan' },
  { to: '#/app/habits', label: 'Habit Tracker' },
  { to: '#/app/chat', label: 'AI Coach Chat' },
  { to: '#/app/progress', label: 'Progress' },
];

function UserLayout({ hash, children }) {
  const { user, logout } = useAuth();
  const hasStreak = (user?.currentStreak || 0) > 0;
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="glass-light sticky top-0 flex h-screen w-64 flex-col border-r">
        <div className="flex items-center justify-between gap-2 px-6 py-5">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white transition-shadow ${hasStreak ? 'animate-pulse-glow shadow-lg shadow-brand-500/30' : ''}`}><FlameIcon size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">AI Fitness Coach</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{user?.name}</p>
            </div>
          </div>
          <ThemeToggle className="text-slate-500 dark:text-slate-400" />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {USER_LINKS.map((l, i) => (
            <a
              key={l.to}
              href={l.to}
              className={`relative block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 animate-fade-up ${hash === l.to ? 'bg-brand-50 text-brand-700 translate-x-0.5 dark:bg-brand-500/10 dark:text-brand-400' : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {hash === l.to && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-600" />}
              {l.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400">Log out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

// ================= Dashboard =================

const GOAL_LABELS = { weight_loss: 'Weight Loss', weight_gain: 'Weight Gain', muscle_gain: 'Muscle Gain', maintenance: 'Maintenance' };

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = React.useState(null);

  React.useEffect(() => { api.get('/dashboard').then(({ data }) => setData(data)); }, []);

  if (!user?.profile?.goal) {
    return (
      <div className="p-8">
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Let's set up your profile</h2>
          <p className="max-w-md text-sm text-slate-500">Upload your body photos and pick a goal so we can generate your personalized diet and workout plans.</p>
          <Link to="/app/onboarding"><Button>Start onboarding</Button></Link>
        </Card>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  const habits = [...(data.last7Habits || [])].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <div className="p-8">
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle={`Goal: ${GOAL_LABELS[data.goal] || '—'}`} action={<Badge tone="brand">{GOAL_LABELS[data.goal]}</Badge>} />
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Current Streak" value={data.currentStreak} suffix=" days" hint={`Best: ${data.longestStreak} days`} tone="amber" delay={0} />
        <StatTile label="Fitness Score" value={data.fitnessScore} hint="out of 100" tone="brand" delay={60} />
        <StatTile label="Weight" value={data.weightKg ? data.weightKg : '—'} suffix={data.weightKg ? ' kg' : ''} hint={data.weightDeltaKg ? `${data.weightDeltaKg > 0 ? '+' : ''}${data.weightDeltaKg} kg this week` : 'No change logged yet'} delay={120} />
        <StatTile label="Daily Calorie Target" value={data.dailyCalorieTarget ? data.dailyCalorieTarget : '—'} suffix={data.dailyCalorieTarget ? ' kcal' : ''} hint={data.bmiCategory ? `BMI ${data.bmi} · ${data.bmiCategory}` : 'Generate a diet plan'} tone="rose" delay={180} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Last 7 days — water &amp; meals logged</h3>
          {habits.length ? (
            <div className="space-y-3">
              {habits.map((h) => (
                <div key={h._id}>
                  <p className="mb-1 text-xs text-slate-400">{h.date}</p>
                  <BarRow label="Water" value={Math.round(h.waterMl / 100) / 10} max={4} suffix="L" />
                  <BarRow label="Meals" value={h.meals} max={6} />
                </div>
              ))}
            </div>
          ) : <p className="py-10 text-center text-sm text-slate-400">No habit logs yet — start tracking today!</p>}
        </Card>
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Quick actions</h3>
            <p className="text-sm text-slate-500">Keep your plans and habits up to date.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/app/habits"><Button variant="secondary" className="w-full">Log today's habits</Button></Link>
            <Link to="/app/chat"><Button variant="secondary" className="w-full">Ask AI coach</Button></Link>
            <Link to="/app/diet"><Button variant="secondary" className="w-full">View diet plan</Button></Link>
            <Link to="/app/progress"><Button variant="secondary" className="w-full">Log progress</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ================= Onboarding =================

const ANGLES = ['front', 'back', 'left', 'right'];
const GOALS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'weight_gain', label: 'Weight Gain' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'maintenance', label: 'Maintenance' },
];

function Onboarding() {
  const { refreshUser } = useAuth();
  const [step, setStep] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [stats, setStats] = React.useState({ heightCm: '', weightKg: '', age: '', gender: 'male' });
  const [images, setImages] = React.useState({});
  const [analysis, setAnalysis] = React.useState(null);
  const [goalForm, setGoalForm] = React.useState({ goal: 'weight_loss', activityLevel: 'moderate', environment: 'home', dietaryPreference: 'none', allergies: '' });

  const submitBodyAnalysis = async (e) => {
    e.preventDefault();
    setError('');
    if (ANGLES.some((a) => !images[a])) { setError('Please upload all 4 angles (front, back, left, right).'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(stats).forEach(([k, v]) => fd.append(k, v));
      ANGLES.forEach((a) => fd.append(a, images[a]));
      const { data } = await api.post('/onboarding/body-analysis', fd);
      setAnalysis(data.bodyAnalysis);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Body analysis failed');
    } finally { setBusy(false); }
  };

  const submitGoal = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/onboarding/goal', { ...goalForm, allergies: goalForm.allergies.split(',').map((s) => s.trim()).filter(Boolean) });
      await refreshUser();
      navigate('#/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save goal');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-8">
      <PageHeader title="Body Analysis & Goals" subtitle="Step-by-step AI onboarding" />
      <div className="mx-auto mt-6 max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-brand-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        {error && <p className="mb-4 animate-slide-in-right rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
        {step === 1 && (
          <Card key="step1" className="animate-fade-up">
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-50">1. Upload body photos</h2>
            <p className="mb-4 text-sm text-slate-500">MediaPipe-based posture &amp; landmark detection, plus BMI estimation.</p>
            <form onSubmit={submitBodyAnalysis} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Input label="Height (cm)" type="number" required value={stats.heightCm} onChange={(e) => setStats({ ...stats, heightCm: e.target.value })} />
                <Input label="Weight (kg)" type="number" required value={stats.weightKg} onChange={(e) => setStats({ ...stats, weightKg: e.target.value })} />
                <Input label="Age" type="number" value={stats.age} onChange={(e) => setStats({ ...stats, age: e.target.value })} />
              </div>
              <Select label="Gender" value={stats.gender} onChange={(e) => setStats({ ...stats, gender: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </Select>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ANGLES.map((angle) => (
                  <label key={angle} className={`flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-medium capitalize transition ${images[angle] ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'border-slate-300 text-slate-400 hover:border-brand-400 dark:border-slate-700 dark:text-slate-500'}`}>
                    {images[angle] ? '✓' : '+'} {angle}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImages({ ...images, [angle]: e.target.files[0] })} />
                  </label>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Analyzing…' : 'Analyze body'}</Button>
            </form>
          </Card>
        )}
        {step === 2 && (
          <div key="step2" className="animate-fade-up space-y-4">
            {analysis && (
              <Card>
                <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-50">Analysis result</h2>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-slate-400">Posture</p><p className="font-medium text-slate-800 dark:text-slate-100">{analysis.posture}</p></div>
                  <div><p className="text-slate-400">Landmarks</p><p className="font-medium text-slate-800 dark:text-slate-100">{analysis.landmarksDetected} points</p></div>
                  <div><p className="text-slate-400">Estimated BMI</p><p className="font-medium text-slate-800 dark:text-slate-100">{analysis.estimatedBMI} ({analysis.bmiCategory})</p></div>
                </div>
              </Card>
            )}
            <Card>
              <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-50">2. Select your goal</h2>
              <p className="mb-4 text-sm text-slate-500">This drives your diet and workout plan generation.</p>
              <form onSubmit={submitGoal} className="space-y-4">
                <Select label="Goal" value={goalForm.goal} onChange={(e) => setGoalForm({ ...goalForm, goal: e.target.value })}>
                  {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Activity level" value={goalForm.activityLevel} onChange={(e) => setGoalForm({ ...goalForm, activityLevel: e.target.value })}>
                    <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very active</option>
                  </Select>
                  <Select label="Environment" value={goalForm.environment} onChange={(e) => setGoalForm({ ...goalForm, environment: e.target.value })}>
                    <option value="home">Home</option><option value="gym">Gym</option>
                  </Select>
                </div>
                <Input label="Allergies (comma-separated)" placeholder="dairy, nuts, gluten" value={goalForm.allergies} onChange={(e) => setGoalForm({ ...goalForm, allergies: e.target.value })} />
                <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Finish setup'}</Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Diet plan =================

function DietPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = () => api.get('/plans').then(({ data }) => setPlan(data.diet)).finally(() => setLoading(false));
  React.useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.post('/plans/diet');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate a plan.');
    } finally {
      setGenerating(false);
    }
  };

  if (!user?.profile?.goal) {
    return (
      <div className="p-8">
        <PageHeader title="AI Diet Plan" />
        <div className="mt-6 px-8">
          <EmptyState title="Set your goal first" subtitle="Diet plans are generated from your profile — finish onboarding to pick a goal." action={<Link to="/app/onboarding"><Button className="mt-2">Go to onboarding</Button></Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="AI Diet Plan" subtitle="Personalized meals, calories & macros — allergy-aware" action={<Button onClick={generate} disabled={generating}>{generating ? 'Generating…' : plan ? 'Regenerate' : 'Generate plan'}</Button>} />
      <div className="mt-6 px-8">
        {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : !plan ? <EmptyState title="No diet plan yet" subtitle="Generate one based on your goal and profile." /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card><p className="text-xs text-slate-400">Daily target</p><p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{plan.content.dailyCalories} kcal</p></Card>
              <Card><p className="text-xs text-slate-400">Protein</p><p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{plan.content.macros?.proteinG}g</p></Card>
              <Card><p className="text-xs text-slate-400">Carbs</p><p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{plan.content.macros?.carbsG}g</p></Card>
              <Card><p className="text-xs text-slate-400">Fats</p><p className="text-xl font-semibold text-slate-900 dark:text-slate-50">{plan.content.macros?.fatsG}g</p></Card>
            </div>
            {plan.content.allergyAware?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Avoiding:</span>
                {plan.content.allergyAware.map((a) => <Badge key={a} tone="amber">{a}</Badge>)}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {plan.content.meals?.map((meal, i) => (
                <Card key={i} delay={i * 70}>
                  <div className="flex items-center justify-between">
                    <Badge tone="brand">{meal.slot}</Badge>
                    <span className="text-xs text-slate-400">{meal.cals} kcal</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{meal.name}</p>
                  <p className="mt-1 text-xs text-slate-400">P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g</p>
                </Card>
              ))}
            </div>
            <p className="text-xs text-slate-400">{plan.content.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Workout plan =================

function WorkoutPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = () => api.get('/plans').then(({ data }) => setPlan(data.workout)).finally(() => setLoading(false));
  React.useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.post('/plans/workout');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate a plan.');
    } finally {
      setGenerating(false);
    }
  };

  if (!user?.profile?.goal) {
    return (
      <div className="p-8">
        <PageHeader title="AI Workout Plan" />
        <div className="mt-6 px-8">
          <EmptyState title="Set your goal first" subtitle="Workout plans are generated from your profile — finish onboarding to pick a goal." action={<Link to="/app/onboarding"><Button className="mt-2">Go to onboarding</Button></Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="AI Workout Plan" subtitle="Weekly split with sets & reps, tailored to home or gym" action={<Button onClick={generate} disabled={generating}>{generating ? 'Generating…' : plan ? 'Regenerate' : 'Generate plan'}</Button>} />
      <div className="mt-6 px-8">
        {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : !plan ? <EmptyState title="No workout plan yet" subtitle="Generate one based on your goal and environment." /> : (
          <div className="space-y-4">
            <Badge tone="brand">{plan.content.environment === 'gym' ? 'Gym program' : 'Home program'}</Badge>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plan.content.weeklySplit?.map((day, i) => (
                <Card key={i} delay={i * 60}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{day.day}</p>
                    <Badge tone={day.focus === 'Rest' ? 'slate' : 'brand'}>{day.focus}</Badge>
                  </div>
                  {day.exercises?.length ? (
                    <ul className="mt-3 space-y-2">
                      {day.exercises.map((ex, j) => (
                        <li key={j} className="flex items-center justify-between text-sm text-slate-600 transition-colors hover:text-slate-900 dark:hover:text-slate-100">
                          <span>{ex.name}</span><span className="text-xs text-slate-400">{ex.sets}x{ex.reps}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-sm text-slate-400">Rest & recover.</p>}
                </Card>
              ))}
            </div>
            <p className="text-xs text-slate-400">{plan.content.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Habit tracker =================

const todayStr = () => new Date().toISOString().slice(0, 10);

function HabitTracker() {
  const [habits, setHabits] = React.useState([]);
  const [streaks, setStreaks] = React.useState({ currentStreak: 0, longestStreak: 0 });
  const [form, setForm] = React.useState({ meals: 0, waterMl: 0, workoutDone: false, sleepHours: 0 });
  const [saving, setSaving] = React.useState(false);

  const load = () => api.get('/habits').then(({ data }) => {
    setHabits(data.habits);
    setStreaks({ currentStreak: data.currentStreak, longestStreak: data.longestStreak });
    const today = data.habits.find((h) => h.date === todayStr());
    if (today) setForm({ meals: today.meals, waterMl: today.waterMl, workoutDone: today.workoutDone, sleepHours: today.sleepHours });
  });

  React.useEffect(() => { load(); }, []);
  useSocket({ 'habit:update': () => load() });

  const save = async (e) => { e.preventDefault(); setSaving(true); try { await api.post('/habits', form); await load(); } finally { setSaving(false); } };

  return (
    <div className="p-8">
      <PageHeader title="Daily Habit Tracker" subtitle="Meals, water, workout, sleep — build your streak" />
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 sm:grid-cols-2">
        <StatTile label="Current Streak" value={`${streaks.currentStreak} days`} tone="amber" />
        <StatTile label="Longest Streak" value={`${streaks.longestStreak} days`} tone="brand" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Log today ({todayStr()})</h3>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Meals logged: {form.meals}</label>
              <input type="range" min="0" max="6" value={form.meals} onChange={(e) => setForm({ ...form, meals: Number(e.target.value) })} className="w-full accent-brand-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Water: {(form.waterMl / 1000).toFixed(1)} L</label>
              <input type="range" min="0" max="4000" step="250" value={form.waterMl} onChange={(e) => setForm({ ...form, waterMl: Number(e.target.value) })} className="w-full accent-brand-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Sleep: {form.sleepHours}h</label>
              <input type="range" min="0" max="12" value={form.sleepHours} onChange={(e) => setForm({ ...form, sleepHours: Number(e.target.value) })} className="w-full accent-brand-600" />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.workoutDone} onChange={(e) => setForm({ ...form, workoutDone: e.target.checked })} className="h-4 w-4 accent-brand-600" />
              Workout completed
            </label>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Save today'}</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent history</h3>
          <div className="space-y-2">
            {habits.slice(0, 10).map((h, i) => (
              <div key={h._id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 text-sm transition-colors animate-fade-up hover:bg-slate-50 dark:hover:bg-slate-800/60" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="text-slate-600">{h.date}</span>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{h.meals} meals</span><span>{(h.waterMl / 1000).toFixed(1)}L</span><span>{h.sleepHours}h sleep</span>
                  <Badge tone={h.goalsMet ? 'green' : 'slate'}>{h.goalsMet ? 'Goal met' : 'Missed'}</Badge>
                </div>
              </div>
            ))}
            {!habits.length && <p className="text-sm text-slate-400">No habit logs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ================= Chat =================

function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => { api.get('/chat').then(({ data }) => setMessages(data.messages)); }, []);
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    setMessages((m) => [...m, { sender: 'user', text }]);
    setSending(true);
    try {
      const { data } = await api.post('/chat', { message: text });
      setMessages((m) => [...m, { sender: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages((m) => [...m, { sender: 'ai', text: err.response?.data?.message || 'Something went wrong.' }]);
    } finally { setSending(false); }
  };

  if (user?.chatBlocked) {
    return (
      <div className="p-8">
        <PageHeader title="AI Coach Chat" />
        <div className="mx-auto mt-10 max-w-md px-8">
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-medium text-slate-800 dark:text-slate-100">Chat access blocked</p>
            <p className="text-sm text-slate-500">An admin has restricted your chatbot access.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-8">
      <PageHeader title="AI Coach Chat" subtitle="Context-aware answers using your plan & progress (RAG)" />
      <div className="mt-6 flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {!messages.length && <p className="animate-fade-in text-center text-sm text-slate-400">Ask about your diet, workouts, streaks, or progress.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 animate-slide-in-up ${m.sender === 'user' ? 'justify-end' : ''}`}>
              {m.sender === 'ai' && <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"><FlameIcon size={14} /></div>}
              <div className={`max-w-lg rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.sender === 'user' ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}>{m.text}</div>
            </div>
          ))}
          {sending && (
            <div className="flex items-end gap-2 animate-slide-in-up">
              <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"><FlameIcon size={14} /></div>
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-800 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce-sm rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce-sm rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce-sm rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your AI coach…" className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
          <button type="submit" disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-all duration-150 hover:bg-brand-700 active:scale-90 disabled:opacity-40">
            <Icon path="M5 12h14M13 6l6 6-6 6" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ================= Progress =================

function Progress() {
  const [entries, setEntries] = React.useState([]);
  const [weightKg, setWeightKg] = React.useState('');
  const [images, setImages] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [latestInsight, setLatestInsight] = React.useState('');

  const load = () => api.get('/progress').then(({ data }) => setEntries(data.entries));
  React.useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('weightKg', weightKg);
      ANGLES.forEach((a) => images[a] && fd.append(a, images[a]));
      const { data } = await api.post('/progress', fd);
      setLatestInsight(data.entry.aiInsights);
      setImages({});
      setWeightKg('');
      await load();
    } finally { setSaving(false); }
  };

  const weights = [...entries].reverse().map((e) => e.weightKg).filter((w) => typeof w === 'number');
  const latestWithPhoto = entries.find((e) => e.photos?.front);
  const previousWithPhoto = entries.slice(1).find((e) => e.photos?.front);

  return (
    <div className="p-8">
      <PageHeader title="Weekly Progress Tracking" subtitle="Photo comparison & AI insights" />
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Log this week</h3>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Current weight (kg)" type="number" step="0.1" required value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            <div className="grid grid-cols-4 gap-2">
              {ANGLES.map((angle) => (
                <label key={angle} className={`flex h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[11px] font-medium capitalize ${images[angle] ? 'border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400' : 'border-slate-300 text-slate-400 hover:border-brand-400 dark:border-slate-700 dark:text-slate-500'}`}>
                  {images[angle] ? '✓' : '+'} {angle}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImages({ ...images, [angle]: e.target.files[0] })} />
                </label>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Save weekly entry'}</Button>
          </form>
          {latestInsight && <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">{latestInsight}</p>}
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Weight trend</h3>
          {weights.length ? <Sparkline points={weights} /> : <p className="py-10 text-center text-sm text-slate-400">No entries yet.</p>}
        </Card>
      </div>
      <div className="mt-6 px-8">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Photo comparison (front)</h3>
          {latestWithPhoto ? (
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <div><p className="mb-1 text-xs text-slate-400">Previous</p>{previousWithPhoto ? <img src={previousWithPhoto.photos.front} className="rounded-lg border border-slate-200 dark:border-slate-800" /> : <p className="text-xs text-slate-400">No earlier photo</p>}</div>
              <div><p className="mb-1 text-xs text-slate-400">Latest ({latestWithPhoto.weekOf})</p><img src={latestWithPhoto.photos.front} className="rounded-lg border border-slate-200 dark:border-slate-800" /></div>
            </div>
          ) : <p className="text-sm text-slate-400">Upload a front photo with your weekly entry to compare over time.</p>}
        </Card>
      </div>
    </div>
  );
}

window.App.userRoutes = {
  '': Dashboard,
  onboarding: Onboarding,
  diet: DietPlan,
  workout: WorkoutPlan,
  habits: HabitTracker,
  chat: Chat,
  progress: Progress,
};
window.App.Login = Login;
window.App.Signup = Signup;
window.App.UserLayout = UserLayout;
