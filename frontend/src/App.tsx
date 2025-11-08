import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Minus, Divide, X as Multiply, Trash2, HelpCircle, CircleX as CloseIcon, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE } from './config'

 

type Stack = number[]

export default function App() {
  const [stack, setStack] = useState<Stack>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [helpTab, setHelpTab] = useState<'overview'|'rules'|'examples'|'errors'|'tips'|'shortcuts'>('overview')
  const [stackId, setStackId] = useState<string | null>(null)
  const [operands, setOperands] = useState<string[]>(['+', '-', '*', 'div'])
  const [allStacks, setAllStacks] = useState<Record<string, number[]>>({})

  const orderedIds = useMemo(() => Object.keys(allStacks), [allStacks])
  const labelFor = (id: string) => {
    const idx = orderedIds.indexOf(id)
    return idx >= 0 ? `Pile ${idx + 1}` : id
  }

  const ensureStack = async (): Promise<string> => {
    const cached = localStorage.getItem('rpn_stack_id')
    if (cached) {
      setStackId(cached)
      return cached
    }
    const r = await fetch(`${API_BASE}/rpn/stack`, { method: 'POST' })
    if (!r.ok) throw new Error('Impossible de créer la pile')
    const data = await r.json()
    localStorage.setItem('rpn_stack_id', data.stack_id)
    setStackId(data.stack_id)
    return data.stack_id
  }

  const fetchStack = async (explicitId?: string) => {
    const id = explicitId ?? stackId ?? (await ensureStack())
    const r = await fetch(`${API_BASE}/rpn/stack/${id}`)
    const data = await r.json()
    setStack(data.stack ?? [])
  }

  const fetchOperands = async () => {
    const r = await fetch(`${API_BASE}/rpn/op`)
    if (r.ok) {
      const data = await r.json()
      if (Array.isArray(data.operands)) setOperands(data.operands)
    }
  }

  const fetchAllStacks = async () => {
    const r = await fetch(`${API_BASE}/rpn/stack`)
    if (r.ok) {
      const data = await r.json()
      setAllStacks(data.stacks || {})
    }
  }

  useEffect(() => {
    ensureStack().then(() => {
      fetchStack()
      fetchOperands()
      fetchAllStacks()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch stack whenever stackId changes
  useEffect(() => {
    if (stackId) {
      fetchStack(stackId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stackId])

  const createNewStack = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/rpn/stack`, { method: 'POST' })
      if (!r.ok) throw new Error('Création pile échouée')
      const data = await r.json()
      localStorage.setItem('rpn_stack_id', data.stack_id)
      setStackId(data.stack_id)
      await fetchStack(data.stack_id)
      await fetchAllStacks()
    } finally { setLoading(false) }
  }

  const deleteCurrentStack = async () => {
    if (!stackId) return
    setLoading(true)
    try {
      await fetch(`${API_BASE}/rpn/stack/${stackId}`, { method: 'DELETE' })
      // refresh list and decide next stack from fresh data
      const r = await fetch(`${API_BASE}/rpn/stack`)
      const data = await r.json()
      setAllStacks(data.stacks || {})
      const ids: string[] = Object.keys(data.stacks || {}).filter((id) => id !== stackId)
      if (ids.length > 0) {
        const next = ids[0]
        localStorage.setItem('rpn_stack_id', next)
        setStackId(next)
        await fetchStack(next)
      } else {
        await createNewStack()
      }
    } finally { setLoading(false) }
  }

  const selectStack = async (id: string) => {
    localStorage.setItem('rpn_stack_id', id)
    setStackId(id)
    await fetchStack(id)
  }

  const onPush = async () => {
    setLoading(true)
    setError(null)
    try {
      const id = stackId ?? (await ensureStack())
      const params = new URLSearchParams()
      params.set('value', input)
      const r = await fetch(`${API_BASE}/rpn/stack/${id}?${params.toString()}`, { method: 'POST' })
      if (!r.ok) throw new Error((await r.json())?.detail || 'Erreur push')
      setInput('')
      const data = await r.json()
      setStack(data.stack ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onOp = async (symbol: string) => {
    setLoading(true)
    setError(null)
    try {
      const id = stackId ?? (await ensureStack())
      const op = symbol === '/' ? 'div' : symbol
      const r = await fetch(`${API_BASE}/rpn/op/${op}/stack/${id}`, { method: 'POST' })
      const body = await r.json()
      if (!r.ok) throw new Error(body?.detail || body?.error || 'Erreur opération')
      setStack(body.stack ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onClear = async () => {
    setLoading(true)
    setError(null)
    try {
      const id = stackId ?? (await ensureStack())
      await fetch(`${API_BASE}/rpn/stack/${id}`, { method: 'DELETE' })
      // recreate fresh stack
      const created = await fetch(`${API_BASE}/rpn/stack`, { method: 'POST' })
      if (created.ok) {
        const data = await created.json()
        localStorage.setItem('rpn_stack_id', data.stack_id)
        setStackId(data.stack_id)
      }
      setStack([])
    } finally {
      setLoading(false)
    }
  }

  // Interactive keypad helpers
  const appendChar = (ch: string) => {
    setInput((prev) => prev + ch)
  }

  const toggleSign = () => {
    setInput((prev) => {
      if (!prev) return '-'
      if (prev.startsWith('-')) return prev.slice(1)
      return '-' + prev
    })
  }

  const backspace = () => {
    setInput((prev) => prev.slice(0, -1))
  }

  // Keyboard shortcuts: Enter=push, + - * /=ops, c=clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading) return
      const key = e.key
      if (key === 'Enter') {
        e.preventDefault()
        if (input.trim() !== '') onPush()
      } else if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault()
        onOp(key)
      } else if (key.toLowerCase() === 'c') {
        e.preventDefault()
        onClear()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [input, loading])

  const topDown = useMemo(() => [...stack].reverse(), [stack])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Calculatrice RPN</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
              title="Documentation API"
            >
              <ExternalLink size={16} /> <span className="hidden sm:inline">Docs API</span><span className="sm:hidden">Docs</span>
            </Link>
            <button
              onClick={() => setShowHelp(true)}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title="Aide RPN"
              aria-label="Ouvrir l'aide RPN"
            >
              <HelpCircle size={16} /> <span className="hidden xs:inline">Aide</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="mb-4 text-slate-300 text-sm">
          Saisis un nombre puis utilise les opérateurs. Sommet de pile en haut.
        </div>

        <div className="bg-background-card/90 backdrop-blur rounded-xl shadow-soft p-4 border border-white/10">
          {/* Stacks manager */}
          <div className="mb-3 flex items-center gap-2">
            <select
              value={stackId ?? ''}
              onChange={(e) => selectStack(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-background px-3 py-2 text-sm"
            >
              {orderedIds.length === 0 && (
                <option value="">(aucune pile)</option>
              )}
              {orderedIds.map((id) => (
                <option key={id} value={id}>{labelFor(id)}</option>
              ))}
            </select>
            <button onClick={createNewStack} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500">Nouvelle pile</button>
            <button onClick={deleteCurrentStack} disabled={!stackId} className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-500 disabled:opacity-60">Supprimer</button>
          </div>
          <div className="max-h-56 overflow-auto rounded-md bg-black/25 p-3 font-mono text-sm">
            {topDown.length === 0 && (
              <div className="text-slate-400">Pile vide</div>
            )}
            {topDown.map((v: number, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-slate-400">#{topDown.length - i}</span>
                <span className="tabular-nums">{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nombre (ex: 10, 3.14)"
              className="flex-1 rounded-md border border-slate-600 bg-background px-3 py-2 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onPush}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-2 font-semibold text-white shadow hover:bg-emerald-400 disabled:opacity-60"
              title="Enter"
            >
              Push
            </button>
          </div>

          {/* Number keypad */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <button onClick={() => appendChar('7')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">7</button>
            <button onClick={() => appendChar('8')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">8</button>
            <button onClick={() => appendChar('9')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">9</button>
            <button onClick={backspace} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600" title="Backspace">⌫</button>
            {/* Row 2 */}
            <button onClick={() => appendChar('4')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">4</button>
            <button onClick={() => appendChar('5')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">5</button>
            <button onClick={() => appendChar('6')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">6</button>
            <button onClick={toggleSign} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">+/-</button>
            {/* Row 3 */}
            <button onClick={() => appendChar('1')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">1</button>
            <button onClick={() => appendChar('2')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">2</button>
            <button onClick={() => appendChar('3')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">3</button>
            <button onClick={() => appendChar('.')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600" title="Point">.</button>
            {/* Row 4 */}
            <button onClick={() => appendChar('0')} className="col-span-2 inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600">0</button>
            <button onClick={() => appendChar(',')} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-700 hover:bg-slate-600" title="Virgule">,</button>
            <button onClick={onPush} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-emerald-500 hover:bg-emerald-400" title="Enter">⏎</button>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {operands.map((op) => {
              const display = op === 'div' ? '/' : op
              const color = op === '+' ? 'bg-blue-600 hover:bg-blue-500'
                           : op === '-' ? 'bg-orange-500 hover:bg-orange-400'
                           : op === '*' ? 'bg-violet-600 hover:bg-violet-500'
                           : 'bg-rose-500 hover:bg-rose-400'
              const icon = op === '+' ? <Plus size={18} />
                         : op === '-' ? <Minus size={18} />
                         : op === '*' ? <Multiply size={18} />
                         : <Divide size={18} />
              return (
                <button key={op} onClick={() => onOp(display)} disabled={loading}
                  className={`inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow disabled:opacity-60 ${color}`}
                  title={display}
                >
                  {icon}
                </button>
              )
            })}
            <button onClick={onClear} disabled={loading} className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-white shadow bg-slate-600 hover:bg-slate-500 disabled:opacity-60" title="Clear">
              <Trash2 size={18} />
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-rose-300/40 bg-rose-900/30 px-3 py-2 text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-400">
          API: {API_BASE}
          {' '}
          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noreferrer"
            className="ml-2 underline hover:text-slate-300"
          >
            Swagger
          </a>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHelp(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-white/10 bg-background-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Comment fonctionne la notation RPN ?</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="rounded-md p-1 hover:bg-white/10"
                aria-label="Fermer"
              >
                <CloseIcon size={20} />
              </button>
            </div>
            {/* Tabs */}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {[
                { id: 'overview', label: 'Introduction' },
                { id: 'rules', label: 'Règles' },
                { id: 'examples', label: 'Exemples' },
                { id: 'errors', label: 'Erreurs' },
                { id: 'tips', label: 'Astuces' },
                { id: 'shortcuts', label: 'Raccourcis' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setHelpTab(t.id as any)}
                  className={`rounded-md px-3 py-1.5 border ${helpTab===t.id ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 hover:bg-white/10'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3 space-y-4 text-sm text-slate-200">
              {helpTab==='overview' && (
              <section className="space-y-2">
                <p>
                  La <strong>RPN</strong> (notation polonaise inversée) utilise une <strong>pile</strong>.
                  On empile d’abord les nombres, puis on applique un opérateur qui dépile les deux
                  derniers nombres, calcule, et réempile le résultat.
                </p>
                <p>
                  Pourquoi l’utiliser ? Elle évite les parenthèses et rend l’ordre des opérations
                  explicite. Très pratique pour des calculatrices et des expressions complexes.
                </p>
              </section>
              )}

              {helpTab==='rules' && (
              <section className="space-y-2">
                <div className="font-semibold">Règles de base</div>
                <ul className="list-disc pl-5">
                  <li>Empile un nombre avec <em>Push</em> (ou Entrée).</li>
                  <li>Un opérateur binaire (+, -, *, /) prend les <em>deux</em> nombres en haut de pile.</li>
                  <li>Ordre important: si la pile est <code>[a, b]</code> (a en bas, b en haut),
                    alors <code>a b -</code> calcule <code>a - b</code> (et non b - a).
                  </li>
                </ul>
              </section>
              )}

              {helpTab==='examples' && (
              <section className="space-y-2">
                <div className="font-semibold">Exemple pas à pas</div>
                <div className="rounded-md border border-white/10 bg-black/20 p-3 font-mono">
                  <div>Stack: []</div>
                  <div>Push 10 → Stack: [10]</div>
                  <div>Push 5 → Stack: [10, 5]</div>
                  <div>Push 6 → Stack: [10, 5, 6]</div>
                  <div>Opérateur ‘+’ → Stack: [10, 11]</div>
                  <div>Opérateur ‘-’ → dépile 10 et 11, calcule 10 - 11 → Stack: [-1]</div>
                </div>
              </section>
              )}

              {helpTab==='examples' && (
              <section className="space-y-2">
                <div className="font-semibold">Autre exemple</div>
                <div className="rounded-md border border-white/10 bg-black/20 p-3 font-mono">
                  <div>Objectif: (3 + 4) * 2</div>
                  <div>Push 3 → [3]</div>
                  <div>Push 4 → [3, 4]</div>
                  <div>‘+’ → [7]</div>
                  <div>Push 2 → [7, 2]</div>
                  <div>‘*’ → [14]</div>
                </div>
              </section>
              )}

              {helpTab==='tips' && (
              <section className="space-y-2">
                <div className="font-semibold">Dans cette application</div>
                <ul className="list-disc pl-5">
                  <li>Entre un nombre puis appuie sur <em>Push</em> (ou Entrée) pour l’empiler.</li>
                  <li>Utilise +, -, *, / pour appliquer une opération sur les deux valeurs au sommet.</li>
                  <li><em>Clear</em> vide la pile.</li>
                </ul>
              </section>
              )}

              {helpTab==='errors' && (
              <section className="space-y-2">
                <div className="font-semibold">Erreurs courantes</div>
                <ul className="list-disc pl-5">
                  <li>Pas assez d’opérandes: empile au moins deux nombres avant une opération.</li>
                  <li>Division par zéro: impossible, corrige la saisie ou la pile.</li>
                </ul>
              </section>
              )}

              {helpTab==='shortcuts' && (
              <section className="space-y-2">
                <div className="font-semibold">Raccourcis</div>
                <ul className="list-disc pl-5">
                  <li>Entrée: Push</li>
                  <li>+, -, *, /: Opérations</li>
                  <li>c: Clear</li>
                </ul>
                <div className="font-semibold">Astuces</div>
                <ul className="list-disc pl-5">
                  <li>Tu peux saisir avec la virgule (ex: 3,14) ou le point (3.14).</li>
                  <li>Utilise le pavé numérique pour saisir rapidement les nombres.</li>
                </ul>
              </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Tailwind helper class for keypad buttons
// Using global styles would be nicer, but keep inline classes for simplicity
declare module 'react' { interface HTMLAttributes<T> { className?: string } }
