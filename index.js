/**
 * 小红书创作台 · Host 半部
 *
 * 负责：
 *  - 用本机 Chrome/Edge（有头、直连）打开小红书，并通过 CDP 驱动登录 / 发布；
 *  - 通过 ctx.llm 按提示词生成标题、正文与标签；
 *  - 通过 ctx.webServer 给右侧栏面板提供同源 JSON 接口与实时截图。
 *
 * 不依赖任何第三方 npm 包：CDP 使用 Node 内置 WebSocket，HTTP 使用内置 http。
 */
import { spawn, execFile } from 'node:child_process'
import { createServer } from 'node:net'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { checkRisk, DEFAULT_RULES, rulesToText, parseRulesText } from './risk.js'

export const name = 'xhs-publisher'
export const inject = ['webServer']

const ROUTE = '/xhs/api'
const ORIGIN = 'https://www.xiaohongshu.com'
const CREATOR = 'https://creator.xiaohongshu.com'
const PUBLISH_URL = `${CREATOR}/publish/publish?source=official`
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomPause = (min = 1000, max = 5000) => sleep(min + Math.floor(Math.random() * (max - min + 1)))

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url))
const COLLAGE_SCRIPT = path.join(PLUGIN_DIR, 'collage.py')
const GROUP_SCRIPT = path.join(PLUGIN_DIR, 'group_images.py')
const SELECT_SCRIPT = path.join(PLUGIN_DIR, 'select_similar.py')

/** 手机端显示不出来的大多是较新的 emoji；只保留基础常用表情。 */
const SAFE_EMOJI = new Set(['🍵', '🎁', '🌿', '✨', '💛', '💬', '🍃', '📦', '🎀', '🍊', '☕', '🌱', '🍂', '🌸'])

function sanitizeEmoji(text) {
  return String(text || '')
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, (match) => {
      const base = match.replace(/\uFE0F|\u200D/gu, '')
      return SAFE_EMOJI.has(base) ? match.replace(/\uFE0F/gu, '') : ''
    })
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
}

/** 首次安装时预置的提示词模板（湖北武汉茶叶伴手礼）。 */
const SAMPLE_TEMPLATE = `请为我生成 {{count}} 组独立成套、可直接发布的小红书爆款笔记，具体要求如下：

一、基础固定信息（永久不变）
行业/产品：湖北武汉特产茶叶伴手礼
核心卖点：本地地域特色、送礼体面、正宗湖北好茶、颜值高、轻便好携带，适配游客返程/本地人走亲访友/商务送礼全场景
目标人群：来武汉旅游的游客、武汉本地有送礼需求的人群、需要湖北特色伴手礼的用户
内容风格：温柔高级、接地气、真实博主种草感、无硬广感、带同城引流属性
核心搜索关键词（按算法权重优先级排序）：湖北特产、武汉伴手礼、武汉特产、武汉礼物、茶叶礼盒、武汉旅游

二、关键词布局强制规则
1. 标题规则：每篇标题前10个字必须出现1个核心高权重关键词（优先湖北特产/武汉伴手礼），标题结构为「核心大词+精准长尾词+场景+情绪钩子」，每篇标题必须覆盖1个核心大词+1个精准长尾词，不堆砌关键词，自然吸睛。
2. 正文埋词规则：正文采用三段式固定埋词，核心词全文出现3-5次，密度控制在3%-5%，不堆砌不降权。
   - 开头前3行：必须完整出现1-2次核心关键词，匹配用户搜索痛点；
   - 中间主体：自然融入核心卖点+场景长尾词（如武汉旅游必买、本地人走亲戚送礼、商务伴手礼等），强化内容相关性；
   - 结尾：自然二次强化核心关键词，带温和合规的同城引流引导，无违规导流词。
3. 标签规则：每组末尾附带10个话题标签，严格按照「2个核心大词+3个精准长尾词+3个场景词+2个同城热词」的黄金配比，每篇标签必须包含核心关键词。

三、内容排版要求
1. 每组笔记=1个爆款标题+1篇对应正文文案+10个适配话题标签，每组可独立发帖使用。
2. 正文必须短句、分段清晰、搭配适配的表情符号、易读性强，符合小红书爆款排版。
3. 语言为真实本地博主种草口吻，自然不生硬，无强广告感。

四、本期可变调整项
内容侧重：{{focus}}
额外要求：{{extra}}`

const DEFAULTS = {
  dataDir: '',
  chromePath: '',
  direct: true,
  windowPosition: '-2400,0',
  windowSize: '1280,960',
  provider: '',
  model: '',
  temperature: 0.85,
}

/** 日志前缀，便于在 Host 控制台定位。 */
function log(...args) {
  console.log('[xhs]', ...args)
}

/** 找可执行文件。 */
function findBrowser(configured) {
  const candidates = [
    configured,
    process.env.XHS_BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {}
  }
  throw new Error('没有找到 Chrome 或 Edge，请在配置里设置 chromePath')
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
  })
}

function httpJson(port, method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, timeout: 3000 }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } catch (error) { reject(error) }
      })
    })
    req.on('timeout', () => req.destroy(new Error('CDP 请求超时')))
    req.on('error', reject)
    req.end()
  })
}

/** 一个页面级 CDP 连接。 */
class Page {
  constructor(url) {
    this.url = url
    this.nextId = 0
    this.pending = new Map()
    this.closed = false
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      const timer = setTimeout(() => reject(new Error('CDP WebSocket 连接超时')), 8000)
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
      this.ws.addEventListener('error', (event) => { clearTimeout(timer); reject(new Error('CDP WebSocket 连接失败: ' + (event?.message || 'unknown'))) }, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      let message
      try { message = JSON.parse(event.data) } catch { return }
      const entry = message.id !== undefined ? this.pending.get(message.id) : undefined
      if (!entry) return
      this.pending.delete(message.id)
      if (message.error) entry.reject(new Error(message.error.message || JSON.stringify(message.error)))
      else entry.resolve(message.result)
    })
    this.ws.addEventListener('close', () => {
      this.closed = true
      for (const entry of this.pending.values()) entry.reject(new Error('CDP 连接已关闭'))
      this.pending.clear()
    })
  }

  send(method, params = {}) {
    if (this.closed) return Promise.reject(new Error('CDP 连接已关闭'))
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async init() {
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('DOM.enable')
    await this.send('Network.enable')
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 960, deviceScaleFactor: 1, mobile: false,
    })
  }

  async goto(url, waitMs = 2500) {
    await this.send('Page.navigate', { url })
    await sleep(350)
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 960, deviceScaleFactor: 1, mobile: false,
    })
    await sleep(Math.max(0, waitMs - 350))
  }

  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true, userGesture: true,
    })
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text
      throw new Error('页面脚本执行失败: ' + detail)
    }
    return result.result?.value
  }

  async screenshot() {
    const result = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    return Buffer.from(result.data, 'base64')
  }

  async cookies() {
    const result = await this.send('Network.getAllCookies')
    return result.cookies || []
  }

  async clickText(text) {
    return await this.eval(`(() => {
      const norm = (v) => (v || '').replace(/\\s+/g, ' ').trim();
      const candidates = [...document.querySelectorAll('button, a, [role=button], span, div')].filter((el) => {
        if (el.children.length !== 0) return false;
        if (norm(el.textContent) !== ${JSON.stringify(text)}) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const el = candidates[0];
      if (!el) return false;
      const target = el.closest('button, a, [role=button]') || el;
      target.click();
      return true;
    })()`)
  }

  async setInput(selector, value) {
    return await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      el.focus();
      if (setter) setter.call(el, ${JSON.stringify(value)});
      else el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`)
  }

  async upload(selector, files) {
    const root = await this.send('DOM.getDocument', { depth: -1, pierce: true })
    const found = await this.send('DOM.querySelector', { nodeId: root.root.nodeId, selector })
    if (!found.nodeId) return false
    await this.send('DOM.setFileInputFiles', { nodeId: found.nodeId, files })
    return true
  }

  async waitFor(expression, timeoutMs = 15000, intervalMs = 400) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        if (await this.eval(expression)) return true
      } catch {}
      await sleep(intervalMs)
    }
    return false
  }

  close() {
    try { this.ws?.close() } catch {}
    this.closed = true
  }
}

export function apply(ctx, rawConfig = {}) {
  const config = { ...DEFAULTS, ...(rawConfig || {}) }
  const dataDir = config.dataDir || path.join(os.homedir(), '.dsh-xhs')
  const profileDir = path.join(dataDir, 'browser-profile')
  const accountsDir = path.join(dataDir, 'accounts')
  const shotDir = path.join(dataDir, 'shots')
  const outDir = path.join(dataDir, 'out')
  for (const dir of [dataDir, profileDir, accountsDir, shotDir, outDir]) {
    try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  }

  // ---------------------------------------------------------------- 文案库

  const libraryFile = path.join(dataDir, 'library.json')
  let library = { prompts: [], notes: [] }

  function saveLibrary() {
    try { fs.writeFileSync(libraryFile, JSON.stringify(library, null, 2)) } catch (error) { log('文案库写入失败', error) }
  }

  function loadLibrary() {
    let loaded = false
    let exists = false
    try { exists = fs.existsSync(libraryFile) } catch {}
    try {
      const raw = JSON.parse(fs.readFileSync(libraryFile, 'utf8'))
      if (raw && Array.isArray(raw.prompts) && Array.isArray(raw.notes)) {
        library = raw
        loaded = true
      }
    } catch {}
    if (!Array.isArray(library.prompts)) library.prompts = []
    if (!Array.isArray(library.notes)) library.notes = []
    if (!loaded && !exists) saveLibrary()
  }

  loadLibrary()

  const historyFile = path.join(dataDir, 'publish-history.json')
  let publishHistory = []

  function saveHistory() {
    try { fs.writeFileSync(historyFile, JSON.stringify(publishHistory, null, 2)) } catch (error) { log('发布记录写入失败', error) }
  }

  function loadHistory() {
    try {
      const raw = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
      if (Array.isArray(raw)) publishHistory = raw
    } catch {}
    if (!Array.isArray(publishHistory)) publishHistory = []
  }

  loadHistory()

  const DEFAULT_RISK_CONFIG = {
    dailyLimit: 1,
    minIntervalHours: 4,
    maxAccountsPerBatch: 20,
    staggerMinMinutes: 3,
    staggerMaxMinutes: 20,
    manualOnly: true,
  }
  const riskConfigFile = path.join(dataDir, 'risk-config.json')
  let riskConfig = { ...DEFAULT_RISK_CONFIG }

  function saveRiskConfig() {
    try { fs.writeFileSync(riskConfigFile, JSON.stringify(riskConfig, null, 2)) } catch (error) { log('风控设置写入失败', error) }
  }

  function loadRiskConfig() {
    try {
      const raw = JSON.parse(fs.readFileSync(riskConfigFile, 'utf8'))
      if (raw && typeof raw === 'object') riskConfig = { ...DEFAULT_RISK_CONFIG, ...raw }
    } catch {}
    riskConfig.manualOnly = riskConfig.manualOnly !== false
  }

  function riskSettings() {
    const dailyLimit = Math.max(1, Math.min(20, Number(riskConfig.dailyLimit) || 1))
    const minIntervalHours = Math.max(0, Math.min(72, Number(riskConfig.minIntervalHours) || 0))
    const maxAccountsPerBatch = Math.max(1, Math.min(20, Number(riskConfig.maxAccountsPerBatch) || 20))
    const staggerMinMinutes = Math.max(1, Math.min(120, Number(riskConfig.staggerMinMinutes) || 3))
    const staggerMaxMinutes = Math.max(staggerMinMinutes, Math.min(240, Number(riskConfig.staggerMaxMinutes) || 20))
    return {
      dailyLimit,
      minIntervalHours,
      maxAccountsPerBatch,
      staggerMinMinutes,
      staggerMaxMinutes,
      manualOnly: riskConfig.manualOnly !== false,
      minIntervalMs: minIntervalHours * 60 * 60 * 1000,
      staggerMinMs: staggerMinMinutes * 60 * 1000,
      staggerMaxMs: staggerMaxMinutes * 60 * 1000,
    }
  }

  function assertManualPublishAllowed() {
    if (riskSettings().manualOnly) {
      throw new Error('风控设置已开启「只允许手动点击发布」；自动批量/定时发布已被拦截，请在审核里逐组点「发布这个账号」')
    }
  }

  loadRiskConfig()

  function dayKey(ts = Date.now()) {
    const date = new Date(ts)
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
  }

  function accountPublishRecords(account) {
    return publishHistory.filter((item) => item.account === account && item.published)
  }

  function assertPublishAllowed(account) {
    const risk = riskSettings()
    const today = dayKey()
    const records = accountPublishRecords(account)
    const todayCount = records.filter((item) => dayKey(item.at) === today).length
    if (todayCount >= risk.dailyLimit) {
      throw new Error(`账号「${account}」今天已发布 ${todayCount} 篇，风控上限 ${risk.dailyLimit} 篇/天；删除发布记录后不计入`)
    }
    const last = records.reduce((max, item) => Math.max(max, item.at || 0), 0)
    if (risk.minIntervalMs && last && Date.now() - last < risk.minIntervalMs) {
      const wait = Math.ceil((risk.minIntervalMs - (Date.now() - last)) / 60000)
      throw new Error(`账号「${account}」距上次发布不足 ${risk.minIntervalHours} 小时，还需等待约 ${wait} 分钟`)
    }
  }

  const riskFile = path.join(dataDir, 'risk-words.json')
  let riskRules = DEFAULT_RULES

  function saveRiskRules() {
    try { fs.writeFileSync(riskFile, JSON.stringify(riskRules, null, 2)) } catch (error) { log('词库写入失败', error) }
  }

  function loadRiskRules() {
    try {
      const raw = JSON.parse(fs.readFileSync(riskFile, 'utf8'))
      if (Array.isArray(raw) && raw.length) riskRules = raw
    } catch {}
  }

  loadRiskRules()

  // ---------------------------------------------------------------- 提示词库

  const promptsFile = path.join(dataDir, 'prompts.json')
  let promptLibrary = []

  function savePrompts() {
    try { fs.writeFileSync(promptsFile, JSON.stringify(promptLibrary, null, 2)) } catch (error) { log('提示词库写入失败', error) }
  }

  function loadPrompts() {
    try {
      const raw = JSON.parse(fs.readFileSync(promptsFile, 'utf8'))
      if (Array.isArray(raw)) promptLibrary = raw
    } catch {}
    if (!Array.isArray(promptLibrary)) promptLibrary = []
    promptLibrary = promptLibrary.filter((item) => item && typeof item.content === 'string' && item.content.trim())
    if (!promptLibrary.length) {
      promptLibrary = [{
        id: 'p-default',
        name: '默认提示词',
        content: '分享这组图片，写一篇自然的小红书笔记',
        isDefault: true,
        updatedAt: Date.now(),
      }]
      savePrompts()
    }
    if (!promptLibrary.some((item) => item.isDefault)) promptLibrary[0].isDefault = true
  }

  function defaultPrompt() {
    const item = promptLibrary.find((entry) => entry.isDefault) || promptLibrary[0]
    return item?.content || '分享这组图片，写一篇自然的小红书笔记'
  }

  loadPrompts()

  const groupTemplatesFile = path.join(dataDir, 'group-templates.json')
  const DEFAULT_GROUP_TEMPLATES = {
    defaultId: 'multi-angle-4',
    templates: [
      { id: 'multi-angle-4', name: '4图·同产品多角度', perPost: 4, strategy: 'cluster', minHashDistance: 8, roles: ['封面', '包装', '手提', '细节'] },
      { id: 'full-5', name: '5图·全套', perPost: 5, strategy: 'cluster', minHashDistance: 8, roles: ['封面', '包装', '手提', '细节', '场景'] },
      { id: 'strict-4', name: '4图·强去重', perPost: 4, strategy: 'cluster', minHashDistance: 12, roles: ['封面', '包装', '手提', '细节'] },
      { id: 'diverse-4', name: '4图·最大差异', perPost: 4, strategy: 'diverse', minHashDistance: 10, roles: ['封面', '包装', '手提', '细节'] },
    ],
  }
  let groupTemplates = { ...DEFAULT_GROUP_TEMPLATES }

  function loadGroupTemplates() {
    try {
      const raw = JSON.parse(fs.readFileSync(groupTemplatesFile, 'utf8'))
      if (raw && Array.isArray(raw.templates) && raw.templates.length) {
        groupTemplates = { ...DEFAULT_GROUP_TEMPLATES, ...raw }
        if (!groupTemplates.templates.some((item) => item.id === groupTemplates.defaultId)) {
          groupTemplates.defaultId = groupTemplates.templates[0].id
        }
      }
    } catch {}
    if (!groupTemplates.templates.length) groupTemplates = { ...DEFAULT_GROUP_TEMPLATES }
  }

  function saveGroupTemplates() {
    try { fs.writeFileSync(groupTemplatesFile, JSON.stringify(groupTemplates, null, 2)) } catch (error) { log('分组模板写入失败', error) }
  }

  loadGroupTemplates()

  function groupTemplateById(id) {
    return groupTemplates.templates.find((item) => item.id === id) || groupTemplates.templates[0]
  }

  const accountsFile = path.join(dataDir, 'accounts.json')
  const accountRegistry = { lastAccount: 'default', defaultAccount: 'default', accounts: {} }

  function saveAccounts() {
    try { fs.writeFileSync(accountsFile, JSON.stringify(accountRegistry, null, 2)) } catch (error) { log('账号表写入失败', error) }
  }

  function loadAccounts() {
    try {
      const raw = JSON.parse(fs.readFileSync(accountsFile, 'utf8'))
      if (raw && typeof raw === 'object') {
        if (raw.accounts && typeof raw.accounts === 'object') accountRegistry.accounts = raw.accounts
        if (typeof raw.lastAccount === 'string' && raw.lastAccount) accountRegistry.lastAccount = raw.lastAccount
        if (typeof raw.defaultAccount === 'string' && raw.defaultAccount) accountRegistry.defaultAccount = raw.defaultAccount
      }
    } catch {}
    if (!accountRegistry.accounts.default) accountRegistry.accounts.default = { profileDir }
    if (!accountRegistry.defaultAccount || !accountRegistry.accounts[accountRegistry.defaultAccount]) {
      accountRegistry.defaultAccount = accountRegistry.accounts[accountRegistry.lastAccount] ? accountRegistry.lastAccount : 'default'
    }
  }

  /** 记住账号昵称和最后使用时间；昵称变化或切换账号时落盘。 */
  function rememberAccount(account, nickname) {
    const name = account || 'default'
    const previous = accountRegistry.accounts[name] || {}
    const next = { ...previous, profileDir: profileDirFor(name), at: Date.now() }
    if (nickname) next.nickname = nickname
    const changed = previous.nickname !== next.nickname || accountRegistry.lastAccount !== name
    accountRegistry.accounts[name] = next
    accountRegistry.lastAccount = name
    if (changed) saveAccounts()
  }

  loadAccounts()

  function libraryId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
  }

  const state = {
    proc: undefined,
    port: 0,
    targetId: '',
    page: undefined,
    browserPhase: 'off',
    busy: '',
    account: accountRegistry.defaultAccount || accountRegistry.lastAccount || 'default',
    baselines: {},
    login: { loggedIn: false, nickname: '' },
    baselineSession: '',
    lastShot: { at: 0, buffer: undefined },
    lastError: '',
    draft: undefined,
    lastPublish: undefined,
    lastAction: undefined,
    starting: undefined,
  }

  /** 每个账号一个独立 Chrome profile，互不影响登录态。 */
  function profileDirFor(account) {
    if (!account || account === 'default') return profileDir
    const safe = String(account).replace(/[^\w\u4e00-\u9fa5-]+/g, '_').slice(0, 40) || 'account'
    const dir = path.join(accountsDir, safe)
    try { fs.mkdirSync(dir, { recursive: true }) } catch {}
    return dir
  }

  let queue = Promise.resolve()
  /** 把所有 CDP 动作串行化，避免并发互相打断。 */
  function exclusive(label, task) {
    const run = async () => {
      if (state.busy) throw new Error('正在执行：' + state.busy)
      state.busy = label
      try {
        return await task()
      } finally {
        state.busy = ''
      }
    }
    const result = queue.then(run, run)
    queue = result.catch(() => {})
    return result
  }

  /** 启动前结束占用同一 profile 的旧 Chrome，否则新实例会因为 profile 被锁而拿不到调试端口。 */
  function killProfileChrome(dir) {
    return new Promise((resolve) => {
      const escaped = String(dir).replace(/'/g, "''")
      const script = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${escaped}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
      execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true }, () => resolve())
    })
  }

  async function launchBrowser(account = 'default') {
    if (state.page && !state.page.closed) {
      if (state.account === account) return state.page
      await stopBrowser()
    }
    if (state.starting) return await state.starting
    state.starting = (async () => {
      if (!accountRegistry.accounts[account] && Object.keys(accountRegistry.accounts).length >= 20) {
        throw new Error('最多支持 20 个账号，请先删除不用的账号')
      }
      state.account = account
      if (accountRegistry.accounts[account]) rememberAccount(account, '')
      state.browserPhase = 'starting'
      state.lastError = ''
      const executable = findBrowser(config.chromePath)
      const accountProfile = profileDirFor(account)
      await killProfileChrome(accountProfile)
      await sleep(800)
      const port = await freePort()
      const args = [
        `--remote-debugging-port=${port}`,
        `--remote-allow-origins=*`,
        `--user-data-dir=${accountProfile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--force-device-scale-factor=1',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--lang=zh-CN',
        '--window-position=' + config.windowPosition,
        '--window-size=' + config.windowSize,
        'about:blank',
      ]
      if (config.direct !== false) args.unshift('--no-proxy-server')
      log('启动浏览器', executable, 'port', port)
      const proc = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
      state.proc = proc
      state.port = port
      proc.on('error', (error) => {
        state.lastError = error?.message || String(error)
        log('浏览器启动失败', error)
      })
      proc.stderr.setEncoding('utf8')
      proc.stderr.on('data', (chunk) => {
        const line = String(chunk)
        if (/ERROR|FATAL/.test(line) && /^(?!.*DevTools)/.test(line)) log('浏览器 stderr:', line.trim().slice(0, 300))
      })
      proc.on('exit', () => {
        state.proc = undefined
        state.browserPhase = 'off'
        state.page?.close()
        state.page = undefined
      })

      const deadline = Date.now() + 25000
      let version
      while (Date.now() < deadline) {
        try {
          version = await httpJson(port, 'GET', '/json/version')
          if (version?.webSocketDebuggerUrl) break
        } catch {}
        await sleep(300)
      }
      if (!version?.webSocketDebuggerUrl) throw new Error('浏览器没有在 25 秒内就绪（端口 ' + port + '）')

      const existingTargets = await httpJson(port, 'GET', '/json/list').catch(() => [])
      const target = await httpJson(port, 'PUT', '/json/new?' + encodeURIComponent(ORIGIN + '/explore'))
      state.targetId = target.id
      // 关掉 Chrome 启动时自带的 about:blank 标签，避免侧边栏里多一个空白页。
      for (const extra of Array.isArray(existingTargets) ? existingTargets : []) {
        if (extra.type === 'page' && extra.id !== target.id && /^about:blank/.test(extra.url || '')) {
          try { await httpJson(port, 'GET', '/json/close/' + extra.id) } catch {}
        }
      }
      const page = new Page(target.webSocketDebuggerUrl)
      await page.open()
      await page.init()
      await page.waitFor(`document.readyState === 'complete'`, 15000, 300)
      await sleep(1200)
      state.page = page
      state.browserPhase = 'ready'
      state.login = { loggedIn: false, nickname: '' }
      log('浏览器就绪')
      return page
    })()
    try {
      return await state.starting
    } finally {
      state.starting = undefined
    }
  }

  async function page(account) {
    const target = account || state.account || 'default'
    if (state.page && !state.page.closed) {
      if (state.account === target) return state.page
      await stopBrowser()
    }
    return await launchBrowser(target)
  }

  async function stopBrowser() {
    const proc = state.proc
    state.proc = undefined
    state.page?.close()
    state.page = undefined
    state.targetId = ''
    state.browserPhase = 'off'
    state.login = { loggedIn: false, nickname: '' }
    state.account = accountRegistry.defaultAccount || 'default'
    if (proc && !proc.killed) {
      try { proc.kill() } catch {}
    }
  }

  async function deleteAccount(name) {
    const account = String(name || '').trim()
    if (!account || account === 'default') throw new Error('默认账号不能删除')
    if (state.account === account) throw new Error('请先切换到其他账号，再删除这个账号')
    const item = accountRegistry.accounts[account]
    if (!item) throw new Error('没有这个账号')
    const dir = item.profileDir || profileDirFor(account)
    delete accountRegistry.accounts[account]
    if (accountRegistry.lastAccount === account) accountRegistry.lastAccount = 'default'
    if (accountRegistry.defaultAccount === account) accountRegistry.defaultAccount = 'default'
    saveAccounts()
    await killProfileChrome(dir)
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
    return { account }
  }

  function setDefaultAccount(name) {
    const account = String(name || '').trim()
    if (!accountRegistry.accounts[account]) throw new Error('没有这个账号')
    accountRegistry.defaultAccount = account
    accountRegistry.lastAccount = account
    saveAccounts()
    return { account, defaultAccount: account }
  }

  /** 浏览器级 CDP 命令（窗口位置等），一次连接即用即关。 */
  async function browserSend(method, params = {}) {    if (!state.port) throw new Error('浏览器未启动')
    const version = await httpJson(state.port, 'GET', '/json/version')
    const socket = new WebSocket(version.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('浏览器调试连接超时')), 5000)
      socket.addEventListener('open', () => { clearTimeout(timer); resolve() }, { once: true })
      socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('浏览器调试连接失败')) }, { once: true })
    })
    try {
      return await new Promise((resolve, reject) => {
        const id = 1
        const onMessage = (event) => {
          let message
          try { message = JSON.parse(event.data) } catch { return }
          if (message.id !== id) return
          socket.removeEventListener('message', onMessage)
          message.error ? reject(new Error(message.error.message || '浏览器命令失败')) : resolve(message.result)
        }
        socket.addEventListener('message', onMessage)
        socket.send(JSON.stringify({ id, method, params }))
      })
    } finally {
      try { socket.close() } catch {}
    }
  }

  /** 把浏览器窗口移到屏幕内/屏幕外，方便手动处理验证码或关闭平台引导。 */
  async function setBrowserWindow(visible) {
    if (!state.targetId) throw new Error('浏览器未启动')
    const info = await browserSend('Browser.getWindowForTarget', { targetId: state.targetId })
    const windowId = info.windowId
    await browserSend('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
    await browserSend('Browser.setWindowBounds', {
      windowId,
      bounds: {
        left: visible ? 60 : -2400,
        top: visible ? 60 : 0,
        width: 1280,
        height: 960,
        windowState: 'normal',
      },
    })
    if (visible) {
      try { await (await page()).send('Page.bringToFront') } catch {}
    }
    return { visible, windowId }
  }

  async function screenshotBuffer(maxAgeMs = 700) {
    if (state.lastShot.buffer && Date.now() - state.lastShot.at < maxAgeMs) return state.lastShot.buffer
    const current = await page()
    const buffer = await current.screenshot()
    state.lastShot = { at: Date.now(), buffer }
    return buffer
  }

  function invalidateShot() {
    state.lastShot = { at: 0, buffer: undefined }
  }

  async function sessionCookie() {
    const current = await page()
    const cookies = await current.cookies()
    return cookies.find((cookie) => cookie.name === 'web_session' && cookie.value)?.value || ''
  }

  /**
   * 读取登录态。小红书会给匿名访客也发 web_session，因此不能用 Cookie 是否存在判断。
   * 页面状态里的 user.loggedIn 是可靠信号；拿不到状态时（例如创作中心）保留上一次结论。
   */
  async function readLogin(allowReload = false) {
    const current = await page()
    const readState = async () => {
      const snapshot = await current.eval(`(() => {
        const user = window.__INITIAL_STATE__ && window.__INITIAL_STATE__.user;
        const hasModal = !!document.querySelector('.login-container, [class*="login-container"], .login-modal');
        const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        const loginBtn = [...document.querySelectorAll('.login-btn, .reds-login-btn, .side-bar .login-btn, .header .login-btn')].find(visible);
        const userBox = [...document.querySelectorAll('.side-bar .user, .side-bar .user-info, .side-bar .user-avatar, .reds-avatar')].find(visible);
        const nameEl = document.querySelector('.side-bar .user-name, .user-name, .nickname');
        if (user && user.loggedIn && typeof user.loggedIn.value === 'boolean') {
          const info = (user.userInfo && user.userInfo.value) || null;
          return JSON.stringify({
            known: true,
            loggedIn: user.loggedIn.value === true && info?.guest !== true,
            nickname: (info && (info.nickname || info.nickName || info.user_name)) || '',
            hasModal,
          });
        }
        if (userBox && !loginBtn) {
          return JSON.stringify({ known: true, loggedIn: true, nickname: nameEl ? nameEl.innerText.trim() : '', hasModal });
        }
        if (loginBtn) {
          return JSON.stringify({ known: true, loggedIn: false, nickname: '', hasModal });
        }
        return JSON.stringify({ known: false, loggedIn: false, nickname: '', hasModal });
      })()`)
      try { return JSON.parse(snapshot || '{}') } catch { return {} }
    }

    let parsed = await readState()
    if (parsed.known) {
      if (parsed.loggedIn) {
        state.login = { loggedIn: true, nickname: parsed.nickname || '' }
        rememberAccount(state.account || 'default', parsed.nickname || '')
        const account = state.account || 'default'
        if (!state.baselines[account]) state.baselines[account] = await sessionCookie()
        return state.login
      }
      if (allowReload) {
        // 扫码完成后 Cookie 会变化，但页面状态未必立即刷新；显式检查时重新载入一次。
        const currentSession = await sessionCookie()
        const account = state.account || 'default'
        const baseline = state.baselines[account]
        if (baseline && currentSession && currentSession !== baseline) {
          state.baselines[account] = currentSession
          await current.goto(ORIGIN + '/explore', 2600)
          parsed = await readState()
          if (parsed.known && parsed.loggedIn) {
            state.login = { loggedIn: true, nickname: parsed.nickname || '' }
            return state.login
          }
        }
      }
      state.login = { loggedIn: false, nickname: '' }
      return state.login
    }

    // 拿不到页面状态：创作中心登录页视为未登录，其余页面保留上次结论。
    let href = ''
    try { href = await current.eval('location.href') } catch {}
    if (/creator\.xiaohongshu\.com\/login/.test(href)) {
      state.login = { loggedIn: false, nickname: '' }
    }
    return state.login
  }

  /**
   * 打开登录页前的账号体检：进创作中心发布页，确认是已登录的创作台，而不是 /login。
   * 比只看首页 Cookie 稳，能识别“其实还登录着”的账号。
   */
  async function probeCreatorLogin(current) {
    try {
      await current.goto(PUBLISH_URL, 3200)
      await current.waitFor(
        `location.href.includes('/login') || !!document.querySelector('.login-container, [class*="login-container"], .login-modal') || !!document.querySelector('.creator-tab')`,
        12000,
        500,
      )
      const snapshot = await current.eval(`(() => {
        const href = location.href;
        const hasPublish = !!document.querySelector('.creator-tab, .publish-page, .publish-page-content');
        const hasLogin = !!document.querySelector('.login-container, [class*="login-container"], .login-modal');
        const nameEl = document.querySelector('.creator-name, .user-name, .name, .nickname');
        return JSON.stringify({ href, hasPublish, hasLogin, nickname: nameEl ? nameEl.innerText.trim() : '' });
      })()`)
      const data = JSON.parse(snapshot || '{}')
      if (data.hasPublish && !/\/login/.test(data.href) && !data.hasLogin) {
        return { loggedIn: true, nickname: data.nickname || '' }
      }
      return { loggedIn: false, nickname: '' }
    } catch {
      return { loggedIn: false, nickname: '' }
    }
  }

  async function confirmDetectedLogin(current, account) {
    let nickname = (accountRegistry.accounts[account] && accountRegistry.accounts[account].nickname) || state.login.nickname || ''
    try {
      await current.goto(ORIGIN + '/explore', 2600)
      const home = await readLogin(true)
      if (home.loggedIn && home.nickname) nickname = home.nickname
    } catch {}
    state.login = { loggedIn: true, nickname }
    rememberAccount(account, nickname)
    return state.login
  }

  async function ensureLoginModal() {
    const current = await page()
    const url = await current.eval('location.href')
    if (!/^https:\/\/www\.xiaohongshu\.com(\/|$)/.test(url)) await current.goto(ORIGIN + '/explore', 3000)
    const hasModal = await current.eval(`!!document.querySelector('.login-container, .login-modal, [class*="login-container"]')`)
    if (!hasModal) {
      const clicked = await current.clickText('登录')
      if (!clicked) {
        await current.eval(`(() => {
          const el = document.querySelector('.login-btn, button.submit, [class*="login-btn"]');
          if (el) { el.click(); return true; }
          return false;
        })()`)
      }
      await sleep(1600)
    }
  }

  async function openLogin(account = state.account || 'default') {
    const current = await page(account)
    const probe = await probeCreatorLogin(current)
    if (probe.loggedIn) {
      const accountKey = state.account || account
      const login = await confirmDetectedLogin(current, accountKey)
      if (!state.baselines[accountKey]) {
        try { state.baselines[accountKey] = await sessionCookie() } catch {}
      }
      invalidateShot()
      return login
    }
    await current.goto(ORIGIN + '/explore', 3200)
    const accountKey = state.account || 'default'
    if (!state.baselines[accountKey]) {
      try { state.baselines[accountKey] = await sessionCookie() } catch {}
    }
    const login = await readLogin()
    if (login.loggedIn) return login
    await ensureLoginModal()
    await sleep(800)
    invalidateShot()
    return { loggedIn: false, nickname: '' }
  }

  /** 确保指定账号已登录；未登录时在侧边栏打开登录页并等待扫码。 */
  async function ensureLogin(account, timeoutMs = 180000) {
    await page(account)
    let login = await readLogin(true)
    if (login.loggedIn) return login
    await openLogin(account)
    login = await readLogin(true)
    if (login.loggedIn) return login
    const deadline = Date.now() + Math.max(30000, Number(timeoutMs) || 180000)
    while (Date.now() < deadline) {
      await sleep(2000)
      login = await readLogin(true)
      if (login.loggedIn) return login
    }
    throw new Error(`账号「${account}」未登录，请在右侧浏览器点「显示窗口」扫码后再试`)
  }

  function normalizePhone(phone) {
    let digits = String(phone || '').replace(/\D/g, '')
    if (digits.length === 13 && digits.startsWith('86')) digits = digits.slice(2)
    return digits
  }

  async function clickAgreement(current) {
    return await current.eval(`(() => {
      const el = [...document.querySelectorAll('*')].find((item) => (item.textContent || '').trim() === '同意并继续' && (item.offsetWidth || item.offsetHeight));
      if (!el) return false;
      (el.closest('.foot-btn, button, .reds-alert, div, span') || el).click();
      return true;
    })()`)
  }

  async function dismissBlockingAlert(current) {
    return await current.eval(`(() => {
      const alerts = [...document.querySelectorAll('.reds-alert')].filter((item) => item.offsetWidth || item.offsetHeight);
      for (const alert of alerts) {
        if (!/我要申诉|我知道了/.test(alert.textContent || '')) continue;
        const button = [...alert.querySelectorAll('*')].find((item) => item.children.length === 0 && (item.textContent || '').trim() === '我知道了');
        if (button) {
          (button.closest('button, div, span') || button).click();
          return true;
        }
      }
      return false;
    })()`)
  }

  async function clickAgreementLabel(current) {
    return await current.eval(`(() => {
      const label = [...document.querySelectorAll('label')].find((item) => /我已阅读并同意/.test(item.textContent || ''));
      if (!label) return false;
      label.click();
      return true;
    })()`)
  }

  async function clickCodeButton(current) {
    return await current.eval(`(() => {
      const button = document.querySelector('.code-button');
      if (!button) return false;
      button.click();
      return true;
    })()`)
  }

  async function clickLoginButton(current) {
    return await current.eval(`(() => {
      const button = document.querySelector('.login-container button.submit, .login-modal button.submit, button.submit');
      if (!button) return false;
      button.click();
      return true;
    })()`)
  }

  async function smsSend(phone) {
    const number = normalizePhone(phone)
    if (number.length !== 11) throw new Error('手机号应为 11 位数字')
    const current = await page()
    const url = await current.eval('location.href')
    if (!/^https:\/\/www\.xiaohongshu\.com(\/|$)/.test(url)) await current.goto(ORIGIN + '/explore', 3000)
    await ensureLoginModal()
    await sleep(800)
    const hasPhoneInput = async () => current.eval('!!document.querySelector(\'input[placeholder*="手机号"], input[name*="phone"]\')')
    if (!(await hasPhoneInput())) {
      await current.eval(`(() => {
        const texts = ['手机号登录', '手机号登录/注册', '验证码登录', '短信登录', '手机登录'];
        const all = [...document.querySelectorAll('*')];
        const el = all.find((item) => item.children.length === 0 && texts.some((text) => (item.textContent || '').trim().includes(text)));
        if (!el) return false;
        (el.closest('button, a, [role="tab"], div, span') || el).click();
        return true;
      })()`)
      await sleep(1200)
    }
    let filled = false
    for (const selector of ['input[placeholder*="手机号"]', 'input[name*="phone"]', 'input[placeholder*="手机"]', 'input[type="tel"]']) {
      filled = await current.setInput(selector, number)
      if (filled) break
    }
    if (!filled) throw new Error('没有找到手机号输入框：请把右侧登录弹窗切到「手机号登录」后再试')
    await dismissBlockingAlert(current)
    await clickAgreementLabel(current)
    await sleep(300)
    await clickCodeButton(current)
    await sleep(1000)
    await dismissBlockingAlert(current)
    const buttonText = await current.eval(`(() => { const button = document.querySelector('.code-button'); return button ? button.textContent.trim() : '' })()`)
    const bodyText = await current.eval(`(document.body.innerText || '').slice(0, 1200)`)
    if (!/重新发送|秒后|重新获取|已发送|\d+\s*s/.test(buttonText + ' ' + bodyText)) {
      const hint = bodyText.match(/(频繁|失败|错误|请输入正确的|已注册|未注册|稍后|操作频繁|安全验证)/)
      throw new Error('验证码发送失败' + (hint ? '：' + hint[0] : '，请检查手机号或稍后再试'))
    }
    invalidateShot()
    return { sent: true, countdown: buttonText }
  }

  async function smsSubmit(phone, code) {
    const number = normalizePhone(phone)
    if (number.length !== 11) throw new Error('手机号应为 11 位数字')
    const current = await page()
    const url = await current.eval('location.href')
    if (!/^https:\/\/www\.xiaohongshu\.com(\/|$)/.test(url)) await current.goto(ORIGIN + '/explore', 3000)
    await ensureLoginModal()
    await sleep(500)
    let filledPhone = false
    for (const selector of ['input[placeholder*="手机号"]', 'input[name*="phone"]', 'input[placeholder*="手机"]', 'input[type="tel"]']) {
      filledPhone = await current.setInput(selector, number)
      if (filledPhone) break
    }
    let filledCode = false
    for (const selector of ['input[placeholder*="验证码"]', 'input[placeholder*="6 位"]', 'input[name*="code"]']) {
      filledCode = await current.setInput(selector, code)
      if (filledCode) break
    }
    if (!filledPhone || !filledCode) throw new Error('没有找到手机号或验证码输入框：请确认已切到「手机号登录」并先获取验证码')
    await dismissBlockingAlert(current)
    await sleep(300)
    await clickAgreement(current)
    await sleep(300)
    await clickLoginButton(current)
    await sleep(1200)
    let login = await readLogin()
    if (!login.loggedIn && await clickAgreement(current)) {
      await sleep(500)
      await clickLoginButton(current)
      await sleep(1800)
      login = await readLogin()
    }
    if (!login.loggedIn) throw new Error('验证码登录没有成功：请检查验证码，或先在右侧同意协议后重试')
    await current.goto(ORIGIN + '/explore', 2500)
    await readLogin()
    invalidateShot()
    return state.login
  }

  async function generateCopy(prompt, imageCount, series) {
    const { provider, model } = resolveModel()

    const system = [
      '你是一名资深小红书内容策划，擅长把普通素材包装成有点击欲、又不夸张失实的图文笔记。',
      '根据用户给的主题和要求，输出一条笔记的标题、正文和标签。',
      '硬性要求：',
      '1. 标题不超过 20 个汉字，要具体、有钩子，不要用“震惊”“必看”这类标题党；不要带引号或 #。',
      '2. 正文 120-300 字，口语化，分 2-4 个短段落，可少量使用 emoji，不要写成一整段，不要编造用户没提供的事实。',
      '3. 标签 6-8 个，不带 #，兼顾大词和垂直词，不要堆砌无关词。',
      '4. 不要出现“作为AI”“以下是”等说明性文字。',
      '5. 如果用户提示词里明确写了标题、正文、标签的数量或关键词规则，以用户提示词为准。',
      '6. 这次只输出 1 组笔记（即使用户要求多组），用 {"title","body","tags"} 的对象，不要输出 notes 数组。',
      '7. 如果提供了套系名称，标题和正文要自然带出这个套系名，不要生硬堆砌。',
      '只输出一个 JSON 对象，格式：{"title":"...","body":"...","tags":["...","..."]}，不要在 JSON 外输出任何内容。',
    ].join('\n')
    const user = [
      `主题与要求：${prompt}`,
      `配图数量：${imageCount} 张拼图`,
      series ? `套系名称：${series}` : '',
      '请让标题和正文互相呼应：标题是正文的钩子，正文第一句能承接标题。',
    ].filter(Boolean).join('\n')

    let text
    try {
      text = await callModel(provider, model, system, user, 4000)
    } catch (error) {
      if (/截断/.test(String(error.message))) {
        throw new Error('模型输出被截断：请把提示词缩短一点，或减少一次要求的标签/段落数量')
      }
      throw error
    }
    const parsed = parseCopy(text)
    parsed.title = sanitizeEmoji(parsed.title) || '分享我的日常'
    parsed.body = sanitizeEmoji(parsed.body)
    parsed.tags = parsed.tags.map((tag) => sanitizeEmoji(tag)).filter(Boolean)
    return { ...parsed, provider, model, risk: checkRisk(parsed, riskRules) }
  }

  /** 标题超过 20 字时，优先在空格/标点处收尾，避免硬切成半个词。 */
  function fitTitle(raw) {
    const title = String(raw || '').replace(/^#+/, '').replace(/[《》"]/g, '').trim()
    if (title.length <= 20) return title
    const head = title.slice(0, 20)
    let cut = -1
    for (const mark of ['，', '。', '！', '？', '｜', '|', ' ', '、', '：', '；']) {
      cut = Math.max(cut, head.lastIndexOf(mark))
    }
    return (cut >= 10 ? head.slice(0, cut) : head).trim()
  }

  function parseCopy(raw) {
    const cleaned = String(raw || '').replace(/```json/gi, '```').replace(/```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('模型没有返回 JSON：' + cleaned.slice(0, 120))
    let data
    try { data = JSON.parse(cleaned.slice(start, end + 1)) } catch (error) {
      throw new Error('模型返回的 JSON 无法解析：' + error.message)
    }
    // 兼容模型按「多组」返回 { notes: [...] } 的情况，单篇只取第一组。
    const source = Array.isArray(data?.notes) && data.notes.length ? data.notes[0] : data
    const title = fitTitle(source?.title)
    const body = String(source?.body || '').trim()
    const tags = (Array.isArray(source?.tags) ? source.tags : []).map((tag) => String(tag).replace(/^#+/, '').trim()).filter(Boolean).slice(0, 10)
    if (!title || !body) throw new Error('模型返回的标题或正文为空')
    return { title, body, tags }
  }

  function resolveModel() {
    let provider = config.provider
    let model = config.model
    if (!provider || !model) {
      try {
        const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
        provider = provider || selection?.provider
        model = model || selection?.model
      } catch {}
    }
    if (!provider || !model) throw new Error('没有找到默认模型，请在插件配置里设置 provider / model')
    return { provider, model }
  }

  async function callModel(provider, model, system, user, maxTokens = 1200) {
    const llm = ctx.get('llm')
    if (!llm) throw new Error('当前 Host 没有可用的模型服务')
    let reasoningEffort
    try {
      const info = await llm.resolveModelInfo(provider, model)
      reasoningEffort = info.reasoning?.efforts?.[0]?.id
    } catch {}
    let text = ''
    let failure
    for await (const chunk of llm.stream({
      provider,
      model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
      temperature: config.temperature,
      maxTokens,
      reasoningEffort,
    })) {
      if (chunk.type === 'text-delta') text += chunk.text
      if (chunk.type === 'finish' && chunk.reason?.kind === 'error') failure = chunk.reason.failure
      if (chunk.type === 'finish' && chunk.reason?.kind === 'max-tokens') failure = { message: '模型输出被截断' }
    }
    if (failure) throw new Error(failure.message || '模型调用失败')
    return text
  }

  function cleanTag(tag) {
    return String(tag || '').replace(/^#+/, '').replace(/[，,。；;、\s]+$/, '').trim()
  }

  function normalizeTagList(value) {
    if (Array.isArray(value)) return value.map(cleanTag).filter(Boolean)
    if (typeof value === 'string') return value.split(/[\s,，#]+/).map(cleanTag).filter(Boolean)
    return []
  }

  /** 模型常把「#标签 #标签」写在正文最后一行；拆出来，并从 tags 字段合并去重。 */
  function splitBodyAndTags(body, rawTags) {
    const lines = String(body || '').split(/\r?\n/)
    const collected = []
    while (lines.length) {
      const last = lines[lines.length - 1].trim()
      if (!last) { lines.pop(); continue }
      if (/^#\S+(\s+#\S+)+$/.test(last) || /^标签[:：]/.test(last)) {
        collected.unshift(last.replace(/^标签[:：]\s*/, ''))
        lines.pop()
        continue
      }
      break
    }
    const tags = [...normalizeTagList(rawTags), ...normalizeTagList(collected.join(' '))]
    const unique = []
    for (const tag of tags) if (!unique.includes(tag)) unique.push(tag)
    return { body: lines.join('\n').trim(), tags: unique }
  }

  function parseBatch(raw, keywords = []) {
    const cleaned = String(raw || '').replace(/```json/gi, '```').replace(/```/g, '').trim()
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('模型没有返回 JSON：' + cleaned.slice(0, 120))
    let data
    try { data = JSON.parse(cleaned.slice(start, end + 1)) } catch (error) {
      throw new Error('模型返回的 JSON 无法解析：' + error.message)
    }
    const list = Array.isArray(data) ? data : (data.notes || data.items || (data.title ? [data] : null))
    if (!Array.isArray(list) || !list.length) throw new Error('模型返回的 notes 为空')

    const pool = [...keywords, '伴手礼推荐', '送礼清单', '同城好物', '城市打卡', '周末去哪儿', '生活记录']
    return list.slice(0, 10).map((note) => {
      const split = splitBodyAndTags(note.body, note.tags)
      for (const tag of pool) {
        if (split.tags.length >= 10) break
        if (!split.tags.includes(tag)) split.tags.push(tag)
      }
      return {
        title: fitTitle(note.title),
        body: split.body,
        tags: split.tags.slice(0, 10),
      }
    }).filter((note) => note.title && note.body)
  }

  function validateBatchNote(note, keywords) {
    const warnings = []
    if (note.title.length > 20) warnings.push('标题超过20字')
    const head = note.title.slice(0, 10)
    if (keywords.length && !keywords.some((keyword) => head.includes(keyword))) warnings.push('标题前10字未含核心词')
    if (note.tags.length !== 10) warnings.push('标签 ' + note.tags.length + '/10')
    const total = keywords.reduce((sum, keyword) => sum + note.body.split(keyword).length - 1, 0)
    if (keywords.length && total < 3) warnings.push('核心词共 ' + total + ' 次')
    if (total > 8) warnings.push('核心词偏多 ' + total + ' 次')
    return warnings
  }

  async function generateBatch({ template, count, focus, extra, keywords, avoid = [] }) {
    const { provider, model } = resolveModel()
    const n = Math.max(1, Math.min(20, Number(count) || 1))
    const source = String(template || '')
    const safeKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : []

    const system = [
      '你是资深小红书内容策划，严格按用户给的规则产出可直接发布的笔记。',
      '硬性要求：',
      '1. 每组标题不超过 20 字，前 10 字必须出现一个核心关键词；',
      '2. 正文 120-300 字，短句分段，带少量 emoji，核心词出现 3-5 次；',
      '3. 每组正好 10 个标签，按 2 个核心大词 + 3 个精准长尾词 + 3 个场景词 + 2 个同城热词配比；',
      '4. 每组标题、正文、标签都不能重复；',
      '5. 不编造用户没提供的产品事实，不写绝对化承诺；',
      '6. 10 个标签只放在 tags 数组里，不要把标签或 # 话题写进正文；tags 必须正好 10 个。',
      '只输出 JSON：{"notes":[{"title":"...","body":"...","tags":["...","..."]}]}，不要输出任何解释。',
    ].join('\n')

    const notes = []
    let attempts = 0
    let chunkSize = 3
    // 十多个号时一次调用会被截断，按每批 3 组生成，失败再降到 1 组。
    while (notes.length < n && attempts < n * 3) {
      attempts += 1
      const size = Math.min(chunkSize, n - notes.length)
      const filled = source
        .replace(/\{\{\s*count\s*\}\}/g, String(size))
        .replace(/\{\{\s*focus\s*\}\}/g, focus || '默认全场景覆盖')
        .replace(/\{\{\s*extra\s*\}\}/g, extra || '无')
        .replace(/【X】/g, String(size))
      const prior = [...avoid, ...notes.map((note) => note.title)].filter(Boolean).slice(-10).join('；')
      const user = `${filled}\n\n本次生成第 ${notes.length + 1}-${notes.length + size} 组（总共 ${n} 组）${prior ? '；不要与这些已生成标题重复：' + prior : ''}。只输出 JSON。`
      const maxTokens = Math.min(8000, 1200 + size * 1400)
      const before = notes.length

      try {
        let raw = await callModel(provider, model, system, user, maxTokens)
        let parsed
        try {
          parsed = parseBatch(raw, safeKeywords)
        } catch {
          raw = await callModel(provider, model, system + '\n上一次输出不是合法 JSON。这次只输出 JSON，不要任何解释。', user, maxTokens)
          parsed = parseBatch(raw, safeKeywords)
        }
        if (!parsed.length) throw new Error('模型没有返回可用笔记')
        for (const note of parsed) {
          if (notes.length >= n) break
          if (notes.some((item) => item.title === note.title)) continue
          notes.push(note)
        }
        if (notes.length === before) {
          if (size === 1) throw new Error('模型连续返回重复笔记，请重试')
          chunkSize = 1
        } else {
          chunkSize = 3
        }
      } catch (error) {
        if (size === 1) throw error
        chunkSize = 1
      }
    }

    if (!notes.length) throw new Error('没有生成可用笔记')
    const warnings = notes.map((note) => validateBatchNote(note, safeKeywords))
    return { notes, warnings, provider, model, requested: n }
  }

  /** 把 data URL 落盘，供浏览器上传。 */
  function saveDataUrl(dataUrl, index) {
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,([\s\S]+)$/i.exec(String(dataUrl || ''))
    if (!match) throw new Error('第 ' + (index + 1) + ' 张图片格式不支持')
    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase()
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > 32 * 1024 * 1024) throw new Error('图片超过 32MB')
    const file = path.join(outDir, `xhs-${Date.now()}-${index}.${ext}`)
    fs.writeFileSync(file, buffer)
    return file
  }

  /** 关闭小红书的引导浮层（例如「图片可以编辑啦」），否则会挡住发布按钮。 */
  async function dismissGuides(current) {
    try {
      const closed = await current.eval(`(() => {
        const direct = document.querySelector('.feature-guide__btn, [class*="feature-guide"] button, [class*="guide"] [class*="close"]');
        if (direct) { direct.click(); return true; }
        const texts = ['我知道了', '知道了', '跳过', '关闭', '以后再说'];
        for (const text of texts) {
          const el = [...document.querySelectorAll('button, [role=button], div, span')]
            .find((node) => node.children.length === 0 && (node.textContent || '').replace(/\\s+/g, '') === text);
          if (el) { (el.closest('button, [role=button]') || el).click(); return true; }
        }
        return false;
      })()`)
      if (closed) await sleep(500)
      return closed
    } catch {
      return false
    }
  }

  /** 把发布页滚到底部，让「发布 / 暂存离开」操作条进入视口。 */
  async function scrollPublishToBottom(current) {
    await current.eval(`(() => {
      const scrollers = [document.scrollingElement, ...document.querySelectorAll('.publish-page, .publish-page-content, .publish-vue-container, .outarea')].filter(Boolean);
      for (const el of scrollers) {
        if (el.scrollHeight > el.clientHeight + 40) el.scrollTop = el.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
      return true;
    })()`)
    await sleep(400)
  }

  /** 找底部的「发布」按钮并返回可点击坐标。 */
  const FIND_PUBLISH = `(() => {
    const items = [];
    for (const el of document.querySelectorAll('button, [role=button], div, span, a')) {
      const text = (el.innerText || el.textContent || '').replace(/\\s+/g, '').trim();
      if (text !== '发布') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 16) continue;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.5) continue;
      items.push({ el, r });
    }
    if (!items.length) return JSON.stringify({
      found: false,
      tail: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(-260),
    });
    items.sort((a, b) => b.r.top - a.r.top);
    const picked = items[0];
    return JSON.stringify({
      found: true,
      x: picked.r.x + picked.r.width / 2,
      y: picked.r.y + picked.r.height / 2,
      tag: picked.el.tagName,
      cls: String(picked.el.className).slice(0, 80),
    });
  })()`

  /**
   * 发布按钮在 <xhs-publish-btn> 的 closed shadow root 里，普通选择器看不到。
   * 通过 CDP DOM 域穿透 shadow root，拿到内部红色按钮的盒子坐标。
   */
  async function publishButtonPoint(current) {
    try {
      const doc = await current.send('DOM.getDocument', { depth: -1, pierce: true })
      const host = await current.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'xhs-publish-btn' })
      if (host.nodeId) {
        const described = await current.send('DOM.describeNode', { nodeId: host.nodeId, depth: -1, pierce: true })
        const buttons = []
        const walk = (node) => {
          if (!node) return
          if (node.nodeName === 'BUTTON') buttons.push(node)
          for (const child of node.children || []) walk(child)
          for (const shadow of node.shadowRoots || []) walk(shadow)
        }
        walk(described.node)
        const target = buttons.find((button) => (button.attributes || []).join(' ').includes('bg-red')) || buttons[buttons.length - 1]
        if (target) {
          const model = await current.send('DOM.getBoxModel', { nodeId: target.nodeId })
          const quad = model.model.border
          const x = (quad[0] + quad[4]) / 2
          const y = (quad[1] + quad[5]) / 2
          const hostAttrs = (host.attributes || []).join(' ')
          const buttonAttrs = (target.attributes || []).join(' ')
          const disabled = /submit-disabled=true/.test(hostAttrs) || /aria-disabled=true/.test(buttonAttrs)
          return { found: true, x, y, disabled, source: 'shadow', backendNodeId: target.backendNodeId }
        }
      }
    } catch {}
    // 兜底：普通 DOM 文本搜索
    try {
      const fallback = JSON.parse(await current.eval(FIND_PUBLISH))
      if (fallback.found) return { ...fallback, disabled: false, source: 'text' }
      return fallback
    } catch {
      return { found: false }
    }
  }

  async function uploadFiles(current, files) {
    const rect = await current.eval(`(() => {
      const el = document.querySelector('.publish-page-content-media')
        || document.querySelector('.publish-page-content')
        || document.querySelector('.upload-wrapper')
        || document.querySelector('.upload-container');
      if (!el) return '';
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.x + r.width / 2, y: r.y + Math.min(260, r.height / 2) });
    })()`)
    if (!rect) return false
    const point = JSON.parse(rect)
    const data = { items: [], files, dragOperationsMask: 1 }
    for (const type of ['dragEnter', 'dragOver', 'drop']) {
      await current.send('Input.dispatchDragEvent', { type, x: point.x, y: point.y, data })
      await sleep(200)
    }
    return await current.waitFor(
      `document.querySelectorAll('.publish-page-content-media .edit-btn').length >= ${files.length}`,
      30000,
      500,
    )
  }

  async function clickAt(current, point) {
    await current.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y })
    await current.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await sleep(80)
    await current.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
  }

  async function addOneImage(current, file, expectedCount) {
    const root = await current.send('DOM.getDocument', { depth: -1, pierce: true })
    const input = await current.send('DOM.querySelector', { nodeId: root.root.nodeId, selector: '.img-list input[type=file]' })
    if (!input.nodeId) return false
    await current.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [file] })
    return await current.waitFor(
      `document.querySelectorAll('.publish-page-content-media .edit-btn').length >= ${expectedCount}`,
      20000,
      500,
    )
  }

  async function fillPublish({ title, body, tags, images, originals }, account = 'default') {
    const current = await page(account)
    if (!state.login.loggedIn) await openLogin()
    if (!state.login.loggedIn) throw Object.assign(new Error('还没有登录小红书'), { code: 'LOGIN_REQUIRED' })

    await current.goto(PUBLISH_URL, 4500)
    const href = await current.eval('location.href')
    if (href.includes('/login')) throw Object.assign(new Error('创作中心未登录，请重新登录'), { code: 'LOGIN_REQUIRED' })

    await dismissGuides(current)

    // 默认是视频页，必须明确切到「上传图文」，否则文件会进视频输入框。
    await current.waitFor(`!!document.querySelector('.creator-tab')`, 20000, 500)
    const clickImageTabs = async () => await current.eval(`(() => {
      const tabs = [...document.querySelectorAll('.creator-tab')].filter((el) => /上传图文/.test(el.textContent || ''));
      if (!tabs.length) return false;
      for (const tab of tabs) { try { tab.click(); } catch {} }
      return true;
    })()`)
    const switched = await clickImageTabs()
    if (!switched) throw new Error('没有找到「上传图文」标签')

    // 页面上可能有多个重复的「上传图文」标签，点完后确认 active 真的切到了图文。
    const imageTabActive = await current.waitFor(
      `[...document.querySelectorAll('.creator-tab.active')].some((el) => /上传图文/.test(el.textContent || ''))`,
      12000,
      400,
    )
    if (!imageTabActive) {
      await clickImageTabs()
      await sleep(1500)
    }

    const ready = await current.waitFor(`!!document.querySelector('input.upload-input, input[type=file][accept*=".png"]')`, 20000, 500)
    if (!ready) throw new Error('发布页没有出现图片上传控件')

    const realFiles = []
    if (typeof images === 'string' && images) realFiles.push(saveDataUrl(images, 0))
    if (Array.isArray(originals)) originals.forEach((dataUrl, index) => realFiles.push(saveDataUrl(dataUrl, index + 1)))
    if (!realFiles.length) throw new Error('没有可上传的图片')

    const expectedImages = realFiles.length

    // 关键：先只传第 1 张，剩余图片在图片区一张一张追加。
    // 一次拖入多张、或一次补多张，平台在发布时会裁成 3 张；逐张追加可以全部保留。
    const coverUploaded = await uploadFiles(current, [realFiles[0]])
    if (!coverUploaded) throw new Error('封面图上传失败')
    await current.waitFor(
      `document.querySelectorAll('.publish-page-content-media .edit-btn').length >= 1`,
      20000,
      500,
    )

    // 首图先稳定 5 秒；再打开/关闭一次图片编辑，模拟手动加图前的状态。
    await sleep(5000)
    const editorOpened = await current.eval(`(() => {
      const btn = document.querySelector('.publish-page-content-media .edit-btn');
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    if (editorOpened) {
      await sleep(2000)
      await current.eval(`(() => {
        const btn = [...document.querySelectorAll('button, span, div')].find((el) => el.children.length === 0 && (el.textContent || '').trim() === '完成' && el.getBoundingClientRect().width > 0);
        if (!btn) return false;
        (btn.closest('button') || btn).click();
        return true;
      })()`)
      await sleep(1000)
    }

    for (let i = 1; i < realFiles.length; i += 1) {
      const added = await addOneImage(current, realFiles[i], i + 1)
      if (!added) throw new Error(`第 ${i + 1} 张图片追加失败，请重试`)
      await sleep(2500)
    }

    const imagesReady = await current.waitFor(
      `document.querySelectorAll('.publish-page-content-media .edit-btn').length >= ${expectedImages}`,
      30000,
      500,
    )
    if (!imagesReady) throw new Error('图片没有全部上传成功')

    await current.waitFor(`!!document.querySelector('input[placeholder*="填写标题"]')`, 30000, 500)
    await sleep(800)

    const titleFocused = await current.eval(`(() => {
      const el = document.querySelector('input[placeholder*="填写标题"]');
      if (!el) return false;
      el.focus();
      el.select();
      return true;
    })()`)
    if (titleFocused) {
      // 逐字输入：一次性粘贴整段正文会触发平台重存草稿并吞图。
      for (const ch of String(title)) {
        await current.send('Input.insertText', { text: ch })
        await sleep(55)
      }
    }
    const titleOk = titleFocused

    const fullText = body + (tags.length ? '\n\n' + tags.map((tag) => '#' + tag).join(' ') : '')
    // 正文是 ProseMirror，必须走真实输入事件
    let bodyOk = await current.eval(`(() => {
      const el = document.querySelector('.tiptap.ProseMirror') || document.querySelector('[contenteditable="true"]');
      if (!el) return false;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    })()`)
    if (bodyOk) {
      // 分段输入正文，避免平台把大批量输入当成粘贴后重存草稿、裁掉图片。
      const chunks = String(fullText).match(/[\s\S]{1,8}/g) || []
      for (const chunk of chunks) {
        await current.send('Input.insertText', { text: chunk })
        await sleep(45)
      }
      await sleep(500)
      // 关掉 # 话题联想下拉，避免挡住底部操作条
      await current.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await current.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await sleep(400)
    }
    let bodyLength = await current.eval(`(() => {
      const el = document.querySelector('.tiptap.ProseMirror') || document.querySelector('[contenteditable="true"]');
      return el ? (el.innerText || '').replace(/\\s+/g, '').length : 0;
    })()`)
    if (!bodyLength) {
      bodyOk = await current.eval(`(() => {
        const el = document.querySelector('.tiptap.ProseMirror') || document.querySelector('[contenteditable="true"]');
        if (!el) return false;
        el.focus();
        document.execCommand('insertText', false, ${JSON.stringify(fullText)});
        return true;
      })()`)
      await sleep(600)
      bodyLength = await current.eval(`(() => {
        const el = document.querySelector('.tiptap.ProseMirror') || document.querySelector('[contenteditable="true"]');
        return el ? (el.innerText || '').replace(/\\s+/g, '').length : 0;
      })()`)
    }

    // 填完立刻计数并返回，缩短填表到发布的间隔；不再补图、不再点引导层。
    const actualImages = await current.eval(`document.querySelectorAll('.publish-page-content-media .edit-btn').length`)
    if (actualImages !== expectedImages) {
      throw new Error(`图片数量异常（实际 ${actualImages}/${expectedImages}），请重试`)
    }

    await scrollPublishToBottom(current)
    await sleep(900)

    const info = await current.eval(`JSON.stringify({
      href: location.href,
      titleFound: !!document.querySelector('input[placeholder*="填写标题"]'),
      bodyFound: !!document.querySelector('.tiptap.ProseMirror, [contenteditable="true"]'),
      bodyLength: ${bodyLength},
      imageLabel: (document.querySelector('.publish-page-content-media')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 40),
    })`)
    const parsedInfo = JSON.parse(info)
    parsedInfo.imageCount = actualImages
    const candidate = await publishButtonPoint(current)
    parsedInfo.publishCandidates = Boolean(candidate.found)
    parsedInfo.publishDisabled = Boolean(candidate.disabled)
    if (candidate.found) {
      parsedInfo.publishX = Math.round(candidate.x)
      parsedInfo.publishY = Math.round(candidate.y)
    }
    state.draft = { title, body, tags, files: realFiles, at: Date.now(), pageInfo: parsedInfo }
    state.lastPublish = undefined
    invalidateShot()
    return {
      url: parsedInfo.href,
      uploaded: realFiles.length,
      titleOk: Boolean(titleOk),
      bodyOk: Boolean(bodyOk) && bodyLength > 0,
      pageInfo: parsedInfo,
    }
  }

  async function submitPublish(account = 'default') {
    const current = await page(account)
    if (!state.draft) throw new Error('请先填入发布页')

    const expectedImages = Array.isArray(state.draft.files) ? state.draft.files.length : 0
    const imageCount = state.draft.pageInfo?.imageCount ?? expectedImages
    if (expectedImages && imageCount !== expectedImages) {
      throw new Error(`发布页图片数量异常（${imageCount}/${expectedImages}），请重新点「填入发布页」`)
    }

    await scrollPublishToBottom(current)
    await sleep(600)

    let candidate = await publishButtonPoint(current)
    if (!candidate.found) {
      // 再等一次：平台偶尔在滚动后才渲染操作条
      await sleep(1500)
      candidate = await publishButtonPoint(current)
    }
    if (!candidate.found) {
      const tail = await current.eval(`(document.body?.innerText || '').replace(/\\s+/g, ' ').slice(-160)`)
      throw new Error('没有找到发布按钮；请点「显示窗口」手动关闭页面浮层后再试。页面尾部：' + String(tail || '').slice(-100))
    }
    if (candidate.disabled) {
      throw new Error('发布按钮当前不可点（图片可能还在处理，或标题/正文未满足要求）')
    }

    if (candidate.backendNodeId) {
      try {
        const resolved = await current.send('DOM.resolveNode', { backendNodeId: candidate.backendNodeId })
        await current.send('Runtime.callFunctionOn', {
          objectId: resolved.object.objectId,
          functionDeclaration: 'function(){ this.click(); }',
          awaitPromise: false,
        })
      } catch {
        await clickAt(current, candidate)
      }
    } else {
      await clickAt(current, candidate)
    }
    await randomPause(1000, 5000)

    let info = await current.eval(`JSON.stringify({ href: location.href, text: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 400) })`)
    let parsed = JSON.parse(info)
    let published = /发布成功/.test(parsed.text)
    if (!published) {
      await sleep(2500)
      info = await current.eval(`JSON.stringify({ href: location.href, text: (document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 400) })`)
      parsed = JSON.parse(info)
      published = /发布成功/.test(parsed.text)
    }
    state.lastPublish = { at: Date.now(), href: parsed.href, published }
    const record = {
      id: 'h-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      account,
      title: state.draft.title,
      body: state.draft.body,
      tags: state.draft.tags,
      images: imageCount || state.draft.pageInfo?.imageCount || (Array.isArray(state.draft.files) ? state.draft.files.length : 0),
      at: Date.now(),
      url: /note-manager|manage/.test(parsed.href) ? parsed.href : 'https://creator.xiaohongshu.com/new/note-manager',
      published,
    }
    publishHistory.unshift(record)
    if (publishHistory.length > 50) publishHistory.length = 50
    saveHistory()
    invalidateShot()
    return {
      published,
      url: parsed.href,
      message: parsed.text.slice(0, 160),
      button: { source: candidate.source },
      imageCount,
      record,
    }
  }

  // ---------------------------------------------------------------- 聊天/批量发布

  function dataUrlFromPath(file) {
    const abs = path.resolve(String(file))
    const buffer = fs.readFileSync(abs)
    if (buffer.length > 32 * 1024 * 1024) throw new Error('单张图片不能超过 32MB：' + path.basename(abs))
    const ext = path.extname(abs).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i

  /** 扫描图片根目录：子文件夹名当账号；没有子文件夹时按文件名里的已知账号名分组。 */
  function scanImageGroups(root) {
    const abs = path.resolve(String(root || ''))
    if (!fs.existsSync(abs)) throw new Error('目录不存在：' + abs)
    const entries = fs.readdirSync(abs, { withFileTypes: true })
    const groups = new Map()
    const dirs = entries.filter((entry) => entry.isDirectory())
    if (dirs.length) {
      for (const dir of dirs) {
        const folder = path.join(abs, dir.name)
        const images = fs.readdirSync(folder, { withFileTypes: true })
          .filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name))
          .map((entry) => path.join(folder, entry.name))
          .sort()
        if (images.length) groups.set(dir.name, { account: dir.name, folder: dir.name, images })
      }
    } else {
      const accounts = Object.keys(accountRegistry.accounts)
      const files = entries
        .filter((entry) => entry.isFile() && IMAGE_EXT.test(entry.name))
        .map((entry) => path.join(abs, entry.name))
        .sort()
      for (const file of files) {
        const name = path.basename(file)
        const account = accounts.find((item) => name.includes(item)) || 'default'
        if (!groups.has(account)) groups.set(account, { account, folder: '', images: [] })
        groups.get(account).images.push(file)
      }
    }
    return { root: abs, groups: [...groups.values()] }
  }

  /** 聊天工具和 HTTP 共用的一次发布：可选生成文案、登录、填表、发布。 */
  async function publishJob(job = {}) {
    const account = String(job.account || state.account || 'default')
    const images = Array.isArray(job.images) ? job.images.map((item) => String(item)).filter(Boolean) : []
    if (!images.length) throw new Error('至少需要 1 张图片')
    if (images.length > 9) throw new Error('最多支持 9 张图片')
    assertPublishAllowed(account)

    const dataUrls = images.map((file) => dataUrlFromPath(file))
    let title = String(job.title || '').trim()
    let body = String(job.body || '').trim()
    let tags = Array.isArray(job.tags)
      ? job.tags.map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean).slice(0, 10)
      : []

    if (!title || !body) {
      const promptText = String(job.prompt || '').trim() || defaultPrompt()
      const generated = await generateCopy(promptText, images.length, String(job.series || ''))
      title = title || generated.title || ''
      body = body || generated.body || ''
      if (!tags.length) tags = Array.isArray(generated.tags) ? generated.tags.slice(0, 10) : []
    }
    if (!title) title = '分享我的日常'
    if (!body) body = ''
    title = sanitizeEmoji(title) || '分享我的日常'
    body = sanitizeEmoji(body)
    tags = tags.map((tag) => sanitizeEmoji(tag)).filter(Boolean)
    const risk = checkRisk({ title, body, tags }, riskRules)

    try {
      await ensureLogin(account, job.loginTimeoutMs)
      const info = await fillPublish({
        title,
        body,
        tags,
        images: dataUrls[0],
        originals: dataUrls.slice(1),
      }, account)
      const submitted = job.publish === false ? { published: false } : await submitPublish(account)
      const result = {
        ok: true,
        account,
        title,
        body,
        tags,
        risk,
        ...submitted,
        imageCount: submitted.imageCount ?? info?.pageInfo?.imageCount ?? images.length,
      }
      state.lastAction = {
        at: Date.now(),
        kind: job.publish === false ? 'fill' : 'publish',
        account,
        title,
        images: images.length,
        published: Boolean(submitted.published),
        ok: true,
      }
      return result
    } catch (error) {
      state.lastAction = {
        at: Date.now(),
        kind: 'failed',
        account,
        title,
        images: images.length,
        ok: false,
        error: error?.message || String(error),
      }
      throw error
    }
  }

  /** 批量任务按账号分组，同一账号连续执行，减少 profile 切换次数。 */
  async function runBatchJobs(jobs, loginTimeoutMs, onProgress, options = {}) {
    if (!options.explicit) assertManualPublishAllowed()
    const risk = riskSettings()
    const fallbackAccount = state.account || 'default'
    const groups = new Map()
    for (const job of jobs) {
      const account = String(job?.account || fallbackAccount)
      if (!groups.has(account)) groups.set(account, [])
      groups.get(account).push(job)
    }
    if (groups.size > risk.maxAccountsPerBatch) {
      throw new Error(`一次最多 ${risk.maxAccountsPerBatch} 个账号，当前 ${groups.size} 个`)
    }
    const results = []
    let previousAccount = ''
    for (const [account, list] of groups) {
      if (previousAccount && previousAccount !== account) {
        await randomPause(risk.staggerMinMs, risk.staggerMaxMs)
      }
      previousAccount = account
      for (const job of list) {
        try {
          onProgress?.({ type: 'start', account, title: job.title || '' })
          const result = await publishJob({ loginTimeoutMs, ...job, account })
          results.push(result)
          onProgress?.({ type: 'done', result })
        } catch (error) {
          const result = { ok: false, account, error: error?.message || String(error) }
          results.push(result)
          onProgress?.({ type: 'done', result })
        }
        await randomPause(1000, 5000)
      }
    }
    state.lastAction = {
      at: Date.now(),
      kind: 'batch',
      count: results.length,
      accounts: [...new Set(results.map((result) => result.account))],
      ok: results.every((result) => result.ok),
      titles: results.map((result) => result.title).filter(Boolean).slice(0, 3),
    }
    return results
  }

  // ---------------------------------------------------------------- 定时发布

  const schedulesFile = path.join(dataDir, 'schedules.json')
  const SCHEDULE_GRACE_MS = 30 * 60 * 1000
  let schedules = []
  let scheduleTimer

  function saveSchedules() {
    try { fs.writeFileSync(schedulesFile, JSON.stringify(schedules, null, 2)) } catch (error) { log('定时任务写入失败', error) }
  }

  function loadSchedules() {
    try {
      const raw = JSON.parse(fs.readFileSync(schedulesFile, 'utf8'))
      if (Array.isArray(raw)) schedules = raw
    } catch {}
    if (!Array.isArray(schedules)) schedules = []
    for (const item of schedules) {
      if (item.status === 'running') {
        item.status = 'failed'
        item.error = '上次定时任务执行中断'
        item.finishedAt = Date.now()
      }
    }
  }

  function scheduleId() {
    return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
  }

  function copyJobImages(job, id, index) {
    const images = Array.isArray(job?.images) ? job.images.map((item) => String(item)).filter(Boolean) : []
    if (!images.length) throw new Error(`第 ${index + 1} 条任务至少需要 1 张图片`)
    const dir = path.join(dataDir, 'schedules', id)
    fs.mkdirSync(dir, { recursive: true })
    const copied = images.map((file, i) => {
      const abs = path.resolve(file)
      const ext = path.extname(abs).toLowerCase() || '.jpg'
      const dest = path.join(dir, `job-${index + 1}-${i + 1}${ext}`)
      fs.copyFileSync(abs, dest)
      return dest
    })
    return { ...job, images: copied }
  }

  function listSchedules() {
    const rank = (item) => (item.status === 'pending' ? 0 : item.status === 'running' ? 1 : 2)
    return schedules
      .slice()
      .sort((a, b) => rank(a) - rank(b) || new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(0, 30)
  }

  function cancelSchedule(id) {
    const item = schedules.find((entry) => entry.id === id)
    if (!item) throw new Error('没有这个定时任务')
    if (item.status !== 'pending') throw new Error('只能取消还没开始的任务')
    item.status = 'cancelled'
    item.finishedAt = Date.now()
    saveSchedules()
    armSchedules()
    for (const job of item.jobs || []) {
      if (!job.stagingId) continue
      const record = staging.find((entry) => entry.id === job.stagingId)
      const target = record && record.jobs[job.stagingJobIndex]
      if (!target || target.scheduleId !== item.id) continue
      delete target.scheduleId
      delete target.scheduledAt
      record.updatedAt = Date.now()
      saveStaging()
    }
    return item
  }

  function deleteSchedule(id) {
    const index = schedules.findIndex((entry) => entry.id === id)
    if (index < 0) throw new Error('没有这个定时任务')
    const item = schedules[index]
    if (item.status === 'pending' || item.status === 'running') throw new Error('请先取消待执行/执行中的任务')
    schedules.splice(index, 1)
    saveSchedules()
    try { fs.rmSync(path.join(dataDir, 'schedules', id), { recursive: true, force: true }) } catch {}
    return item
  }

  function createSchedule({ at, jobs, loginTimeoutMs, explicit = false }) {
    if (!explicit) assertManualPublishAllowed()
    const time = at instanceof Date ? at : new Date(String(at || ''))
    if (Number.isNaN(time.getTime())) throw new Error('定时时间格式不正确，请用带时区的 ISO 时间')
    if (time.getTime() <= Date.now() + 3000) throw new Error('定时时间必须晚于现在')
    if (!Array.isArray(jobs) || !jobs.length) throw new Error('jobs 不能为空')
    const id = scheduleId()
    const copiedJobs = jobs.map((job, index) => copyJobImages(job, id, index))
    const item = {
      id,
      at: time.toISOString(),
      createdAt: Date.now(),
      loginTimeoutMs: Number(loginTimeoutMs) || 180000,
      jobs: copiedJobs,
      explicit: Boolean(explicit),
      status: 'pending',
    }
    schedules.push(item)
    saveSchedules()
    armSchedules()
    return item
  }

  async function runSchedule(item) {
    if (!item || item.status !== 'pending') return
    if (riskSettings().manualOnly && !item.explicit) {
      item.status = 'cancelled'
      item.error = '风控设置已开启手动发布，自动定时任务已取消'
      item.finishedAt = Date.now()
      saveSchedules()
      return
    }
    const at = new Date(item.at).getTime()
    if (Date.now() - at > SCHEDULE_GRACE_MS) {
      item.status = 'missed'
      item.error = '应用当时没有运行，已错过定时时间'
      item.finishedAt = Date.now()
      saveSchedules()
      return
    }
    item.status = 'running'
    item.startedAt = Date.now()
    saveSchedules()
    try {
      const results = await exclusive('定时发布', async () => await runBatchJobs(item.jobs, item.loginTimeoutMs, undefined, { explicit: Boolean(item.explicit) }))
      item.results = results
      item.status = results.every((result) => result.ok) ? 'done' : 'failed'
      item.error = results.filter((result) => !result.ok).map((result) => result.error).filter(Boolean).join('; ').slice(0, 500)
    } catch (error) {
      item.status = 'failed'
      item.error = error?.message || String(error)
    }
    item.finishedAt = Date.now()
    saveSchedules()
    for (let index = 0; index < item.jobs.length; index += 1) {
      const job = item.jobs[index]
      if (!job.stagingId) continue
      const record = staging.find((entry) => entry.id === job.stagingId)
      if (!record) continue
      const target = record.jobs[job.stagingJobIndex]
      if (!target) continue
      const result = item.results?.[index] || {}
      if (result.ok) {
        target.publishedAt = Date.now()
        delete target.scheduleId
        delete target.scheduledAt
      }
      target.publishOk = Boolean(result.ok)
      target.publishError = result.error || ''
      if (record.jobs.every((entry) => entry.publishedAt)) record.status = 'published'
      else if ((item.results || []).some((entry) => !entry.ok)) record.status = 'pending'
      record.updatedAt = Date.now()
      saveStaging()
    }
  }

  async function fireDueSchedules() {
    const now = Date.now()
    const due = schedules.filter((item) => item.status === 'pending' && new Date(item.at).getTime() <= now + 1000)
    for (const item of due) {
      try { await runSchedule(item) } catch {}
    }
  }

  function armSchedules() {
    if (scheduleTimer) { clearTimeout(scheduleTimer); scheduleTimer = undefined }
    const now = Date.now()
    const due = schedules.filter((item) => item.status === 'pending' && new Date(item.at).getTime() <= now + 1000)
    if (due.length) {
      fireDueSchedules().catch(() => {}).finally(() => armSchedules())
    }
    const next = schedules
      .filter((item) => item.status === 'pending' && new Date(item.at).getTime() > now + 1000)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0]
    if (!next) return
    const delay = Math.min(new Date(next.at).getTime() - now, 24 * 60 * 60 * 1000)
    scheduleTimer = setTimeout(async () => {
      scheduleTimer = undefined
      await fireDueSchedules().catch(() => {})
      armSchedules()
    }, Math.max(0, delay))
  }

  loadSchedules()

  // ---------------------------------------------------------------- 待审核暂存

  const stagingFile = path.join(dataDir, 'staging.json')
  const stagingDir = path.join(dataDir, 'staging')
  let staging = []

  function saveStaging() {
    try { fs.writeFileSync(stagingFile, JSON.stringify(staging, null, 2)) } catch (error) { log('待审核写入失败', error) }
  }

  function loadStaging() {
    try {
      const raw = JSON.parse(fs.readFileSync(stagingFile, 'utf8'))
      if (Array.isArray(raw)) staging = raw
    } catch {}
    if (!Array.isArray(staging)) staging = []
    for (const item of staging) {
      if (item.status === 'publishing') {
        item.status = 'failed'
        item.error = '上次审核发布中断'
        item.finishedAt = Date.now()
      }
    }
  }

  function listStaging() {
    const rank = (item) => (item.status === 'pending' ? 0 : item.status === 'publishing' ? 1 : 2)
    return staging
      .slice()
      .sort((a, b) => rank(a) - rank(b) || b.createdAt - a.createdAt)
      .slice(0, 20)
  }

  function saveStagedImage(source, dir, name) {
    const text = String(source)
    if (/^data:image\//i.test(text)) {
      const match = /^data:image\/([a-z+]+);base64,(.+)$/i.exec(text)
      if (!match) throw new Error('图片 data URL 无法解析')
      const ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg'
      const file = path.join(dir, name + '.' + ext)
      fs.writeFileSync(file, Buffer.from(match[2], 'base64'))
      return file
    }
    const abs = path.resolve(text)
    const ext = path.extname(abs).toLowerCase() || '.jpg'
    const file = path.join(dir, name + ext)
    fs.copyFileSync(abs, file)
    return file
  }

  function coverExcerpt(job) {
    const text = String((job && job.body) || '').replace(/\s+/g, '')
    const clauses = text.split(/[，。！？；、\n]/).map((item) => item.trim()).filter((item) => item.length >= 4 && item.length <= 10)
    const scored = clauses.map((item) => ({
      text: item,
      score: (/送礼|长辈|体面|高级|温柔|成双|拿得出手|伴手礼|不踩雷|礼盒|质感/.test(item) ? 100 : 0) + item.length,
    }))
    scored.sort((left, right) => right.score - left.score)
    return (scored[0]?.text || (job && job.series) || '').slice(0, 10)
  }

  function runCollage(images, title, out, style = 'classic', series = '', excerpt = '') {
    return new Promise((resolve) => {
      const payload = path.join(path.dirname(out), 'collage-' + Date.now() + '.json')
      try {
        fs.writeFileSync(payload, JSON.stringify({ images, title, out, style, series, excerpt }))
      } catch {
        resolve(false)
        return
      }
      const attempt = (command, fallback) => {
        execFile(command, [COLLAGE_SCRIPT, payload], { timeout: 45000, windowsHide: true }, (error) => {
          if (error && fallback) { attempt(fallback, null); return }
          try { fs.unlinkSync(payload) } catch {}
          if (error) { log('封面生成失败', error.message); resolve(false); return }
          resolve(fs.existsSync(out))
        })
      }
      attempt('python', 'py')
    })
  }

  const DIVERSION_RE = /微信|vx|VX|威信|加我|私信|二维码|扫码|站外|链接|淘宝|抖音|拼多多|1[3-9]\d{9}|手机号|电话|联系我|加微/

  function platformWarningsFor(job) {
    const text = [job.title, job.body, ...(Array.isArray(job.tags) ? job.tags : [])].join(' ')
    const warnings = []
    if (DIVERSION_RE.test(text)) warnings.push('疑似导流/联系方式：发布前请删除微信、电话、二维码、站外链接等')
    if (/(绝对|第一|最便宜|顶级|百分百|保证|根治|治疗|疗效)/.test(text)) warnings.push('疑似绝对化/功效话术，建议改成真实体验描述')
    return warnings
  }

  function refreshStagingWarnings(record) {
    const warnings = []
    const titleMap = new Map()
    const imageMap = new Map()
    for (let index = 0; index < record.jobs.length; index += 1) {
      const job = record.jobs[index]
      const normalized = String(job.title || '').replace(/\s+/g, '').toLowerCase()
      if (normalized) {
        if (titleMap.has(normalized)) warnings.push(`第 ${titleMap.get(normalized) + 1} 组和第 ${index + 1} 组标题重复`)
        else titleMap.set(normalized, index)
        if (publishHistory.some((item) => item.published && item.title && String(item.title).replace(/\s+/g, '').toLowerCase() === normalized)) {
          warnings.push(`第 ${index + 1} 组标题与已发布记录重复`)
        }
      }
      for (const file of job.images || []) {
        let hash = ''
        try { hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex') } catch {}
        if (!hash) continue
        if (imageMap.has(hash)) warnings.push(`第 ${imageMap.get(hash) + 1} 组和第 ${index + 1} 组有相同图片`)
        else imageMap.set(hash, index)
      }
      job.platformWarnings = platformWarningsFor(job)
    }
    record.warnings = [...new Set(warnings)]
    return record.warnings
  }

  async function stageGroups(jobs, loginTimeoutMs, options = {}) {
    if (!Array.isArray(jobs) || !jobs.length) throw new Error('jobs / groups 不能为空')
    const id = 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
    const dir = path.join(stagingDir, id)
    fs.mkdirSync(dir, { recursive: true })
    const record = {
      id,
      createdAt: Date.now(),
      status: 'pending',
      loginTimeoutMs: Number(loginTimeoutMs) || 180000,
      jobs: [],
    }
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index] || {}
      const sources = Array.isArray(job.images) ? job.images.filter(Boolean).slice(0, 9) : []
      if (!sources.length) throw new Error(`第 ${index + 1} 组没有图片`)
      const account = String(job.account || state.account || 'default')
      const nickname = accountRegistry.accounts[account]?.nickname || ''
      let title = String(job.title || '').trim()
      let body = String(job.body || '').trim()
      let tags = Array.isArray(job.tags)
        ? job.tags.map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean).slice(0, 10)
        : []
      if (!title || !body) {
        const promptText = String(job.prompt || '').trim() || defaultPrompt()
        const generated = await generateCopy(promptText, sources.length + 1, String(job.series || ''))
        title = title || generated.title || ''
        body = body || generated.body || ''
        if (!tags.length) tags = Array.isArray(generated.tags) ? generated.tags.slice(0, 10) : []
      }
      if (!title) title = '分享我的日常'
      title = sanitizeEmoji(title) || '分享我的日常'
      body = sanitizeEmoji(body)
      tags = tags.map((tag) => sanitizeEmoji(tag)).filter(Boolean)
      const originals = sources.map((source, imageIndex) => saveStagedImage(source, dir, `job-${index + 1}-${imageIndex + 1}`))
      const noCover = Boolean(options.noCover)
      const coverStyle = noCover ? '' : String(job.coverStyle || 'classic')
      const coverPath = path.join(dir, `cover-${index + 1}.jpg`)
      const hasCover = noCover ? false : await runCollage(originals, title, coverPath, coverStyle, job.series || '', coverExcerpt(job))
      const images = hasCover ? [coverPath, ...originals] : originals
      record.jobs.push({
        account,
        nickname,
        images,
        title,
        body,
        tags,
        coverStyle,
        prompt: job.prompt || '',
        series: job.series || '',
        imageCount: images.length,
        risk: checkRisk({ title, body, tags }, riskRules),
      })
    }
    refreshStagingWarnings(record)
    if (options.preview) {
      record.status = 'preview'
      record.preview = true
      return record
    }
    staging.unshift(record)
    if (staging.length > 30) staging.length = 30
    saveStaging()
    return record
  }

  const PRODUCT_COPY = {
    利川红: {
      title: '江陈记利川红礼盒，送长辈同事体面',
      body: '江陈记 · 湖北特产里，利川红真的是被低估的温柔选手。\n\n红色手提袋配红色礼盒，拎出去不张扬，打开却很有质感。茶叶是湖北利川的红茶，泡出来汤色暖亮，入口顺，长辈喝着不觉得冲。\n\n送长辈显得有心，送同事也不越界。伴手礼最怕花哨，这套利川红刚好把体面藏在细节里。\n\n同城的朋友如果想先看看实物，可以来店里坐坐，慢慢挑一盒合眼缘的。🍵',
      tags: ['江陈记', '利川红', '湖北特产', '武汉伴手礼', '茶叶礼盒', '送长辈礼物', '送同事伴手礼', '红茶推荐', '同城探店'],
      series: '利川红',
      style: 'festive',
    },
    恩施玉露: {
      title: '江陈记恩施玉露·利川红，一红一绿刚好成双',
      body: '江陈记 · 这套恩施玉露·利川红，一红一绿刚好成双。\n\n绿色礼袋配手绘茶卡，送长辈、朋友都体面，不用费心解释。一红一绿，自己留一罐、送人一罐都合适。\n\n包装不浮夸，但拿得出手，适合武汉伴手礼或日常走动。\n\n同城的朋友如果想看实物，可以约着一起挑，慢慢选不着急。',
      tags: ['江陈记', '恩施玉露', '利川红', '湖北特产', '武汉伴手礼', '送礼推荐', '茶礼', '茶叶礼盒'],
      series: '恩施玉露',
      style: 'magazine',
    },
    楚汉茶礼: {
      title: '江陈记楚汉茶礼，送长辈很稳',
      body: '江陈记 · 湖北特产里挑伴手礼，我最近偏爱楚汉茶礼这套三罐茶。\n\n白绿配色很干净，恩施玉露、利川红、来凤藤茶各一罐，湖北三个地方的风味都齐了。送长辈或客户，温柔又高级，不会显得刻意。\n\n我自己留了一罐藤茶，入口微苦回甘，配下午茶刚好🍵 礼盒拿在手里有分量，包装不花哨，长辈收着也舒服。\n\n武汉同城想看的可以慢慢聊，选伴手礼不用急，合适最重要。',
      tags: ['江陈记', '湖北特产', '武汉伴手礼', '楚汉茶礼', '恩施玉露', '利川红', '来凤藤茶', '茶礼盒', '送长辈礼物'],
      series: '楚汉茶礼',
      style: 'warm',
    },
  }

  async function runLocalGroup(folder, template, postsPerGroup = 1, perPost = null) {
    const target = String(folder || '').trim()
    if (!target) throw new Error('请填写本地文件夹路径')
    const chosen = template || groupTemplateById(groupTemplates.defaultId)
    const count = Math.max(3, Math.min(5, Number(perPost) || chosen.perPost || 4))
    const out = path.join(dataDir, 'local-groups', 'group-' + Date.now())
    fs.mkdirSync(out, { recursive: true })
    const run = (command, commandArgs, timeout) => new Promise((resolve, reject) => {
      execFile(command, commandArgs, { timeout, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message).slice(-800)))
          return
        }
        resolve(stdout)
      })
    })
    await run('python', [GROUP_SCRIPT, '--folder', target, '--out', out], 800000)
    const groupsPath = path.join(out, 'groups.json')
    const selectedOut = path.join(out, 'selected')
    await run('python', [
      SELECT_SCRIPT,
      '--groups', groupsPath,
      '--out', selectedOut,
      '--per-post', String(count),
      '--posts-per-group', String(Math.max(1, Math.min(20, Number(postsPerGroup) || 1))),
      '--min-hash-distance', String(chosen.minHashDistance ?? 8),
      '--strategy', String(chosen.strategy || 'cluster'),
      '--roles', (chosen.roles || ['封面', '包装', '手提', '细节']).join(','),
    ], 600000)
    const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'))
    const selected = JSON.parse(fs.readFileSync(path.join(selectedOut, 'selected.json'), 'utf8'))
    return {
      ok: true,
      folder: target,
      out,
      template: { id: chosen.id, name: chosen.name, perPost: count, strategy: chosen.strategy },
      count: groups.count,
      ocr: groups.ocr,
      summary: groups.summary,
      groups: groups.groups.map((group) => ({ label: group.label, count: group.count, sheet: group.sheet })),
      posts: selected.posts.map((post) => ({
        product: post.product,
        account: post.account,
        images: post.images,
        roles: post.roles,
        sheet: post.sheet,
      })),
    }
  }

  let localGroupPreview = null
  const groupSessionFile = path.join(dataDir, 'group-session.json')

  function todayKey() {
    const now = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
  }

  function saveGroupSession(result) {
    try {
      fs.writeFileSync(groupSessionFile, JSON.stringify({ ...result, date: todayKey(), updatedAt: Date.now() }, null, 2), 'utf8')
    } catch (error) {
      log('分组会话写入失败', error)
    }
  }

  function loadGroupSession() {
    try {
      const data = JSON.parse(fs.readFileSync(groupSessionFile, 'utf8'))
      return data && data.date === todayKey() ? data : null
    } catch {
      return null
    }
  }

  function clearGroupSession() {
    try { fs.unlinkSync(groupSessionFile) } catch {}
  }

  async function stageLocalGroup(posts, options = {}) {
    const list = Array.isArray(posts) ? posts : []
    if (!list.length) throw new Error('没有可放入审核的分组')
    const jobs = list.map((post) => {
      const copy = PRODUCT_COPY[post.product] || {}
      return {
        account: post.account || 'default',
        images: (Array.isArray(post.images) ? post.images : [])
          .filter((image) => !/[\\/]预览\.jpg$/i.test(image) && !/[\\/]cover-[^\\/]+\.(jpe?g|png)$/i.test(image)),
        title: copy.title || '',
        body: copy.body || '',
        tags: copy.tags || [],
        series: copy.series || post.product || '',
        coverStyle: '',
      }
    })
    return await stageGroups(jobs, undefined, options)
  }

  async function publishStaging(id) {    assertManualPublishAllowed()
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('这个任务不是待审核状态')
    cancelSchedulesForStaging(id)
    for (const job of record.jobs) {
      delete job.scheduleId
      delete job.scheduledAt
    }
    record.status = 'publishing'
    record.startedAt = Date.now()
    record.progress = { total: record.jobs.length, done: 0, results: [], current: null, updatedAt: Date.now() }
    saveStaging()
    try {
      const results = await exclusive('审核发布', async () => await runBatchJobs(
        record.jobs.map((job) => ({ ...job, publish: true })),
        record.loginTimeoutMs,
        (event) => {
          if (!record.progress) record.progress = { total: record.jobs.length, done: 0, results: [], current: null }
          if (event.type === 'start') {
            record.progress.current = {
              account: event.account,
              nickname: accountRegistry.accounts[event.account]?.nickname || '',
              title: event.title || '',
            }
          } else {
            const result = event.result || {}
            record.progress.results.push({
              account: result.account || '',
              nickname: accountRegistry.accounts[result.account]?.nickname || '',
              title: result.title || '',
              ok: Boolean(result.ok),
              error: result.error || '',
            })
            record.progress.done = record.progress.results.length
            record.progress.current = null
          }
          record.progress.updatedAt = Date.now()
          saveStaging()
        },
      ))
      record.results = results
      record.status = results.every((result) => result.ok) ? 'published' : 'failed'
      record.error = results.filter((result) => !result.ok).map((result) => result.error).filter(Boolean).join('; ').slice(0, 500)
    } catch (error) {
      record.status = 'failed'
      record.error = error?.message || String(error)
    }
    record.finishedAt = Date.now()
    saveStaging()
    return record
  }

  async function publishStagingJob(id, jobIndex) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以单组发布')
    const index = Number(jobIndex)
    const job = record.jobs[index]
    if (!job) throw new Error('没有这一组')
    if (job.publishedAt) throw new Error('这一组已经发布过了')
    cancelSchedulesForStaging(id, index)
    delete job.scheduleId
    delete job.scheduledAt
    record.status = 'publishing'
    record.progress = {
      total: 1,
      done: 0,
      results: [],
      current: { account: job.account, nickname: job.nickname || accountRegistry.accounts[job.account]?.nickname || '', title: job.title },
      updatedAt: Date.now(),
    }
    saveStaging()
    try {
      const result = await exclusive('审核发布', async () => await publishJob({ ...job, publish: true }))
      if (!result.published) throw new Error('平台没有确认发布成功')
      job.publishedAt = Date.now()
      job.publishOk = true
      job.publishError = ''
      record.progress.results.push({
        account: job.account,
        nickname: job.nickname || accountRegistry.accounts[job.account]?.nickname || '',
        title: job.title,
        ok: true,
        error: '',
      })
      record.progress.done = 1
      record.progress.current = null
      record.status = record.jobs.every((item) => item.publishedAt) ? 'published' : 'pending'
      record.updatedAt = Date.now()
      saveStaging()
      return { record, result }
    } catch (error) {
      job.publishError = error?.message || String(error)
      record.status = 'pending'
      record.error = job.publishError
      record.updatedAt = Date.now()
      saveStaging()
      throw error
    }
  }

  function scheduleStagingStaggered(id) {
    assertManualPublishAllowed()
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以错峰发布')
    const pending = record.jobs
      .map((job, index) => ({ job, index }))
      .filter((item) => !item.job.publishedAt)
    if (!pending.length) throw new Error('没有待发布的分组')
    const risk = riskSettings()
    if (pending.length > risk.maxAccountsPerBatch) {
      throw new Error(`一次最多 ${risk.maxAccountsPerBatch} 个账号`)
    }
    const accountNames = pending.map((item) => item.job.account)
    if (new Set(accountNames).size !== accountNames.length) {
      throw new Error('同一账号一天最多 1 篇：请把重复账号的分组合并，或在审核里改账号')
    }
    const items = []
    let cursor = Date.now() + 5000
    for (let i = 0; i < pending.length; i += 1) {
      if (i > 0) {
        cursor += risk.staggerMinMs + Math.floor(Math.random() * (risk.staggerMaxMs - risk.staggerMinMs + 1))
      }
      items.push(createSchedule({
        at: new Date(cursor),
        jobs: [{
          ...pending[i].job,
          stagingId: record.id,
          stagingJobIndex: pending[i].index,
        }],
        loginTimeoutMs: record.loginTimeoutMs,
      }))
    }
    const firstAt = new Date(items[0].at).getTime()
    record.status = 'scheduled'
    record.scheduleIds = items.map((item) => item.id)
    record.scheduleAt = firstAt
    record.updatedAt = Date.now()
    saveStaging()
    return { record, schedules: items }
  }

  async function updateStaging(id, jobsPatch) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以编辑')
    if (!Array.isArray(jobsPatch)) throw new Error('jobs 参数不正确')
    for (let index = 0; index < record.jobs.length; index += 1) {
      const patch = jobsPatch[index]
      if (!patch) continue
      const job = record.jobs[index]
      const title = fitTitle(sanitizeEmoji(patch.title ?? job.title)) || '分享我的日常'
      const body = sanitizeEmoji(patch.body ?? job.body)
      const tags = (Array.isArray(patch.tags) ? patch.tags : String(patch.tags || '').split(/[,，\s#]+/))
        .map((tag) => sanitizeEmoji(String(tag).replace(/^#/, '').trim()))
        .filter(Boolean)
        .slice(0, 10)
      const titleChanged = title !== job.title
      job.title = title
      job.body = body
      job.tags = tags
      job.risk = checkRisk({ title, body, tags }, riskRules)
      if (titleChanged) {
        const hasCover = job.images?.[0] && path.basename(job.images[0]).startsWith('cover-')
        const originals = hasCover ? job.images.slice(1) : (job.images || [])
        if (originals.length) {
          const coverPath = path.join(stagingDir, record.id, `cover-${index + 1}-${Date.now()}.jpg`)
          const hasNewCover = await runCollage(originals, title, coverPath, job.coverStyle || 'classic', job.series || '', coverExcerpt(job))
          if (hasNewCover) {
            job.images = [coverPath, ...originals]
            job.imageCount = job.images.length
          }
        }
      }
    }
    record.updatedAt = Date.now()
    refreshStagingWarnings(record)
    saveStaging()
    return record
  }

  async function editStagingImages(id, jobIndex, action, payload = {}) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以改图片')
    const job = record.jobs[Number(jobIndex)]
    if (!job) throw new Error('没有这一组')
    const dir = path.join(stagingDir, record.id)
    const current = Array.isArray(job.images) ? job.images.slice() : []
    if (action === 'add') {
      const sources = Array.isArray(payload.images) ? payload.images.filter(Boolean) : []
      if (!sources.length) throw new Error('没有收到新图片')
      const room = 9 - current.length
      if (room <= 0) throw new Error('最多 9 张图片')
      const added = sources.slice(0, room).map((source, index) => saveStagedImage(
        source,
        dir,
        `job-${Number(jobIndex) + 1}-add-${Date.now()}-${index + 1}`,
      ))
      current.push(...added)
    } else if (action === 'remove') {
      const index = Number(payload.index)
      if (!Number.isInteger(index) || index < 0 || index >= current.length) throw new Error('图片位置不正确')
      current.splice(index, 1)
    } else if (action === 'replace') {
      const sources = Array.isArray(payload.images) ? payload.images.filter(Boolean) : []
      if (!sources.length) throw new Error('没有收到新图片')
      current.length = 0
      const added = sources.slice(0, 9).map((source, index) => saveStagedImage(
        source,
        dir,
        `job-${Number(jobIndex) + 1}-replace-${Date.now()}-${index + 1}`,
      ))
      current.push(...added)
    } else {
      throw new Error('图片操作不正确')
    }
    const hasCoverNow = current[0] && path.basename(current[0]).startsWith('cover-')
    const originals = hasCoverNow ? current.slice(1) : current
    if (!originals.length) throw new Error('至少保留一张原图')
    const coverPath = path.join(dir, `cover-${Number(jobIndex) + 1}-${Date.now()}.jpg`)
    const hasNewCover = await runCollage(originals, job.title, coverPath, job.coverStyle || 'classic', job.series || '', coverExcerpt(job))
    job.images = hasNewCover ? [coverPath, ...originals] : originals
    job.imageCount = job.images.length
    record.updatedAt = Date.now()
    refreshStagingWarnings(record)
    saveStaging()
    return record
  }

  function updateStagingAccount(id, jobIndex, account) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以改账号')
    const job = record.jobs[Number(jobIndex)]
    if (!job) throw new Error('没有这一组')
    const name = String(account || '').trim()
    if (!name) throw new Error('账号不能为空')
    job.account = name
    job.nickname = accountRegistry.accounts[name]?.nickname || ''
    record.updatedAt = Date.now()
    refreshStagingWarnings(record)
    saveStaging()
    return record
  }

  async function updateStagingCoverStyle(id, jobIndex, style) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只有待审核的记录可以换拼图模板')
    const job = record.jobs[Number(jobIndex)]
    if (!job) throw new Error('没有这一组')
    const nextStyle = ['classic', 'warm', 'magazine', 'minimal', 'film', 'festive'].includes(style) ? style : 'classic'
    const hasCover = job.images?.[0] && path.basename(job.images[0]).startsWith('cover-')
    const originals = hasCover ? job.images.slice(1) : (job.images || [])
    if (!originals.length) throw new Error('至少需要一张原图')
    const coverPath = path.join(stagingDir, record.id, `cover-${Number(jobIndex) + 1}-${Date.now()}.jpg`)
    const hasNewCover = await runCollage(originals, job.title, coverPath, nextStyle, job.series || '', coverExcerpt(job))
    if (!hasNewCover) throw new Error('拼图生成失败')
    job.coverStyle = nextStyle
    job.images = [coverPath, ...originals]
    job.imageCount = job.images.length
    record.updatedAt = Date.now()
    saveStaging()
    return record
  }

  function cancelSchedulesForStaging(id, jobIndex = null) {
    let changed = false
    for (const item of schedules) {
      if (item.status !== 'pending') continue
      const hit = (item.jobs || []).some((job) => job.stagingId === id && (jobIndex === null || Number(job.stagingJobIndex) === Number(jobIndex)))
      if (!hit) continue
      item.status = 'cancelled'
      item.finishedAt = Date.now()
      item.error = '待审核任务已取消'
      changed = true
    }
    if (changed) {
      saveSchedules()
      armSchedules()
    }
  }

  function cancelStaging(id, jobIndex = null) {
    const record = staging.find((item) => item.id === id)
    if (!record) throw new Error('没有这个待审核任务')
    if (record.status !== 'pending') throw new Error('只能取消待审核的任务')
    cancelSchedulesForStaging(id, jobIndex)
    if (jobIndex === null || jobIndex === undefined) {
      record.status = 'cancelled'
      record.finishedAt = Date.now()
      saveStaging()
      return record
    }
    const index = Number(jobIndex)
    const job = record.jobs[index]
    if (!job) throw new Error('没有这一组')
    if (job.publishedAt) throw new Error('这一组已经发布过了')
    record.jobs.splice(index, 1)
    if (!record.jobs.length) {
      record.status = 'cancelled'
      record.finishedAt = Date.now()
    }
    let shifted = false
    for (const item of schedules) {
      if (item.status !== 'pending') continue
      for (const scheduledJob of item.jobs || []) {
        if (scheduledJob.stagingId === id && Number(scheduledJob.stagingJobIndex) > index) {
          scheduledJob.stagingJobIndex = Number(scheduledJob.stagingJobIndex) - 1
          shifted = true
        }
      }
    }
    if (shifted) {
      saveSchedules()
      armSchedules()
    }
    record.updatedAt = Date.now()
    saveStaging()
    return record
  }

  function deleteStaging(id) {
    const index = staging.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('没有这个审核记录')
    const record = staging[index]
    if (record.status === 'pending' || record.status === 'publishing') {
      throw new Error('待审核/发布中的任务不能删除')
    }
    cancelSchedulesForStaging(id)
    staging.splice(index, 1)
    saveStaging()
    const before = publishHistory.length
    publishHistory = publishHistory.filter((item) => !record.jobs.some((job) => item.account === job.account && String(item.title || '').trim() === String(job.title || '').trim()))
    if (publishHistory.length !== before) saveHistory()
    try { fs.rmSync(path.join(stagingDir, record.id), { recursive: true, force: true }) } catch {}
    return record
  }

  loadStaging()

  /** 把面板提交的 groups（图片是 data URL）落盘成文件任务。 */
  function groupJobsFromPayload(groups) {
    if (!Array.isArray(groups) || !groups.length) throw new Error('groups 不能为空')
    return groups.map((group, index) => {
      const images = Array.isArray(group?.images) ? group.images.filter(Boolean).slice(0, 9) : []
      if (!images.length) throw new Error(`第 ${index + 1} 组没有图片`)
      return {
        account: String(group.account || state.account || 'default'),
        images: images.map((dataUrl, imageIndex) => saveDataUrl(dataUrl, index * 10 + imageIndex)),
        title: group.title,
        body: group.body,
        tags: group.tags,
        prompt: group.prompt,
        series: group.series,
      }
    })
  }

  // ---------------------------------------------------------------- HTTP 接口

  function sendJson(res, status, payload) {
    const body = JSON.stringify(payload)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(body)
  }

  function readJson(req, limit = 80 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0
      const chunks = []
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > limit) { reject(new Error('请求体过大')); req.destroy(); return }
        chunks.push(chunk)
      })
      req.on('end', () => {
        if (!chunks.length) return resolve({})
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (error) { reject(new Error('请求 JSON 无效: ' + error.message)) }
      })
      req.on('error', reject)
    })
  }

  function sameOrigin(req) {
    const origin = req.headers.origin
    if (!origin) return true
    try {
      return new URL(origin).host === req.headers.host
    } catch { return false }
  }

  async function handleApi(req, res, url) {
    const route = url.pathname.slice(ROUTE.length) || '/'
    const method = req.method || 'GET'

    if (route === '/screenshot') {
      try {
        const buffer = await screenshotBuffer()
        res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
        res.end(buffer)
      } catch (error) {
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
      }
      return
    }

    if (route === '/qr') {
      try {
        const current = await page()
        const box = await current.eval(`(() => {
          const el = document.querySelector('.qrcode-img, [class*="qrcode"] img, canvas[class*="qr"]');
          if (!el) return '';
          const r = el.getBoundingClientRect();
          if (r.width < 80 || r.height < 80) return '';
          return JSON.stringify({ x: r.x, y: r.y, width: r.width, height: r.height });
        })()`)
        if (box) {
          // 用整页截图在页面里裁剪放大：取到的就是用户在面板里看到的像素，并补上一圈白边。
          invalidateShot()
          const full = await current.screenshot()
          const dataUrl = await current.eval(`(async () => {
            const rect = ${box};
            const img = new Image();
            img.src = 'data:image/png;base64,${full.toString('base64')}';
            await img.decode();
            const pad = 20;
            const scale = 3;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round((rect.width + pad * 2) * scale);
            canvas.height = Math.round((rect.height + pad * 2) * scale);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              img,
              rect.x - pad, rect.y - pad, rect.width + pad * 2, rect.height + pad * 2,
              0, 0, canvas.width, canvas.height,
            );
            return canvas.toDataURL('image/png');
          })()`)
          if (String(dataUrl || '').startsWith('data:image/')) {
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
            res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
            res.end(Buffer.from(base64, 'base64'))
            return
          }
        }
        // 兜底：元素自身就是 data URL
        const src = await current.eval(`(() => {
          const el = document.querySelector('.qrcode-img, [class*="qrcode"] img');
          if (!el) return '';
          return el.currentSrc || el.src || '';
        })()`)
        if (String(src).startsWith('data:image/')) {
          const base64 = src.slice(src.indexOf(',') + 1)
          res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' })
          res.end(Buffer.from(base64, 'base64'))
          return
        }
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
      } catch (error) {
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
      }
      return
    }

    if (route === '/risk/config') {
      return sendJson(res, 200, { ok: true, config: riskSettings(), raw: riskConfig })
    }

    if (route === '/status') {      if (!state.login.loggedIn && state.browserPhase === 'ready' && !state.busy) {
        try { await readLogin() } catch {}
      }
      sendJson(res, 200, {
        ok: true,
        browser: state.browserPhase,
        loggedIn: state.login.loggedIn,
        nickname: state.login.nickname,
        account: state.account,
        defaultAccount: accountRegistry.defaultAccount || 'default',
        accounts: Object.keys(accountRegistry.accounts),
        accountsInfo: Object.entries(accountRegistry.accounts)
          .map(([name, info]) => ({
            name,
            nickname: info.nickname || '',
            lastUsedAt: info.at || 0,
            profileDir: info.profileDir || '',
            current: name === state.account,
          }))
          .sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0) || (b.lastUsedAt - a.lastUsedAt)),
        busy: state.busy,
        draft: Boolean(state.draft),
        published: state.lastPublish?.published || false,
        lastAction: state.lastAction,
        error: state.lastError,
      })
      return
    }

    if (route === '/library') {
      return sendJson(res, 200, { ok: true, prompts: library.prompts, notes: library.notes })
    }

    if (route === '/group/templates') {
      return sendJson(res, 200, { ok: true, ...groupTemplates })
    }

    if (route === '/group/today') {
      return sendJson(res, 200, { ok: true, session: loadGroupSession() })
    }

    if (route === '/local/file') {
      const file = String(new URL(req.url, 'http://127.0.0.1').searchParams.get('path') || '')
      if (!file || !fs.existsSync(file) || !/\.(jpe?g|png|webp)$/i.test(file)) {
        return sendJson(res, 404, { ok: false, error: '图片不存在' })
      }
      const buffer = fs.readFileSync(file)
      res.writeHead(200, {
        'content-type': /\.png$/i.test(file) ? 'image/png' : 'image/jpeg',
        'cache-control': 'no-store',
      })
      res.end(buffer)
      return
    }

    if (route === '/publish/history') {
      return sendJson(res, 200, { ok: true, items: publishHistory })
    }

    if (route === '/schedule') {
      return sendJson(res, 200, { ok: true, items: listSchedules() })
    }

    if (route === '/staging') {
      return sendJson(res, 200, { ok: true, items: listStaging() })
    }

    if (route === '/prompts') {
      const defaultItem = promptLibrary.find((item) => item.isDefault) || promptLibrary[0] || null
      return sendJson(res, 200, { ok: true, items: promptLibrary, defaultId: defaultItem?.id || '' })
    }

    if (route === '/staging/image' && method === 'GET') {
      const id = url.searchParams.get('id')
      const jobIndex = Number(url.searchParams.get('job'))
      const imageIndex = Number(url.searchParams.get('index'))
      const record = staging.find((item) => item.id === id)
      const file = record?.jobs?.[jobIndex]?.images?.[imageIndex]
      const root = path.resolve(stagingDir) + path.sep
      if (!file || !path.resolve(file).startsWith(root)) {
        res.writeHead(404)
        res.end()
        return
      }
      const ext = path.extname(file).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
      res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' })
      fs.createReadStream(file).pipe(res)
      return
    }

    if (route === '/risk/words' && method === 'GET') {
      return sendJson(res, 200, { ok: true, rules: riskRules, text: rulesToText(riskRules) })
    }

    if (method !== 'POST') return sendJson(res, 405, { ok: false, error: '只支持 POST' })
    if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, error: '跨站请求被拒绝' })

    const body = await readJson(req)
    switch (route) {
      case '/login/start': {
        const account = String(body.account || state.account || 'default')
        const info = await exclusive('打开登录页', async () => {
          const login = await openLogin(account)
          return { login, browser: state.browserPhase, account }
        })
        return sendJson(res, 200, { ok: true, ...info })
      }
      case '/login/check': {
        const login = await exclusive('检查登录', async () => {
          const current = await page()
          const probe = await probeCreatorLogin(current)
          if (probe.loggedIn) {
            const accountKey = state.account || 'default'
            const login = await confirmDetectedLogin(current, accountKey)
            invalidateShot()
            return login
          }
          await current.goto(ORIGIN + '/explore', 2600)
          return await readLogin(true)
        })
        return sendJson(res, 200, { ok: true, ...login })
      }
      case '/login/sms/send': {
        if (!body.phone) return sendJson(res, 400, { ok: false, error: '请填写手机号' })
        await exclusive('发送验证码', async () => { await smsSend(String(body.phone)) })
        invalidateShot()
        return sendJson(res, 200, { ok: true })
      }
      case '/login/sms/submit': {
        if (!body.phone || !body.code) return sendJson(res, 400, { ok: false, error: '请填写手机号和验证码' })
        const login = await exclusive('验证码登录', async () => await smsSubmit(String(body.phone), String(body.code)))
        return sendJson(res, 200, { ok: true, ...login })
      }
      case '/accounts/check': {
        const result = await exclusive('检测全部账号', async () => {
          const original = state.account || 'default'
          const names = Object.keys(accountRegistry.accounts)
          if (!names.includes(original)) names.unshift(original)
          const accounts = []
          for (const name of names) {
            try {
              const current = await page(name)
              const probe = await probeCreatorLogin(current)
              const nickname = (accountRegistry.accounts[name] && accountRegistry.accounts[name].nickname) || ''
              if (probe.loggedIn && nickname) rememberAccount(name, nickname)
              accounts.push({ account: name, nickname, loggedIn: Boolean(probe.loggedIn), checkedAt: Date.now() })
            } catch (error) {
              accounts.push({ account: name, nickname: '', loggedIn: false, error: error.message || String(error), checkedAt: Date.now() })
            }
          }
          try {
            const current = await page(original)
            const probe = await probeCreatorLogin(current)
            const nickname = (accountRegistry.accounts[original] && accountRegistry.accounts[original].nickname) || ''
            state.login = probe.loggedIn ? { loggedIn: true, nickname } : { loggedIn: false, nickname: '' }
          } catch {}
          invalidateShot()
          return { accounts, current: original }
        })
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/accounts/default': {
        const result = setDefaultAccount(String(body.account || ''))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/group/templates': {
        if (body.defaultId && groupTemplates.templates.some((item) => item.id === body.defaultId)) {
          groupTemplates.defaultId = body.defaultId
          saveGroupTemplates()
        }
        return sendJson(res, 200, { ok: true, ...groupTemplates })
      }
      case '/group/run': {
        const template = groupTemplateById(String(body.template || groupTemplates.defaultId))
        const result = await exclusive('本地分组', async () => await runLocalGroup(
          String(body.folder || ''),
          template,
          Number(body.postsPerGroup) || 1,
          Number(body.perPost) || null,
        ))
        saveGroupSession(result)
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/group/clear': {
        clearGroupSession()
        return sendJson(res, 200, { ok: true })
      }
      case '/group/session': {
        const session = loadGroupSession()
        if (!session) throw new Error('今天还没有分组结果')
        const posts = Array.isArray(body.posts) ? body.posts : session.posts
        const next = { ...session, posts }
        saveGroupSession(next)
        return sendJson(res, 200, { ok: true, session: next })
      }
      case '/client-error': {
        try {
          const line = new Date().toISOString() + ' ' + JSON.stringify(body) + '\n'
          fs.appendFileSync(path.join(dataDir, 'client-errors.log'), line, 'utf8')
        } catch {}
        return sendJson(res, 200, { ok: true })
      }
      case '/group/preview': {
        const record = await exclusive('预览分组效果', async () => await stageLocalGroup(body.posts || [], { preview: true, noCover: true }))
        localGroupPreview = record
        return sendJson(res, 200, { ok: true, record })
      }
      case '/group/commit': {
        if (!localGroupPreview || localGroupPreview.id !== String(body.id || '')) {
          throw new Error('预览已失效，请重新预览')
        }
        const record = localGroupPreview
        record.status = 'pending'
        delete record.preview
        staging.unshift(record)
        if (staging.length > 30) staging.length = 30
        saveStaging()
        localGroupPreview = null
        return sendJson(res, 200, { ok: true, record })
      }
      case '/group/export': {
        const posts = Array.isArray(body.posts) ? body.posts : []
        if (!posts.length) throw new Error('没有可导出的分组')
        const base = String(body.baseFolder || body.folder || '').trim()
        if (!base) throw new Error('请填写导出根目录')
        const mode = body.mode === 'move' ? 'move' : 'copy'
        const safe = (value) => String(value || '未分组').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
        const root = path.join(base, '_分组结果')
        fs.mkdirSync(root, { recursive: true })
        const counters = {}
        const exported = []
        for (const post of posts) {
          const product = post.product || '未分组'
          counters[product] = (counters[product] || 0) + 1
          const folder = path.join(root, safe(product), '组' + String(counters[product]).padStart(2, '0'))
          fs.mkdirSync(folder, { recursive: true })
          const images = []
          for (const source of Array.isArray(post.images) ? post.images : []) {
            if (!source || !fs.existsSync(source)) continue
            if (/[\\/]预览\.jpg$/i.test(source) || /[\\/]cover-[^\\/]+\.(jpe?g|png)$/i.test(source)) continue
            const dest = path.join(folder, path.basename(source))
            if (mode === 'move') {
              try { fs.renameSync(source, dest) } catch { fs.copyFileSync(source, dest); try { fs.unlinkSync(source) } catch {} }
            } else {
              fs.copyFileSync(source, dest)
            }
            images.push(dest)
          }
          if (post.sheet && fs.existsSync(post.sheet)) {
            try { fs.copyFileSync(post.sheet, path.join(folder, '预览.jpg')) } catch {}
          }
          const item = { ...post, images, folder, groupNo: counters[product] }
          fs.writeFileSync(path.join(folder, 'post.json'), JSON.stringify(item, null, 2), 'utf8')
          exported.push(item)
        }
        const session = loadGroupSession()
        if (session) saveGroupSession({ ...session, posts: exported, baseFolder: root })
        return sendJson(res, 200, { ok: true, mode, baseFolder: root, posts: exported })
      }
      case '/group/stage': {
        const record = await exclusive('本组放入审核', async () => await stageLocalGroup(body.posts || [], { noCover: true }))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/accounts/delete': {
        const result = await deleteAccount(String(body.account || ''))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/logout': {
        await exclusive('退出登录', async () => {
          await page()
          await state.page.send('Network.clearBrowserCookies')
          state.login = { loggedIn: false, nickname: '' }
          state.baselineSession = ''
        })
        invalidateShot()
        return sendJson(res, 200, { ok: true })
      }
      case '/generate': {
        const result = await exclusive('生成文案', async () => await generateCopy(
          String(body.prompt || '').trim() || '分享我的日常',
          Number(body.imageCount) || 1,
          String(body.series || body.tone || '').trim(),
        ))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/risk/check': {
        const result = checkRisk({
          title: String(body.title || ''),
          body: String(body.body || ''),
          tags: Array.isArray(body.tags) ? body.tags : [],
        }, riskRules)
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/risk/words': {
        if (body.text !== undefined) {
          const rules = parseRulesText(body.text)
          if (!rules.length) return sendJson(res, 400, { ok: false, error: '词库内容不能为空，格式：等级|类别|词|建议' })
          riskRules = rules
          saveRiskRules()
          return sendJson(res, 200, { ok: true, rules: riskRules, text: rulesToText(riskRules) })
        }
        return sendJson(res, 200, { ok: true, rules: riskRules, text: rulesToText(riskRules) })
      }
      case '/risk/config': {
        const incoming = body.config && typeof body.config === 'object' ? body.config : body
        riskConfig = { ...riskConfig, ...incoming }
        riskConfig.manualOnly = incoming.manualOnly !== false
        saveRiskConfig()
        return sendJson(res, 200, { ok: true, config: riskSettings() })
      }
      case '/generate/batch': {
        const result = await exclusive('生成多组文案', async () => {
          let template = String(body.template || '')
          let keywords = Array.isArray(body.keywords) ? body.keywords : []
          if (body.promptId) {
            const stored = library.prompts.find((item) => item.id === body.promptId)
            if (stored) {
              if (!template) template = stored.template
              if (!keywords.length) keywords = stored.keywords || []
            }
          }
          return await generateBatch({
            template,
            count: body.count,
            focus: body.focus,
            extra: body.extra,
            keywords,
            avoid: Array.isArray(body.avoid) ? body.avoid : [],
          })
        })
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/library/prompt': {
        const existing = library.prompts.find((item) => item.id === body.id)
        const prompt = {
          id: existing?.id || libraryId('p'),
          name: String(body.name || '未命名模板').trim().slice(0, 60),
          template: String(body.template || '').trim(),
          keywords: (Array.isArray(body.keywords) ? body.keywords : []).map((keyword) => String(keyword).trim()).filter(Boolean).slice(0, 20),
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        }
        if (!prompt.template) return sendJson(res, 400, { ok: false, error: '模板内容不能为空' })
        library.prompts = existing
          ? library.prompts.map((item) => (item.id === prompt.id ? prompt : item))
          : [prompt, ...library.prompts]
        saveLibrary()
        return sendJson(res, 200, { ok: true, prompt })
      }
      case '/library/prompt/delete': {
        library.prompts = library.prompts.filter((item) => item.id !== body.id)
        saveLibrary()
        return sendJson(res, 200, { ok: true })
      }
      case '/library/note': {
        const note = {
          id: libraryId('n'),
          promptId: String(body.promptId || ''),
          promptName: String(body.promptName || ''),
          title: String(body.title || '').trim().slice(0, 40),
          body: String(body.body || '').trim(),
          tags: (Array.isArray(body.tags) ? body.tags : []).map((tag) => String(tag).replace(/^#+/, '').trim()).filter(Boolean).slice(0, 10),
          createdAt: Date.now(),
        }
        if (!note.title || !note.body) return sendJson(res, 400, { ok: false, error: '标题和正文不能为空' })
        library.notes.unshift(note)
        if (library.notes.length > 200) library.notes.length = 200
        saveLibrary()
        return sendJson(res, 200, { ok: true, note })
      }
      case '/library/note/delete': {
        library.notes = library.notes.filter((item) => item.id !== body.id)
        saveLibrary()
        return sendJson(res, 200, { ok: true })
      }
      case '/publish/history/delete': {
        publishHistory = publishHistory.filter((item) => item.id !== body.id)
        saveHistory()
        return sendJson(res, 200, { ok: true })
      }
      case '/publish/draft': {
        const result = await exclusive('填入发布页', async () => await fillPublish(body, String(body.account || state.account || 'default')))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/publish/submit': {
        const result = await exclusive('发布笔记', async () => await submitPublish(String(body.account || state.account || 'default')))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/publish/agent': {
        if (body.publish !== false) assertManualPublishAllowed()
        const result = await exclusive('聊天发布', async () => await publishJob(body))
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/publish/agent-batch': {
        const jobs = Array.isArray(body.jobs) ? body.jobs : []
        if (!jobs.length) return sendJson(res, 400, { ok: false, error: 'jobs 不能为空' })
        const results = await exclusive('批量发布', async () => await runBatchJobs(jobs, body.loginTimeoutMs))
        return sendJson(res, 200, { ok: results.every((item) => item.ok), results })
      }
      case '/publish/groups': {
        const jobs = groupJobsFromPayload(body.groups).map((job) => ({ ...job, publish: body.publish !== false }))
        const results = await exclusive('分组发布', async () => await runBatchJobs(jobs))
        return sendJson(res, 200, { ok: results.every((item) => item.ok), results })
      }
      case '/schedule/groups': {
        const jobs = groupJobsFromPayload(body.groups)
        const schedule = createSchedule({ at: body.at, jobs, loginTimeoutMs: body.loginTimeoutMs })
        return sendJson(res, 200, { ok: true, schedule })
      }
      case '/staging/publish': {
        if (body.job !== undefined && body.job !== null) {
          const result = await publishStagingJob(String(body.id || ''), body.job)
          return sendJson(res, 200, { ok: true, ...result })
        }
        if (body.mode === 'stagger') {
          const result = scheduleStagingStaggered(String(body.id || ''))
          return sendJson(res, 200, { ok: true, ...result })
        }
        const record = await publishStaging(String(body.id || ''))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/cancel': {
        const record = cancelStaging(String(body.id || ''), body.job === undefined || body.job === null ? null : Number(body.job))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/schedule': {
        const id = String(body.id || '')
        const jobIndex = Number(body.job)
        const record = staging.find((item) => item.id === id)
        if (!record) throw new Error('没有这个待审核任务')
        if (record.status !== 'pending') throw new Error('只有待审核的记录可以定时')
        const job = record.jobs[jobIndex]
        if (!job) throw new Error('没有这一组')
        if (job.publishedAt) throw new Error('这一组已经发布过了')
        cancelSchedulesForStaging(id, jobIndex)
        const schedule = createSchedule({
          at: body.at,
          jobs: [{ ...job, stagingId: id, stagingJobIndex: jobIndex }],
          loginTimeoutMs: record.loginTimeoutMs,
          explicit: true,
        })
        job.scheduleId = schedule.id
        job.scheduledAt = schedule.at
        record.updatedAt = Date.now()
        saveStaging()
        return sendJson(res, 200, { ok: true, record, schedule })
      }
      case '/staging/delete': {
        const record = deleteStaging(String(body.id || ''))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/update': {
        const record = await updateStaging(String(body.id || ''), Array.isArray(body.jobs) ? body.jobs : [])
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/account': {
        const record = updateStagingAccount(String(body.id || ''), Number(body.job), String(body.account || ''))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/cover': {
        const record = await updateStagingCoverStyle(String(body.id || ''), Number(body.job), String(body.style || 'classic'))
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/plain': {
        const record = staging.find((item) => item.id === String(body.id || ''))
        if (!record) throw new Error('没有这个待审核任务')
        const target = Number(body.job)
        const jobs = Number.isInteger(target) && record.jobs[target] ? [record.jobs[target]] : record.jobs
        for (const job of jobs) {
          if (job.images?.[0] && /[\\/]cover-[^\\/]+\.(jpe?g|png)$/i.test(job.images[0])) job.images.shift()
          job.images = (job.images || []).filter((image) => !/[\\/]预览\.jpg$/i.test(image))
          job.coverStyle = ''
          job.imageCount = job.images.length
        }
        record.updatedAt = Date.now()
        saveStaging()
        return sendJson(res, 200, { ok: true, record })
      }
      case '/staging/image': {
        const record = await editStagingImages(String(body.id || ''), Number(body.job), String(body.action || ''), body)
        return sendJson(res, 200, { ok: true, record })
      }
      case '/prompts': {
        const action = String(body.action || 'save')
        if (action === 'delete') {
          promptLibrary = promptLibrary.filter((item) => item.id !== body.id)
          if (!promptLibrary.length) {
            promptLibrary = [{
              id: 'p-default',
              name: '默认提示词',
              content: '分享这组图片，写一篇自然的小红书笔记',
              isDefault: true,
              updatedAt: Date.now(),
            }]
          } else if (!promptLibrary.some((item) => item.isDefault)) {
            promptLibrary[0].isDefault = true
          }
          savePrompts()
          return sendJson(res, 200, { ok: true, items: promptLibrary })
        }
        if (action === 'default') {
          for (const item of promptLibrary) item.isDefault = item.id === body.id
          if (!promptLibrary.some((item) => item.isDefault) && promptLibrary[0]) promptLibrary[0].isDefault = true
          savePrompts()
          return sendJson(res, 200, { ok: true, items: promptLibrary })
        }
        const source = body.prompt || {}
        const content = String(source.content || '').trim()
        if (!content) return sendJson(res, 400, { ok: false, error: '提示词内容不能为空' })
        const name = String(source.name || '未命名提示词').trim().slice(0, 40) || '未命名提示词'
        const isDefault = Boolean(source.isDefault)
        let item = source.id ? promptLibrary.find((entry) => entry.id === source.id) : null
        if (!item) {
          item = {
            id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
            name,
            content,
            isDefault,
            updatedAt: Date.now(),
          }
          promptLibrary.push(item)
        } else {
          item.name = name
          item.content = content
          item.isDefault = isDefault
          item.updatedAt = Date.now()
        }
        if (isDefault) for (const entry of promptLibrary) entry.isDefault = entry.id === item.id
        if (!promptLibrary.some((entry) => entry.isDefault)) promptLibrary[0].isDefault = true
        savePrompts()
        return sendJson(res, 200, { ok: true, items: promptLibrary, item })
      }
      case '/schedule/create': {
        const schedule = createSchedule({ at: body.at, jobs: body.jobs, loginTimeoutMs: body.loginTimeoutMs })
        return sendJson(res, 200, { ok: true, schedule })
      }
      case '/schedule/cancel': {
        const schedule = cancelSchedule(String(body.id || ''))
        return sendJson(res, 200, { ok: true, schedule })
      }
      case '/schedule/delete': {
        const schedule = deleteSchedule(String(body.id || ''))
        return sendJson(res, 200, { ok: true, schedule })
      }
      case '/browser/close': {
        await exclusive('关闭浏览器', async () => { await stopBrowser() })
        return sendJson(res, 200, { ok: true })
      }
      case '/browser/show': {
        const result = await exclusive('显示浏览器窗口', async () => {
          await page()
          return await setBrowserWindow(true)
        })
        return sendJson(res, 200, { ok: true, ...result })
      }
      case '/browser/hide': {
        const result = await exclusive('隐藏浏览器窗口', async () => {
          await page()
          return await setBrowserWindow(false)
        })
        return sendJson(res, 200, { ok: true, ...result })
      }
      default:
        return sendJson(res, 404, { ok: false, error: '未知接口 ' + route })
    }
  }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'prefix',
      path: ROUTE,
      handler: (req, res) => {
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        handleApi(req, res, url).catch((error) => {
          state.lastError = error?.message || String(error)
          log('接口错误', error)
          if (!res.headersSent) sendJson(res, 500, { ok: false, error: state.lastError, code: error?.code })
          else try { res.end() } catch {}
        })
      },
    })
    return () => {
      dispose()
      stopBrowser()
    }
  }, 'xhs-publisher: routes')

  const toolsService = typeof ctx.get === 'function' ? ctx.get('tools') : undefined
  if (toolsService && typeof toolsService.register === 'function') {
    const toolOutput = {
      schema: { type: 'object', additionalProperties: true },
      render: (args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    }
    const jobProperties = {
      account: { type: 'string', description: '账号名称，默认当前账号（上次使用的账号）。新账号首次使用会在右侧打开登录页等待扫码。' },
      images: { type: 'array', items: { type: 'string' }, description: '本地图片绝对路径，1-9 张，第一张作为封面。' },
      title: { type: 'string', description: '标题；不填时用 prompt 生成。' },
      body: { type: 'string', description: '正文；不填时用 prompt 生成。' },
      tags: { type: 'array', items: { type: 'string' }, description: '话题标签，不带 #，最多 10 个。' },
      prompt: { type: 'string', description: '没给标题/正文时，用这段提示词生成文案。' },
      series: { type: 'string', description: '套系名称，例如 利川红。' },
      publish: { type: 'boolean', description: '是否真正发布，默认 true；false 只填入发布页。' },
    }
    const jobItemSchema = {
      type: 'object',
      properties: jobProperties,
      required: ['images'],
      additionalProperties: false,
    }
    ctx.effect(() => {
      const disposers = []
      disposers.push(toolsService.register({
        name: 'xhs_publish',
        description: '把本地图片发布成一条小红书图文笔记，自动在右侧边栏浏览器里操作，用户可以看到但不用动手。images 传本地图片绝对路径（1-9 张，第一张当封面）；只给 prompt 会先生成标题/正文/标签。account 可指定账号，默认当前账号；新账号首次使用会自动打开登录页等待扫码。publish=false 时只填发布页不点发布。',
        parameters: {
          type: 'object',
          properties: jobProperties,
          required: ['images'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 900000,
        async execute(args) {
          if (args?.publish !== false) assertManualPublishAllowed()
          return await exclusive('聊天发布', async () => await publishJob(args || {}))
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_login',
        description: '打开指定小红书账号的登录页并等待扫码/登录。account 是账号名；新账号会自动创建独立 profile（~/.dsh-xhs/accounts/<账号名>），不同账号互不影响。wait=false 只打开登录页立即返回；wait=true 等待扫码完成。showWindow=true 会把浏览器窗口显示出来方便扫码。',
        parameters: {
          type: 'object',
          properties: {
            account: { type: 'string', description: '账号名称，例如 账号B。' },
            wait: { type: 'boolean', description: '是否等待扫码完成，默认 true。' },
            timeoutMs: { type: 'number', description: '等待超时，默认 180000 毫秒。' },
            showWindow: { type: 'boolean', description: '是否把浏览器窗口显示出来，默认 true。' },
          },
          required: ['account'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 300000,
        async execute(args) {
          const account = String(args?.account || 'default')
          const wait = args?.wait !== false
          return await exclusive('账号登录', async () => {
            await page(account)
            if (args?.showWindow !== false) {
              try { await setBrowserWindow(true) } catch {}
            }
            if (!wait) {
              const login = await openLogin(account)
              return { account, opened: true, loggedIn: Boolean(login.loggedIn), nickname: login.nickname || '' }
            }
            const login = await ensureLogin(account, args?.timeoutMs)
            return { account, opened: true, loggedIn: true, nickname: login.nickname || '' }
          })
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_accounts',
        description: '列出已保存的小红书账号：账号名、昵称、最后使用时间、profile 目录和当前账号。用于长期记忆和多账号发布前确认账号。',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
        output: toolOutput,
        async execute() {
          return {
            current: state.account,
            loggedIn: state.login.loggedIn,
            nickname: state.login.nickname,
            accounts: Object.entries(accountRegistry.accounts)
              .map(([name, info]) => ({
                name,
                nickname: info.nickname || '',
                lastUsedAt: info.at || 0,
                profileDir: info.profileDir || '',
              }))
              .sort((a, b) => b.lastUsedAt - a.lastUsedAt),
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_group_images',
        description: '扫描图片根目录并按账号分组：子文件夹名当作账号名（例如 default/、账号B/）；没有子文件夹时按文件名里包含的已知账号名分组。返回每组账号、图片数量和路径，可直接交给 xhs_batch_publish 或 xhs_schedule_publish 的 groups。',
        parameters: {
          type: 'object',
          properties: {
            root: { type: 'string', description: '图片根目录；子文件夹名就是账号名。' },
          },
          required: ['root'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 30000,
        async execute(args) {
          const result = scanImageGroups(args?.root)
          return {
            ok: true,
            root: result.root,
            groups: result.groups.map((group) => ({
              account: group.account,
              folder: group.folder,
              count: group.images.length,
              images: group.images,
            })),
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_local_group_images',
        description: '本地商品图自动分组与选图：扫描本地文件夹，优先 OCR 识别包装产品名（利川红/恩施玉露/楚汉茶礼/来凤藤茶），识别不出的归入未识别不硬塞；再按「分组模板」在产品组内去重并选 4-5 张不同角度的图，返回可直接发帖的图片组合和缩略图。全部本地完成，不调用云端。',
        parameters: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: '本地图片文件夹绝对路径，例如 C:\\Users\\23529\\Desktop\\photo\\10.13茶叶。' },
            template: { type: 'string', description: '分组模板 id，默认用侧边栏保存的模板。' },
            postsPerGroup: { type: 'number', description: '每个产品组生成几组帖子，默认 1。' },
            perPost: { type: 'number', description: '每组帖子几张图；不填用模板的 4 或 5。' },
          },
          required: ['folder'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 1800000,
        async execute(args) {
          const folder = String(args?.folder || '').trim()
          if (!folder) throw new Error('请填写本地文件夹路径')
          const template = groupTemplateById(String(args?.template || groupTemplates.defaultId))
          const postsPerGroup = Math.max(1, Math.min(20, Number(args?.postsPerGroup) || 1))
          const perPost = Math.max(3, Math.min(5, Number(args?.perPost) || template.perPost || 4))
          const out = path.join(dataDir, 'local-groups', 'group-' + Date.now())
          fs.mkdirSync(out, { recursive: true })
          const run = (command, commandArgs, timeout) => new Promise((resolve, reject) => {
            execFile(command, commandArgs, { timeout, windowsHide: true }, (error, stdout, stderr) => {
              if (error) {
                reject(new Error(String(stderr || error.message).slice(-800)))
                return
              }
              resolve(stdout)
            })
          })
          await run('python', [GROUP_SCRIPT, '--folder', folder, '--out', out], 800000)
          const groupsPath = path.join(out, 'groups.json')
          const selectedOut = path.join(out, 'selected')
          await run('python', [
            SELECT_SCRIPT,
            '--groups', groupsPath,
            '--out', selectedOut,
            '--per-post', String(perPost),
            '--posts-per-group', String(postsPerGroup),
            '--min-hash-distance', String(template.minHashDistance ?? 8),
            '--strategy', String(template.strategy || 'cluster'),
            '--roles', (template.roles || ['封面', '包装', '手提', '细节']).join(','),
          ], 600000)
          const result = JSON.parse(fs.readFileSync(groupsPath, 'utf8'))
          const selected = JSON.parse(fs.readFileSync(path.join(selectedOut, 'selected.json'), 'utf8'))
          return {
            ok: true,
            folder,
            out,
            template: { id: template.id, name: template.name },
            count: result.count,
            ocr: result.ocr,
            summary: result.summary,
            groups: result.groups.map((group) => ({
              label: group.label,
              count: group.count,
              sheet: group.sheet,
            })),
            posts: selected.posts.map((post) => ({
              product: post.product,
              account: post.account,
              images: post.images,
              sheet: post.sheet,
            })),
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_schedule_publish',
        description: '在指定时间自动发布一条或多条小红书笔记。at 用带时区的 ISO 时间（例如 2026-10-30T10:00:00+08:00），或 delayMinutes；jobs / groups 与 xhs_batch_publish 相同，groups 的每一项就是一个账号的一组图片。图片会在创建时复制保存；到点自动执行，应用需要保持运行。',
        parameters: {
          type: 'object',
          properties: {
            at: { type: 'string', description: '带时区的 ISO 时间，例如 2026-10-30T10:00:00+08:00。' },
            delayMinutes: { type: 'number', description: '多少分钟后发布；和 at 二选一。' },
            jobs: { type: 'array', description: '要发布的笔记任务。', items: jobItemSchema },
            groups: { type: 'array', description: 'jobs 的别名；每一项是一个账号的一组图片。', items: jobItemSchema },
            loginTimeoutMs: { type: 'number', description: '新账号等待扫码的超时时间，默认 180000 毫秒。' },
          },
          required: [],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 60000,
        async execute(args) {
          const jobs = Array.isArray(args?.jobs) && args.jobs.length
            ? args.jobs
            : Array.isArray(args?.groups) ? args.groups : []
          if (!jobs.length) throw new Error('jobs 或 groups 不能为空')
          let time
          if (args?.at) time = new Date(String(args.at))
          else if (Number.isFinite(args?.delayMinutes)) time = new Date(Date.now() + Number(args.delayMinutes) * 60000)
          else throw new Error('请提供 at 或 delayMinutes')
          if (Number.isNaN(time.getTime())) throw new Error('时间格式不正确')
          const item = createSchedule({ at: time, jobs, loginTimeoutMs: args?.loginTimeoutMs })
          return {
            ok: true,
            id: item.id,
            at: item.at,
            atLocal: new Date(item.at).toLocaleString('zh-CN', { hour12: false }),
            jobs: item.jobs.length,
            message: '已加入定时任务',
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_schedules',
        description: '查看、取消或删除定时发布任务。action=list 返回任务、时间、状态和账号；cancel 只能取消未开始的任务；delete 只能删除已结束的任务。',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'cancel', 'delete'], description: 'list / cancel / delete。' },
            id: { type: 'string', description: '取消或删除时传定时任务 id。' },
          },
          required: ['action'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 30000,
        async execute(args) {
          if (args?.action === 'cancel') {
            const item = cancelSchedule(String(args?.id || ''))
            return { ok: true, id: item.id, status: item.status }
          }
          if (args?.action === 'delete') {
            const item = deleteSchedule(String(args?.id || ''))
            return { ok: true, id: item.id, deleted: true, status: item.status }
          }
          return {
            ok: true,
            items: listSchedules().map((item) => ({
              id: item.id,
              at: item.at,
              atLocal: new Date(item.at).toLocaleString('zh-CN', { hour12: false }),
              status: item.status,
              jobs: Array.isArray(item.jobs) ? item.jobs.length : 0,
              accounts: [...new Set((item.jobs || []).map((job) => job.account || 'default'))],
              error: item.error || '',
            })),
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_stage_publish',
        description: '只生成分组文案、把待发布内容暂存到侧边栏「审核」步骤，不碰小红书。jobs / groups 每一项是一组账号 + 图片；可给 prompt / title / body / tags。用户审核确认后再发布。',
        parameters: {
          type: 'object',
          properties: {
            jobs: { type: 'array', description: '要审核的分组任务。', items: jobItemSchema },
            groups: { type: 'array', description: 'jobs 的别名；每一项是一个账号的一组图片。', items: jobItemSchema },
            loginTimeoutMs: { type: 'number', description: '发布时新账号等待扫码的超时时间。' },
          },
          required: [],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 300000,
        async execute(args) {
          const jobs = Array.isArray(args?.jobs) && args.jobs.length
            ? args.jobs
            : Array.isArray(args?.groups) ? args.groups : []
          if (!jobs.length) throw new Error('jobs 或 groups 不能为空')
          const record = await stageGroups(jobs, args?.loginTimeoutMs)
          return {
            ok: true,
            stagingId: record.id,
            groups: record.jobs.map((job) => ({
              account: job.account,
              nickname: job.nickname || '',
              title: job.title,
              imageCount: job.imageCount,
              risk: job.risk,
            })),
            message: '已放到侧边栏「审核」步骤，确认后再发布',
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_staging',
        description: '查看、发布、取消或删除侧边栏审核记录。action=list 返回记录；publish 会真正发布指定 id 的全部分组；cancel 取消待审核；delete 删除已结束的审核记录。',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'publish', 'cancel', 'delete'], description: 'list / publish / cancel / delete。' },
            id: { type: 'string', description: '待审核任务 id。' },
          },
          required: ['action'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 1800000,
        async execute(args) {
          if (args?.action === 'publish') {
            const record = await publishStaging(String(args?.id || ''))
            return { ok: record.status === 'published', id: record.id, status: record.status, results: record.results || [], error: record.error || '' }
          }
          if (args?.action === 'cancel') {
            const record = cancelStaging(String(args?.id || ''))
            return { ok: true, id: record.id, status: record.status }
          }
          if (args?.action === 'delete') {
            const record = deleteStaging(String(args?.id || ''))
            return { ok: true, id: record.id, deleted: true }
          }
          return {
            ok: true,
            items: listStaging().map((record) => ({
              id: record.id,
              status: record.status,
              createdAt: record.createdAt,
              jobs: record.jobs.map((job) => ({ account: job.account, nickname: job.nickname || '', title: job.title, images: job.imageCount })),
              error: record.error || '',
            })),
          }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_prompts',
        description: '管理小红书文案提示词库。action=list 返回所有提示词和默认项；save 新增/修改（prompt: {id?, name, content, isDefault}）；delete 删除；default 设为默认。发布/暂存没有给 prompt 时会用默认提示词生成文案。',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'save', 'delete', 'default'], description: 'list / save / delete / default。' },
            id: { type: 'string', description: '删除或设为默认时的提示词 id。' },
            prompt: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                content: { type: 'string' },
                isDefault: { type: 'boolean' },
              },
              additionalProperties: false,
            },
          },
          required: ['action'],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 30000,
        async execute(args) {
          const action = String(args?.action || 'list')
          if (action === 'delete') {
            promptLibrary = promptLibrary.filter((item) => item.id !== args?.id)
            if (!promptLibrary.length) {
              promptLibrary = [{
                id: 'p-default', name: '默认提示词',
                content: '分享这组图片，写一篇自然的小红书笔记',
                isDefault: true, updatedAt: Date.now(),
              }]
            } else if (!promptLibrary.some((item) => item.isDefault)) {
              promptLibrary[0].isDefault = true
            }
            savePrompts()
          } else if (action === 'default') {
            for (const item of promptLibrary) item.isDefault = item.id === args?.id
            if (!promptLibrary.some((item) => item.isDefault) && promptLibrary[0]) promptLibrary[0].isDefault = true
            savePrompts()
          } else if (action === 'save') {
            const source = args?.prompt || {}
            const content = String(source.content || '').trim()
            if (!content) throw new Error('提示词内容不能为空')
            const name = String(source.name || '未命名提示词').trim().slice(0, 40) || '未命名提示词'
            const isDefault = Boolean(source.isDefault)
            let item = source.id ? promptLibrary.find((entry) => entry.id === source.id) : null
            if (!item) {
              item = {
                id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
                name, content, isDefault, updatedAt: Date.now(),
              }
              promptLibrary.push(item)
            } else {
              item.name = name
              item.content = content
              item.isDefault = isDefault
              item.updatedAt = Date.now()
            }
            if (isDefault) for (const entry of promptLibrary) entry.isDefault = entry.id === item.id
            if (!promptLibrary.some((entry) => entry.isDefault)) promptLibrary[0].isDefault = true
            savePrompts()
          }
          const defaultItem = promptLibrary.find((item) => item.isDefault) || promptLibrary[0] || null
          return { ok: true, items: promptLibrary, defaultId: defaultItem?.id || '' }
        },
      }))
      disposers.push(toolsService.register({
        name: 'xhs_batch_publish',
        description: '批量发布多条小红书笔记，支持多账号。jobs / groups 按顺序执行；同一账号的任务会连续执行，减少换号；切换到新账号时会打开登录页等待扫码。每条 job / group 的字段与 xhs_publish 相同，images 就是这一组要发的图片。返回值逐条给出账号、标题、是否发布、图片数和错误。',
        parameters: {
          type: 'object',
          properties: {
            jobs: { type: 'array', description: '按顺序执行的发布任务。', items: jobItemSchema },
            groups: { type: 'array', description: 'jobs 的别名；每一项是一个账号的一组图片。', items: jobItemSchema },
            loginTimeoutMs: { type: 'number', description: '新账号等待扫码的超时时间，默认 180000 毫秒。' },
          },
          required: [],
          additionalProperties: false,
        },
        output: toolOutput,
        timeoutMs: 1800000,
        async execute(args) {
          const jobs = Array.isArray(args?.jobs) && args.jobs.length
            ? args.jobs
            : Array.isArray(args?.groups) ? args.groups : []
          if (!jobs.length) throw new Error('jobs 或 groups 不能为空')
          return await exclusive('批量发布', async () => {
            const results = await runBatchJobs(jobs, args?.loginTimeoutMs)
            return { ok: results.every((item) => item.ok), results }
          })
        },
      }))
      return () => {
        for (const dispose of disposers) {
          try { dispose() } catch {}
        }
      }
    }, 'xhs-publisher: tools')
  }

  ctx.effect(() => {
    armSchedules()
    return () => {
      if (scheduleTimer) clearTimeout(scheduleTimer)
      scheduleTimer = undefined
    }
  }, 'xhs-publisher: schedules')

  log('已就绪，数据目录', dataDir)
}

