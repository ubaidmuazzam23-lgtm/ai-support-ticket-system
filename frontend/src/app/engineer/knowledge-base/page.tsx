'use client'
// File: frontend/src/app/engineer/knowledge/page.tsx

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL

interface SearchResult {
  content: string; title: string; doc_id: string
  domain: string; cosine_similarity: number; filename: string; description: string
}

const DOMAINS = [
  {v:'',l:'All Domains'},{v:'networking',l:'Networking'},{v:'hardware',l:'Hardware'},
  {v:'software',l:'Software'},{v:'security',l:'Security'},{v:'email_communication',l:'Email & Comm'},
  {v:'identity_access',l:'Identity & Access'},{v:'database',l:'Database'},{v:'cloud',l:'Cloud'},
  {v:'infrastructure',l:'Infrastructure'},{v:'devops',l:'DevOps'},
  {v:'erp_business_apps',l:'ERP & Business'},{v:'endpoint_management',l:'Endpoint Mgmt'},
]

export default function EngineerKnowledgePage() {
  const [query,setQuery]         = useState('')
  const [domain,setDomain]       = useState('')
  const [results,setResults]     = useState<SearchResult[]>([])
  const [searching,setSearching] = useState(false)
  const [searched,setSearched]   = useState(false)
  const [dark,setDark]           = useState(true)
  const [expanded,setExpanded]   = useState<number|null>(null)
  const [showUpload,setShowUpload] = useState(false)
  const [uploading,setUploading] = useState(false)
  const [uploadForm,setUploadForm] = useState({title:'',domain:'networking',description:''})
  const [uploadError,setUploadError] = useState('')
  const [uploadSuccess,setUploadSuccess] = useState('')
  const fileRef = useState<HTMLInputElement|null>(null)

  const hdrs  = () => ({ Authorization: `Bearer ${localStorage.getItem('access_token')||''}` })
  const jhdrs = () => ({ ...hdrs(), 'Content-Type': 'application/json' })

  useEffect(() => {
    const t = localStorage.getItem('engineer_theme'); setDark(t !== 'light')
  }, [])

  const search = async () => {
    if (!query.trim()) return
    setSearching(true); setSearched(false)
    try {
      const r = await fetch(`${API}/api/v1/knowledge/search`, {
        method: 'POST', headers: jhdrs(),
        body: JSON.stringify({ query, n_results: 8, domain: domain || undefined }),
      })
      const d = await r.json()
      setResults(d.results || [])
    } catch { setResults([]) }
    finally { setSearching(false); setSearched(true) }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = document.getElementById('eng-kb-file') as HTMLInputElement
    const file = input?.files?.[0]
    if (!file) { setUploadError('Select a file'); return }
    if (!uploadForm.title.trim()) { setUploadError('Title required'); return }
    setUploading(true); setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', uploadForm.title)
      fd.append('domain', uploadForm.domain)
      fd.append('description', uploadForm.description)
      const r = await fetch(`${API}/api/v1/knowledge/upload`, { method: 'POST', headers: hdrs(), body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Upload failed')
      setUploadSuccess(`"${d.title}" — ${d.chunk_count} chunks indexed.`)
      setShowUpload(false)
      setUploadForm({ title:'', domain:'networking', description:'' })
      input.value = ''
    } catch (err: any) { setUploadError(err.message) }
    finally { setUploading(false) }
  }

  const similarityColor = (s: number) => s >= 80 ? '#4d9e78' : s >= 60 ? '#eab308' : s >= 40 ? '#f97316' : '#6b7280'
  const similarityLabel = (s: number) => s >= 80 ? 'High' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Low'

  const T = {
    text: dark?'#ede8e0':'#1a1a1a', muted: dark?'rgba(237,232,224,0.4)':'rgba(26,26,26,0.45)',
    card: dark?'#141414':'#ffffff', border: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)',
    gl: '#4d9e78', accent: dark?'rgba(23,77,56,0.18)':'rgba(23,77,56,0.08)',
    inp: { width:'100%', padding:'10px 14px', background:dark?'rgba(255,255,255,0.04)':'#f4f3ef', border:`1px solid ${dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.1)'}`, color:dark?'#ede8e0':'#1a1a1a', fontSize:13, outline:'none', borderRadius:6, fontFamily:'"DM Sans",sans-serif' } as React.CSSProperties,
  }

  return (
    <div style={{ fontFamily:'"DM Sans",sans-serif', color:T.text, minHeight:'100vh', background:dark?'#080808':'#f4f3ef', padding:'32px' }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
          <div>
            <h1 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:28, fontWeight:500, color:T.text, marginBottom:6 }}>Knowledge Base</h1>
            <p style={{ fontSize:13, color:T.muted }}>Search IT docs · Semantic similarity search</p>
          </div>
          <button onClick={()=>{setShowUpload(true);setUploadError('');setUploadSuccess('')}}
            style={{ padding:'9px 18px', background:'#174D38', color:'#ede8e0', border:'none', fontSize:13, fontWeight:500, cursor:'pointer', borderRadius:8, fontFamily:'inherit' }}>
            + Upload Doc
          </button>
        </div>

        {uploadSuccess && <div style={{ padding:'11px 14px', background:'rgba(23,77,56,0.12)', border:'1px solid rgba(23,77,56,0.3)', color:'#4d9e78', fontSize:13, marginBottom:16, borderRadius:6 }}>{uploadSuccess}</div>}

        {/* Search */}
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 22px', marginBottom:20 }}>
          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            <input
              style={{ flex:1, padding:'12px 16px', background:dark?'rgba(255,255,255,0.04)':'#f4f3ef', border:`1px solid ${T.border}`, color:T.text, fontSize:14, outline:'none', borderRadius:8, fontFamily:'"DM Sans",sans-serif' }}
              placeholder="Search docs... e.g. 'SSL certificate renewal', 'VPN setup steps'"
              value={query}
              onChange={e=>setQuery(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&search()}
            />
            <button onClick={search} disabled={searching||!query.trim()}
              style={{ padding:'12px 24px', background:!query.trim()||searching?'rgba(23,77,56,0.15)':'linear-gradient(135deg,#174D38,#0f3324)', color:!query.trim()||searching?T.muted:'#ede8e0', border:'none', fontSize:13, fontWeight:600, cursor:!query.trim()||searching?'not-allowed':'pointer', borderRadius:8, fontFamily:'inherit', minWidth:100 }}>
              {searching?'Searching...':'Search'}
            </button>
          </div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {DOMAINS.map(d=>(
              <button key={d.v} onClick={()=>setDomain(d.v)}
                style={{ padding:'4px 10px', background:domain===d.v?T.accent:'transparent', border:`1px solid ${domain===d.v?'rgba(23,77,56,.4)':T.border}`, color:domain===d.v?T.gl:T.muted, fontSize:11, cursor:'pointer', borderRadius:4, fontFamily:'inherit', fontWeight:domain===d.v?600:400 }}>
                {d.l}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {searching && <div style={{ padding:40, textAlign:'center', color:T.muted, fontSize:13 }}>Searching knowledge base...</div>}

        {searched && !searching && results.length === 0 && (
          <div style={{ padding:'40px 24px', textAlign:'center', background:T.card, border:`1px solid ${T.border}`, borderRadius:12 }}>
            <div style={{ fontSize:28, marginBottom:12 }}>🔍</div>
            <div style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:17, fontWeight:500, color:T.text, marginBottom:6 }}>No results found</div>
            <div style={{ fontSize:13, color:T.muted }}>Try different keywords or a broader domain filter.</div>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:12, color:T.muted, marginBottom:4 }}>{results.length} result{results.length!==1?'s':''} for "{query}"</div>
            {results.map((r, i) => (
              <div key={i} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden', position:'relative' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${similarityColor(r.cosine_similarity)},transparent)` }}/>
                <div style={{ padding:'14px 16px', cursor:'pointer' }} onClick={()=>setExpanded(expanded===i?null:i)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:15, fontWeight:500, color:T.text, flex:1, marginRight:12 }}>{r.title}</div>
                    <div style={{ display:'flex', gap:5, flexShrink:0, alignItems:'center' }}>
                      {/* Cosine similarity badge */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4px 10px', background:`${similarityColor(r.cosine_similarity)}12`, border:`1px solid ${similarityColor(r.cosine_similarity)}30`, borderRadius:6 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:similarityColor(r.cosine_similarity), fontFamily:'"Cormorant Garamond",serif' }}>{r.cosine_similarity}%</span>
                        <span style={{ fontSize:9, color:similarityColor(r.cosine_similarity), letterSpacing:'.06em', textTransform:'uppercase' }}>{similarityLabel(r.cosine_similarity)}</span>
                      </div>
                      <span style={{ fontSize:10, padding:'2px 7px', background:T.accent, color:T.gl, borderRadius:3 }}>{DOMAINS.find(d=>d.v===r.domain)?.l||r.domain}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>{r.filename}</div>
                  <div style={{ fontSize:13, color:T.text, lineHeight:1.65, display:expanded===i?'block':'-webkit-box', WebkitLineClamp:expanded===i?undefined:3, WebkitBoxOrient:'vertical' as any, overflow:expanded===i?'visible':'hidden' }}>
                    {r.content}
                  </div>
                  <div style={{ marginTop:8, fontSize:11, color:T.gl }}>{expanded===i?'Show less ↑':'Show more ↓'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searched && !searching && (
          <div style={{ padding:'40px 24px', textAlign:'center', background:T.card, border:`1px solid ${T.border}`, borderRadius:12 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📖</div>
            <div style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:17, fontWeight:500, color:T.text, marginBottom:8 }}>Search the knowledge base</div>
            <div style={{ fontSize:13, color:T.muted, maxWidth:380, margin:'0 auto' }}>Find runbooks, setup guides and troubleshooting docs. Cosine similarity shows how closely each result matches your query.</div>
          </div>
        )}

        {/* Upload modal */}
        {showUpload && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:dark?'#111111':'#ffffff', border:`1px solid ${T.border}`, borderRadius:12, width:'100%', maxWidth:480, overflow:'hidden' }}>
              <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <h2 style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:19, fontWeight:500, color:T.text, marginBottom:3 }}>Upload Document</h2>
                  <p style={{ fontSize:12, color:T.muted }}>PDF, TXT, Markdown · Max 20MB</p>
                </div>
                <button onClick={()=>{setShowUpload(false);setUploadError('')}} style={{ background:'none', border:'none', color:T.muted, fontSize:22, cursor:'pointer' }}>×</button>
              </div>
              <form onSubmit={handleFileUpload} style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                {uploadError && <div style={{ padding:'9px 12px', background:'rgba(77,23,23,0.2)', border:'1px solid rgba(200,50,50,0.3)', color:'#f87171', fontSize:13, borderRadius:6 }}>{uploadError}</div>}
                <div><label style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block', fontWeight:600 }}>File</label><input id="eng-kb-file" type="file" accept=".pdf,.txt,.md" style={{ ...T.inp, cursor:'pointer' }}/></div>
                <div><label style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block', fontWeight:600 }}>Title</label><input style={T.inp} placeholder="e.g. DNS Troubleshooting Guide" value={uploadForm.title} onChange={e=>setUploadForm(f=>({...f,title:e.target.value}))} required/></div>
                <div><label style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block', fontWeight:600 }}>Domain</label>
                  <select style={{ ...T.inp, appearance:'none' as any, cursor:'pointer' }} value={uploadForm.domain} onChange={e=>setUploadForm(f=>({...f,domain:e.target.value}))}>
                    {DOMAINS.filter(d=>d.v!=='').map(d=><option key={d.v} value={d.v}>{d.l}</option>)}
                  </select>
                </div>
                <div><label style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block', fontWeight:600 }}>Description (optional)</label><textarea style={{ ...T.inp, minHeight:52, resize:'vertical' as any }} placeholder="Brief description..." value={uploadForm.description} onChange={e=>setUploadForm(f=>({...f,description:e.target.value}))}/></div>
                <div style={{ display:'flex', gap:10 }}>
                  <button type="button" onClick={()=>{setShowUpload(false);setUploadError('')}} style={{ flex:1, padding:'11px', background:'transparent', border:`1px solid ${T.border}`, color:T.muted, fontSize:13, cursor:'pointer', borderRadius:6, fontFamily:'inherit' }}>Cancel</button>
                  <button type="submit" disabled={uploading} style={{ flex:2, padding:'11px', background:uploading?'rgba(23,77,56,0.3)':'linear-gradient(135deg,#174D38,#0f3324)', color:'#ede8e0', border:'none', fontSize:13, fontWeight:600, cursor:uploading?'not-allowed':'pointer', borderRadius:6, fontFamily:'inherit' }}>
                    {uploading?'Indexing...':'Upload & Index →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}