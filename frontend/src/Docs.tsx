import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, BookOpen, Copy as CopyIcon, Check, Link as LinkIcon } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-okaidia.css'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import { API_BASE } from './config'

 

export default function Docs() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const swaggerUrl = useMemo(() => `${API_BASE}/docs`, [])
  const swaggerJson = useMemo(() => `${API_BASE}/swagger.json`, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight inline-flex items-center gap-2">
            <BookOpen size={22} /> API Documentation (RPN)
          </h1>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-slate-300">Language</span>
            <button onClick={() => setLang('fr')} className={`rounded-md px-3 py-1.5 border text-sm ${lang==='fr' ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 hover:bg-white/10'}`}>FR</button>
            <button onClick={() => setLang('en')} className={`rounded-md px-3 py-1.5 border text-sm ${lang==='en' ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 hover:bg-white/10'}`}>EN</button>
            <a href="/" className="ml-2 rounded-md bg-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-600">Back</a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-[260px_1fr] gap-6 px-4 py-8">
        <aside className="hidden md:block">
          <nav className="sticky top-20 space-y-1 text-sm">
            <TOCItem href="#overview" label={lang==='fr' ? 'Présentation' : 'Overview'} />
            <TOCItem href="#endpoints" label={lang==='fr' ? 'Endpoints' : 'Endpoints'} />
            <TOCItem href="#examples" label={lang==='fr' ? 'Exemples' : 'Examples'} />
            <TOCItem href="#errors" label={lang==='fr' ? 'Erreurs' : 'Errors'} />
            <TOCItem href="#swagger" label="Swagger" />
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-300">Base URL:</span>
            <code className="rounded bg-black/30 px-2 py-1">{API_BASE}</code>
            <a href={swaggerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/10">
              Swagger <ExternalLink size={14} />
            </a>
            <a href={swaggerJson} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/10">
              swagger.json <ExternalLink size={14} />
            </a>
          </div>

          {lang === 'fr' ? <FrenchDocsAdvanced /> : <EnglishDocsAdvanced />}
        </main>
      </div>
    </div>
  )
}

function Badge({ method }: { method: 'GET'|'POST'|'DELETE' }) {
  const color = method==='GET' ? 'bg-emerald-600' : method==='POST' ? 'bg-blue-600' : 'bg-rose-600'
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${color}`}>{method}</span>
}

function Anchor({ id, children }: { id: string, children: React.ReactNode }) {
  return (
    <a id={id} href={`#${id}`} className="group inline-flex items-center gap-2 scroll-mt-24">
      <span className="group-hover:underline">{children}</span>
      <LinkIcon size={14} className="opacity-0 group-hover:opacity-60 transition" />
    </a>
  )
}

function TOCItem({ href, label }: { href: string, label: string }) {
  return (
    <a href={href} className="block rounded px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white">{label}</a>
  )
}

function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1200) } catch {} }}
      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs hover:bg-black/40">
      {ok ? (<><Check size={14} /> Copied</>) : (<><CopyIcon size={14} /> Copy</>)}
    </button>
  )
}

function CodeTabs({ blocks }: { blocks: { label: string, code: string }[] }) {
  const [tab, setTab] = useState(0)
  const active = blocks[tab]
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        {blocks.map((b, i) => (
          <button key={i} onClick={()=>setTab(i)} className={`rounded border px-2 py-1 ${i===tab? 'border-blue-400 bg-blue-500/20':'border-white/10 hover:bg-white/10'}`}>{b.label}</button>
        ))}
      </div>
      <div className="relative">
        <CopyButton text={active.code} />
        <CodeBlock lang="bash" code={active.code} />
      </div>
    </div>
  )
}

function FrenchDocsAdvanced() {
  return (
    <div className="space-y-8">
      <Section title={<Anchor id="overview">Présentation</Anchor>}>
        <p>
          L’API RPN expose une gestion de piles et des opérations arithmétiques en notation polonaise inversée.
          Utilisez une pile dédiée (multi-piles) puis poussez des valeurs et appliquez des opérations.
        </p>
      </Section>

      <Section title={<Anchor id="endpoints">Endpoints</Anchor>}>
        <div className="space-y-4">
          <Endpoint method="GET" path="/rpn/op" desc="Liste des opérateurs disponibles"
            res={`{\n  "operands": ["+", "-", "*", "div"]\n}`}
          />
          <Endpoint method="POST" path="/rpn/stack" desc="Crée une pile (retourne { stack_id })"
            res={`{\n  "stack_id": "c9d2b7b7-6f6f-4a1e-9e2e-3d9e7b2a1cde"\n}`}
          />
          <Endpoint method="GET" path="/rpn/stack" desc="Liste de toutes les piles"
            res={`{\n  "stacks": {\n    "c9d2b7b7-...": [10, 5],\n    "1f3a9e21-...": []\n  }\n}`}
          />
          <Endpoint method="GET" path="/rpn/stack/<stack_id>" desc="Contenu d’une pile"
            res={`{\n  "stack": [10, 5]\n}`}
          />
          <Endpoint method="POST" path="/rpn/stack/<stack_id>?value=10" desc="Push d’une valeur"
            req={`Query:\n{\n  "value": 10\n}`}
            res={`{\n  "stack": [10, 5, 10]\n}`}
          />
          <Endpoint method="DELETE" path="/rpn/stack/<stack_id>" desc="Supprime une pile"
            res={`{\n  "message": "Stack deleted successfully"\n}`}
          />
          <Endpoint method="POST" path="/rpn/op/<op>/stack/<stack_id>" desc="Applique une opération (+ - * div)"
            req={`Path:\n{\n  "op": "+" | "-" | "*" | "div"\n}`}
            res={`{\n  "stack": [15]\n}`}
          />
          <Endpoint method="GET" path="/swagger.json" desc="Schéma OpenAPI"
            res={`OpenAPI JSON`}
          />
          <Endpoint method="GET" path="/docs" desc="Swagger UI" />
        </div>
      </Section>

      <Section title={<Anchor id="examples">Exemples</Anchor>}>
        <CodeTabs blocks={[
          { label: 'curl', code: `# Créer une pile
curl -s -X POST ${API_BASE}/rpn/stack

# Lister opérateurs
curl -s ${API_BASE}/rpn/op

# Push 10 puis 5
curl -s -X POST "${API_BASE}/rpn/stack/<stack_id>?value=10"
curl -s -X POST "${API_BASE}/rpn/stack/<stack_id>?value=5"

# Addition
curl -s -X POST ${API_BASE}/rpn/op/+/stack/<stack_id>

# Lire la pile
curl -s ${API_BASE}/rpn/stack/<stack_id>` },
          { label: 'fetch', code: `const base = '${API_BASE}'
const create = await fetch(base + '/rpn/stack', { method: 'POST' }).then(r=>r.json())
const id = create.stack_id

await fetch(base + '/rpn/stack/' + id + '?value=10', { method: 'POST' })
await fetch(base + '/rpn/stack/' + id + '?value=5', { method: 'POST' })
await fetch(base + '/rpn/op/+/stack/' + id, { method: 'POST' })
const stack = await fetch(base + '/rpn/stack/' + id).then(r=>r.json())` },
          { label: 'axios', code: `import axios from 'axios'
const base = '${API_BASE}'
const { data: create } = await axios.post(base + '/rpn/stack')
const id = create.stack_id
await axios.post(base + '/rpn/stack/' + id + '?value=10')
await axios.post(base + '/rpn/stack/' + id + '?value=5')
await axios.post(base + '/rpn/op/+/stack/' + id)
const { data: stack } = await axios.get(base + '/rpn/stack/' + id)` },
          { label: 'python', code: `import requests
base = '${API_BASE}'
create = requests.post(base + '/rpn/stack').json()
id = create['stack_id']
requests.post(f"{base}/rpn/stack/{id}?value=10")
requests.post(f"{base}/rpn/stack/{id}?value=5")
requests.post(f"{base}/rpn/op/+/stack/{id}")
stack = requests.get(f"{base}/rpn/stack/{id}").json()` },
        ]} />
      </Section>

      <Section title={<Anchor id="errors">Erreurs & remarques</Anchor>}>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>400 Non-numeric value</code> si la valeur n’est pas un nombre.</li>
          <li><code>400 Division by zero</code> pour division par zéro.</li>
          <li><code>404 Stack not found</code> si l’identifiant est invalide.</li>
          <li>Opérateur <code>div</code> correspond à <code>/</code>.</li>
        </ul>
      </Section>

      <Section title={<Anchor id="swagger">Swagger & schéma</Anchor>}>
        <p>
          Consulte la documentation interactive sur <a className="underline" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">Swagger UI</a>
          {' '}ou récupère le schéma <a className="underline" href={`${API_BASE}/swagger.json`} target="_blank" rel="noreferrer">swagger.json</a>.
        </p>
      </Section>
    </div>
  )
}

function Endpoint({ method, path, desc, req, res }: { method: 'GET'|'POST'|'DELETE', path: string, desc: string, req?: string, res?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge method={method} />
        <code className="rounded bg-black/40 px-2 py-1">{path}</code>
      </div>
      <p className="mt-1 text-slate-300 text-sm">{desc}</p>
      {(req || res) && (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {req && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-300">Request</div>
              <div className="relative">
                <CopyButton text={req} />
                <CodeBlock lang="json" code={req} />
              </div>
            </div>
          )}
          {res && (
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-300">Response</div>
              <div className="relative">
                <CopyButton text={res} />
                <CodeBlock lang="json" code={res} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EnglishDocsAdvanced() {
  return (
    <div className="space-y-8">
      <Section title={<Anchor id="overview">Overview</Anchor>}>
        <p>
          The RPN API provides stack management and arithmetic operations using Reverse Polish Notation.
          Create a dedicated stack (multi-stack), push values, and apply operations.
        </p>
      </Section>

      <Section title={<Anchor id="endpoints">Endpoints</Anchor>}>
        <div className="space-y-4">
          <Endpoint method="GET" path="/rpn/op" desc="List available operators"
            res={`{\n  "operands": ["+", "-", "*", "div"]\n}`}
          />
          <Endpoint method="POST" path="/rpn/stack" desc="Create a stack (returns { stack_id })"
            res={`{\n  "stack_id": "c9d2b7b7-6f6f-4a1e-9e2e-3d9e7b2a1cde"\n}`}
          />
          <Endpoint method="GET" path="/rpn/stack" desc="List all stacks"
            res={`{\n  "stacks": {\n    "c9d2b7b7-...": [10, 5],\n    "1f3a9e21-...": []\n  }\n}`}
          />
          <Endpoint method="GET" path="/rpn/stack/<stack_id>" desc="Get stack content"
            res={`{\n  "stack": [10, 5]\n}`}
          />
          <Endpoint method="POST" path="/rpn/stack/<stack_id>?value=10" desc="Push a value"
            req={`Query:\n{\n  "value": 10\n}`}
            res={`{\n  "stack": [10, 5, 10]\n}`}
          />
          <Endpoint method="DELETE" path="/rpn/stack/<stack_id>" desc="Delete a stack"
            res={`{\n  "message": "Stack deleted successfully"\n}`}
          />
          <Endpoint method="POST" path="/rpn/op/<op>/stack/<stack_id>" desc="Apply an operation (+ - * div)"
            req={`Path:\n{\n  "op": "+" | "-" | "*" | "div"\n}`}
            res={`{\n  "stack": [15]\n}`}
          />
          <Endpoint method="GET" path="/swagger.json" desc="OpenAPI schema"
            res={`OpenAPI JSON`}
          />
          <Endpoint method="GET" path="/docs" desc="Swagger UI" />
        </div>
      </Section>

      <Section title={<Anchor id="examples">Examples</Anchor>}>
        <CodeTabs blocks={[
          { label: 'curl', code: `# Create a stack
curl -s -X POST ${API_BASE}/rpn/stack

# List operators
curl -s ${API_BASE}/rpn/op

# Push 10 then 5
curl -s -X POST "${API_BASE}/rpn/stack/<stack_id>?value=10"
curl -s -X POST "${API_BASE}/rpn/stack/<stack_id>?value=5"

# Addition
curl -s -X POST ${API_BASE}/rpn/op/+/stack/<stack_id>

# Read stack
curl -s ${API_BASE}/rpn/stack/<stack_id>` },
          { label: 'fetch', code: `const base = '${API_BASE}'
const create = await fetch(base + '/rpn/stack', { method: 'POST' }).then(r=>r.json())
const id = create.stack_id

await fetch(base + '/rpn/stack/' + id + '?value=10', { method: 'POST' })
await fetch(base + '/rpn/stack/' + id + '?value=5', { method: 'POST' })
await fetch(base + '/rpn/op/+/stack/' + id, { method: 'POST' })
const stack = await fetch(base + '/rpn/stack/' + id).then(r=>r.json())` },
          { label: 'axios', code: `import axios from 'axios'
const base = '${API_BASE}'
const { data: create } = await axios.post(base + '/rpn/stack')
const id = create.stack_id
await axios.post(base + '/rpn/stack/' + id + '?value=10')
await axios.post(base + '/rpn/stack/' + id + '?value=5')
await axios.post(base + '/rpn/op/+/stack/' + id)
const { data: stack } = await axios.get(base + '/rpn/stack/' + id)` },
          { label: 'python', code: `import requests
base = '${API_BASE}'
create = requests.post(base + '/rpn/stack').json()
id = create['stack_id']
requests.post(f"{base}/rpn/stack/{id}?value=10")
requests.post(f"{base}/rpn/stack/{id}?value=5")
requests.post(f"{base}/rpn/op/+/stack/{id}")
stack = requests.get(f"{base}/rpn/stack/{id}").json()` },
        ]} />
      </Section>

      <Section title={<Anchor id="errors">Errors & notes</Anchor>}>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>400 Non-numeric value</code> when the value is not a number.</li>
          <li><code>400 Division by zero</code> when dividing by zero.</li>
          <li><code>404 Stack not found</code> when the id is invalid.</li>
          <li>Operator <code>div</code> corresponds to <code>/</code>.</li>
        </ul>
      </Section>

      <Section title={<Anchor id="swagger">Swagger & schema</Anchor>}>
        <p>
          See interactive docs at <a className="underline" href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">Swagger UI</a>
          {' '}or fetch the <a className="underline" href={`${API_BASE}/swagger.json`} target="_blank" rel="noreferrer">swagger.json</a> schema.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: React.ReactNode, children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="text-slate-200/95 space-y-2">
        {children}
      </div>
    </section>
  )
}

function CodeBlock({ code, lang }: { code: string, lang?: string }) {
  const preRef = useRef<HTMLPreElement | null>(null)
  useEffect(() => {
    if (preRef.current) {
      Prism.highlightAllUnder(preRef.current)
    }
  }, [code, lang])
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300">
        <span className="uppercase tracking-wide">{lang || 'code'}</span>
      </div>
      <pre ref={preRef} className="overflow-auto p-3 text-sm">
        <code className={lang ? `language-${lang}` : undefined}>{code}</code>
      </pre>
    </div>
  )
}
