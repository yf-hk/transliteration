import { useState, useMemo } from 'preact/hooks'
import { transliterate, slugify } from 'transliteration'

interface TranslOptions {
  unknown: string
  replace: [string, string][]
  ignore: string[]
  trim: boolean
  fixChineseSpacing: boolean
}

interface SlugifyOptions {
  lowercase: boolean
  uppercase: boolean
  separator: string
  allowedChars: string
  replace: [string, string][]
  ignore: string[]
  trim: boolean
  fixChineseSpacing: boolean
}

export default function App() {
  const [source, setSource] = useState('')
  
  const [translOpt, setTranslOpt] = useState<TranslOptions>({
    unknown: '',
    replace: [],
    ignore: [],
    trim: false,
    fixChineseSpacing: true
  })
  const [translReplace, setTranslReplace] = useState({ from: '', to: '' })
  const [translIgnore, setTranslIgnore] = useState('')

  const [slugifyOpt, setSlugifyOpt] = useState<SlugifyOptions>({
    lowercase: true,
    uppercase: false,
    separator: '-',
    allowedChars: 'a-zA-Z0-9-_.~',
    replace: [],
    ignore: [],
    trim: false,
    fixChineseSpacing: true
  })
  const [slugifyReplace, setSlugifyReplace] = useState({ from: '', to: '' })
  const [slugifyIgnore, setSlugifyIgnore] = useState('')

  const translResult = useMemo(() => {
    try {
      return transliterate(source, { ...translOpt })
    } catch {
      return ''
    }
  }, [source, translOpt])

  const slugifyResult = useMemo(() => {
    try {
      return slugify(source, { ...slugifyOpt })
    } catch {
      return ''
    }
  }, [source, slugifyOpt])

  const addTranslReplace = () => {
    if (translReplace.from) {
      setTranslOpt(prev => ({
        ...prev,
        replace: [...prev.replace, [translReplace.from, translReplace.to]]
      }))
      setTranslReplace({ from: '', to: '' })
    }
  }

  const removeTranslReplace = (index: number) => {
    setTranslOpt(prev => ({
      ...prev,
      replace: prev.replace.filter((_, i) => i !== index)
    }))
  }

  const addTranslIgnore = () => {
    if (translIgnore) {
      setTranslOpt(prev => ({
        ...prev,
        ignore: [...prev.ignore, translIgnore]
      }))
      setTranslIgnore('')
    }
  }

  const removeTranslIgnore = (index: number) => {
    setTranslOpt(prev => ({
      ...prev,
      ignore: prev.ignore.filter((_, i) => i !== index)
    }))
  }

  const addSlugifyReplace = () => {
    if (slugifyReplace.from) {
      setSlugifyOpt(prev => ({
        ...prev,
        replace: [...prev.replace, [slugifyReplace.from, slugifyReplace.to]]
      }))
      setSlugifyReplace({ from: '', to: '' })
    }
  }

  const removeSlugifyReplace = (index: number) => {
    setSlugifyOpt(prev => ({
      ...prev,
      replace: prev.replace.filter((_, i) => i !== index)
    }))
  }

  const addSlugifyIgnore = () => {
    if (slugifyIgnore) {
      setSlugifyOpt(prev => ({
        ...prev,
        ignore: [...prev.ignore, slugifyIgnore]
      }))
      setSlugifyIgnore('')
    }
  }

  const removeSlugifyIgnore = (index: number) => {
    setSlugifyOpt(prev => ({
      ...prev,
      ignore: prev.ignore.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="title">
            <span className="title-gradient">Transliteration</span>
            <span className="title-sub">Demo</span>
          </h1>
          <a 
            className="github-link" 
            href="https://github.com/yf-hk/transliteration" 
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </header>

      <main className="main">
        <div className="grid">
          {/* Input/Output Card */}
          <div className="card card-primary">
            <div className="card-header">
              <span className="card-icon">✨</span>
              <h2>Input / Output</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="source">Source String</label>
                <textarea 
                  id="source"
                  value={source}
                  onInput={(e) => setSource((e.target as HTMLTextAreaElement).value)}
                  placeholder="Type any unicode characters here..."
                  rows={3}
                />
              </div>

              <div className="field">
                <label>Transliteration Result</label>
                <div className="output-box">{translResult || <span className="placeholder">Result will appear here...</span>}</div>
              </div>

              <div className="field">
                <label>Slugify Result</label>
                <div className="output-box output-slug">{slugifyResult || <span className="placeholder">Result will appear here...</span>}</div>
              </div>
            </div>
          </div>

          {/* Transliteration Options Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-icon">⚙️</span>
              <h2>Transliteration Options</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label htmlFor="transl-unknown">Unknown Character Placeholder</label>
                <input 
                  id="transl-unknown"
                  type="text"
                  value={translOpt.unknown}
                  onInput={(e) => setTranslOpt(prev => ({ ...prev, unknown: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., [?]"
                />
              </div>

              <div className="field field-inline">
                <label htmlFor="transl-trim">Trim Result</label>
                <button 
                  id="transl-trim"
                  type="button"
                  className={`toggle ${translOpt.trim ? 'active' : ''}`}
                  onClick={() => setTranslOpt(prev => ({ ...prev, trim: !prev.trim }))}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="field field-inline">
                <label htmlFor="transl-fix-chinese">Fix Chinese Spacing</label>
                <button 
                  id="transl-fix-chinese"
                  type="button"
                  className={`toggle ${translOpt.fixChineseSpacing ? 'active' : ''}`}
                  onClick={() => setTranslOpt(prev => ({ ...prev, fixChineseSpacing: !prev.fixChineseSpacing }))}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="field">
                <label>Replace Rules</label>
                {translOpt.replace.length > 0 && (
                  <div className="tags">
                    {translOpt.replace.map((item, i) => (
                      <span key={i} className="tag">
                        <span className="tag-from">{item[0]}</span>
                        <span className="tag-arrow">→</span>
                        <span className="tag-to">{item[1]}</span>
                        <button type="button" className="tag-remove" onClick={() => removeTranslReplace(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-group">
                  <input 
                    type="text"
                    value={translReplace.from}
                    onInput={(e) => setTranslReplace(prev => ({ ...prev, from: (e.target as HTMLInputElement).value }))}
                    placeholder="From"
                    aria-label="Replace from"
                  />
                  <input 
                    type="text"
                    value={translReplace.to}
                    onInput={(e) => setTranslReplace(prev => ({ ...prev, to: (e.target as HTMLInputElement).value }))}
                    placeholder="To"
                    aria-label="Replace to"
                  />
                  <button type="button" className="btn btn-add" disabled={!translReplace.from} onClick={addTranslReplace}>+</button>
                </div>
              </div>

              <div className="field">
                <label>Ignore List</label>
                {translOpt.ignore.length > 0 && (
                  <div className="tags">
                    {translOpt.ignore.map((item, i) => (
                      <span key={i} className="tag tag-ignore">
                        {item}
                        <button type="button" className="tag-remove" onClick={() => removeTranslIgnore(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-group">
                  <input 
                    type="text"
                    value={translIgnore}
                    onInput={(e) => setTranslIgnore((e.target as HTMLInputElement).value)}
                    placeholder="String to ignore"
                    aria-label="String to ignore"
                  />
                  <button type="button" className="btn btn-add" disabled={!translIgnore} onClick={addTranslIgnore}>+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Slugify Options Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-icon">🔗</span>
              <h2>Slugify Options</h2>
            </div>
            <div className="card-body">
              <div className="field field-inline">
                <label htmlFor="slug-lowercase">Lowercase</label>
                <button 
                  id="slug-lowercase"
                  type="button"
                  className={`toggle ${slugifyOpt.lowercase ? 'active' : ''}`}
                  onClick={() => setSlugifyOpt(prev => ({ ...prev, lowercase: !prev.lowercase, uppercase: false }))}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="field field-inline">
                <label htmlFor="slug-uppercase">Uppercase</label>
                <button 
                  id="slug-uppercase"
                  type="button"
                  className={`toggle ${slugifyOpt.uppercase ? 'active' : ''}`}
                  onClick={() => setSlugifyOpt(prev => ({ ...prev, uppercase: !prev.uppercase, lowercase: false }))}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="field field-inline">
                <label htmlFor="slug-trim">Trim Result</label>
                <button 
                  id="slug-trim"
                  type="button"
                  className={`toggle ${slugifyOpt.trim ? 'active' : ''}`}
                  onClick={() => setSlugifyOpt(prev => ({ ...prev, trim: !prev.trim }))}
                >
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="field">
                <label htmlFor="slug-separator">Separator</label>
                <input 
                  id="slug-separator"
                  type="text"
                  value={slugifyOpt.separator}
                  onInput={(e) => setSlugifyOpt(prev => ({ ...prev, separator: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., -"
                />
              </div>

              <div className="field">
                <label htmlFor="slug-allowed">Allowed Characters</label>
                <input 
                  id="slug-allowed"
                  type="text"
                  value={slugifyOpt.allowedChars}
                  onInput={(e) => setSlugifyOpt(prev => ({ ...prev, allowedChars: (e.target as HTMLInputElement).value }))}
                  placeholder="e.g., a-zA-Z0-9-_.~"
                />
              </div>

              <div className="field">
                <label>Replace Rules</label>
                {slugifyOpt.replace.length > 0 && (
                  <div className="tags">
                    {slugifyOpt.replace.map((item, i) => (
                      <span key={i} className="tag">
                        <span className="tag-from">{item[0]}</span>
                        <span className="tag-arrow">→</span>
                        <span className="tag-to">{item[1]}</span>
                        <button type="button" className="tag-remove" onClick={() => removeSlugifyReplace(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-group">
                  <input 
                    type="text"
                    value={slugifyReplace.from}
                    onInput={(e) => setSlugifyReplace(prev => ({ ...prev, from: (e.target as HTMLInputElement).value }))}
                    placeholder="From"
                    aria-label="Replace from"
                  />
                  <input 
                    type="text"
                    value={slugifyReplace.to}
                    onInput={(e) => setSlugifyReplace(prev => ({ ...prev, to: (e.target as HTMLInputElement).value }))}
                    placeholder="To"
                    aria-label="Replace to"
                  />
                  <button type="button" className="btn btn-add" disabled={!slugifyReplace.from} onClick={addSlugifyReplace}>+</button>
                </div>
              </div>

              <div className="field">
                <label>Ignore List</label>
                {slugifyOpt.ignore.length > 0 && (
                  <div className="tags">
                    {slugifyOpt.ignore.map((item, i) => (
                      <span key={i} className="tag tag-ignore">
                        {item}
                        <button type="button" className="tag-remove" onClick={() => removeSlugifyIgnore(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-group">
                  <input 
                    type="text"
                    value={slugifyIgnore}
                    onInput={(e) => setSlugifyIgnore((e.target as HTMLInputElement).value)}
                    placeholder="String to ignore"
                    aria-label="String to ignore"
                  />
                  <button type="button" className="btn btn-add" disabled={!slugifyIgnore} onClick={addSlugifyIgnore}>+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
