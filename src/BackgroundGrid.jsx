import { useEffect, useRef } from 'react'

// ===== 微交互参数（克制、轻微、不干扰内容） =====
const GRID = 46 // 网格间距（与原 CSS 网格一致）
const SAMPLE = GRID / 4 // 线段采样步长（11.5px）：加密使高亮边缘平滑、无阶梯硬边
const RADIUS = 100 // 搅动影响半径（px）：80~120
const GLOW_RADIUS = 65 // 高亮影响半径（px）：50~80
const PUSH_MAX = 2.5 // 推挤最大位移（px）：总扭曲控制在 2~4px
const RIPPLE_MAX = 1.2 // 涟漪最大位移（px）
const FOLLOW_TAU = 0.07 // 鼠标跟随延迟（s）：越小越跟手，0.05~0.1 之间调节
const RISE_TAU = 0.15 // 能量上升时间常数（s）
const FALL_TAU = 0.25 // 能量恢复时间常数（s）：0.4~0.6s 内恢复平静
const LAYERS = 24 // 颜色分层数（越多亮度渐变越平滑，stroke 次数随之增加）
const BASE_RGB = [52, 245, 197] // 网格线本色（青色，与原 CSS 一致）
const BASE_ALPHA = 0.045
const GLOW_RGB = [255, 255, 255] // 鼠标附近网格线变亮后的颜色（纯白，高亮更明显）
const GLOW_ALPHA = 0.4 // 高亮时透明度：0.3 ~ 0.5 区间
const MOVE_THRESHOLD = 12 // 判定鼠标"在移动"的速度阈值（px/s）：超过即满强度，与速度大小无关

// ===== 点击涟漪参数（可微调） =====
const CLICK_RADIUS = 220 // 涟漪最大扩散半径（px）：180~250
const CLICK_DURATION = 0.8 // 涟漪持续时间（s）：爆发更快，尾段仍缓慢消散
const CLICK_PUSH = 5 // 点击中心峰值位移（px）：3~5，随距离衰减趋近 0
const CLICK_DECAY = 0.3 // 高斯宽度系数：σ = 当前前沿半径 * CLICK_DECAY（随扩散摊开），越小衰减越快
const FRONT_SOFT = 24 // 涟漪前沿软过渡宽度（px）：前沿扫过时强度渐入，消除边界突跳
const MAX_DISP = 9 // 总位移上限（px）：多力叠加时 clamp，防止个别点被拉得过远形成尖锐转折

// ===== 平滑性参数（修复跳动/硬边） =====
const DISP_LERP = 0.15 // 帧间位移插值系数：当前位移 = lerp(当前, 目标, DISP_LERP)，平滑逼近防突变
const SMOOTH_SELF = 0.6 // Laplacian 邻居平滑：自身权重
const SMOOTH_NEIGHBOR = 0.4 // Laplacian 邻居平滑：邻居均值权重（1 - SMOOTH_SELF）

const smoothstep = (t) => t * t * (3 - 2 * t)
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10) // 两端导数均为 0，过渡最平滑
const easeOutQuint = (t) => 1 - (1 - t) ** 5 // 更陡的先快后慢：点击瞬间更快荡开

function BackgroundGrid() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let last = 0
    let mouse = { x: -9999, y: -9999 } // 文档坐标（视口坐标 + scrollY，每帧重算）
    let client = { x: -9999, y: -9999 } // 视口坐标：仅鼠标移动更新
    let prevClient = { x: -9999, y: -9999 }
    let follow = { x: -9999, y: -9999 } // 平滑跟随位置（滞后鼠标，产生拖拽感）
    let energy = 0 // 扰动强度 0..1，随鼠标速度增减
    let phase = 0 // 涟漪相位

    let rows = [] // 水平网格线：[{x,y},...]（交叉点与 cols 共享同一顶点对象）
    let cols = [] // 垂直网格线
    let verts = [] // 全部唯一顶点（用于位移更新，避免共享点被重复 lerp）
    let ripples = [] // 点击涟漪：[{x, y, start, radius, t}]

    // 预计算各层颜色：按亮度插值 青色 → 浅灰
    const layerColors = Array.from({ length: LAYERS }, (_, i) => {
      const t = i / (LAYERS - 1)
      const rgb = BASE_RGB.map((c, j) => Math.round(c + (GLOW_RGB[j] - c) * t))
      const a = BASE_ALPHA + (GLOW_ALPHA - BASE_ALPHA) * t
      return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(3)})`
    })

    function buildGrid() {
      rows = []
      cols = []
      verts = []
      // 交叉点共享同一顶点对象：横竖线在交叉处位移一致，避免错位折角
      const shared = new Map()
      const getV = (x, y) => {
        const key = `${Math.round(x)},${Math.round(y)}`
        let v = shared.get(key)
        if (!v) {
          v = { x, y, ox: 0, oy: 0, idx: verts.length }
          shared.set(key, v)
          verts.push(v)
        }
        return v
      }
      for (let y = 0; y <= height; y += GRID) {
        const line = []
        for (let x = 0; x <= width; x += SAMPLE) line.push(getV(x, y))
        rows.push(line)
      }
      for (let x = 0; x <= width; x += GRID) {
        const line = []
        for (let y = 0; y <= height; y += SAMPLE) line.push(getV(x, y))
        cols.push(line)
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      // 画布铺满整个文档（随滚动同步），而非仅视口
      height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      )
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildGrid()
      if (reduced) drawStatic()
    }

    function onMove(e) {
      client = { x: e.clientX, y: e.clientY }
    }

    function onLeave() {
      client = { x: -9999, y: -9999 }
    }

    // 点击触发涟漪：按下瞬间在光标位置爆发（文档坐标）
    function onDown(e) {
      if (reduced) return
      ripples.push({
        x: e.clientX,
        y: e.clientY + window.scrollY,
        start: performance.now(),
        radius: 0,
        t: 0, // 进度 0..1
      })
    }

    // 静止网格（reduced motion 时使用）
    function drawStatic() {
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = layerColors[0]
      ctx.lineWidth = 1
      for (const line of rows) {
        ctx.beginPath()
        line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.stroke()
      }
      for (const line of cols) {
        ctx.beginPath()
        line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.stroke()
      }
    }

    function draw(now) {
      raf = requestAnimationFrame(draw)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // 每帧用视口坐标 + 滚动偏移重算文档坐标：滚动时鼠标未动，高亮也跟随光标（而非停在原地）
      mouse = { x: client.x, y: client.y + window.scrollY }

      // 平滑跟随：位置滞后鼠标（拖拽延迟）
      const fk = 1 - Math.exp(-dt / FOLLOW_TAU)
      // 鼠标刚进入（或离开后重进）时直接瞬移到光标处，避免高亮从远处"飞入"
      if (Math.hypot(mouse.x - follow.x, mouse.y - follow.y) > 1000) {
        follow = { ...mouse }
      } else {
        follow.x += (mouse.x - follow.x) * fk
        follow.y += (mouse.y - follow.y) * fk
      }

      // 能量：与鼠标速度解耦——只要在移动（超过极小阈值）即满强度，低速与高速扭曲幅度一致；
      // 完全静止后 ~0.5s 平滑恢复平静。强度只由距离场衰减决定，速度不参与乘法。
      // 速度仅用视口坐标计算，滚动页面不会误判为鼠标移动
      const instSpeed = Math.hypot(client.x - prevClient.x, client.y - prevClient.y) / Math.max(dt, 1e-3)
      prevClient = { ...client }
      const target = instSpeed > MOVE_THRESHOLD ? 1 : 0
      const tau = target > energy ? RISE_TAU : FALL_TAU
      energy += (target - energy) * (1 - Math.exp(-dt / tau))
      phase += dt * (1.2 + energy * 2) // 涟漪相位：缓慢

      ctx.clearRect(0, 0, width, height)
      ctx.lineWidth = 1

      // 推进涟漪：前沿以先快后慢曲线荡开（爆发明显），结束后移除
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        r.t = Math.min(1, (now - r.start) / (CLICK_DURATION * 1000))
        if (r.t >= 1) {
          ripples.splice(i, 1)
          continue
        }
        r.radius = easeOutQuint(r.t) * CLICK_RADIUS
      }

      // 位移场：先对每个唯一顶点计算目标位移并做帧间插值（平滑逼近，消除突变）
      const updateDisplacement = (p) => {
        let tx = 0
        let ty = 0

        // 1) 鼠标移动：向外推挤 + 轻微涟漪；smootherstep 平滑衰减，边界导数连续
        const mdx = p.x - follow.x
        const mdy = p.y - follow.y
        const md = Math.hypot(mdx, mdy)
        if (md < RADIUS && md >= 0.001) {
          const mfall = smootherstep(1 - md / RADIUS)
          const mnx = mdx / md
          const mny = mdy / md
          const amp = mfall * energy * (PUSH_MAX + RIPPLE_MAX * Math.sin(md * 0.05 - phase * 2))
          tx += mnx * amp
          ty += mny * amp
        }

        // 2) 点击涟漪：高斯钟形波（任意距离连续平滑、无棱角），中心幅度最大；
        //    前沿用 FRONT_SOFT 软过渡带，扫过顶点时强度渐入，无突跳
        for (const r of ripples) {
          const dx = p.x - r.x
          const dy = p.y - r.y
          const d = Math.hypot(dx, dy)
          if (d >= r.radius + FRONT_SOFT || d < 0.001) continue
          const nx = dx / d
          const ny = dy / d
          // 高斯 σ 随前沿半径增长而摊开，波形始终平滑
          const sigma = Math.max(r.radius * CLICK_DECAY, 8)
          // 前沿软过渡：d <= radius 时全强，radius ~ radius+FRONT_SOFT 间平滑降为 0
          const front = d <= r.radius ? 1 : smootherstep(1 - (d - r.radius) / FRONT_SOFT)
          // 高斯波：exp(-d² / 2σ²) * 时间衰减 (1-t)²
          const amp = CLICK_PUSH * Math.exp(-(d * d) / (2 * sigma * sigma)) * (1 - r.t) ** 2 * front
          tx += nx * amp
          ty += ny * amp
        }

        // 帧间插值：实际位移平滑逼近目标，鼠标快速靠近某条线时也是渐入而非瞬跳
        p.ox += (tx - p.ox) * DISP_LERP
        p.oy += (ty - p.oy) * DISP_LERP

        // 限制力叠加上限：多涟漪/多力重叠时 clamp 总位移，防止个别点被拉得过远
        const mag = Math.hypot(p.ox, p.oy)
        if (mag > MAX_DISP) {
          p.ox = (p.ox / mag) * MAX_DISP
          p.oy = (p.oy / mag) * MAX_DISP
        }
      }

      for (let i = 0; i < verts.length; i++) {
        updateDisplacement(verts[i])
      }

      // 顶点邻居平滑（Laplacian）：把每个顶点的位移向邻居均值"拉"一点，
      // 被多个点击拉向不同方向的点由邻居圆润过渡，形成曲线而非折角
      const snapOx = new Float32Array(verts.length)
      const snapOy = new Float32Array(verts.length)
      for (let i = 0; i < verts.length; i++) {
        snapOx[i] = verts[i].ox
        snapOy[i] = verts[i].oy
      }
      // 水平线邻居
      for (const line of rows) {
        for (let i = 1; i < line.length - 1; i++) {
          const p = line[i]
          const l = line[i - 1]
          const r = line[i + 1]
          p.ox = SMOOTH_SELF * snapOx[p.idx] + SMOOTH_NEIGHBOR * ((snapOx[l.idx] + snapOx[r.idx]) / 2)
          p.oy = SMOOTH_SELF * snapOy[p.idx] + SMOOTH_NEIGHBOR * ((snapOy[l.idx] + snapOy[r.idx]) / 2)
        }
      }
      // 垂直线邻居
      for (const line of cols) {
        for (let i = 1; i < line.length - 1; i++) {
          const p = line[i]
          const u = line[i - 1]
          const d = line[i + 1]
          p.ox = SMOOTH_SELF * snapOx[p.idx] + SMOOTH_NEIGHBOR * ((snapOx[u.idx] + snapOx[d.idx]) / 2)
          p.oy = SMOOTH_SELF * snapOy[p.idx] + SMOOTH_NEIGHBOR * ((snapOy[u.idx] + snapOy[d.idx]) / 2)
        }
      }

      const displace = (p) => {
        if (p.ox === 0 && p.oy === 0) return p
        return { x: p.x + p.ox, y: p.y + p.oy }
      }

      // 网格线：按线段距鼠标距离插值颜色（近处变亮、远处保持青色），线段本身随位移场弯曲
      const layers = Array.from({ length: LAYERS }, () => new Path2D())
      const vh = window.innerHeight
      const emit = (a, b) => {
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        // 视口相对渐隐：视口顶部 55% 内全亮，之下线性衰减（与原 CSS mask 一致，随滚动始终作用于视口）
        const v = my - window.scrollY
        const maskFade = v <= vh * 0.55 ? 1 : Math.max(0, 1 - (v - vh * 0.55) / (vh * 0.45))
        if (maskFade <= 0) return
        const d = Math.hypot(mx - follow.x, my - follow.y)
        const t = smoothstep(Math.max(0, 1 - d / GLOW_RADIUS)) * maskFade
        const layer = Math.min(LAYERS - 1, Math.floor(t * LAYERS))
        const path = layers[layer]
        path.moveTo(a.x, a.y)
        path.lineTo(b.x, b.y)
      }

      for (const line of rows) {
        for (let i = 0; i < line.length - 1; i++) {
          emit(displace(line[i]), displace(line[i + 1]))
        }
      }
      for (const line of cols) {
        for (let i = 0; i < line.length - 1; i++) {
          emit(displace(line[i]), displace(line[i + 1]))
        }
      }

      for (let i = 0; i < LAYERS; i++) {
        ctx.strokeStyle = layerColors[i]
        ctx.stroke(layers[i])
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('pointerdown', onDown)

    if (!reduced) {
      last = performance.now()
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  return <canvas ref={canvasRef} className="bg-grid" aria-hidden="true" />
}

export default BackgroundGrid
