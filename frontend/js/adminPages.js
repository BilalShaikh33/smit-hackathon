const ADMIN_LINKS = [
  { to: '#/admin', label: 'Analytics' },
  { to: '#/admin/users', label: 'User Management' },
  { to: '#/admin/ai-output', label: 'AI Output Monitoring' },
  { to: '#/admin/images', label: 'Image Moderation' },
  { to: '#/admin/plans', label: 'Plan Management' },
  { to: '#/admin/chats', label: 'Chat Moderation' },
  { to: '#/admin/logs', label: 'Reports & Logs' },
];

function AdminLayout({ hash, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="glass-dark sticky top-0 flex h-screen w-64 flex-col border-r text-white">
        <div className="flex items-center justify-between gap-2 px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20"><FlameIcon size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-white">Admin Panel</p>
              <p className="text-xs text-slate-400">{user?.name}</p>
            </div>
          </div>
          <ThemeToggle className="text-slate-400 hover:text-white" />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {ADMIN_LINKS.map((l, i) => (
            <a
              key={l.to}
              href={l.to}
              className={`relative block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 animate-fade-up ${hash === l.to ? 'bg-brand-500/10 text-brand-400 translate-x-0.5' : 'text-slate-300 hover:translate-x-0.5 hover:bg-slate-800'}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {hash === l.to && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-400" />}
              {l.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-400">Log out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">{children}</main>
    </div>
  );
}

// ================= Analytics =================

function AdminAnalytics() {
  const [data, setData] = React.useState(null);
  React.useEffect(() => { api.get('/admin/analytics').then(({ data }) => setData(data)); }, []);
  if (!data) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <PageHeader title="Analytics Dashboard" subtitle="Platform-wide activity and engagement" />
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Users" value={data.totalUsers} hint={`${data.totalAdmins} admins`} delay={0} />
        <StatTile label="Daily Active Users" value={data.dau} hint={`${data.wau} weekly active`} tone="brand" delay={60} />
        <StatTile label="Plan Completion" value={data.planCompletionRate} suffix="%" hint="active vs total plans" tone="amber" delay={120} />
        <StatTile label="Avg. Fitness Score" value={data.avgFitnessScore} hint="out of 100" tone="rose" delay={180} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 px-8 sm:grid-cols-2">
        <StatTile label="Chatbot Messages" value={data.chatbotUsage.totalMessages} hint={`${data.chatbotUsage.totalChats} conversations`} delay={240} />
        <StatTile label="Banned Users" value={data.bannedUsers} tone="rose" delay={300} />
      </div>
      <div className="mt-6 px-8">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">About this data</h3>
          <p className="text-sm text-slate-500">DAU/WAU are computed from each user's last login timestamp. Plan completion rate compares active vs. total generated plans. Chatbot usage aggregates every logged conversation across all users.</p>
        </Card>
      </div>
    </div>
  );
}

// ================= User management =================

const STATUS_TONE = { active: 'green', banned: 'red', deactivated: 'slate' };

function UserManagement() {
  const { promptDialog } = useDialog();
  const toast = useToast();
  const [users, setUsers] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [expanded, setExpanded] = React.useState(null);
  const [detail, setDetail] = React.useState(null);

  const load = () => {
    const params = { limit: 50 };
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/admin/users', { params }).then(({ data }) => setUsers(data.users));
  };
  React.useEffect(() => { load(); }, [status]); // eslint-disable-line

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const { data } = await api.get(`/admin/users/${id}`);
    setDetail(data);
  };

  const setUserStatus = async (id, newStatus) => {
    let reason;
    if (newStatus === 'banned') {
      reason = await promptDialog('Ban reason (optional):', '');
      if (reason === null) return;
    }
    await api.patch(`/admin/users/${id}/status`, { status: newStatus, reason });
    toast(`User ${newStatus}.`, { type: newStatus === 'banned' ? 'error' : 'success' });
    load();
  };

  return (
    <div className="p-8">
      <PageHeader title="User Management" subtitle="View, search, filter, and moderate user accounts" />
      <div className="mt-6 px-8">
        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex-1">
              <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
            <Button variant="secondary" onClick={load}>Search</Button>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="">All statuses</option><option value="active">Active</option><option value="banned">Banned</option><option value="deactivated">Deactivated</option>
            </Select>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Fitness Score</th><th className="px-4 py-2">Streak</th><th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <React.Fragment key={u._id}>
                    <tr className="animate-fade-up border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        <button onClick={() => toggleExpand(u._id)} className="transition-colors hover:text-brand-700">{expanded === u._id ? '▾' : '▸'} {u.name}</button>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
                      <td className="px-4 py-3">{u.fitnessScore}</td>
                      <td className="px-4 py-3">{u.currentStreak}d</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {u.status !== 'banned' && <Button variant="danger" onClick={() => setUserStatus(u._id, 'banned')}>Ban</Button>}
                          {u.status !== 'active' && <Button variant="secondary" onClick={() => setUserStatus(u._id, 'active')}>Activate</Button>}
                          {u.status !== 'deactivated' && <Button variant="secondary" onClick={() => setUserStatus(u._id, 'deactivated')}>Deactivate</Button>}
                        </div>
                      </td>
                    </tr>
                    {expanded === u._id && detail && (
                      <tr className="animate-fade-in border-t border-slate-100 dark:border-slate-800 bg-slate-50">
                        <td colSpan={6} className="px-4 py-3 text-sm text-slate-600">
                          <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-xs text-slate-400">Last login</p><p>{detail.activity.lastLogin ? new Date(detail.activity.lastLogin).toLocaleString() : 'Never'}</p></div>
                            <div><p className="text-xs text-slate-400">Plans generated</p><p>{detail.activity.planUsage}</p></div>
                            <div><p className="text-xs text-slate-400">Progress entries</p><p>{detail.activity.progressStats.length}</p></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {!users.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ================= AI output monitoring =================

const TEMPLATE_KEYS = [
  { key: 'diet', label: 'Diet plan prompt' },
  { key: 'workout', label: 'Workout plan prompt' },
  { key: 'chat', label: 'Chatbot prompt' },
];

function AIOutputMonitoring() {
  const { promptDialog } = useDialog();
  const toast = useToast();
  const [plans, setPlans] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [templates, setTemplates] = React.useState({});
  const [savingKey, setSavingKey] = React.useState('');

  const loadPlans = () => {
    const params = {};
    if (typeFilter) params.type = typeFilter;
    api.get('/admin/plans', { params }).then(({ data }) => setPlans(data.plans));
  };
  const loadTemplates = () => api.get('/admin/prompt-templates').then(({ data }) => {
    const map = {};
    data.templates.forEach((t) => { map[t.key] = t.instructions; });
    setTemplates(map);
  });

  React.useEffect(() => { loadPlans(); }, [typeFilter]); // eslint-disable-line
  React.useEffect(() => { loadTemplates(); }, []);

  const saveTemplate = async (key) => {
    setSavingKey(key);
    try {
      await api.put(`/admin/prompt-templates/${key}`, { instructions: templates[key] || '' });
      toast('Prompt template saved.', { type: 'success' });
    } finally { setSavingKey(''); }
  };

  const toggleFlag = async (plan) => {
    let reason;
    if (!plan.flagged) {
      reason = await promptDialog('Flag reason:', 'Flagged by admin');
      if (reason === null) return;
    }
    await api.patch(`/admin/plans/${plan._id}/flag`, { flagged: !plan.flagged, flagReason: reason });
    toast(plan.flagged ? 'Plan unflagged.' : 'Plan flagged.', { type: plan.flagged ? 'success' : 'error' });
    loadPlans();
  };

  return (
    <div className="p-8">
      <PageHeader title="AI Output Monitoring" subtitle="Review generated plans and tune AI prompt templates" />
      <div className="mt-6 px-8">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Admin-controlled AI tuning</h3>
          <div className="space-y-4">
            {TEMPLATE_KEYS.map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                <div className="flex gap-2">
                  <textarea rows={2} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Additional instructions appended to the AI prompt (used only when OPENAI_API_KEY is set)…"
                    value={templates[key] || ''} onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })} />
                  <Button variant="secondary" onClick={() => saveTemplate(key)} disabled={savingKey === key}>{savingKey === key ? 'Saving…' : 'Save'}</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-6 px-8">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generated plans</h3>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
              <option value="">All types</option><option value="diet">Diet</option><option value="workout">Workout</option>
            </Select>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">User</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Goal</th>
                  <th className="px-4 py-2">Source</th><th className="px-4 py-2">Flag</th><th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p, i) => (
                  <tr key={p._id} className="animate-fade-up border-t border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-3">{p.user?.name || '—'}</td>
                    <td className="px-4 py-3 capitalize">{p.type}</td>
                    <td className="px-4 py-3 capitalize">{p.goal?.replace('_', ' ')}</td>
                    <td className="px-4 py-3"><Badge>{p.source}</Badge></td>
                    <td className="px-4 py-3">{p.flagged ? <Badge tone="red">{p.flagReason || 'Flagged'}</Badge> : <Badge tone="green">OK</Badge>}</td>
                    <td className="px-4 py-3 text-right"><Button variant={p.flagged ? 'secondary' : 'danger'} onClick={() => toggleFlag(p)}>{p.flagged ? 'Unflag' : 'Flag'}</Button></td>
                  </tr>
                ))}
                {!plans.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No plans generated yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ================= Image moderation =================

function ImageModeration() {
  const { confirmDialog } = useDialog();
  const toast = useToast();
  const [items, setItems] = React.useState([]);
  const load = () => api.get('/admin/images').then(({ data }) => setItems(data.items));
  React.useEffect(() => { load(); }, []);

  const remove = async (item) => {
    if (!(await confirmDialog(`Delete ${item.angle} photo for ${item.userName}?`, { danger: true, confirmLabel: 'Delete' }))) return;
    await api.delete(`/admin/images/${item.userId}/${item.angle}`);
    toast('Image removed.', { type: 'success' });
    load();
  };

  return (
    <div className="p-8">
      <PageHeader title="Image Moderation" subtitle="Review uploaded body images and remove flagged content" />
      <div className="mt-6 px-8">
        {!items.length ? <EmptyState title="No body images uploaded yet" /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, i) => (
              <Card key={`${item.userId}-${item.angle}`} delay={i * 40} className="overflow-hidden p-0">
                <img src={item.url} className="h-40 w-full object-cover" />
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.userName}</p>
                  <p className="text-xs text-slate-400">{item.userEmail}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone="brand">{item.angle}</Badge>
                    <Button variant="danger" onClick={() => remove(item)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= Plan management =================

function PlanManagement() {
  const toast = useToast();
  const [templates, setTemplates] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [form, setForm] = React.useState({ type: 'diet', templateName: '', goal: 'weight_loss', contentJson: '{\n  "dailyCalories": 1800,\n  "meals": []\n}' });
  const [assignTarget, setAssignTarget] = React.useState({});
  const [error, setError] = React.useState('');

  const loadTemplates = () => api.get('/admin/plan-templates').then(({ data }) => setTemplates(data.templates));
  const loadUsers = () => api.get('/admin/users', { params: { limit: 100 } }).then(({ data }) => setUsers(data.users));
  React.useEffect(() => { loadTemplates(); loadUsers(); }, []);

  const createTemplate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const content = JSON.parse(form.contentJson);
      await api.post('/admin/plan-templates', { type: form.type, templateName: form.templateName, goal: form.goal, content });
      setForm({ ...form, templateName: '' });
      toast('Template created.', { type: 'success' });
      loadTemplates();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid JSON content or request failed');
    }
  };

  const assign = async (templateId) => {
    const userId = assignTarget[templateId];
    if (!userId) return;
    await api.post('/admin/plans/assign', { templateId, userId });
    toast('Plan assigned to user.', { type: 'success' });
  };

  return (
    <div className="p-8">
      <PageHeader title="Plan Management" subtitle="Create manual templates and assign plans to users (override system)" />
      <div className="mt-6 grid grid-cols-1 gap-4 px-8 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Create a manual template</h3>
          {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
          <form onSubmit={createTemplate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="diet">Diet</option><option value="workout">Workout</option>
              </Select>
              <Select label="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                <option value="weight_loss">Weight loss</option><option value="weight_gain">Weight gain</option><option value="muscle_gain">Muscle gain</option><option value="maintenance">Maintenance</option>
              </Select>
            </div>
            <Input label="Template name" required value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Content (JSON)</span>
              <textarea rows={6} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={form.contentJson} onChange={(e) => setForm({ ...form, contentJson: e.target.value })} />
            </label>
            <Button type="submit" className="w-full">Create template</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Existing templates</h3>
          {!templates.length ? <EmptyState title="No templates yet" /> : (
            <div className="space-y-3">
              {templates.map((t, i) => (
                <div key={t._id} className="animate-fade-up rounded-lg border border-slate-200 p-3 transition-shadow hover:shadow-sm dark:border-slate-800" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.templateName}</p>
                    <Badge tone="brand">{t.type}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">Goal: {t.goal?.replace('_', ' ')}</p>
                  <div className="mt-2 flex gap-2">
                    <Select value={assignTarget[t._id] || ''} onChange={(e) => setAssignTarget({ ...assignTarget, [t._id]: e.target.value })} className="flex-1">
                      <option value="">Assign to user…</option>
                      {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                    </Select>
                    <Button variant="secondary" onClick={() => assign(t._id)}>Assign</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ================= Chat moderation =================

function ChatModeration() {
  const [chats, setChats] = React.useState([]);
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [expanded, setExpanded] = React.useState(null);

  const load = () => api.get('/admin/chats', { params: flaggedOnly ? { flaggedOnly: true } : {} }).then(({ data }) => setChats(data.chats));
  React.useEffect(() => { load(); }, [flaggedOnly]); // eslint-disable-line

  const setBlocked = async (userId, blocked) => { await api.patch(`/admin/chats/${userId}/block`, { blocked }); load(); };

  return (
    <div className="p-8">
      <PageHeader title="Chat Moderation" subtitle="Review chatbot conversations and block abusive users"
        action={<Button variant={flaggedOnly ? 'primary' : 'secondary'} onClick={() => setFlaggedOnly(!flaggedOnly)}>{flaggedOnly ? 'Showing flagged only' : 'Show flagged only'}</Button>} />
      <div className="mt-6 space-y-3 px-8">
        {!chats.length && <EmptyState title="No conversations found" />}
        {chats.map((chat, i) => (
          <Card key={chat._id} delay={i * 50} className="p-0">
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setExpanded(expanded === chat._id ? null : chat._id)} className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {expanded === chat._id ? '▾' : '▸'} {chat.user?.name || 'Unknown user'} <span className="text-xs text-slate-400">({chat.user?.email})</span>
              </button>
              <div className="flex items-center gap-2">
                {chat.messages.some((m) => m.flagged) && <Badge tone="red">Flagged content</Badge>}
                {chat.user?.chatBlocked ? <Button variant="secondary" onClick={() => setBlocked(chat.user._id, false)}>Unblock</Button> : <Button variant="danger" onClick={() => setBlocked(chat.user._id, true)}>Block</Button>}
              </div>
            </div>
            {expanded === chat._id && (
              <div className="max-h-72 space-y-2 overflow-y-auto border-t border-slate-100 dark:border-slate-800 p-4">
                {chat.messages.map((m, i) => (
                  <div key={i} className={`flex animate-fade-up ${m.sender === 'user' ? 'justify-end' : ''}`} style={{ animationDelay: `${i * 25}ms` }}>
                    <div className={`max-w-md rounded-lg px-3 py-1.5 text-sm ${m.sender === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'} ${m.flagged ? 'ring-2 ring-rose-400' : ''}`}>
                      {m.text}
                      {m.flagged && <p className="mt-1 text-[10px] uppercase tracking-wide text-rose-500">Flagged: {m.flagReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ================= Reports & logs =================

const TABS = ['System Logs', 'Admin Actions', 'AI Usage'];
const TYPE_TONE = { error: 'red', ai_usage: 'brand', info: 'slate' };

function ReportsLogs() {
  const [tab, setTab] = React.useState('System Logs');
  const [systemLogs, setSystemLogs] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [adminLogs, setAdminLogs] = React.useState([]);
  const [aiUsage, setAiUsage] = React.useState([]);

  React.useEffect(() => {
    if (tab === 'System Logs') api.get('/admin/logs/system', { params: typeFilter ? { type: typeFilter } : {} }).then(({ data }) => setSystemLogs(data.logs));
    else if (tab === 'Admin Actions') api.get('/admin/logs/admin').then(({ data }) => setAdminLogs(data.logs));
    else api.get('/admin/logs/ai-usage').then(({ data }) => setAiUsage(data.summary));
  }, [tab, typeFilter]);

  return (
    <div className="p-8">
      <PageHeader title="Reports & Logs" subtitle="System logs, AI usage (API calls/tokens), and error tracking" />
      <div className="mt-6 px-8">
        <div className="mb-4 flex gap-2">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</button>)}
        </div>
        {tab === 'System Logs' && (
          <Card>
            <div className="mb-3 flex justify-end">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
                <option value="">All types</option><option value="info">Info</option><option value="ai_usage">AI usage</option><option value="error">Error</option>
              </Select>
            </div>
            {!systemLogs.length ? <EmptyState title="No logs yet" /> : (
              <div className="space-y-2">
                {systemLogs.map((l, i) => (
                  <div key={l._id} className="flex animate-fade-up items-start justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60" style={{ animationDelay: `${i * 25}ms` }}>
                    <div><p className="text-slate-700 dark:text-slate-300">{l.message}</p><p className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString()}</p></div>
                    <Badge tone={TYPE_TONE[l.type]}>{l.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        {tab === 'Admin Actions' && (
          <Card>
            {!adminLogs.length ? <EmptyState title="No admin actions logged yet" /> : (
              <div className="space-y-2">
                {adminLogs.map((l, i) => (
                  <div key={l._id} className="flex animate-fade-up items-start justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60" style={{ animationDelay: `${i * 25}ms` }}>
                    <div>
                      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium">{l.admin?.name}</span> — {l.action}</p>
                      {l.details && <p className="text-xs text-slate-400">{l.details}</p>}
                      <p className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge>{l.targetType}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        {tab === 'AI Usage' && (
          <Card>
            {!aiUsage.length ? <EmptyState title="No AI calls logged yet" subtitle="Runs on the rule-based engine until OPENAI_API_KEY is set." /> : (
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-2">Endpoint</th><th className="px-4 py-2">Calls</th><th className="px-4 py-2">Total tokens</th></tr></thead>
                <tbody>{aiUsage.map((row) => <tr key={row._id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3">{row._id || 'unknown'}</td><td className="px-4 py-3">{row.calls}</td><td className="px-4 py-3">{row.totalTokens || 0}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

window.App.adminRoutes = {
  '': AdminAnalytics,
  users: UserManagement,
  'ai-output': AIOutputMonitoring,
  images: ImageModeration,
  plans: PlanManagement,
  chats: ChatModeration,
  logs: ReportsLogs,
};
window.App.AdminLayout = AdminLayout;
