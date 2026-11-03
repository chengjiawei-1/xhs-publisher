/**
 * 小红书文案风控预检：本地规则库，不联网、不上传内容。
 * 返回风险等级、命中词、所在字段和替换建议。
 */

const RULES = [
  {
    level: 'high',
    category: '医疗/功效',
    words: {
      '治疗': '调理/缓解',
      '治愈': '改善',
      '根治': '改善',
      '抗癌': '日常养护',
      '降血压': '日常养护',
      '降血糖': '日常养护',
      '减肥': '身材管理',
      '瘦身': '身材管理',
      '排毒': '代谢',
      '祛痘': '清洁',
      '杀菌': '清洁',
      '增强免疫力': '日常养护',
      '药效': '特点',
      '疗效': '体验',
      '疗程': '使用周期',
      '处方': '配方',
      '医院同款': '同类型',
    },
  },
  {
    level: 'high',
    category: '导流/交易',
    words: {
      '加微信': '评论区交流',
      '加V': '评论区交流',
      '微信号': '评论区',
      '私信我': '评论区聊',
      '私聊': '评论区聊',
      '扫码': '搜索',
      '二维码': '主页',
      '代购': '选购',
      '刷单': '',
      '返现': '优惠',
      '返利': '优惠',
      '点击购买': '主页',
      '下单': '选购',
      '内部价': '活动价',
      '招代理': '合作',
      '站外': '平台内',
      '淘宝': '平台内',
      '拼多多': '平台内',
    },
  },
  {
    level: 'high',
    category: '违法/平台禁词',
    words: {
      '赌博': '',
      '彩票': '',
      '色情': '',
      '毒品': '',
      '迷药': '',
      '枪支': '',
      '代考': '',
      '办证': '',
      '发票': '',
      '套现': '',
      '洗钱': '',
    },
  },
  {
    level: 'medium',
    category: '绝对化用语',
    words: {
      '最好': '更推荐',
      '最佳': '很合适',
      '最强': '很能打',
      '最低': '更划算',
      '最高': '很高',
      '最大': '更大',
      '最美': '很好看',
      '最便宜': '更划算',
      '最划算': '更划算',
      '最正宗': '很地道',
      '全网最低': '性价比高',
      '第一品牌': '热门品牌',
      '排名第一': '排名靠前',
      '销量第一': '销量靠前',
      '全网第一': '热度靠前',
      '唯一': '少见',
      '独家': '少见',
      '国家级': '本地',
      '世界级': '高水准',
      '100%': '很高',
      '百分百': '很高',
      '绝对': '基本',
      '保证': '尽量',
      '永久': '长期',
      '永不': '长期',
      '零风险': '风险较低',
      '万能': '多用',
      '史上': '少见',
      '顶级': '高水准',
      '极致': '很用心',
      '完美': '很满意',
      '纯天然': '自然',
      '无添加': '配方简单',
      '首个': '较早',
      '首家': '较早',
    },
  },
  {
    level: 'medium',
    category: '承诺/夸大',
    words: {
      '无效退款': '售后保障',
      '假一赔十': '正品保障',
      '稳赚': '有机会',
      '躺赚': '轻松一些',
      '月入过万': '收入提升',
      '零门槛': '上手简单',
      '一夜': '短期',
      '立刻见效': '坚持一段时间',
    },
  },
]

const LEVEL_WEIGHT = { high: 25, medium: 12, low: 5 }
const LEVEL_ORDER = { high: 0, medium: 1, low: 2 }

/**
 * 扫描一组文案。
 * @param {{title?: string, body?: string, tags?: string[]}} input
 * @param {Array} rules - 词库规则，默认使用内置词库
 * @returns {{issues: Array, score: number, level: string, checkedAt: number}}
 */
export function checkRisk(input = {}, rules = RULES) {
  const title = String(input.title || '')
  const body = String(input.body || '')
  const tags = Array.isArray(input.tags) ? input.tags : []
  const fields = [
    { name: '标题', text: title },
    { name: '正文', text: body },
    { name: '标签', text: tags.join(' ') },
  ]

  const issues = []
  const seen = new Set()
  for (const rule of rules) {
    for (const [word, suggestion] of Object.entries(rule.words)) {
      if (seen.has(word)) continue
      let count = 0
      const inFields = []
      for (const field of fields) {
        const hits = field.text.split(word).length - 1
        if (hits > 0) {
          count += hits
          inFields.push(field.name)
        }
      }
      if (!count) continue
      seen.add(word)
      issues.push({
        word,
        count,
        category: rule.category,
        level: rule.level,
        suggestion,
        fields: inFields,
      })
    }
  }

  issues.sort((a, b) => (LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]) || (b.count - a.count))
  const score = Math.min(100, issues.reduce((sum, issue) => sum + LEVEL_WEIGHT[issue.level], 0))
  const level = issues.some((issue) => issue.level === 'high')
    ? 'high'
    : score >= 20
      ? 'medium'
      : issues.length
        ? 'low'
        : 'clean'

  return { issues, score, level, checkedAt: Date.now() }
}

export { RULES, RULES as DEFAULT_RULES }

/** 把词库展开成一行一个词，供界面编辑。 */
export function rulesToText(rules = RULES) {
  const lines = []
  for (const rule of rules) {
    for (const [word, suggestion] of Object.entries(rule.words || {})) {
      lines.push(`${rule.level}|${rule.category}|${word}|${suggestion || ''}`)
    }
  }
  return lines.join('\n')
}

/** 解析界面编辑的文本：等级|类别|词|建议。 */
export function parseRulesText(text) {
  const map = new Map()
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length < 3) continue
    let level = parts[0].toLowerCase()
    if (level === '高') level = 'high'
    else if (level === '中') level = 'medium'
    else if (level === '低') level = 'low'
    if (!['high', 'medium', 'low'].includes(level)) continue
    const category = parts[1] || '自定义'
    const word = parts[2]
    const suggestion = parts[3] || ''
    if (!word) continue
    const key = level + '|' + category
    if (!map.has(key)) map.set(key, { level, category, words: {} })
    map.get(key).words[word] = suggestion
  }
  return [...map.values()]
}
