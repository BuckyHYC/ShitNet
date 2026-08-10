import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUpRight,
  CircleDot,
  Cpu,
  ExternalLink,
  Hammer,
  Rocket,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

const GITHUB_URL = 'https://github.com/BuckyHYC'
const MORON_TOWN_URL = 'https://moron-town.vercel.app'
const STORAGE_KEY = 'shitnet_feedback_v1'
const COMMAND = 'open moron-town.vercel.app'

const bootLines = [
  { time: '12:00:01', level: 'ok', text: 'ShitNet OS v1.0 booting...' },
  { time: '12:00:02', level: 'ok', text: 'bad-idea engine ......... online' },
  { time: '12:00:03', level: 'ok', text: 'moron-town link ......... ready' },
  { time: '12:00:04', level: 'warn', text: 'placeholder slots ...... 2 pending' },
  { time: '12:00:05', level: 'ok', text: 'feedback channel ....... open' },
]

const projects = [
  {
    name: 'MoronTown',
    tag: 'LIVE',
    accent: 'live',
    icon: Rocket,
    description: '一个已经上线的小城项目，现在就能点进去逛。',
    meta: 'vercel.app · playable now',
    href: MORON_TOWN_URL,
  },
  {
    name: 'Next Bad Idea',
    tag: 'SOON',
    accent: 'warn',
    icon: Hammer,
    description: '下一个烂点子正在孵化，先把位置占好。',
    meta: 'status: in development',
    href: null,
  },
  {
    name: 'Mystery Slot',
    tag: 'SOON',
    accent: 'muted',
    icon: Cpu,
    description: '保留位，等真正的灵感（或灾难）出现。',
    meta: 'status: in queue',
    href: null,
  },
]

function GithubMark({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  )
}

function Typewriter({ text, speed = 55 }) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    const id = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(id)
          return current
        }
        return current + 1
      })
    }, speed)
    return () => window.clearInterval(id)
  }, [reduced, speed, text])

  return (
    <span className="typewriter">
      <span>{text.slice(0, count)}</span>
      <span className="cursor" aria-hidden="true" />
    </span>
  )
}

function BootLog() {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className="terminal-window"
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="terminal-bar">
        <div className="terminal-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="terminal-title">sh -- ShitNet boot</span>
      </div>
      <div className="terminal-body">
        <div className="boot-lines">
          {bootLines.map((line, index) => (
            <motion.p
              className={`boot-line boot-line--${line.level}`}
              key={line.text}
              initial={reduced ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.35, duration: 0.35 }}
            >
              <span className="boot-time">{line.time}</span>
              <span className="boot-status">{line.level}</span>
              <span className="boot-text">{line.text}</span>
            </motion.p>
          ))}
        </div>
        <div className="command-line">
          <span className="prompt">sh &gt;</span>
          <Typewriter text={COMMAND} speed={55} />
        </div>
      </div>
    </motion.div>
  )
}

function readFeedback() {
  const empty = { vote: null, likes: 0, dislikes: 0 }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return empty
    }
    const parsed = JSON.parse(raw)
    return {
      vote:
        parsed.vote === 'like' || parsed.vote === 'dislike'
          ? parsed.vote
          : null,
      likes: Number.isFinite(parsed.likes) ? Math.max(0, parsed.likes) : 0,
      dislikes: Number.isFinite(parsed.dislikes)
        ? Math.max(0, parsed.dislikes)
        : 0,
    }
  } catch {
    return empty
  }
}

function Feedback() {
  const [state, setState] = useState(readFeedback)

  const applyVote = (choice) => {
    const next = { ...state }
    const target = choice === 'like' ? 'likes' : 'dislikes'

    if (next.vote === choice) {
      next[target] = Math.max(0, next[target] - 1)
      next.vote = null
    } else {
      if (next.vote === 'like') {
        next.likes = Math.max(0, next.likes - 1)
      }
      if (next.vote === 'dislike') {
        next.dislikes = Math.max(0, next.dislikes - 1)
      }
      next.vote = choice
      next[target] += 1
    }

    setState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 浏览器禁用存储时，仅保留当前页面内的状态
    }
  }

  return (
    <div className="feedback-panel">
      <div className="feedback-copy">
        <span className="feedback-label">USER INPUT // LOCAL</span>
        <p className="feedback-line">这个网站，还行吗？</p>
        <p className="feedback-note">
          数据只存在你的浏览器里，不联网，不跨设备。
        </p>
      </div>
      <div className="feedback-actions">
        <button
          className="vote-button vote-button--like"
          type="button"
          aria-pressed={state.vote === 'like'}
          onClick={() => applyVote('like')}
        >
          <ThumbsUp size={18} />
          <span>满意</span>
          <span className="vote-count">{state.likes}</span>
        </button>
        <button
          className="vote-button vote-button--dislike"
          type="button"
          aria-pressed={state.vote === 'dislike'}
          onClick={() => applyVote('dislike')}
        >
          <ThumbsDown size={18} />
          <span>不满意</span>
          <span className="vote-count">{state.dislikes}</span>
        </button>
      </div>
    </div>
  )
}

function ProjectCard({ project, index }) {
  const reduced = useReducedMotion()
  const Icon = project.icon
  const content = (
    <>
      <div className="card-top">
        <span className={`card-icon card-icon--${project.accent}`}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className={`tag tag--${project.accent}`}>{project.tag}</span>
      </div>
      <h3 className="card-title">{project.name}</h3>
      <p className="card-description">{project.description}</p>
      <p className="card-meta">{project.meta}</p>
      <div className="card-action">
        {project.href ? (
          <>
            <span>进入站点</span>
            <ArrowUpRight size={17} />
          </>
        ) : (
          <>
            <span>即将上线</span>
            <CircleDot size={16} />
          </>
        )}
      </div>
    </>
  )

  const entrance = reduced
    ? { initial: false, whileInView: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
      }
  const motionProps = {
    ...entrance,
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.45, delay: index * 0.08, ease: 'easeOut' },
  }

  if (project.href) {
    return (
      <motion.a
        className="project-card project-card--live"
        href={project.href}
        target="_blank"
        rel="noreferrer"
        {...motionProps}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.div
      className="project-card project-card--pending"
      aria-disabled="true"
      {...motionProps}
    >
      {content}
    </motion.div>
  )
}

function App() {
  return (
    <div className="app">
      <div className="bg-grid" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="ShitNet 回到顶部">
            <span className="brand-bracket">[</span>
            SHITNET
            <span className="brand-bracket">]</span>
          </a>
          <div className="topbar-status">
            <span className="status-dot" />
            <span>ALL SYSTEMS LOUD</span>
          </div>
          <a
            className="topbar-github"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            <GithubMark size={16} />
            <span>GitHub</span>
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">// SHITNET v1.0 · BAD IDEAS, SHIPPED</p>
            <h1 className="hero-title">
              烂点子，
              <br />
              也要被认真发射。
            </h1>
            <p className="hero-sub">
              这里是 ShitNet，我的项目集散地。所有粗糙、离谱、半成品但正在变好的东西，都会出现在这里。
            </p>
            <div className="hero-actions">
              <a
                className="btn btn-primary"
                href={MORON_TOWN_URL}
                target="_blank"
                rel="noreferrer"
              >
                进入 MoronTown
                <ArrowUpRight size={19} />
              </a>
              <a
                className="btn btn-ghost"
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
              >
                <GithubMark size={17} />
                GitHub
              </a>
            </div>
            <p className="hero-hint">↓ 往下看：项目列表 + 反馈</p>
          </div>
          <div className="hero-terminal">
            <BootLog />
          </div>
        </section>

        <section className="section section-projects" id="projects">
          <div className="section-inner">
            <div className="section-head">
              <p className="section-index">01 // PROJECTS</p>
              <h2 className="section-title">在跑的项目</h2>
              <p className="section-desc">
                点开第一张卡片，去 MoronTown 里逛一圈。
              </p>
            </div>
            <div className="projects-grid">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.name}
                  project={project}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="section section-feedback" id="feedback">
          <div className="section-inner">
            <div className="section-head">
              <p className="section-index">02 // FEEDBACK</p>
              <h2 className="section-title">投个票再走</h2>
            </div>
            <Feedback />
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>SHITNET © 2026 · 纯前端，无后端</p>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          github.com/BuckyHYC
        </a>
      </footer>

      <a
        className="github-badge"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="ShitNet GitHub 主页"
      >
        <GithubMark size={17} />
        <span>ShitNet</span>
      </a>
    </div>
  )
}

export default App
