import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, ChartNoAxesCombined, Settings,
  Plus, Search, Download, Pencil, Trash2, X, TrendingUp, TrendingDown,
  PiggyBank, CircleDollarSign, ChevronDown, CalendarDays, Menu, CheckCircle2,
  AlertCircle, Tags, Landmark
} from 'lucide-react'

type Kind = 'income' | 'expense'
type Transaction = {
  id: string; kind: Kind; description: string; category: string;
  amount: number; date: string; notes?: string
}
type Budget = { category: string; limit: number }
type Page = 'dashboard' | 'transactions' | 'budgets' | 'reports' | 'settings'
const KEY = 'finanzas-personales-v1'
const categories = {
  income: ['Salario', 'Freelance', 'Ventas', 'Inversiones', 'Otros ingresos'],
  expense: ['Alimentación', 'Vivienda', 'Transporte', 'Salud', 'Educación', 'Servicios', 'Entretenimiento', 'Compras', 'Otros gastos']
}
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)
const seed: Transaction[] = [
  { id: 'seed1', kind: 'income', description: 'Salario mensual', category: 'Salario', amount: 3200000, date: `${currentMonth}-01` },
  { id: 'seed2', kind: 'expense', description: 'Mercado', category: 'Alimentación', amount: 185000, date: `${currentMonth}-03` },
  { id: 'seed3', kind: 'expense', description: 'Arriendo', category: 'Vivienda', amount: 850000, date: `${currentMonth}-05` },
  { id: 'seed4', kind: 'expense', description: 'Transporte', category: 'Transporte', amount: 96000, date: `${currentMonth}-07` },
  { id: 'seed5', kind: 'expense', description: 'Internet y celular', category: 'Servicios', amount: 112000, date: `${currentMonth}-09` },
  { id: 'seed6', kind: 'income', description: 'Trabajo independiente', category: 'Freelance', amount: 350000, date: `${currentMonth}-12` },
  { id: 'seed7', kind: 'expense', description: 'Almuerzo', category: 'Alimentación', amount: 28000, date: `${currentMonth}-14` },
]
const defaultBudgets: Budget[] = [
  { category: 'Alimentación', limit: 450000 }, { category: 'Vivienda', limit: 900000 },
  { category: 'Transporte', limit: 200000 }, { category: 'Servicios', limit: 180000 },
  { category: 'Entretenimiento', limit: 150000 }
]
function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as { transactions: Transaction[]; budgets: Budget[] }
  } catch { /* use demo data when browser storage is unavailable */ }
  return { transactions: seed, budgets: defaultBudgets }
}
function money(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}
function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

export default function App() {
  const [stored, setStored] = useState(loadData)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [syncReady, setSyncReady] = useState(false)
  const [syncUserId, setSyncUserId] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [page, setPage] = useState<Page>('dashboard')
  const [month, setMonth] = useState(currentMonth)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ kind: 'expense' as Kind, description: '', category: 'Alimentación', amount: '', date: today, notes: '' })
  const [budgetForm, setBudgetForm] = useState({ category: 'Alimentación', limit: '' })
  const [currency, setCurrency] = useState('COP')

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthReady(true) })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) { setSyncReady(false); return }
    let cancelled = false
    setSyncReady(false); setSyncUserId(null)
    ;(async () => {
      const userId = session.user.id
      const [profileResult, dataResult] = await Promise.all([
        supabase!.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
        supabase!.from('finance_data').select('payload').eq('user_id', userId).maybeSingle()
      ])
      if (cancelled) return
      if (profileResult.error) setToast(`No se pudo cargar el perfil: ${profileResult.error.message}`)
      const name = profileResult.data?.display_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Usuario'
      setDisplayName(name); setNameDraft(name)
      if (dataResult.error) { setToast(`No se pudieron cargar los datos. Revisa que ejecutaste supabase/schema.sql: ${dataResult.error.message}`); return }
      else if (dataResult.data?.payload && typeof dataResult.data.payload === 'object') {
        const payload = dataResult.data.payload as { transactions?: Transaction[]; budgets?: Budget[] }
        if (Array.isArray(payload.transactions) && Array.isArray(payload.budgets)) setStored({ transactions: payload.transactions, budgets: payload.budgets })
      } else {
        const initialData = { transactions: seed, budgets: defaultBudgets }
        setStored(initialData)
        const { error } = await supabase!.from('finance_data').upsert({ user_id: userId, payload: initialData, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        if (error) setToast(`No se pudieron inicializar los datos: ${error.message}`)
      }
      setSyncUserId(userId); setSyncReady(true)
    })()
    return () => { cancelled = true }
  }, [session?.user.id])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(stored)) } catch { /* local cache */ }
    if (!session || !syncReady || syncUserId !== session.user.id || !supabase) return
    const timer = window.setTimeout(async () => {
      const { error } = await supabase!.from('finance_data').upsert({ user_id: session.user.id, payload: stored, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) setToast(`Error al sincronizar datos: ${error.message}`)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [stored, session?.user.id, syncReady, syncUserId])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthMessage('')
    if (!supabase) return
    if (!authEmail.trim() || authPassword.length < 6) { setAuthError('Escribe un correo válido y una contraseña de al menos 6 caracteres.'); return }
    setAuthBusy(true)
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { display_name: displayName.trim() || authEmail.split('@')[0] } } })
        if (error) throw error
        if (!data.session) setAuthMessage('Cuenta creada. Revisa tu correo para confirmar el registro y después inicia sesión.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : 'No se pudo completar la autenticación.') }
    finally { setAuthBusy(false) }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    const cleaned = nameDraft.trim()
    if (!cleaned || cleaned.length > 60) { setToast('El nombre debe tener entre 1 y 60 caracteres.'); return }
    if (!session || !supabase) return
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, display_name: cleaned, updated_at: new Date().toISOString() })
    if (error) { setToast(`No se pudo guardar el nombre: ${error.message}`); return }
    setDisplayName(cleaned); setToast('Nombre de usuario actualizado.')
  }

  const signOut = async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) setToast(`No se pudo cerrar sesión: ${error.message}`) } }

  const monthTransactions = useMemo(() => stored.transactions.filter(t => t.date.startsWith(month)), [stored.transactions, month])
  const income = monthTransactions.filter(t => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = monthTransactions.filter(t => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses
  const filtered = useMemo(() => stored.transactions
    .filter(t => t.date.startsWith(month))
    .filter(t => kindFilter === 'all' || t.kind === kindFilter)
    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
    .filter(t => `${t.description} ${t.category} ${t.notes || ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [stored.transactions, month, kindFilter, categoryFilter, query])

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    monthTransactions.filter(t => t.kind === 'expense').forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [monthTransactions])
  const monthName = new Date(`${month}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const nav = [
    { id: 'dashboard' as Page, label: 'Resumen', icon: LayoutDashboard },
    { id: 'transactions' as Page, label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'budgets' as Page, label: 'Presupuestos', icon: Wallet },
    { id: 'reports' as Page, label: 'Reportes', icon: ChartNoAxesCombined },
    { id: 'settings' as Page, label: 'Configuración', icon: Settings },
  ]
  const openNew = (kind: Kind = 'expense') => {
    setEditing(null)
    setForm({ kind, description: '', category: categories[kind][0], amount: '', date: today, notes: '' })
    setModal(true)
  }
  const openEdit = (t: Transaction) => {
    setEditing(t)
    setForm({ kind: t.kind, description: t.description, category: t.category, amount: String(t.amount), date: t.date, notes: t.notes || '' })
    setModal(true)
  }
  const saveTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim() || !form.date || !Number.isFinite(amount) || amount <= 0) {
      setToast('Completa los campos y utiliza un valor mayor que cero.')
      return
    }
    const transaction: Transaction = { ...form, id: editing?.id || uid(), description: form.description.trim(), amount, notes: form.notes.trim() }
    setStored(prev => ({ ...prev, transactions: editing ? prev.transactions.map(t => t.id === editing.id ? transaction : t) : [transaction, ...prev.transactions] }))
    setMonth(form.date.slice(0, 7))
    setModal(false)
    setToast(editing ? 'Movimiento actualizado.' : 'Movimiento guardado.')
  }
  const deleteTransaction = (id: string) => {
    if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return
    setStored(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }))
    setToast('Movimiento eliminado.')
  }
  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault()
    const limit = Number(budgetForm.limit)
    if (!Number.isFinite(limit) || limit <= 0) { setToast('El presupuesto debe ser mayor que cero.'); return }
    setStored(prev => ({ ...prev, budgets: [...prev.budgets.filter(b => b.category !== budgetForm.category), { category: budgetForm.category, limit }].sort((a,b) => a.category.localeCompare(b.category)) }))
    setBudgetForm({ category: 'Alimentación', limit: '' })
    setToast('Presupuesto guardado.')
  }
  const removeBudget = (category: string) => setStored(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.category !== category) }))
  const exportCsv = () => {
    const rows = [['Fecha','Tipo','Descripción','Categoría','Valor','Notas'], ...filtered.map(t => [t.date, t.kind === 'income' ? 'Ingreso' : 'Gasto', t.description, t.category, String(t.amount), t.notes || ''])]
    const csv = '\uFEFF' + rows.map(row => row.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = `movimientos-${month}.csv`; a.click(); URL.revokeObjectURL(url)
    setToast('Archivo CSV exportado.')
  }
  
  if (!isSupabaseConfigured) return <div className="auth-page"><div className="auth-card"><div className="brand-mark auth-mark"><Landmark size={24}/></div><h1>Conecta Mi Balance con Supabase</h1><p>Falta configurar las variables de entorno para activar las cuentas y la sincronización en la nube.</p><ol><li>Copia <code>.env.example</code> como <code>.env.local</code>.</li><li>Completa <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li><li>Reinicia el servidor con <code>npm run dev</code>.</li></ol></div></div>
  if (!authReady) return <div className="auth-page"><div className="auth-card"><p>Conectando con Supabase…</p></div></div>
  if (!session) return <div className="auth-page"><div className="auth-card"><div className="brand-mark auth-mark"><Landmark size={24}/></div><h1>Mi Balance</h1><p className="auth-subtitle">Gestión y control de gastos personales</p><div className="auth-tabs"><button className={authMode==='login'?'selected':''} onClick={()=>{setAuthMode('login');setAuthError('');setAuthMessage('')}}>Iniciar sesión</button><button className={authMode==='signup'?'selected':''} onClick={()=>{setAuthMode('signup');setAuthError('');setAuthMessage('')}}>Crear cuenta</button></div><form onSubmit={handleAuth} className="auth-form">{authMode==='signup' && <label>Nombre de usuario<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={60} placeholder="Cómo quieres que te llamemos"/></label>}<label>Correo electrónico<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} minLength={6} required placeholder="Mínimo 6 caracteres"/></label>{authError && <p className="auth-error">{authError}</p>}{authMessage && <p className="auth-message">{authMessage}</p>}<button className="primary-button auth-submit" disabled={authBusy}>{authBusy?'Procesando…':authMode==='login'?'Entrar a mi cuenta':'Crear mi cuenta'}</button></form><small>Tu información se guarda bajo tu cuenta y las políticas de seguridad de Supabase.</small></div></div>

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Landmark size={21}/></div><div><strong>Mi Balance</strong><span>Finanzas personales</span></div><button className="icon-button close-mobile" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="workspace-label">MENÚ PRINCIPAL</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false) }}><item.icon size={19}/><span>{item.label}</span>{page === item.id && <span className="active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="tip-icon"><PiggyBank size={19}/></div><strong>Pequeños pasos, grandes metas</strong><p>Lleva el control de tu dinero, un movimiento a la vez.</p><div className="local-pill"><span/> {syncReady ? 'Sincronizado con Supabase' : 'Conectando datos…'}</div></div>
      <div className="sidebar-footer">Mi Balance · Versión 0.1.0</div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={21}/></button><div className="breadcrumb">Finanzas personales <span>/</span> <strong>{nav.find(n => n.id === page)?.label}</strong></div><div className="topbar-right"><div className="month-control"><CalendarDays size={16}/><input aria-label="Mes de consulta" type="month" value={month} onChange={e => setMonth(e.target.value)}/><ChevronDown size={14}/></div><div className="avatar" title={displayName}>{(displayName || session.user.email || 'U').trim().slice(0,1).toUpperCase()}</div></div></header>
      <div className="content">
        {page === 'dashboard' && <Dashboard userName={displayName} monthName={monthName} income={income} expenses={expenses} balance={balance} transactions={monthTransactions} categoryTotals={categoryTotals} budgets={stored.budgets} onAdd={openNew} onNavigate={setPage} onEdit={openEdit} onDelete={deleteTransaction}/>}
        {page === 'transactions' && <section><PageHeading title="Movimientos" subtitle="Consulta y administra todos tus ingresos y gastos." action={<button className="primary-button" onClick={() => openNew()}><Plus size={17}/> Nuevo movimiento</button>}/><div className="panel filters"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por descripción o categoría..."/></div><select aria-label="Filtrar tipo" value={kindFilter} onChange={e => setKindFilter(e.target.value)}><option value="all">Todos los tipos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></select><select aria-label="Filtrar categoría" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">Todas las categorías</option>{[...categories.income, ...categories.expense].filter((v,i,a)=>a.indexOf(v)===i).map(c => <option key={c}>{c}</option>)}</select><button className="secondary-button" onClick={exportCsv}><Download size={16}/> Exportar CSV</button></div><TransactionTable transactions={filtered} onEdit={openEdit} onDelete={deleteTransaction}/><p className="muted small-text">Mostrando {filtered.length} movimiento(s) de {monthName}.</p></section>}
        {page === 'budgets' && <section><PageHeading title="Presupuestos" subtitle="Define límites por categoría y haz seguimiento a tus gastos."/><div className="budget-summary"><div><span>Presupuestos configurados</span><strong>{stored.budgets.length}</strong></div><div><span>Límite total mensual</span><strong>{money(stored.budgets.reduce((s,b)=>s+b.limit,0))}</strong></div><div><span>Gasto en categorías presupuestadas</span><strong>{money(stored.budgets.reduce((s,b)=>s+(categoryTotals.find(c=>c[0]===b.category)?.[1]||0),0))}</strong></div></div><div className="panel budget-form-panel"><h3><Plus size={18}/> Crear o actualizar presupuesto</h3><form className="budget-form" onSubmit={saveBudget}><label>Categoría<select value={budgetForm.category} onChange={e=>setBudgetForm({...budgetForm,category:e.target.value})}>{categories.expense.map(c=><option key={c}>{c}</option>)}</select></label><label>Límite mensual (COP)<input type="number" min="1" step="1" value={budgetForm.limit} onChange={e=>setBudgetForm({...budgetForm,limit:e.target.value})} placeholder="Ej. 300000" required/></label><button className="primary-button"><Plus size={16}/> Guardar presupuesto</button></form><p className="muted small-text">Si la categoría ya tiene presupuesto, se actualizará el límite existente.</p></div><div className="budget-grid">{stored.budgets.map(b=>{const spent=categoryTotals.find(c=>c[0]===b.category)?.[1]||0;const pct=spent/b.limit*100;return <div className="panel budget-card" key={b.category}><div className="budget-card-head"><div className="category-icon"><Tags size={18}/></div><button className="icon-button danger-icon" onClick={()=>removeBudget(b.category)} aria-label={`Eliminar presupuesto ${b.category}`}><Trash2 size={16}/></button></div><h3>{b.category}</h3><p className="muted small-text">Gasto registrado en {monthName}</p><div className="budget-numbers"><strong>{money(spent)}</strong><span>de {money(b.limit)}</span></div><div className="progress-track"><div className={`progress-fill ${pct>=100?'over':pct>=80?'warning':''}`} style={{width:`${Math.min(pct,100)}%`}}/></div><div className="budget-foot"><span>{Math.round(pct)}% utilizado</span><span className={pct>100?'text-danger':''}>{pct>100?`Exceso ${money(spent-b.limit)}`:`Restan ${money(Math.max(0,b.limit-spent))}`}</span></div></div>})}{stored.budgets.length===0&&<EmptyState title="Aún no hay presupuestos" text="Crea un presupuesto para comenzar a controlar tus gastos por categoría."/>}</div></section>}
        {page === 'reports' && <section><PageHeading title="Reportes y análisis" subtitle={`Un vistazo a tu actividad financiera de ${monthName}.`} action={<button className="secondary-button" onClick={exportCsv}><Download size={16}/> Exportar datos</button>}/><div className="stats-grid"><StatCard label="Ingresos del período" value={money(income)} icon={<TrendingUp/>} tone="green"/><StatCard label="Gastos del período" value={money(expenses)} icon={<TrendingDown/>} tone="red"/><StatCard label="Balance del período" value={money(balance)} icon={<CircleDollarSign/>} tone="blue"/></div><div className="panel report-panel"><div className="panel-heading"><div><h3>Gastos por categoría</h3><p>Distribución de los gastos registrados</p></div></div>{categoryTotals.length?categoryTotals.map(([cat,val])=><div className="report-row" key={cat}><div className="report-label"><span>{cat}</span><strong>{money(val)}</strong></div><div className="progress-track"><div className="progress-fill" style={{width:`${expenses?val/expenses*100:0}%`}}/></div><small>{expenses?Math.round(val/expenses*100):0}% del gasto total</small></div>):<EmptyState title="Sin gastos en este período" text="Registra un gasto para ver el análisis por categorías."/>}</div><div className="panel report-panel"><div className="panel-heading"><div><h3>Resumen de movimientos</h3><p>Ingresos y gastos del período seleccionado</p></div></div><div className="report-metric"><span>Total de ingresos</span><strong className="text-green">{money(income)}</strong></div><div className="report-metric"><span>Total de gastos</span><strong className="text-red">{money(expenses)}</strong></div><div className="report-metric"><span>Porcentaje de ingresos gastados</span><strong>{income?Math.round(expenses/income*100):0}%</strong></div><div className="report-metric"><span>Número de movimientos</span><strong>{monthTransactions.length}</strong></div></div></section>}
        {page === 'settings' && <section><PageHeading title="Configuración" subtitle="Administra tu perfil, preferencias y datos de Mi Balance."/><div className="panel settings-panel"><div className="profile-settings"><div className="settings-icon"><Settings/></div><div className="settings-copy"><strong>Perfil de usuario</strong><p>Actualiza el nombre que se muestra en la aplicación.</p></div></div><form className="profile-form" onSubmit={saveProfile}><label>Nombre de usuario<input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} maxLength={60} required placeholder="Tu nombre"/><small>Este nombre no cambia tu correo de inicio de sesión.</small></label><button className="primary-button"><CheckCircle2 size={16}/> Guardar nombre</button></form><div className="settings-row"><div className="settings-icon"><AlertCircle/></div><div className="settings-copy"><strong>Cuenta</strong><p>Sesión iniciada como {session.user.email}. Tus movimientos y presupuestos se sincronizan con esta cuenta.</p></div><button className="secondary-button" onClick={signOut}>Cerrar sesión</button></div><div className="settings-row"><div className="settings-icon"><CircleDollarSign/></div><div className="settings-copy"><strong>Moneda de visualización</strong><p>Los cálculos de esta versión están optimizados para pesos colombianos (COP).</p></div><select value={currency} onChange={e=>{setCurrency(e.target.value);setToast('La preferencia de moneda aún no cambia el cálculo, que sigue en COP.')}}><option value="COP">Peso colombiano (COP)</option><option value="USD">Dólar estadounidense (vista previa)</option></select></div><div className="settings-row"><div className="settings-icon"><Download/></div><div className="settings-copy"><strong>Exportar movimientos</strong><p>Descarga los registros del mes seleccionado en formato CSV.</p></div><button className="secondary-button" onClick={exportCsv}><Download size={16}/> Exportar CSV</button></div><div className="settings-row"><div className="settings-icon"><AlertCircle/></div></div><div className="notice"><AlertCircle size={19}/><div><strong>Protección de datos</strong><p>La aplicación usa Supabase Auth y políticas de acceso por usuario. Los datos se sincronizan como un documento JSON por cuenta en esta versión inicial.</p></div></div></section>}
        <footer className="content-footer"><span>Mi Balance · Aplicación académica en desarrollo</span><span>Los datos de demostración son ilustrativos.</span></footer>
      </div>
    </main>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{editing?'Editar movimiento':'Nuevo movimiento'}</h2><p>Completa la información del registro financiero.</p></div><button className="icon-button" onClick={()=>setModal(false)} aria-label="Cerrar"><X size={20}/></button></div><form onSubmit={saveTransaction} className="transaction-form"><div className="type-switch"><button type="button" className={form.kind==='expense'?'selected expense-selected':''} onClick={()=>setForm({...form,kind:'expense',category:categories.expense[0]})}><TrendingDown size={17}/> Gasto</button><button type="button" className={form.kind==='income'?'selected income-selected':''} onClick={()=>setForm({...form,kind:'income',category:categories.income[0]})}><TrendingUp size={17}/> Ingreso</button></div><label>Descripción<input autoFocus value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ej. Compra del mercado" maxLength={100} required/></label><div className="form-two-col"><label>Valor (COP)<input type="number" min="1" step="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0" required/></label><label>Fecha<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label></div><label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories[form.kind].map(c=><option key={c}>{c}</option>)}</select></label><label>Notas (opcional)<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} maxLength={500} placeholder="Agrega un detalle si lo necesitas."/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(false)}>Cancelar</button><button className="primary-button"><CheckCircle2 size={17}/>{editing?'Guardar cambios':'Guardar movimiento'}</button></div></form></div></div>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>
}

function PageHeading({title,subtitle,action}:{title:string;subtitle:string;action?:React.ReactNode}) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}
function StatCard({label,value,icon,tone}:{label:string;value:string;icon:React.ReactNode;tone:string}) {
  return <div className="panel stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>Período seleccionado</small></div>
}
function Dashboard({userName,monthName,income,expenses,balance,transactions,categoryTotals,budgets,onAdd,onNavigate,onEdit,onDelete}:{userName:string;monthName:string;income:number;expenses:number;balance:number;transactions:Transaction[];categoryTotals:[string,number][];budgets:Budget[];onAdd:(kind?:Kind)=>void;onNavigate:(p:Page)=>void;onEdit:(t:Transaction)=>void;onDelete:(id:string)=>void}) {
  const recent = [...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)
  const max = Math.max(1,...categoryTotals.map(c=>c[1]))
  return <section><div className="welcome-row"><div><div className="eyebrow">TU RESUMEN FINANCIERO</div><h1>¡Hola{userName ? `, ${userName}` : ''}! Este es tu balance.</h1><p>Revisa cómo se está moviendo tu dinero en <strong>{monthName}</strong>.</p></div><button className="primary-button" onClick={()=>onAdd()}><Plus size={17}/> Nuevo movimiento</button></div>
    <div className="stats-grid"><StatCard label="Ingresos totales" value={money(income)} icon={<TrendingUp/>} tone="green"/><StatCard label="Gastos totales" value={money(expenses)} icon={<TrendingDown/>} tone="red"/><StatCard label="Balance disponible" value={money(balance)} icon={<CircleDollarSign/>} tone="blue"/></div>
    <div className="quick-actions"><button onClick={()=>onAdd('income')}><span className="quick-icon green"><TrendingUp size={19}/></span><span><strong>Registrar ingreso</strong><small>Agrega dinero recibido</small></span><Plus size={17}/></button><button onClick={()=>onAdd('expense')}><span className="quick-icon orange"><TrendingDown size={19}/></span><span><strong>Registrar gasto</strong><small>Registra una compra o pago</small></span><Plus size={17}/></button><button onClick={()=>onNavigate('budgets')}><span className="quick-icon purple"><Wallet size={19}/></span><span><strong>Mis presupuestos</strong><small>Controla tus límites</small></span><Plus size={17}/></button></div>
    <div className="dashboard-grid"><div className="panel"><div className="panel-heading"><div><h3>Gastos por categoría</h3><p>Principales categorías de {monthName}</p></div><button className="text-button" onClick={()=>onNavigate('reports')}>Ver reporte <span>→</span></button></div>{categoryTotals.length?categoryTotals.slice(0,5).map(([cat,val],i)=><div className="category-bar" key={cat}><div className="category-bar-top"><span><i className={`category-dot dot-${i%5}`}/>{cat}</span><strong>{money(val)}</strong></div><div className="progress-track"><div className={`progress-fill fill-${i%5}`} style={{width:`${val/max*100}%`}}/></div></div>):<EmptyState title="Todavía no hay gastos" text="Registra un gasto para ver tus categorías aquí."/>}</div>
    <div className="panel"><div className="panel-heading"><div><h3>Presupuestos</h3><p>Seguimiento de límites mensuales</p></div><button className="text-button" onClick={()=>onNavigate('budgets')}>Ver todos <span>→</span></button></div>{budgets.length?budgets.slice(0,4).map(b=>{const spent=categoryTotals.find(c=>c[0]===b.category)?.[1]||0;const pct=spent/b.limit*100;return <div className="mini-budget" key={b.category}><div className="mini-budget-top"><span>{b.category}</span><strong>{Math.round(pct)}%</strong></div><div className="progress-track"><div className={`progress-fill ${pct>=100?'over':pct>=80?'warning':''}`} style={{width:`${Math.min(pct,100)}%`}}/></div><small>{money(spent)} de {money(b.limit)}</small></div>}):<EmptyState title="Sin presupuestos" text="Agrega un límite mensual por categoría."/>}</div></div>
    <div className="panel recent-panel"><div className="panel-heading"><div><h3>Movimientos recientes</h3><p>Últimas transacciones del período</p></div><button className="text-button" onClick={()=>onNavigate('transactions')}>Ver movimientos <span>→</span></button></div><TransactionTable transactions={recent} onEdit={onEdit} onDelete={onDelete}/></div>
  </section>
}
function TransactionTable({transactions,onEdit,onDelete}:{transactions:Transaction[];onEdit:(t:Transaction)=>void;onDelete:(id:string)=>void}) {
  if (!transactions.length) return <EmptyState title="No hay movimientos para mostrar" text="Prueba otro mes o registra un nuevo ingreso o gasto."/>
  return <div className="table-wrap"><table><thead><tr><th>Movimiento</th><th>Categoría</th><th>Fecha</th><th className="align-right">Valor</th><th className="actions-cell">Acciones</th></tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td><div className="transaction-title"><span className={`transaction-icon ${t.kind}`} >{t.kind==='income'?<TrendingUp size={17}/>:<TrendingDown size={17}/>}</span><span><strong>{t.description}</strong><small>{t.kind==='income'?'Ingreso':'Gasto'}</small></span></div></td><td><span className="category-chip">{t.category}</span></td><td className="date-cell">{dateLabel(t.date)}</td><td className={`align-right amount ${t.kind==='income'?'text-green':'text-red'}`}>{t.kind==='income'?'+':'−'}{money(t.amount)}</td><td><div className="row-actions"><button className="icon-button" onClick={()=>onEdit(t)} aria-label={`Editar ${t.description}`}><Pencil size={15}/></button><button className="icon-button danger-icon" onClick={()=>onDelete(t.id)} aria-label={`Eliminar ${t.description}`}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
}
function EmptyState({title,text}:{title:string;text:string}) { return <div className="empty-state"><div className="empty-icon"><ArrowLeftRight size={22}/></div><strong>{title}</strong><p>{text}</p></div> }
