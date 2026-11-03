window.__ModuleLoader__.load({
  id: '@local/xhs-publisher',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const NS = 'xhsStudio'
    const ID = '@local/xhs-publisher'
    const KIND = 'xhs-studio'

    // ------------------------------------------------------------------ 文案

    const zh = {
      'tab.title': '小红书',
      'guide.title': '小红书',
      'guide.description': '登录、拼图、写文案并发布',
      'step.login': '登录',
      'step.create': '创作',
      'step.publish': '发布',
      'status.loggedOut': '未登录',
      'status.loggedIn': '已登录',
      'status.browserOff': '浏览器未启动',
      'status.busy': '处理中',
      'action.start': '打开登录页',
      'action.refresh': '刷新',
      'action.zoomQr': '放大二维码',
      'action.close': '关闭',
      'action.showWindow': '显示窗口',
      'action.hideWindow': '隐藏窗口',
      'hint.guide': '若页面出现「图片可以编辑啦」等引导浮层，点「显示窗口」到真实浏览器里关掉，再点「填入发布页」或「确认发布」。',
      'label.scan': '扫码登录',
      'action.check': '检查登录',
      'action.checkAll': '检测全部账号',
      'action.logout': '退出登录',
      'action.sms': '手机号验证码登录',
      'action.smsSend': '发送验证码',
      'action.smsSubmit': '登录',
      'action.next': '下一步',
      'action.back': '上一步',
      'action.generate': '生成文案',
      'action.regenerate': '换一版',
      'action.draft': '填入发布页',
      'action.submit': '确认发布',
      'action.add': '添加',
      'action.remove': '移除',
      'hint.scan': '用小红书 App 扫描二维码；网页版不支持账号密码，只支持扫码或手机号验证码。扫码后若仍显示未登录，点「检查登录」。',
      'hint.loginFirst': '先在「登录」完成扫码，发布时才能进入创作中心。',
      'hint.images': '拖动 1–9 张图片到这里，或点击选择',
      'hint.titleCount': '{count}/20',
      'hint.tagsCount': '{count}/10',
      'label.phone': '手机号',
      'label.code': '验证码',
      'label.title': '标题',
      'label.body': '正文',
      'label.tags': '标签',
      'label.prompt': '想让这条笔记讲什么？',
      'label.preview': '封面拼图预览',
      'label.mirror': '浏览器实时画面',
      'label.includeOriginals': '同时上传原图（拼图作为封面）',
      'label.confirm': '我已核对图片、标题和正文，确认发布',
      'label.missing': '还缺：',
      'placeholder.prompt': '例如：周六带娃去安吉露营，两天一夜，主打亲子、轻奢、出片，语气轻松一点',
      'placeholder.title': '写完标题会同步画到拼图中间',
      'placeholder.body': '正文会带上标签一起填入发布页',
      'placeholder.tag': '输入标签后回车',
      'empty.mirror': '点击「打开登录页」启动浏览器，登录过程会实时显示在这里。',
      'empty.collage': '添加图片后在这里预览拼图',
      'state.loading': '处理中…',
      'error.noPrompt': '先写一句主题或要求',
      'error.noImages': '至少添加一张图片',
      'error.noContent': '标题和正文不能为空',
      'error.loginRequired': '请先登录小红书',
      'error.network': '请求失败，请稍后重试',
      'error.publish': '发布失败',
      'error.confirm': '请先勾选核对确认',
      'publish.filled': '已填入发布页，请查看右侧预览后确认发布',
      'publish.done': '发布成功',
      'publish.unknown': '已提交，请在小红书确认结果',
      'sms.sent': '验证码已发送，请查看手机短信',
      'toast.starting': '正在启动浏览器，首次会慢一些…',
    }

    const en = {
      'tab.title': 'Xiaohongshu',
      'guide.title': 'Xiaohongshu',
      'guide.description': 'Log in, compose a cover, write, and publish',
      'step.login': 'Sign in',
      'step.create': 'Create',
      'step.publish': 'Publish',
      'status.loggedOut': 'Signed out',
      'status.loggedIn': 'Signed in',
      'status.browserOff': 'Browser off',
      'status.busy': 'Working',
      'action.start': 'Open sign-in',
      'action.refresh': 'Refresh',
      'action.zoomQr': 'Enlarge QR',
      'action.close': 'Close',
      'action.showWindow': 'Show window',
      'action.hideWindow': 'Hide window',
      'hint.guide': 'If a guide such as “images can be edited” covers the page, click Show window, close it in the real browser, then retry.',
      'label.scan': 'Scan to sign in',
      'action.check': 'Check status',
      'action.checkAll': 'Check all accounts',
      'action.logout': 'Sign out',
      'action.sms': 'Sign in with phone code',
      'action.smsSend': 'Send code',
      'action.smsSubmit': 'Sign in',
      'action.next': 'Next',
      'action.back': 'Back',
      'action.generate': 'Generate copy',
      'action.regenerate': 'Another version',
      'action.draft': 'Fill publish page',
      'action.submit': 'Publish now',
      'action.add': 'Add',
      'action.remove': 'Remove',
      'hint.scan': 'Scan the QR code with the Xiaohongshu app. The web login supports QR or SMS only.',
      'hint.loginFirst': 'Sign in first so the publish page can open.',
      'hint.images': 'Drop 1–9 images here, or click to choose',
      'hint.titleCount': '{count}/20',
      'hint.tagsCount': '{count}/10',
      'label.phone': 'Phone',
      'label.code': 'Code',
      'label.title': 'Title',
      'label.body': 'Body',
      'label.tags': 'Tags',
      'label.prompt': 'What is this note about?',
      'label.preview': 'Collage preview',
      'label.mirror': 'Live browser',
      'label.includeOriginals': 'Also upload originals (collage as cover)',
      'label.confirm': 'I reviewed the images, title and body',
      'label.missing': 'Missing: ',
      'placeholder.prompt': 'e.g. a weekend camping trip with kids in Anji, light-luxury, photogenic, relaxed tone',
      'placeholder.title': 'The title is drawn in the middle of the collage',
      'placeholder.body': 'The body is filled into the publish page with tags',
      'placeholder.tag': 'Type a tag and press Enter',
      'empty.mirror': 'Open sign-in to start the browser. The live page appears here.',
      'empty.collage': 'Add images to preview the collage',
      'state.loading': 'Working…',
      'error.noPrompt': 'Describe what the note should say first',
      'error.noImages': 'Add at least one image',
      'error.noContent': 'Title and body cannot be empty',
      'error.loginRequired': 'Sign in to Xiaohongshu first',
      'error.network': 'Request failed, please retry',
      'error.publish': 'Publish failed',
      'error.confirm': 'Tick the review checkbox first',
      'publish.filled': 'Filled into the publish page. Review the preview, then publish.',
      'publish.done': 'Published',
      'publish.unknown': 'Submitted. Please confirm on Xiaohongshu.',
      'sms.sent': 'Code sent, check your phone',
      'toast.starting': 'Starting the browser, the first run takes a moment…',
    }

    // ------------------------------------------------------------------ 工具

    async function api(path, body) {
      const init = body === undefined ? { cache: 'no-store' } : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }
      const response = await fetch('/xhs/api' + path, init)
      let data = {}
      try { data = await response.json() } catch {}
      if (!response.ok || data.ok === false) {
        const error = new Error(data.error || 'HTTP ' + response.status)
        error.code = data.code
        throw error
      }
      return data
    }

    function readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error || new Error('read failed'))
        reader.readAsDataURL(file)
      })
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('image decode failed'))
        image.src = src
      })
    }

    /** 每个数字对应每行的列数。 */
    function rowPlan(count) {
      if (count <= 1) return [1]
      if (count === 2) return [1, 1]
      if (count === 3) return [1, 2]
      if (count === 4) return [2, 2]
      if (count === 5) return [2, 3]
      if (count === 6) return [2, 2, 2]
      if (count === 7) return [1, 3, 3]
      if (count === 8) return [2, 3, 3]
      return [3, 3, 3]
    }

    function drawCover(context, image, x, y, width, height, radius) {
      const iw = image.naturalWidth || image.width
      const ih = image.naturalHeight || image.height
      if (!iw || !ih) return
      const scale = Math.max(width / iw, height / ih)
      const sw = width / scale
      const sh = height / scale
      const sx = (iw - sw) / 2
      const sy = (ih - sh) / 2
      context.save()
      context.beginPath()
      if (typeof context.roundRect === 'function') context.roundRect(x, y, width, height, radius)
      else context.rect(x, y, width, height)
      context.clip()
      context.drawImage(image, sx, sy, sw, sh, x, y, width, height)
      context.restore()
    }

    function wrapTitle(context, text, maxWidth) {
      const lines = []
      let current = ''
      for (const char of Array.from(text)) {
        const next = current + char
        if (current && context.measureText(next).width > maxWidth) {
          lines.push(current)
          current = char
        } else {
          current = next
        }
      }
      if (current) lines.push(current)
      return lines.slice(0, 3)
    }

    const W = 1080
    const H = 1440

    function renderCollage(images, title) {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, W, H)

      const GAP = 8
      const rows = rowPlan(images.length)
      const rowHeight = (H - GAP * (rows.length - 1)) / rows.length
      let index = 0
      let y = 0
      for (const columns of rows) {
        const cellWidth = (W - GAP * (columns - 1)) / columns
        let x = 0
        for (let column = 0; column < columns; column += 1) {
          const image = images[index]
          index += 1
          if (image?.el) drawCover(context, image.el, x, y, cellWidth, rowHeight, 18)
          x += cellWidth + GAP
        }
        y += rowHeight + GAP
      }

      if (title) {
        const size = title.length <= 6 ? 100 : title.length <= 10 ? 86 : title.length <= 14 ? 74 : 64
        const font = `700 ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
        context.font = font
        if ('letterSpacing' in context) context.letterSpacing = '2px'
        const lines = wrapTitle(context, title, W * 0.82)
        const lineHeight = size * 1.24
        const center = H * 0.5
        const blockHeight = lines.length * lineHeight
        const band = blockHeight + 180

        const gradient = context.createLinearGradient(0, center - band / 2, 0, center + band / 2)
        gradient.addColorStop(0, 'rgba(0,0,0,0)')
        gradient.addColorStop(0.35, 'rgba(0,0,0,0.48)')
        gradient.addColorStop(0.65, 'rgba(0,0,0,0.48)')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        context.fillStyle = gradient
        context.fillRect(0, center - band / 2, W, band)

        context.strokeStyle = 'rgba(255,255,255,0.9)'
        context.lineWidth = 3
        context.beginPath()
        const lineY = center - blockHeight / 2 - 46
        context.moveTo(W / 2 - 34, lineY)
        context.lineTo(W / 2 + 34, lineY)
        context.stroke()

        context.font = font
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillStyle = '#ffffff'
        context.shadowColor = 'rgba(0,0,0,0.45)'
        context.shadowBlur = 16
        context.shadowOffsetY = 3
        const start = center - blockHeight / 2 + lineHeight / 2
        lines.forEach((line, lineIndex) => {
          context.fillText(line, W / 2, start + lineIndex * lineHeight)
        })
        context.shadowColor = 'transparent'
      }

      return canvas.toDataURL('image/png')
    }

    // ------------------------------------------------------------------ 样式

    const css = `
      .xhs-root { position:relative; display:flex; flex-direction:column; height:100%; min-height:0; color:var(--dsw-alias-label-primary,#1f2329); background:var(--dsw-alias-bg-base,#fff); font-size:13px; }
      .xhs-head { flex:none; padding:12px 14px 0; }
      .xhs-titleRow { display:flex; align-items:center; gap:8px; }
      .xhs-title { font-size:15px; font-weight:600; letter-spacing:.2px; }
      .xhs-chip { font-size:11px; line-height:18px; padding:0 8px; border-radius:9px; color:var(--dsw-alias-label-secondary,#6b7280); background:var(--dsw-alias-bg-layer-2,#f2f3f5); white-space:nowrap; }
      .xhs-chip[data-state=ok] { color:var(--dsw-alias-state-success-primary,#0f9d58); background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#0f9d58) 12%, transparent); }
      .xhs-chip[data-state=warn] { color:var(--dsw-alias-state-warning-primary,#b26a00); background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 12%, transparent); }
      .xhs-chip[data-state=error] { color:var(--dsw-alias-state-error-primary,#d93026); background:color-mix(in srgb, var(--dsw-alias-state-error-primary,#d93026) 12%, transparent); }
      .xhs-chip[data-state=busy] { color:var(--dsw-alias-state-warning-primary,#b26a00); background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 12%, transparent); }
      .xhs-steps { display:flex; gap:6px; margin-top:10px; }
      .xhs-step { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; height:30px; border:0; border-radius:8px; cursor:pointer; font:inherit; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); background:var(--dsw-alias-bg-layer-1,#f7f8fa); }
      .xhs-step[data-active=true] { color:var(--dsw-alias-label-primary,#1f2329); background:var(--dsw-alias-interactive-bg-hover,#eceef2); font-weight:600; }
      .xhs-stepIndex { width:16px; height:16px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:10px; background:var(--dsw-alias-bg-layer-3,#e8eaee); }
      .xhs-body { flex:auto; min-height:0; overflow:auto; padding:12px 14px 18px; display:flex; flex-direction:column; gap:12px; }
      .xhs-card { border:0.5px solid var(--dsw-alias-border-l2,#e5e6eb); border-radius:12px; background:var(--dsw-alias-bg-layer-1,#fafbfc); overflow:hidden; }
      .xhs-cardBody { padding:10px; display:flex; flex-direction:column; gap:8px; }
      .xhs-cardHead { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 2px; }
      .xhs-label { font-size:11px; font-weight:600; letter-spacing:.3px; color:var(--dsw-alias-label-tertiary,#8a919c); text-transform:uppercase; }
      .xhs-muted { color:var(--dsw-alias-label-tertiary,#8a919c); font-size:11px; line-height:1.6; }
      .xhs-hint { color:var(--dsw-alias-label-secondary,#6b7280); font-size:11px; line-height:1.6; }

      .xhs-mirror { position:relative; border-radius:10px; overflow:hidden; background:var(--dsw-alias-bg-layer-2,#f2f3f5); min-height:180px; display:flex; align-items:center; justify-content:center; }
      .xhs-mirror[data-has-image=true] { aspect-ratio:4/3; min-height:0; }
      .xhs-mirror img { width:100%; height:100%; object-fit:contain; display:block; }
      .xhs-mirrorEmpty { padding:18px 16px; text-align:center; color:var(--dsw-alias-label-tertiary,#8a919c); font-size:12px; line-height:1.7; }

      .xhs-row { display:flex; gap:8px; flex-wrap:wrap; }
      .xhs-btn { height:30px; padding:0 12px; border-radius:7px; border:0.5px solid var(--dsw-alias-border-l2,#dfe1e6); background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2329); font:inherit; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; }
      .xhs-btn:hover:not(:disabled) { background:var(--dsw-alias-interactive-bg-hover,#f2f3f5); }
      .xhs-btn:disabled { opacity:.5; cursor:not-allowed; }
      .xhs-btn[data-kind=primary] { border-color:transparent; background:#ff2442; color:#fff; font-weight:600; }
      .xhs-btn[data-kind=primary]:hover:not(:disabled) { background:#e51f3a; }
      .xhs-btn[data-kind=ghost] { border-color:transparent; background:transparent; color:var(--dsw-alias-label-secondary,#6b7280); }
      .xhs-btn[data-kind=danger] { border-color:transparent; background:var(--dsw-alias-state-error-primary,#d93026); color:#fff; font-weight:600; }
      .xhs-btn[data-kind=small] { height:26px; padding:0 9px; font-size:11px; }

      .xhs-drop { border:1.5px dashed var(--dsw-alias-border-l3,#cfd3da); border-radius:10px; padding:18px 12px; text-align:center; color:var(--dsw-alias-label-tertiary,#8a919c); font-size:12px; cursor:pointer; line-height:1.6; transition:background .15s ease, border-color .15s ease; }
      .xhs-drop[data-over=true] { border-color:#ff2442; background:rgba(255,36,66,.05); color:#ff2442; }
      .xhs-thumbs { display:grid; grid-template-columns:repeat(auto-fill,minmax(64px,1fr)); gap:6px; }
      .xhs-thumb { position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; background:#e9ebef; }
      .xhs-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
      .xhs-thumbBar { position:absolute; left:0; right:0; bottom:0; display:flex; justify-content:center; gap:2px; padding:3px; background:linear-gradient(transparent, rgba(0,0,0,.55)); opacity:0; transition:opacity .15s ease; }
      .xhs-thumb:hover .xhs-thumbBar { opacity:1; }
      .xhs-mini { width:18px; height:18px; border:0; border-radius:4px; background:rgba(255,255,255,.9); color:#1f2329; font-size:10px; line-height:18px; cursor:pointer; padding:0; }
      .xhs-mini:disabled { opacity:.35; cursor:default; }

      .xhs-field { display:flex; flex-direction:column; gap:5px; }
      .xhs-fieldHead { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
      .xhs-input, .xhs-textarea { width:100%; box-sizing:border-box; border:0.5px solid var(--dsw-alias-border-l2,#dfe1e6); border-radius:7px; background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,#1f2329); font:inherit; font-size:12px; padding:7px 9px; outline:none; }
      .xhs-input:focus, .xhs-textarea:focus { border-color:#ff2442; box-shadow:0 0 0 2px rgba(255,36,66,.12); }
      .xhs-textarea { min-height:96px; resize:vertical; line-height:1.65; }
      .xhs-counter { font-size:10px; color:var(--dsw-alias-label-tertiary,#8a919c); font-variant-numeric:tabular-nums; }

      .xhs-tags { display:flex; flex-wrap:wrap; gap:5px; }
      .xhs-tag { display:inline-flex; align-items:center; gap:4px; height:22px; padding:0 7px; border-radius:11px; font-size:11px; color:#c81e37; background:rgba(255,36,66,.08); }
      .xhs-tag button { border:0; background:transparent; color:#c81e37; cursor:pointer; padding:0; font-size:12px; line-height:1; }
      .xhs-tagAdd { display:flex; gap:6px; }
      .xhs-tagAdd .xhs-input { height:26px; padding:0 8px; flex:1; }

      .xhs-preview { display:flex; justify-content:center; padding:8px; background:var(--dsw-alias-bg-layer-2,#f2f3f5); border-radius:10px; }
      .xhs-preview img { width:min(100%, 300px); aspect-ratio:3/4; object-fit:contain; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.08); background:#fff; }

      .xhs-summary { display:flex; gap:10px; }
      .xhs-summary img { width:76px; aspect-ratio:3/4; object-fit:cover; border-radius:8px; flex:none; background:#eee; }
      .xhs-summaryText { min-width:0; display:flex; flex-direction:column; gap:4px; }
      .xhs-summaryTitle { font-weight:600; font-size:13px; line-height:1.4; word-break:break-word; }
      .xhs-summaryBody { font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary,#6b7280); display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }

      .xhs-check { display:flex; align-items:flex-start; gap:7px; font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary,#6b7280); cursor:pointer; }
      .xhs-check input { margin:2px 0 0; accent-color:#ff2442; }

      .xhs-foot { flex:none; display:flex; gap:8px; padding:10px 14px 12px; border-top:0.5px solid var(--dsw-alias-border-l2,#e5e6eb); background:var(--dsw-alias-bg-base,#fff); }
      .xhs-foot .xhs-btn { flex:1; }
      .xhs-toast { margin:0 14px 8px; padding:8px 10px; border-radius:8px; font-size:11px; line-height:1.5; background:var(--dsw-alias-bg-layer-2,#f2f3f5); color:var(--dsw-alias-label-secondary,#6b7280); }
      .xhs-toast[data-kind=error] { color:var(--dsw-alias-state-error-primary,#d93026); background:color-mix(in srgb, var(--dsw-alias-state-error-primary,#d93026) 10%, transparent); }
      .xhs-toast[data-kind=ok] { color:var(--dsw-alias-state-success-primary,#0f9d58); background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#0f9d58) 10%, transparent); }
      .xhs-sms { display:flex; flex-direction:column; gap:7px; padding-top:8px; border-top:0.5px dashed var(--dsw-alias-border-l2,#e5e6eb); }
      .xhs-empty { text-align:center; color:var(--dsw-alias-label-tertiary,#8a919c); font-size:12px; line-height:1.7; padding:26px 12px; }
      .xhs-notes { display:flex; flex-direction:column; gap:8px; }
      .xhs-note { border:0.5px solid var(--dsw-alias-border-l2,#e5e6eb); border-radius:10px; padding:8px; background:var(--dsw-alias-bg-base,#fff); display:flex; flex-direction:column; gap:6px; }
      .xhs-noteTitle { font-size:12px; font-weight:600; line-height:1.5; word-break:break-word; }
      .xhs-noteBody { font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary,#6b7280); max-height:240px; overflow:hidden; white-space:pre-wrap; }
      .xhs-warn { font-size:10px; color:var(--dsw-alias-state-warning-primary,#b26a00); line-height:1.5; }
      .xhs-riskList { display:flex; flex-direction:column; gap:6px; }
      .xhs-riskItem { border-left:3px solid var(--dsw-alias-state-warning-primary,#b26a00); padding:4px 0 4px 8px; }
      .xhs-riskRow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .xhs-riskWord { color:var(--dsw-alias-state-error-primary,#d93026); font-weight:600; }
      .xhs-accountRow { display:flex; align-items:center; gap:8px; padding:7px 0; border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 18%, transparent); }
      .xhs-accountRow:first-of-type { border-top:0; padding-top:2px; }
      .xhs-accountName { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; }
      .xhs-accountNick { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xhs-select { height:28px; border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 26%, transparent); border-radius:6px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#1f2329); font-size:12px; padding:0 6px; min-width:0; flex:1 1 auto; }
      .xhs-group { border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 20%, transparent); border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:6px; }
      .xhs-groupHead { display:flex; align-items:center; gap:6px; }
      .xhs-groupDrop { display:flex; flex-wrap:wrap; gap:6px; min-height:64px; padding:6px; border:1px dashed color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 32%, transparent); border-radius:6px; }
      .xhs-groupThumb { position:relative; width:54px; height:70px; border-radius:4px; overflow:hidden; background:#f4f5f7; }
      .xhs-groupThumb img { width:100%; height:100%; object-fit:cover; display:block; }
      .xhs-groupRemove { position:absolute; top:2px; right:2px; width:16px; height:16px; border:0; border-radius:50%; background:rgba(0,0,0,.55); color:#fff; font-size:11px; line-height:1; cursor:pointer; padding:0; }
      .xhs-groupAdd { width:54px; height:70px; border:1px dashed color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 32%, transparent); border-radius:4px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:10px; color:var(--dsw-alias-label-tertiary,#8a919c); cursor:pointer; padding:4px; }
      .xhs-groupsList { display:flex; flex-direction:column; gap:8px; }
      .xhs-groupActions { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
      .xhs-check { display:flex; align-items:center; gap:4px; font-size:11px; }
      .xhs-statusBar { flex:none; padding:5px 12px 6px; border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 16%, transparent); background:var(--dsw-alias-bg-layer-1,#fff); display:flex; flex-direction:column; gap:2px; }
      .xhs-statusLine { display:flex; align-items:center; gap:5px; min-width:0; }
      .xhs-statusDot { width:6px; height:6px; border-radius:50%; background:var(--dsw-alias-state-error-primary,#d93026); flex:none; }
      .xhs-statusDot[data-state=ok] { background:var(--dsw-alias-state-success-primary,#0f9d58); }
      .xhs-statusDot[data-state=busy] { background:var(--dsw-alias-state-warning-primary,#b26a00); }
      .xhs-statusText { font-size:10px; color:var(--dsw-alias-label-secondary,#4b5563); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xhs-statusRecent { display:flex; align-items:center; gap:6px; font-size:10px; color:var(--dsw-alias-label-tertiary,#8a919c); min-width:0; }
      .xhs-statusRecent > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xhs-reviewBanner { display:flex; align-items:center; justify-content:space-between; gap:6px; padding:6px 12px; background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 10%, transparent); border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 24%, transparent); font-size:11px; color:var(--dsw-alias-state-warning-primary,#b26a00); }
      .xhs-review { border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 16%, transparent); padding:8px 0; display:flex; flex-direction:column; gap:6px; }
      .xhs-review:first-of-type { border-top:0; padding-top:2px; }
      .xhs-reviewTop { display:flex; align-items:center; justify-content:space-between; gap:6px; }
      .xhs-reviewJob { border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 18%, transparent); border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:5px; }
      .xhs-reviewJobHead { display:flex; align-items:center; gap:6px; min-width:0; }
      .xhs-reviewImgs { display:flex; flex-wrap:wrap; gap:4px; }
      .xhs-reviewImgs img { width:48px; height:64px; object-fit:cover; border-radius:3px; background:#f4f5f7; }
      .xhs-reviewImgWrap { position:relative; width:48px; height:64px; border-radius:3px; overflow:hidden; background:#f4f5f7; }
      .xhs-reviewImgWrap img { width:100%; height:100%; object-fit:cover; display:block; }
      .xhs-coverTag { position:absolute; left:0; bottom:0; font-size:9px; line-height:12px; background:rgba(0,0,0,.55); color:#fff; padding:0 3px; }
      .xhs-imgRemove { position:absolute; top:1px; right:1px; width:15px; height:15px; border:0; border-radius:50%; background:rgba(0,0,0,.6); color:#fff; font-size:11px; line-height:1; cursor:pointer; padding:0; }
      .xhs-reviewAdd { width:48px; height:64px; border:1px dashed color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 32%, transparent); border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--dsw-alias-label-tertiary,#8a919c); cursor:pointer; text-align:center; }
      .xhs-progress { border:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 22%, transparent); border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:4px; background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 5%, transparent); }
      .xhs-progressHead { display:flex; align-items:center; justify-content:space-between; gap:6px; }
      .xhs-progressRow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:11px; }
      .xhs-reviewBody { font-size:11px; line-height:1.55; white-space:pre-wrap; max-height:180px; overflow:auto; color:var(--dsw-alias-label-secondary,#4b5563); }
      .xhs-reviewTools { display:flex; gap:8px; flex-wrap:wrap; }
      .xhs-riskGrid { display:flex; gap:8px; flex-wrap:wrap; }
      .xhs-riskField { flex:1 1 130px; display:flex; flex-direction:column; gap:2px; min-width:0; }
      .xhs-riskField .xhs-input { height:26px; font-size:11px; }
      .xhs-riskSummary { font-size:11px; line-height:1.6; color:var(--dsw-alias-label-secondary,#4b5563); }
      .xhs-reviewTool { display:flex; align-items:center; gap:4px; flex:1 1 140px; min-width:0; }
      .xhs-reviewTool .xhs-select { flex:1; height:26px; }
      .xhs-riskWarn { border:1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 28%, transparent); border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:4px; font-size:11px; line-height:1.5; color:var(--dsw-alias-state-warning-primary,#b26a00); background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,#b26a00) 6%, transparent); }
      .xhs-historyList { display:flex; flex-direction:column; gap:0; }
      .xhs-historyRow { display:flex; align-items:center; gap:6px; padding:6px 0; border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 14%, transparent); }
      .xhs-historyRow:first-of-type { border-top:0; }
      .xhs-modal { position:absolute; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; background:rgba(15,18,24,.45); padding:20px; }
      .xhs-modalCard { width:min(320px,100%); background:var(--dsw-alias-bg-base,#fff); border-radius:14px; padding:14px; box-shadow:0 12px 40px rgba(0,0,0,.25); display:flex; flex-direction:column; gap:10px; align-items:center; }
      .xhs-modalHead { width:100%; display:flex; align-items:center; justify-content:space-between; }
      .xhs-modalCard img { width:100%; aspect-ratio:1; object-fit:contain; border-radius:10px; background:#fff; }
      .xhs-modalClose { border:0; background:transparent; font-size:18px; line-height:1; cursor:pointer; color:var(--dsw-alias-label-tertiary,#8a919c); }
      .xhs-riskModal { width:min(560px,94%); align-items:stretch; }
      .xhs-promptModal { width:min(520px,94%); align-items:stretch; max-height:86vh; overflow:auto; }
      .xhs-promptList { display:flex; flex-direction:column; gap:6px; max-height:220px; overflow:auto; }
      .xhs-promptItem { border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 18%, transparent); border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:4px; }
      .xhs-promptItemHead { display:flex; align-items:center; justify-content:space-between; gap:6px; }
      .xhs-promptText { font-size:11px; line-height:1.5; color:var(--dsw-alias-label-secondary,#4b5563); white-space:pre-wrap; max-height:66px; overflow:hidden; }
      .xhs-promptEditor { border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 16%, transparent); padding-top:8px; display:flex; flex-direction:column; gap:6px; }
      .xhs-accountModal { width:min(380px,94%); align-items:stretch; }
      .xhs-previewModal { width:min(560px,94%); align-items:stretch; max-height:88vh; overflow:auto; }
      .xhs-previewModal img { width:100%; height:auto; border-radius:10px; background:#fff; }
      .xhs-addTabs { display:flex; gap:6px; width:100%; }
      .xhs-addTab { flex:1; height:30px; border:0; border-radius:6px; cursor:pointer; font:inherit; font-size:12px; color:var(--dsw-alias-label-secondary,#6b7280); background:var(--dsw-alias-bg-layer-1,#f7f8fa); }
      .xhs-addTab[data-active=true] { color:var(--dsw-alias-label-primary,#1f2329); background:var(--dsw-alias-interactive-bg-hover,#eceef2); font-weight:600; }
      .xhs-addBody { display:flex; flex-direction:column; gap:8px; width:100%; }
      .xhs-riskTextarea { min-height:320px; font-family:ui-monospace,Consolas,monospace; font-size:11px; line-height:1.6; }

      /* ---------- 2026 UI refresh ---------- */
      .xhs-root { background:var(--dsw-alias-bg-layer-2,#f5f6f8); font-size:13px; }
      .xhs-head { padding:16px 16px 12px; background:var(--dsw-alias-bg-base,#fff); border-bottom:1px solid var(--dsw-alias-border-l2,#e8ebef); }
      .xhs-titleRow { align-items:flex-start; gap:10px; }
      .xhs-title { font-size:18px; font-weight:700; letter-spacing:-.3px; line-height:1.35; }
      .xhs-titleRow .xhs-chip { margin-top:2px; }
      .xhs-steps { gap:3px; padding:3px; height:40px; border-radius:12px; background:var(--dsw-alias-bg-layer-2,#eef0f3); }
      .xhs-step { height:34px; border-radius:9px; font-size:12.5px; background:transparent; }
      .xhs-step[data-active=true] { background:var(--dsw-alias-bg-base,#fff); box-shadow:0 1px 3px rgba(20,24,32,.10); }
      .xhs-stepIndex { width:18px; height:18px; font-size:10px; background:color-mix(in srgb, var(--dsw-alias-label-tertiary,#8a919c) 16%, transparent); }
      .xhs-step[data-active=true] .xhs-stepIndex { background:#ff2442; color:#fff; }
      .xhs-body { padding:14px 14px 28px; gap:14px; background:var(--dsw-alias-bg-layer-2,#f5f6f8); }
      .xhs-card { border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:16px; background:var(--dsw-alias-bg-base,#fff); box-shadow:0 1px 2px rgba(20,24,32,.04); }
      .xhs-cardBody { padding:14px; gap:12px; }
      .xhs-cardHead { padding:0; align-items:center; }
      .xhs-cardHead .xhs-label { font-size:13px; font-weight:650; letter-spacing:0; text-transform:none; color:var(--dsw-alias-label-primary,#1f2329); }
      .xhs-label { font-size:11.5px; font-weight:600; letter-spacing:.1px; color:var(--dsw-alias-label-tertiary,#8a919c); text-transform:none; }
      .xhs-muted { font-size:11.5px; line-height:1.6; }
      .xhs-hint { font-size:12px; line-height:1.65; }
      .xhs-chip { font-size:11px; line-height:22px; height:22px; padding:0 9px; border-radius:999px; }
      .xhs-row { gap:9px; }
      .xhs-btn { height:34px; padding:0 14px; border-radius:10px; font-size:12.5px; border:1px solid var(--dsw-alias-border-l2,#e3e6ea); box-shadow:0 1px 1px rgba(20,24,32,.03); }
      .xhs-btn[data-kind=small] { height:28px; padding:0 10px; font-size:11.5px; border-radius:8px; }
      .xhs-btn[data-kind=primary] { background:linear-gradient(135deg,#ff3d58,#ff2442); box-shadow:0 4px 12px rgba(255,36,66,.22); }
      .xhs-btn[data-kind=ghost] { box-shadow:none; }
      .xhs-input, .xhs-textarea { height:34px; padding:7px 10px; border-radius:9px; font-size:12.5px; }
      .xhs-textarea { min-height:108px; line-height:1.7; }
      .xhs-select { height:32px; border-radius:9px; font-size:12px; }
      .xhs-check { font-size:12px; line-height:1.65; }
      .xhs-mirror { border-radius:14px; }
      .xhs-accountRow { padding:10px 0; gap:9px; flex-wrap:wrap; }
      .xhs-accountName { font-size:12.5px; flex-wrap:wrap; row-gap:4px; }
      .xhs-notes { gap:10px; }
      .xhs-note { border-radius:12px; padding:10px; border-color:var(--dsw-alias-border-l2,#e8ebef); }
      .xhs-noteTitle { font-size:13.5px; line-height:1.55; }
      .xhs-review { border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:14px; padding:12px; background:var(--dsw-alias-bg-base,#fff); gap:10px; margin-top:0; }
      .xhs-reviewTop { align-items:center; }
      .xhs-reviewJob { border:1px solid var(--dsw-alias-border-l2,#edf0f3); border-radius:12px; padding:10px; background:var(--dsw-alias-bg-layer-1,#fafbfc); gap:8px; }
      .xhs-reviewImgs { gap:6px; }
      .xhs-reviewImgWrap, .xhs-reviewImgs img { width:64px; height:84px; border-radius:8px; }
      .xhs-reviewAdd { width:64px; height:84px; border-radius:8px; }
      .xhs-reviewBody { font-size:12.5px; line-height:1.7; max-height:220px; }
      .xhs-riskWarn { border-radius:12px; padding:10px; gap:6px; font-size:11.5px; }
      .xhs-riskSummary { font-size:12px; line-height:1.65; }
      .xhs-riskGrid { gap:10px; }
      .xhs-riskField { gap:4px; }
      .xhs-riskField .xhs-input { height:30px; font-size:12px; }
      .xhs-reviewTool .xhs-select { height:30px; }
      .xhs-scheduleRow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:8px; border:1px dashed var(--dsw-alias-border-l3,#dfe3e8); border-radius:10px; background:var(--dsw-alias-bg-layer-2,#f7f8fa); }
      .xhs-scheduleRow .xhs-label { flex:none; }
      .xhs-scheduleRow .xhs-input { flex:1 1 190px; width:auto; height:30px; font-size:11.5px; }
      .xhs-groupGrid { display:flex; flex-wrap:wrap; gap:8px; }
      .xhs-groupCell { display:flex; align-items:center; gap:6px; padding:6px 10px; border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:10px; background:var(--dsw-alias-bg-layer-1,#fafbfc); }
      .xhs-groupPosts { display:flex; flex-direction:column; gap:10px; }
      .xhs-groupPost { border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:12px; padding:10px; background:var(--dsw-alias-bg-layer-1,#fafbfc); display:flex; flex-direction:column; gap:8px; }
      .xhs-groupPostHead { display:flex; align-items:baseline; justify-content:space-between; gap:8px; flex-wrap:wrap; }
      .xhs-groupThumbs { display:flex; gap:6px; flex-wrap:wrap; }
      .xhs-groupThumbs img { width:64px; height:84px; object-fit:cover; border-radius:8px; background:#eee; }
      .xhs-previewPost { border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:12px; padding:10px; background:var(--dsw-alias-bg-layer-1,#fafbfc); display:flex; flex-direction:column; gap:8px; }
      .xhs-previewPostHead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .xhs-previewImgs { display:flex; gap:6px; flex-wrap:wrap; }
      .xhs-previewImg { position:relative; width:64px; height:84px; border-radius:8px; overflow:hidden; background:#eee; }
      .xhs-previewImg img { width:100%; height:100%; object-fit:cover; display:block; }
      .xhs-productGroup { display:flex; flex-direction:column; gap:8px; padding:10px 0; border-top:1px solid var(--dsw-alias-border-l2,#e8ebef); }
      .xhs-productGroup:first-of-type { border-top:0; padding-top:0; }
      .xhs-productGroupHead { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
      .xhs-postGroup { border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:10px; padding:8px; background:var(--dsw-alias-bg-base,#fff); display:flex; flex-direction:column; gap:6px; }
      .xhs-postGroupHead { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .xhs-postDetail { font-size:10.5px; line-height:1.5; color:var(--dsw-alias-label-tertiary,#8a919c); word-break:break-all; }
      .xhs-collapseHead { cursor:pointer; user-select:none; }
      .xhs-collapseHead:hover { color:var(--dsw-alias-label-primary,#111); }
      .xhs-collapseIcon { margin-left:auto; font-size:10.5px; color:var(--dsw-alias-label-tertiary,#8a919c); flex:0 0 auto; }
      .xhs-collapseBody { display:flex; flex-direction:column; gap:8px; padding-top:8px; }
      .xhs-historyList { gap:8px; }
      .xhs-historyRow { padding:10px; border:1px solid var(--dsw-alias-border-l2,#e8ebef); border-radius:12px; margin-top:0; }
      .xhs-historyRow:first-of-type { border-top:1px solid var(--dsw-alias-border-l2,#e8ebef); }
      .xhs-foot { padding:12px 16px 14px; background:var(--dsw-alias-bg-base,#fff); border-top:1px solid var(--dsw-alias-border-l2,#e8ebef); }
      .xhs-foot .xhs-btn { height:36px; }
      .xhs-toast { margin:0 14px 10px; padding:10px 12px; border-radius:10px; font-size:12px; }
      .xhs-empty { padding:30px 12px; font-size:12px; }
      .xhs-drop { padding:22px 14px; border-radius:14px; }
      .xhs-preview, .xhs-summary { border-radius:12px; }
      .xhs-modalCard { border-radius:16px; padding:16px; }
      .xhs-accountModal, .xhs-previewModal { width:min(560px,94%); }
      .xhs-addTab { height:34px; border-radius:9px; }

      /* 简约皮肤：少边框、少阴影、更多留白 */
      .xhs-shell { --xhs-ink:#1f2a24; --xhs-line:#e7e3da; --xhs-accent:#2f5d4a; background:transparent; }
      .xhs-head { padding:14px 14px 4px; background:transparent; border-bottom:0; }
      .xhs-title { font-weight:600; letter-spacing:.02em; color:var(--xhs-ink); }
      .xhs-steps { gap:20px; border-bottom:1px solid var(--xhs-line); }
      .xhs-step { background:none; border:0; padding:6px 0 9px; border-radius:0; color:#7b857f; font-size:12.5px; }
      .xhs-step[data-active=true] { color:var(--xhs-accent); font-weight:600; box-shadow:inset 0 -2px 0 var(--xhs-accent); }
      .xhs-stepIndex { display:none; }
      .xhs-card { border:0; border-bottom:1px solid var(--xhs-line); border-radius:0; background:transparent; box-shadow:none; }
      .xhs-cardBody { padding:12px 0; }
      .xhs-label { font-weight:600; color:var(--xhs-ink); }
      .xhs-btn { border-radius:8px; box-shadow:none; }
      .xhs-btn[data-kind=primary] { background:var(--xhs-accent); border-color:var(--xhs-accent); }
      .xhs-input, .xhs-textarea { border-radius:8px; background:#fbfaf7; }
      .xhs-drop { border-radius:10px; border-style:solid; background:#fbfaf7; }
      .xhs-know { display:flex; flex-direction:column; gap:10px; padding:4px 0 18px; }
      .xhs-knowHead { display:flex; flex-direction:column; gap:2px; }
      .xhs-knowTitle { font-size:13px; font-weight:600; color:var(--xhs-ink); }
      .xhs-knowPath { font-size:10.5px; color:#8a919c; word-break:break-all; }
      .xhs-knowList { display:flex; flex-direction:column; max-height:190px; overflow:auto; border-top:1px solid var(--xhs-line); }
      .xhs-knowItem { display:flex; flex-direction:column; gap:1px; text-align:left; padding:7px 2px; border:0; border-bottom:1px solid var(--xhs-line); background:none; cursor:pointer; }
      .xhs-knowItem:hover { background:#fbfaf7; }
      .xhs-knowItem[data-active=true] { color:var(--xhs-accent); }
      .xhs-knowName { font-size:12px; }
      .xhs-knowDir { font-size:10px; color:#9aa39d; }
      .xhs-knowEdit { display:flex; flex-direction:column; gap:6px; }
      .xhs-knowEditBar { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .xhs-knowEditPath { font-size:10.5px; color:#8a919c; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .xhs-knowText { min-height:240px; font-family:ui-monospace, Consolas, monospace; font-size:11px; line-height:1.55; }
      .xhs-knowHint { font-size:11.5px; color:#8a919c; line-height:1.65; padding:6px 0; }
      .xhs-seg { display:inline-flex; gap:4px; background:#f2f0ea; padding:3px; border-radius:9px; align-self:flex-start; }
      .xhs-segBtn { border:0; background:none; padding:5px 10px; border-radius:7px; font-size:11.5px; color:#6f7872; cursor:pointer; }
      .xhs-segBtn[data-active=true] { background:#fff; color:var(--xhs-accent); box-shadow:0 1px 2px rgba(0,0,0,.06); }
    `

    // ------------------------------------------------------------------ 图标

    function GuideIcon() {
      return h('svg', {
        viewBox: '0 0 48 48', width: 34, height: 34, 'aria-hidden': true,
        style: { display: 'block' },
      }, [
        h('rect', { key: 'bg', x: 4, y: 4, width: 40, height: 40, rx: 12, fill: '#ff2442' }),
        h('path', { key: 'book', d: 'M15 15.5h12.2c1.3 0 2.3 1 2.3 2.3v15.7H17.3c-1.3 0-2.3-1-2.3-2.3V15.5Z', fill: '#fff', opacity: 0.95 }),
        h('path', { key: 'line1', d: 'M19 21h7M19 25h7M19 29h4', stroke: '#ff2442', strokeWidth: 2, strokeLinecap: 'round' }),
        h('path', { key: 'spark', d: 'M33 13.2l1.3 3.1 3.1 1.3-3.1 1.3-1.3 3.1-1.3-3.1-3.1-1.3 3.1-1.3 1.3-3.1Z', fill: '#ffd7dd' }),
      ])
    }

    // ------------------------------------------------------------------ 面板

    const DEFAULT_GROUP_TEMPLATES = [
      { id: 'multi-angle-4', name: '4图·同产品多角度', perPost: 4, strategy: 'cluster', minHashDistance: 8, roles: ['封面', '包装', '手提', '细节'] },
      { id: 'full-5', name: '5图·全套', perPost: 5, strategy: 'cluster', minHashDistance: 8, roles: ['封面', '包装', '手提', '细节', '场景'] },
      { id: 'strict-4', name: '4图·强去重', perPost: 4, strategy: 'cluster', minHashDistance: 12, roles: ['封面', '包装', '手提', '细节'] },
      { id: 'diverse-4', name: '4图·最大差异', perPost: 4, strategy: 'diverse', minHashDistance: 10, roles: ['封面', '包装', '手提', '细节'] },
    ]

    class XhsErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        try {
          console.error('[xhs] group panel error', error, info)
          fetch('/xhs/api/client-error', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              message: String(error?.message || error),
              stack: String(error?.stack || ''),
              componentStack: String(info?.componentStack || ''),
            }),
          }).catch(() => {})
        } catch {}
      }

      render() {
        if (this.state.error) {
          return h('div', { className: 'xhs-card' }, [
            h('div', { className: 'xhs-cardBody' }, [
              h('div', { className: 'xhs-label' }, '分组模块出错了'),
              h('pre', { className: 'xhs-hint', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, String(this.state.error?.stack || this.state.error)),
            ]),
          ])
        }
        return this.props.children
      }
    }

    function GroupBlock({ post, index, position, checked, onToggle, onRemove }) {
      const [open, setOpen] = useState(false)
      return h('div', { className: 'xhs-postGroup' }, [
        h('div', {
          key: 'h', className: 'xhs-postGroupHead xhs-collapseHead',
          onClick: () => setOpen((value) => !value),
        }, [
          h('input', {
            key: 's', type: 'checkbox', checked,
            onClick: (event) => event.stopPropagation(),
            onChange: (event) => onToggle(index, event.target.checked),
          }),
          h('span', { key: 'i', className: 'xhs-chip' }, '组 ' + (position + 1)),
          h('span', { key: 'a', className: 'xhs-muted' }, post.account || 'default'),
          h('span', { key: 'n', className: 'xhs-muted' }, (post.images || []).length + ' 张'),
          h('span', { key: 'x', className: 'xhs-collapseIcon' }, open ? '收起' : '展开'),
        ]),
        open ? h('div', { key: 'b', className: 'xhs-collapseBody' }, [
          h('div', { key: 'imgs', className: 'xhs-groupThumbs' }, (post.images || []).map((path) => h('img', {
            key: path, src: '/xhs/api/local/file?path=' + encodeURIComponent(path), alt: '', loading: 'lazy',
          }))),
          h('div', { key: 'detail', className: 'xhs-postDetail' }, (post.images || []).map((path, imageIndex) => String(path).split(/[\\/]/).pop() + ' · ' + ((post.roles || [])[imageIndex] || '')).join(' / ')),
          post.folder ? h('div', { key: 'f', className: 'xhs-muted' }, '文件夹：' + post.folder) : null,
          h('button', {
            key: 'rm', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
            onClick: (event) => { event.stopPropagation(); onRemove(index) },
          }, '移除这一组'),
        ]) : null,
      ])
    }

    function ProductBlock({ group, items, selected, onToggle, onRemove }) {
      const [open, setOpen] = useState(false)
      return h('div', { className: 'xhs-productGroup' }, [
        h('div', {
          key: 'h', className: 'xhs-productGroupHead xhs-collapseHead',
          onClick: () => setOpen((value) => !value),
        }, [
          h('span', { key: 'l', className: 'xhs-label' }, group.label),
          h('span', { key: 'c', className: 'xhs-muted' }, items.length + ' 组'),
          h('span', { key: 'x', className: 'xhs-collapseIcon' }, open ? '收起' : '展开'),
        ]),
        open ? h('div', { key: 'b', className: 'xhs-collapseBody' }, items.map(({ post, index }, position) => h(GroupBlock, {
          key: index,
          post,
          index,
          position,
          checked: selected[index] !== false,
          onToggle,
          onRemove,
        }))) : null,
      ])
    }

    function PreviewGroup({ job }) {
      const [open, setOpen] = useState(false)
      return h('div', { className: 'xhs-previewPost' }, [
        h('div', {
          key: 'h', className: 'xhs-previewPostHead xhs-collapseHead',
          onClick: () => setOpen((value) => !value),
        }, [
          h('span', { key: 'a', className: 'xhs-chip', 'data-state': 'ok' }, job.nickname || job.account),
          h('span', { key: 't', className: 'xhs-noteTitle' }, job.title),
          h('span', { key: 'x', className: 'xhs-collapseIcon' }, open ? '收起' : (job.images || []).length + ' 张'),
        ]),
        open ? h('div', { key: 'b', className: 'xhs-collapseBody' }, [
          h('div', { key: 'imgs', className: 'xhs-previewImgs' }, (job.images || []).map((path, imageIndex) => h('div', { key: path, className: 'xhs-previewImg' }, [
            h('img', { src: '/xhs/api/local/file?path=' + encodeURIComponent(path), alt: '', loading: 'lazy' }),
            imageIndex === 0 ? h('span', { key: 'c', className: 'xhs-coverTag' }, '封面') : null,
          ]))),
          h('div', { key: 'body', className: 'xhs-reviewBody' }, job.body),
          h('div', { key: 'tags', className: 'xhs-muted' }, (job.tags || []).map((tag) => '#' + tag).join(' ')),
        ]) : null,
      ])
    }

    function GroupStudio({ say, onCommitted }) {
      const [templates, setTemplates] = useState({ defaultId: 'multi-angle-4', templates: DEFAULT_GROUP_TEMPLATES })
      const [folder, setFolder] = useState('C:\\Users\\23529\\Desktop\\photo\\10.13茶叶')
      const [exportFolder, setExportFolder] = useState('C:\\Users\\23529\\Desktop\\photo\\10.13茶叶')
      const [perProduct, setPerProduct] = useState(7)
      const [perPost, setPerPost] = useState(4)
      const [running, setRunning] = useState(false)
      const [result, setResult] = useState(null)
      const [selected, setSelected] = useState({})
      const [exporting, setExporting] = useState(false)
      const [exportResult, setExportResult] = useState(null)
      const [preview, setPreview] = useState(null)
      const [previewBusy, setPreviewBusy] = useState(false)

      const cleanPosts = (data) => ({
        ...data,
        posts: (data.posts || []).map((post) => ({
          ...post,
          images: (post.images || []).filter((image) => !/[\\/]预览\.jpg$/i.test(image) && !/[\\/]cover-[^\\/]+\.(jpe?g|png)$/i.test(image)),
        })),
      })

      useEffect(() => {
        api('/group/today').then((data) => {
          if (!data.session) return
          const clean = cleanPosts(data.session)
          setResult(clean)
          if (clean.baseFolder) setExportResult({ baseFolder: clean.baseFolder })
        }).catch(() => {})
        api('/group/templates').then((data) => {
          if (Array.isArray(data.templates) && data.templates.length) {
            setTemplates({ defaultId: data.defaultId || 'multi-angle-4', templates: data.templates })
          }
        }).catch(() => {})
      }, [])

      const posts = (result && Array.isArray(result.posts)) ? result.posts : []
      const isChecked = (index) => selected[index] !== false
      const selectedIndexes = posts.map((_, index) => index).filter(isChecked)
      const selectedPosts = selectedIndexes.map((index) => posts[index])
      const selectedCount = selectedPosts.length
      const activeTemplate = templates.templates.find((item) => item.id === templates.defaultId) || templates.templates[0]

      const saveTemplate = async (id) => {
        try {
          const data = await api('/group/templates', { defaultId: id })
          if (Array.isArray(data.templates) && data.templates.length) {
            setTemplates({ defaultId: data.defaultId || id, templates: data.templates })
          } else {
            setTemplates((prev) => ({ ...prev, defaultId: id }))
          }
          say('已设为默认分组模板', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const run = async () => {
        if (!folder.trim()) { say('请填写图片文件夹', 'error'); return }
        setRunning(true)
        say('正在本地分组（OCR + pHash 去重，约 10-15 分钟）…', 'info')
        try {
          const data = await api('/group/run', {
            folder: folder.trim(),
            template: templates.defaultId,
            postsPerGroup: perProduct,
            perPost,
          })
          const clean = cleanPosts(data)
          setResult(clean)
          setSelected({})
          setPreview(null)
          setExportResult(null)
          say('分组完成：' + (clean.posts || []).length + ' 组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setRunning(false)
        }
      }

      const remove = async (index) => {
        try {
          const next = posts.filter((_, position) => position !== index)
          const data = await api('/group/session', { posts: next })
          setResult((prev) => ({ ...(prev || {}), posts: data.session?.posts || next }))
          setSelected({})
          setPreview(null)
          say('已移除这一组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const clear = async () => {
        if (!window.confirm('清除今天的分组展示？图片文件不会被删除。')) return
        try {
          await api('/group/clear', {})
          setResult(null)
          setSelected({})
          setPreview(null)
          setExportResult(null)
          say('已清除今天的分组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const exportGroups = async (mode) => {
        if (!selectedPosts.length) { say('请先勾选要导出的组', 'error'); return }
        if (mode === 'move' && !window.confirm('移动会改变原图位置，确定？')) return
        setExporting(true)
        try {
          const data = await api('/group/export', {
            posts: selectedPosts,
            baseFolder: exportFolder || folder,
            mode,
          })
          const next = posts.slice()
          selectedIndexes.forEach((index, position) => {
            if (data.posts && data.posts[position]) next[index] = data.posts[position]
          })
          setResult((prev) => ({ ...(prev || {}), posts: next }))
          setExportResult(data)
          say((mode === 'move' ? '已移动' : '已复制') + '到 ' + data.baseFolder, 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setExporting(false)
        }
      }

      const previewGroups = async () => {
        if (!selectedPosts.length) { say('请先勾选要预览的组', 'error'); return }
        setPreviewBusy(true)
        say('正在生成 ' + selectedPosts.length + ' 组预览（原图直发，不拼图）…', 'info')
        try {
          const data = await api('/group/preview', { posts: selectedPosts })
          setPreview(data.record)
          say('预览已生成，确认后再放入审核', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setPreviewBusy(false)
        }
      }

      const commit = async () => {
        if (!preview) { say('没有可确认的预览', 'error'); return }
        setPreviewBusy(true)
        try {
          await api('/group/commit', { id: preview.id })
          setPreview(null)
          if (onCommitted) await onCommitted()
          say('已放入审核', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setPreviewBusy(false)
        }
      }

      const templateCard = h('div', { key: 'template', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '分组模板'),
            h('span', { key: 'c', className: 'xhs-muted' }, activeTemplate ? activeTemplate.perPost + ' 张/组 · ' + (activeTemplate.strategy === 'diverse' ? '最大差异' : '同产品多角度') : ''),
          ]),
          h('select', {
            key: 'select', className: 'xhs-select', value: templates.defaultId,
            onChange: (event) => saveTemplate(event.target.value),
          }, templates.templates.map((item) => h('option', { key: item.id, value: item.id }, item.name))),
        ]),
      ])

      const runCard = h('div', { key: 'run', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '本地图片分组'),
            h('span', { key: 'c', className: 'xhs-muted' }, '图片放进文件夹后开始'),
          ]),
          h('label', { key: 'folder', className: 'xhs-field' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '图片文件夹'),
            h('input', { key: 'i', className: 'xhs-input', value: folder, onChange: (event) => setFolder(event.target.value) }),
          ]),
          h('div', { key: 'counts', className: 'xhs-riskGrid' }, [
            h('label', { key: 'p', className: 'xhs-riskField' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '每个产品几组'),
              h('input', { key: 'i', className: 'xhs-input', type: 'number', min: 1, max: 20, value: perProduct, onChange: (event) => setPerProduct(Number(event.target.value)) }),
            ]),
            h('label', { key: 'n', className: 'xhs-riskField' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '每组几张'),
              h('input', { key: 'i', className: 'xhs-input', type: 'number', min: 3, max: 5, value: perPost, onChange: (event) => setPerPost(Number(event.target.value)) }),
            ]),
          ]),
          h('div', { key: 'actions', className: 'xhs-row' }, [
            h('button', { key: 'run', type: 'button', className: 'xhs-btn', 'data-kind': 'primary', disabled: running, onClick: run }, running ? '分组中…' : '开始分组'),
            result ? h('button', { key: 'clear', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost', onClick: clear }, '清除当天分组') : null,
          ]),
        ]),
      ])

      const resultCard = result && posts.length ? h('div', { key: 'result', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '分组结果'),
            h('div', { key: 'right', className: 'xhs-row' }, [
              h('span', { key: 'c', className: 'xhs-muted' }, selectedCount + ' / ' + posts.length + ' 组已选'),
              h('button', { key: 'all', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => setSelected(Object.fromEntries(posts.map((_, index) => [index, true]))) }, '全选'),
              h('button', { key: 'none', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => setSelected(Object.fromEntries(posts.map((_, index) => [index, false]))) }, '清空'),
            ]),
          ]),
          ...(result.groups || []).filter((group) => group.label !== '未识别').map((group) => {
            const groupPosts = posts.map((post, index) => ({ post, index })).filter((item) => item.post.product === group.label)
            if (!groupPosts.length) return null
            return h(ProductBlock, {
              key: group.label,
              group,
              items: groupPosts,
              selected,
              onToggle: (index, checked) => setSelected((prev) => ({ ...prev, [index]: checked })),
              onRemove: remove,
            })
          }).filter(Boolean),
          h('div', { key: 'hint', className: 'xhs-hint' }, '勾选需要的组，再预览或导出；每组 4-5 张原图，不拼图。'),
        ]),
      ]) : null

      const exportCard = result && posts.length ? h('div', { key: 'export', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '导出到子文件夹'),
            h('span', { key: 'c', className: 'xhs-muted' }, exportResult ? exportResult.baseFolder : '已选 ' + selectedCount + ' 组'),
          ]),
          h('label', { key: 'folder', className: 'xhs-field' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '根目录'),
            h('input', { key: 'i', className: 'xhs-input', value: exportFolder, onChange: (event) => setExportFolder(event.target.value) }),
          ]),
          h('div', { key: 'actions', className: 'xhs-row' }, [
            h('button', { key: 'copy', type: 'button', className: 'xhs-btn', 'data-kind': 'primary', disabled: exporting, onClick: () => exportGroups('copy') }, exporting ? '导出中…' : '复制到子文件夹'),
            h('button', { key: 'move', type: 'button', className: 'xhs-btn', disabled: exporting, onClick: () => exportGroups('move') }, '移动原图'),
            h('button', { key: 'preview', type: 'button', className: 'xhs-btn', disabled: previewBusy, onClick: previewGroups }, previewBusy ? '生成中…' : '预览 ' + selectedCount + ' 组'),
          ]),
        ]),
      ]) : null

      const previewCard = preview && preview.jobs ? h('div', { key: 'previewCard', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '预览效果 · ' + preview.jobs.length + ' 组（原图直发）'),
            h('div', { key: 'right', className: 'xhs-row' }, [
              h('button', { key: 'commit', type: 'button', className: 'xhs-btn', 'data-kind': 'primary', disabled: previewBusy, onClick: commit }, previewBusy ? '放入中…' : '确认放入审核'),
              h('button', { key: 'cancel', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost', onClick: () => setPreview(null) }, '取消预览'),
            ]),
          ]),
          h('div', { key: 'list', className: 'xhs-groupPosts' }, preview.jobs.map((job, index) => h(PreviewGroup, { key: index, job }))),
        ]),
      ]) : null

      return h('div', { className: 'xhs-groupStudio', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        templateCard,
        runCard,
        resultCard,
        exportCard,
        previewCard,
      ])
    }

    function XhsStudio({ t, openBrowser }) {
      const [step, setStep] = useState(0)
      const [status, setStatus] = useState({ browser: 'off', loggedIn: false, nickname: '', defaultAccount: 'default', busy: '', published: false })
      const [shotAt, setShotAt] = useState(Date.now())
      const [shotOk, setShotOk] = useState(true)
      const [booting, setBooting] = useState(false)
      const [toast, setToast] = useState(null)

      const [images, setImages] = useState([])
      const [dragOver, setDragOver] = useState(false)
      const [groups, setGroups] = useState([])
      const [groupConfirm, setGroupConfirm] = useState(false)
      const [groupBusy, setGroupBusy] = useState(false)
      const [groupAt, setGroupAt] = useState('')
      const fileInput = useRef(null)

      const [prompt, setPrompt] = useState('')
      const [series, setSeries] = useState('')
      const [title, setTitle] = useState('')
      const [body, setBody] = useState('')
      const [tags, setTags] = useState([])
      const [tagDraft, setTagDraft] = useState('')
      const [generating, setGenerating] = useState(false)
      const [collage, setCollage] = useState('')

      const [phone, setPhone] = useState('')
      const [code, setCode] = useState('')
      const [addAccountOpen, setAddAccountOpen] = useState(false)
      const [addMode, setAddMode] = useState('qr')
      const [newAccountName, setNewAccountName] = useState('')
      const [qrOpen, setQrOpen] = useState(false)
      const [qrAt, setQrAt] = useState(Date.now())
      const [windowVisible, setWindowVisible] = useState(false)
      const rootRef = useRef(null)
      const [smsBusy, setSmsBusy] = useState('')

      const [includeOriginals, setIncludeOriginals] = useState(true)
      const [drafting, setDrafting] = useState(false)
      const [publishShot, setPublishShot] = useState(0)
      const [confirm, setConfirm] = useState(false)
      const [submitting, setSubmitting] = useState(false)
      const [publishResult, setPublishResult] = useState('')
      const [draftInfo, setDraftInfo] = useState(null)
      const [history, setHistory] = useState([])
      const [schedules, setSchedules] = useState([])
      const [staging, setStaging] = useState([])
      const [stagingEdits, setStagingEdits] = useState({})
      const [stagingEditing, setStagingEditing] = useState({})
      const [stagingBusy, setStagingBusy] = useState(false)
      const [riskAck, setRiskAck] = useState(false)
      const [coverPreview, setCoverPreview] = useState(null)
      const [accountHealth, setAccountHealth] = useState({})
      const [healthBusy, setHealthBusy] = useState(false)
      const [groupTemplates, setGroupTemplates] = useState({ defaultId: 'multi-angle-4', templates: DEFAULT_GROUP_TEMPLATES })
      const [templateBusy, setTemplateBusy] = useState(false)
      const [groupFolder, setGroupFolder] = useState('C:\\Users\\23529\\Desktop\\photo\\10.13茶叶')
      const [groupExportFolder, setGroupExportFolder] = useState('C:\\Users\\23529\\Desktop\\photo\\10.13茶叶')
      const [groupExporting, setGroupExporting] = useState(false)
      const [groupExportResult, setGroupExportResult] = useState(null)
      const [groupRunning, setGroupRunning] = useState(false)
      const [groupStaging, setGroupStaging] = useState(false)
      const [groupResult, setGroupResult] = useState(null)
      const [selectedGroups, setSelectedGroups] = useState({})
      const [groupPreview, setGroupPreview] = useState(null)
      const [groupPreviewBusy, setGroupPreviewBusy] = useState(false)
      const [groupPostsPerGroup, setGroupPostsPerGroup] = useState(7)
      const [groupPerPost, setGroupPerPost] = useState(4)
      const [riskConfig, setRiskConfig] = useState({
        dailyLimit: 1,
        minIntervalHours: 4,
        maxAccountsPerBatch: 20,
        staggerMinMinutes: 3,
        staggerMaxMinutes: 20,
        manualOnly: true,
      })
      const [riskConfigBusy, setRiskConfigBusy] = useState(false)
      const [riskEditing, setRiskEditing] = useState(false)
      const [showStagingHistory, setShowStagingHistory] = useState(false)
      const [prompts, setPrompts] = useState([])
      const [promptOpen, setPromptOpen] = useState(false)
      const [promptBusy, setPromptBusy] = useState(false)
      const [promptId, setPromptId] = useState('')
      const [promptName, setPromptName] = useState('')
      const [promptContent, setPromptContent] = useState('')
      const [promptIsDefault, setPromptIsDefault] = useState(false)
      const [risk, setRisk] = useState(null)
      const [riskBusy, setRiskBusy] = useState(false)
      const [riskWordOpen, setRiskWordOpen] = useState(false)
      const [riskWordText, setRiskWordText] = useState('')
      const [riskWordBusy, setRiskWordBusy] = useState(false)

      const [knowledge, setKnowledge] = useState({ root: '', files: [] })
      const [knowledgeFile, setKnowledgeFile] = useState('')
      const [knowledgeText, setKnowledgeText] = useState('')
      const [knowledgeBusy, setKnowledgeBusy] = useState(false)
      const [moreTab, setMoreTab] = useState('staging')

      const busy = Boolean(status.busy) || generating || drafting || submitting || smsBusy

      const accountLabel = (name) => {
        const info = (status.accountsInfo || []).find((item) => item.name === name)
        return (info && info.nickname) || name || '未命名账号'
      }

      const suggestAccountName = (list) => {
        const names = new Set((list || []).map((item) => item.name))
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
          const name = '账号' + letter
          if (!names.has(name)) return name
        }
        return '账号' + ((list || []).length + 1)
      }

      const TITLE_TEMPLATES = []
      const COVER_STYLES = {
        classic: '经典',
        warm: '暖色',
        magazine: '杂志',
        minimal: '极简',
        film: '胶片',
        festive: '节日红',
      }

      const toggleStagingEditing = (id) => {
        setStagingEditing((prev) => ({ ...prev, [id]: !prev[id] }))
      }

      const say = useCallback((text, kind = 'info') => {
        setToast({ text, kind, at: Date.now() })
      }, [])

      useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 6000)
        return () => clearTimeout(timer)
      }, [toast])

      useEffect(() => {
        api('/group/today').then((data) => {
          if (!data.session) return
          setGroupResult(data.session)
          setSelectedGroups({})
          if (data.session.baseFolder) setGroupExportResult({ baseFolder: data.session.baseFolder })
        }).catch(() => {})
      }, [])

      useEffect(() => {
        api('/group/templates').then((data) => setGroupTemplates({
          defaultId: data.defaultId || 'multi-angle-4',
          templates: Array.isArray(data.templates) && data.templates.length ? data.templates : DEFAULT_GROUP_TEMPLATES,
        })).catch(() => {})
      }, [])

      useEffect(() => {
        let stop = false
        let timer
        const tick = async () => {
          try {
            const next = await api('/status')
            if (stop) return
            setStatus(next)
          } catch {}
          if (!stop) timer = setTimeout(tick, 3000)
        }
        tick()
        return () => { stop = true; clearTimeout(timer) }
      }, [])

      useEffect(() => {
        if (status.loggedIn && qrOpen) setQrOpen(false)
      }, [status.loggedIn, qrOpen])

      useEffect(() => {
        if (status.browser !== 'ready' || step === 1) return undefined
        const timer = setInterval(() => {
          setShotOk(true)
          setShotAt(Date.now())
        }, 4000)
        return () => clearInterval(timer)
      }, [status.browser, step])

      // 拼图随图片与标题变化重绘
      useEffect(() => {
        let cancelled = false
        const run = () => {
          try {
            const next = renderCollage(images, title)
            if (!cancelled) setCollage(next)
          } catch {}
        }
        const timer = setTimeout(run, 120)
        return () => { cancelled = true; clearTimeout(timer) }
      }, [images, title])

      const addFiles = useCallback(async (fileList) => {
        const files = Array.from(fileList || []).filter((file) => /^image\//.test(file.type))
        if (!files.length) return
        const room = 9 - images.length
        if (room <= 0) { say('最多 9 张图片', 'error'); return }
        const picked = files.slice(0, room)
        const next = []
        for (const file of picked) {
          try {
            const dataUrl = await readFile(file)
            const el = await loadImage(dataUrl)
            next.push({
              id: Math.random().toString(36).slice(2),
              name: file.name || 'image',
              dataUrl,
              width: el.naturalWidth,
              height: el.naturalHeight,
              el,
            })
          } catch {}
        }
        if (next.length) setImages((current) => [...current, ...next].slice(0, 9))
      }, [images.length, say])

      const newGroupId = () => Math.random().toString(36).slice(2)

      const addGroup = () => {
        setGroups((current) => [...current, {
          id: newGroupId(),
          account: status.account || 'default',
          images: [],
          prompt: '',
        }])
        setGroupConfirm(false)
      }

      const updateGroup = (id, patch) => {
        setGroups((current) => current.map((group) => (group.id === id ? { ...group, ...patch } : group)))
        setGroupConfirm(false)
      }

      const removeGroup = (id) => {
        setGroups((current) => current.filter((group) => group.id !== id))
        setGroupConfirm(false)
      }

      const addGroupFiles = async (id, fileList) => {
        const files = Array.from(fileList || []).filter((file) => /^image\//.test(file.type))
        if (!files.length) return
        const group = groups.find((item) => item.id === id)
        const room = 9 - (group?.images.length || 0)
        if (room <= 0) { say('每组最多 9 张图片', 'error'); return }
        const next = []
        for (const file of files.slice(0, room)) {
          try {
            next.push({
              id: Math.random().toString(36).slice(2),
              name: file.name || 'image',
              dataUrl: await readFile(file),
            })
          } catch {}
        }
        if (!next.length) return
        setGroups((current) => current.map((item) => (
          item.id === id ? { ...item, images: [...item.images, ...next].slice(0, 9) } : item
        )))
        setGroupConfirm(false)
      }

      const removeGroupImage = (id, imageId) => {
        setGroups((current) => current.map((group) => (
          group.id === id ? { ...group, images: group.images.filter((image) => image.id !== imageId) } : group
        )))
        setGroupConfirm(false)
      }

      const groupPayload = () => groups.map((group) => ({
        account: group.account,
        images: group.images.map((image) => image.dataUrl),
        prompt: group.prompt || '',
      }))

      const publishGroups = async () => {
        if (!groups.length) return
        if (groups.some((group) => !group.images.length)) { say('每个分组至少需要 1 张图片', 'error'); return }
        setGroupBusy(true)
        try {
          const result = await api('/publish/groups', { groups: groupPayload(), publish: true })
          const okCount = (result.results || []).filter((item) => item.ok).length
          say(`分组发布完成 ${okCount}/${(result.results || []).length}`, result.ok ? 'ok' : 'error')
          await loadHistory()
          setGroupConfirm(false)
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupBusy(false)
        }
      }

      const scheduleGroups = async () => {
        if (!groups.length) return
        if (groups.some((group) => !group.images.length)) { say('每个分组至少需要 1 张图片', 'error'); return }
        if (!groupAt) { say('请选择定时时间', 'error'); return }
        const time = new Date(groupAt)
        if (Number.isNaN(time.getTime())) { say('定时时间格式不正确', 'error'); return }
        setGroupBusy(true)
        try {
          await api('/schedule/groups', { at: time.toISOString(), groups: groupPayload() })
          say('已加入定时：' + time.toLocaleString('zh-CN', { hour12: false }), 'ok')
          setGroupAt('')
          setGroupConfirm(false)
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupBusy(false)
        }
      }

      // 拖拽只在右侧面板内生效，阻止事件冒泡到中间的对话输入框
      useEffect(() => {
        const insidePanel = (event) => {
          const root = rootRef.current
          if (!root) return false
          const target = event.target
          if (target && (target === root || root.contains(target))) return true
          const rect = root.getBoundingClientRect()
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
        }
        const insideGroup = (event) => event.target instanceof Element && Boolean(event.target.closest('[data-xhs-group]'))
        const intercept = (event) => {
          if (insideGroup(event)) return
          if (!insidePanel(event)) return
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          if (step === 0) setDragOver(true)
        }
        const onDrop = (event) => {
          if (insideGroup(event)) return
          if (!insidePanel(event)) return
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          setDragOver(false)
          if (step === 0) addFiles(event.dataTransfer?.files)
        }
        const onLeave = (event) => {
          if (!insidePanel(event)) return
          setDragOver(false)
        }
        window.addEventListener('dragenter', intercept, true)
        window.addEventListener('dragover', intercept, true)
        window.addEventListener('drop', onDrop, true)
        window.addEventListener('dragleave', onLeave, true)
        return () => {
          window.removeEventListener('dragenter', intercept, true)
          window.removeEventListener('dragover', intercept, true)
          window.removeEventListener('drop', onDrop, true)
          window.removeEventListener('dragleave', onLeave, true)
        }
      }, [step, addFiles])

      const loadHistory = useCallback(async () => {
        try {
          const data = await api('/publish/history')
          setHistory(data.items || [])
        } catch {}
      }, [])

      useEffect(() => { loadHistory() }, [loadHistory])

      const openHistory = (item) => {
        const url = item.url || 'https://creator.xiaohongshu.com/new/note-manager'
        if (typeof openBrowser === 'function') openBrowser(url)
        else window.open(url, '_blank')
      }

      const deleteHistory = async (id) => {
        if (!window.confirm('删除这条发布记录？只影响插件的每日风控计数，不会删除小红书上的笔记。')) return
        try {
          await api('/publish/history/delete', { id })
          await loadHistory()
          say('已删除发布记录，不再计入每日上限', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const loadSchedules = useCallback(async () => {
        try {
          const data = await api('/schedule')
          setSchedules(Array.isArray(data.items) ? data.items : [])
        } catch {}
      }, [])

      useEffect(() => {
        loadSchedules()
        const timer = setInterval(loadSchedules, 5000)
        return () => clearInterval(timer)
      }, [loadSchedules])

      const cancelSchedule = async (id) => {
        try {
          await api('/schedule/cancel', { id })
          await loadSchedules()
          await loadStaging()
          say('已取消定时任务', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const deleteSchedule = async (id) => {
        try {
          await api('/schedule/delete', { id })
          await loadSchedules()
          say('已删除定时任务', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const loadStaging = useCallback(async () => {
        try {
          const data = await api('/staging')
          setStaging(Array.isArray(data.items) ? data.items : [])
        } catch {}
      }, [])

      useEffect(() => {
        loadStaging()
        const timer = setInterval(loadStaging, 4000)
        return () => clearInterval(timer)
      }, [loadStaging])

      const loadRiskConfig = useCallback(async () => {
        try {
          const data = await api('/risk/config')
          if (data?.config) setRiskConfig((prev) => ({ ...prev, ...data.config }))
        } catch {}
      }, [])

      useEffect(() => { loadRiskConfig() }, [loadRiskConfig])

      const updateRiskConfig = (patch) => setRiskConfig((prev) => ({ ...prev, ...patch }))

      const saveRiskConfig = async () => {
        setRiskConfigBusy(true)
        try {
          const data = await api('/risk/config', { config: riskConfig })
          if (data?.config) setRiskConfig((prev) => ({ ...prev, ...data.config }))
          setRiskEditing(false)
          say('风控设置已保存并生效', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setRiskConfigBusy(false)
        }
      }

      const cancelRiskEdit = async () => {
        setRiskEditing(false)
        await loadRiskConfig()
        say('已取消修改', 'info')
      }

      const publishStaged = async (id) => {
        setStagingBusy(true)
        try {
          await saveStagedEdits(id)
          const result = await api('/staging/publish', { id })
          await loadStaging()
          await loadHistory()
          say(result.record?.status === 'published' ? '已发布' : '发布失败，请查看原因', result.record?.status === 'published' ? 'ok' : 'error')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const publishStagedJob = async (id, jobIndex) => {
        setStagingBusy(true)
        try {
          await saveStagedEdits(id)
          const result = await api('/staging/publish', { id, job: jobIndex })
          await loadStaging()
          await loadHistory()
          say(result.result?.published ? '这个账号已发布' : '发布失败，请查看原因', result.result?.published ? 'ok' : 'error')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const scheduleStaged = async (id) => {
        setStagingBusy(true)
        try {
          await saveStagedEdits(id)
          const result = await api('/staging/publish', { id, mode: 'stagger' })
          await loadStaging()
          say('已按账号错峰定时，间隔随机 3-20 分钟', 'ok')
          return result
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const changeCoverStyle = async (recordId, jobIndex, style) => {
        setStagingBusy(true)
        try {
          await api('/staging/cover', { id: recordId, job: jobIndex, style })
          await loadStaging()
          say('拼图模板已更新', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const cancelStaged = async (id) => {
        if (!window.confirm('驳回整组待发布内容？已设置的定时也会取消。')) return
        try {
          await api('/staging/cancel', { id })
          await loadStaging()
          await loadSchedules()
          say('已驳回整组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const cancelStagedJob = async (id, jobIndex) => {
        if (!window.confirm('驳回这个账号的待发布内容？其他账号不受影响。')) return
        setStagingBusy(true)
        try {
          await api('/staging/cancel', { id, job: jobIndex })
          await loadStaging()
          await loadSchedules()
          say('已驳回这个账号', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const scheduleStagedJob = async (id, jobIndex, at) => {
        if (!at) { say('请选择定时时间', 'error'); return }
        const time = new Date(at)
        if (Number.isNaN(time.getTime())) { say('定时时间格式不正确', 'error'); return }
        if (time.getTime() <= Date.now() + 3000) { say('定时时间必须晚于现在', 'error'); return }
        setStagingBusy(true)
        try {
          await saveStagedEdits(id)
          await api('/staging/schedule', { id, job: jobIndex, at: time.toISOString() })
          await loadStaging()
          await loadSchedules()
          say('已定时：' + time.toLocaleString('zh-CN', { hour12: false }), 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const cancelJobSchedule = async (scheduleId) => {
        if (!scheduleId) return
        setStagingBusy(true)
        try {
          await api('/schedule/cancel', { id: scheduleId })
          await loadStaging()
          await loadSchedules()
          say('已取消这个账号的定时', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const deleteStaged = async (id) => {
        try {
          await api('/staging/delete', { id })
          await loadStaging()
          say('已删除审核记录', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const toLocalInput = (iso) => {
        if (!iso) return ''
        const date = new Date(iso)
        if (Number.isNaN(date.getTime())) return ''
        const pad = (value) => String(value).padStart(2, '0')
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
      }

      const stagedEdit = (recordId, job, index) => {
        const stored = stagingEdits[recordId]?.[index] || {}
        return {
          title: stored.title ?? job.title ?? '',
          body: stored.body ?? job.body ?? '',
          tags: stored.tags ?? (job.tags || []).join(' '),
          scheduleAt: stored.scheduleAt ?? toLocalInput(job.scheduledAt),
        }
      }

      const setStagedEdit = (recordId, index, patch) => {
        setStagingEdits((prev) => ({
          ...prev,
          [recordId]: {
            ...(prev[recordId] || {}),
            [index]: { ...(prev[recordId]?.[index] || {}), ...patch },
          },
        }))
      }

      const saveStagedEdits = async (id) => {
        const record = staging.find((item) => item.id === id)
        if (!record) return false
        const edits = stagingEdits[id] || {}
        if (!Object.keys(edits).length) return false
        const jobs = record.jobs.map((job, index) => {
          const edit = edits[index] || {}
          return {
            title: edit.title ?? job.title,
            body: edit.body ?? job.body,
            tags: String(edit.tags ?? (job.tags || []).join(' ')).split(/[,，\s#]+/).filter(Boolean),
          }
        })
        await api('/staging/update', { id, jobs })
        setStagingEdits((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        await loadStaging()
        return true
      }

      const saveStaged = async (id) => {
        setStagingBusy(true)
        try {
          const saved = await saveStagedEdits(id)
          await loadStaging()
          say(saved ? '修改已保存' : '没有修改', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const addStagingImages = async (recordId, jobIndex, files) => {
        const list = Array.from(files || [])
        if (!list.length) return
        setStagingBusy(true)
        try {
          const dataUrls = await Promise.all(list.map((file) => new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('读取图片失败'))
            reader.readAsDataURL(file)
          })))
          await api('/staging/image', { id: recordId, job: jobIndex, action: 'add', images: dataUrls })
          await loadStaging()
          say('已添加图片，封面已重做', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const removeStagingImage = async (recordId, jobIndex, index) => {
        setStagingBusy(true)
        try {
          await api('/staging/image', { id: recordId, job: jobIndex, action: 'remove', index })
          await loadStaging()
          say('已删除图片，封面已重做', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const changeStagingAccount = async (recordId, jobIndex, account) => {
        setStagingBusy(true)
        try {
          await api('/staging/account', { id: recordId, job: jobIndex, account })
          await loadStaging()
          say('已切换分组账号', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setStagingBusy(false)
        }
      }

      const loadPrompts = useCallback(async () => {
        try {
          const data = await api('/prompts')
          setPrompts(Array.isArray(data.items) ? data.items : [])
        } catch {}
      }, [])

      useEffect(() => { loadPrompts() }, [loadPrompts])

      const openPromptLibrary = async () => {
        await loadPrompts()
        setPromptOpen(true)
      }

      const newPrompt = () => {
        setPromptId('')
        setPromptName('')
        setPromptContent('')
        setPromptIsDefault(false)
      }

      const editPrompt = (item) => {
        setPromptId(item.id || '')
        setPromptName(item.name || '')
        setPromptContent(item.content || '')
        setPromptIsDefault(Boolean(item.isDefault))
      }

      const savePrompt = async () => {
        if (!promptContent.trim()) { say('提示词内容不能为空', 'error'); return }
        setPromptBusy(true)
        try {
          await api('/prompts', {
            action: 'save',
            prompt: {
              id: promptId || undefined,
              name: promptName.trim() || '未命名提示词',
              content: promptContent.trim(),
              isDefault: promptIsDefault,
            },
          })
          await loadPrompts()
          say('提示词已保存', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setPromptBusy(false)
        }
      }

      const deletePrompt = async (id) => {
        try {
          await api('/prompts', { action: 'delete', id })
          await loadPrompts()
          say('已删除提示词', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const setPromptDefault = async (id) => {
        try {
          await api('/prompts', { action: 'default', id })
          await loadPrompts()
          say('已设为默认提示词', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const move = (index, delta) => {
        setImages((current) => {
          const target = index + delta
          if (target < 0 || target >= current.length) return current
          const next = current.slice()
          const [item] = next.splice(index, 1)
          next.splice(target, 0, item)
          return next
        })
      }

      const startLogin = async () => {
        setBooting(true)
        say('正在检测账号登录状态…', 'info')
        try {
          const result = await api('/login/start', {})
          setShotOk(true)
          setShotAt(Date.now())
          if (result.login?.loggedIn) {
            say('检测到已登录' + (result.login.nickname ? ' · ' + result.login.nickname : '') + '，无需重新扫码', 'ok')
          } else {
            say('未检测到登录，已打开登录页，请扫码或验证码登录', 'info')
          }
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setBooting(false)
        }
      }

      const switchAccount = async (name) => {
        setBooting(true)
        say('正在检测「' + name + '」的登录状态…', 'info')
        try {
          const result = await api('/login/start', { account: name })
          setShotOk(true)
          setShotAt(Date.now())
          if (result.login?.loggedIn) {
            say('检测到已登录，已切换到「' + name + '」' + (result.login.nickname ? ' · ' + result.login.nickname : ''), 'ok')
          } else {
            say('「' + name + '」未登录，已打开登录页，请在右侧浏览器扫码', 'info')
          }
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setBooting(false)
        }
      }

      const makeDefaultAccount = async (name) => {
        try {
          await api('/accounts/default', { account: name })
          const next = await api('/status')
          setStatus(next)
          say('已设为默认账号：' + name + '（下次启动使用）', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const saveGroupTemplate = async (id) => {
        setTemplateBusy(true)
        try {
          const data = await api('/group/templates', { defaultId: id })
          setGroupTemplates({
            defaultId: data.defaultId || id,
            templates: Array.isArray(data.templates) && data.templates.length ? data.templates : DEFAULT_GROUP_TEMPLATES,
          })
          say('已设为默认分组模板', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setTemplateBusy(false)
        }
      }

      const runLocalGroup = async () => {
        if (!groupFolder.trim()) { say('请填写本地文件夹路径', 'error'); return }
        setGroupRunning(true)
        say('正在本地分组与选图（OCR + pHash 去重，约 5-8 分钟）…', 'info')
        try {
          const data = await api('/group/run', {
            folder: groupFolder.trim(),
            template: groupTemplates.defaultId,
            postsPerGroup: groupPostsPerGroup,
            perPost: groupPerPost,
          })
          setGroupResult(data)
          say('分组完成：' + (data.posts || []).length + ' 组帖子', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupRunning(false)
        }
      }

      const selectedGroupIndexes = () => (groupResult?.posts || []).map((_, index) => index).filter((index) => selectedGroups[index] !== false)
      const selectedGroupPosts = () => {
        const indexes = selectedGroupIndexes()
        return indexes.map((index) => groupResult.posts[index])
      }

      const previewLocalGroup = async () => {
        const posts = selectedGroupPosts()
        if (!posts.length) { say('请先选要预览的分组', 'error'); return }
        setGroupPreviewBusy(true)
        say('正在生成 ' + posts.length + ' 组预览（原图直发，不拼图）…', 'info')
        try {
          const data = await api('/group/preview', { posts })
          setGroupPreview(data.record)
          say('预览已生成，确认后再放入审核', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupPreviewBusy(false)
        }
      }

      const exportLocalGroup = async (mode) => {
        const posts = selectedGroupPosts()
        if (!posts.length) { say('请先选要导出的分组', 'error'); return }
        if (mode === 'move' && !window.confirm('移动会把原图从原文件夹移到 _分组结果 子文件夹，确定？')) return
        setGroupExporting(true)
        try {
          const data = await api('/group/export', {
            posts,
            baseFolder: groupExportFolder || groupFolder,
            mode,
          })
          const indexes = selectedGroupIndexes()
          setGroupResult((prev) => {
            if (!prev) return prev
            const next = (prev.posts || []).slice()
            indexes.forEach((index, position) => {
              if (data.posts && data.posts[position]) next[index] = data.posts[position]
            })
            return { ...prev, posts: next }
          })
          setGroupExportResult(data)
          say((mode === 'move' ? '已移动' : '已复制') + '到子文件夹：' + data.baseFolder, 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupExporting(false)
        }
      }

      const removeGroupPost = async (index) => {
        if (!groupResult) return
        const posts = (groupResult.posts || []).filter((_, position) => position !== index)
        try {
          const data = await api('/group/session', { posts })
          setGroupResult((prev) => ({ ...(prev || {}), posts: data.session?.posts || posts }))
          setSelectedGroups({})
          setGroupPreview(null)
          say('已移除这一组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const clearTodayGroups = async () => {
        if (!window.confirm('清除今天的分组结果？图片文件不会被删除，只清空分组展示。')) return
        try {
          await api('/group/clear', {})
          setGroupResult(null)
          setSelectedGroups({})
          setGroupPreview(null)
          setGroupExportResult(null)
          say('已清除今天的分组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const commitLocalGroup = async () => {
        if (!groupPreview) { say('没有预览可确认', 'error'); return }
        setGroupPreviewBusy(true)
        try {
          const data = await api('/group/commit', { id: groupPreview.id })
          await loadStaging()
          setGroupPreview(null)
          setStep(2)
          setMoreTab('staging')
          say('已放入审核：' + (data.record?.jobs?.length || 0) + ' 组', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGroupPreviewBusy(false)
        }
      }

      const checkAllAccounts = async () => {        setHealthBusy(true)
        say('正在逐个检测账号（会切换浏览器，约 10 秒/个）…', 'info')
        try {
          const result = await api('/accounts/check', {})
          const map = {}
          for (const item of result.accounts || []) map[item.account] = item
          setAccountHealth(map)
          setShotAt(Date.now())
          const total = (result.accounts || []).length
          const logged = (result.accounts || []).filter((item) => item.loggedIn).length
          say('检测完成：' + logged + '/' + total + ' 个账号已登录', logged === total ? 'ok' : 'info')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setHealthBusy(false)
        }
      }

      const removeAccount = async (name) => {
        if (!window.confirm('确定删除账号「' + name + '」？会同时删除它的本地登录资料。')) return
        try {
          await api('/accounts/delete', { account: name })
          say('已删除账号「' + name + '」', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const createAccount = async () => {
        const name = newAccountName.trim()
        if (!name) { say('请填写账号名称', 'error'); return }
        if (name.length > 40) { say('账号名称最多 40 个字', 'error'); return }
        setAddAccountOpen(false)
        await switchAccount(name)
      }

      const sendCode = async () => {
        const name = newAccountName.trim()
        if (!name) { say('请填写账号名称', 'error'); return }
        if (!phone.trim()) { say('请填写手机号', 'error'); return }
        setSmsBusy('send')
        try {
          const started = await api('/login/start', { account: name })
          setShotAt(Date.now())
          if (started.login?.loggedIn) {
            setAddAccountOpen(false)
            say('账号已登录', 'ok')
            return
          }
          await api('/login/sms/send', { phone: phone.trim() })
          setShotAt(Date.now())
          say(t('sms.sent'), 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setSmsBusy('')
        }
      }

      const submitCode = async () => {
        if (!newAccountName.trim()) { say('请填写账号名称', 'error'); return }
        if (!phone.trim() || !code.trim()) { say('请填写手机号和验证码', 'error'); return }
        setSmsBusy('submit')
        try {
          const result = await api('/login/sms/submit', { phone: phone.trim(), code: code.trim() })
          setShotAt(Date.now())
          if (result.loggedIn) {
            setAddAccountOpen(false)
            say(t('status.loggedIn'), 'ok')
          } else {
            say(t('status.loggedOut'), 'error')
          }
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setSmsBusy('')
        }
      }

      const logout = async () => {
        try {
          await api('/logout', {})
          setShotAt(Date.now())
          say(t('status.loggedOut'))
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const toggleWindow = async (visible) => {
        try {
          await api(visible ? '/browser/show' : '/browser/hide', {})
          setWindowVisible(visible)
          say(visible ? '浏览器窗口已移到屏幕内，可直接操作' : '浏览器窗口已移出屏幕', 'ok')
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const generate = async () => {
        if (!prompt.trim()) { say(t('error.noPrompt'), 'error'); return }
        setGenerating(true)
        try {
          const result = await api('/generate', {
            prompt: prompt.trim(),
            imageCount: Math.max(1, images.length),
            series: series.trim(),
          })
          setTitle(result.title)
          setBody(result.body)
          setTags(Array.isArray(result.tags) ? result.tags.slice(0, 10) : [])
          setRisk(result.risk || null)
          say('文案已生成，可继续修改', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setGenerating(false)
        }
      }

      const addTag = () => {
        const value = tagDraft.replace(/^#+/, '').trim()
        if (!value) return
        if (tags.length >= 10) { say('最多 10 个标签', 'error'); return }
        if (!tags.includes(value)) setTags([...tags, value])
        setTagDraft('')
      }

      const checkRiskNow = async () => {
        setRiskBusy(true)
        try {
          const result = await api('/risk/check', { title, body, tags })
          setRisk(result)
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setRiskBusy(false)
        }
      }

      const openRiskWords = async () => {
        try {
          const data = await api('/risk/words')
          setRiskWordText(data.text || '')
          setRiskWordOpen(true)
        } catch (error) {
          say(error.message, 'error')
        }
      }

      const saveRiskWords = async () => {
        setRiskWordBusy(true)
        try {
          const data = await api('/risk/words', { text: riskWordText })
          setRiskWordText(data.text || riskWordText)
          setRiskWordOpen(false)
          await checkRiskNow()
          say('词库已保存并重新检测', 'ok')
        } catch (error) {
          say(error.message, 'error')
        } finally {
          setRiskWordBusy(false)
        }
      }

      const applyRiskIssues = (issues) => {
        let nextTitle = title
        let nextBody = body
        let nextTags = tags.slice()
        for (const issue of issues) {
          const replace = (text) => issue.suggestion
            ? text.split(issue.word).join(issue.suggestion)
            : text.split(issue.word).join('')
          nextTitle = replace(nextTitle)
          nextBody = replace(nextBody)
          nextTags = nextTags.map(replace)
        }
        setTitle(nextTitle)
        setBody(nextBody)
        setTags(nextTags)
        api('/risk/check', { title: nextTitle, body: nextBody, tags: nextTags })
          .then(setRisk)
          .catch(() => {})
      }

      const fillDraft = async () => {
        if (!status.loggedIn) { say(t('error.loginRequired'), 'error'); return }
        if (!collage) { say(t('error.noImages'), 'error'); return }
        if (!title.trim() || !body.trim()) { say(t('error.noContent'), 'error'); return }
        setDrafting(true)
        setPublishResult('')
        try {
          const result = await api('/publish/draft', {
            title: title.trim().slice(0, 20),
            body: body.trim(),
            tags,
            images: collage,
            originals: includeOriginals ? images.map((image) => image.dataUrl) : [],
          })
          setDraftInfo(result)
          setPublishShot(Date.now())
          setConfirm(false)
          const actual = result.pageInfo?.imageCount
          const requested = result.uploaded
          if (actual != null && requested != null && actual < requested) {
            say(`小红书只保留了 ${actual}/${requested} 张图片，请确认后再发布`, 'error')
          } else {
            say(t('publish.filled'), 'ok')
          }
        } catch (error) {
          setPublishShot(Date.now())
          say(error.message, 'error')
        } finally {
          setDrafting(false)
        }
      }

      const submit = async () => {
        if (!confirm) { say(t('error.confirm'), 'error'); return }
        setSubmitting(true)
        try {
          const result = await api('/publish/submit', {})
          setPublishShot(Date.now())
          setPublishResult(result.published ? t('publish.done') : t('publish.unknown'))
          say(result.published ? t('publish.done') : t('publish.unknown'), result.published ? 'ok' : 'info')
          await loadHistory()
        } catch (error) {
          setPublishShot(Date.now())
          say(error.message, 'error')
        } finally {
          setSubmitting(false)
        }
      }

      const mirrorSrc = useMemo(() => '/xhs/api/screenshot?t=' + shotAt, [shotAt])
      const publishSrc = useMemo(() => '/xhs/api/screenshot?t=' + publishShot, [publishShot])

      const missing = []
      if (!images.length) missing.push('图片')
      if (!title.trim()) missing.push('标题')
      if (!body.trim()) missing.push('正文')

      useEffect(() => {
        let stop = false
        api('/knowledge').then((data) => {
          if (!stop) setKnowledge({ root: data.root || '', files: Array.isArray(data.files) ? data.files : [] })
        }).catch(() => {})
        return () => { stop = true }
      }, [])

      const loadKnowledge = async () => {
        try {
          const data = await api('/knowledge')
          setKnowledge({ root: data.root || '', files: Array.isArray(data.files) ? data.files : [] })
          say('知识包已重新读取', 'ok')
        } catch (error) { say(error.message, 'error') }
      }

      const openKnowledgeFile = async (rel) => {
        try {
          const data = await api('/knowledge/file', { path: rel })
          setKnowledgeFile(rel)
          setKnowledgeText(data.text || '')
        } catch (error) { say(error.message, 'error') }
      }

      const saveKnowledgeFile = async () => {
        if (!knowledgeFile) return
        setKnowledgeBusy(true)
        try {
          await api('/knowledge/save', { path: knowledgeFile, text: knowledgeText })
          say('已保存，规则文件会立即生效', 'ok')
          const data = await api('/knowledge')
          setKnowledge({ root: data.root || '', files: Array.isArray(data.files) ? data.files : [] })
        } catch (error) { say(error.message, 'error') }
        finally { setKnowledgeBusy(false) }
      }

      const revealKnowledge = async (rel) => {
        try { await api('/knowledge/open', rel ? { path: rel } : {}) }
        catch (error) { say(error.message, 'error') }
      }

      const head = h('div', { className: 'xhs-head' }, [
        h('div', { key: 'row', className: 'xhs-titleRow' }, [
          h('span', { key: 'title', className: 'xhs-title' }, t('tab.title')),
          h('span', {
            key: 'chip',
            className: 'xhs-chip',
            'data-state': busy ? 'busy' : status.loggedIn ? 'ok' : undefined,
          }, busy ? t('status.busy') : status.loggedIn ? t('status.loggedIn') + (status.nickname ? ' · ' + status.nickname : '') : status.browser === 'ready' ? t('status.loggedOut') : t('status.browserOff')),
        ]),
        h('div', { key: 'steps', className: 'xhs-steps' }, [
          ['发布', 0],
          ['知识', 1],
          ['更多', 2],
        ].map(([label, index]) => h('button', {
          key: index,
          type: 'button',
          className: 'xhs-step',
          'data-active': step === index,
          onClick: () => setStep(index),
        }, [
          h('span', { key: 'i', className: 'xhs-stepIndex' }, String(index + 1)),
          h('span', { key: 'l' }, label),
        ]))),
      ])

      const loginStep = h('div', { key: 'login', style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, [
        h('div', { key: 'mirror', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, t('label.mirror')),
              h('span', { key: 's', className: 'xhs-muted' }, status.browser === 'ready' ? '1280×960' : ''),
            ]),
            h('div', {
              key: 'screen',
              className: 'xhs-mirror',
              'data-has-image': status.browser === 'ready' && shotOk ? true : undefined,
            },
              status.browser === 'ready' && shotOk
                ? h('img', {
                    src: mirrorSrc,
                    alt: t('label.mirror'),
                    draggable: false,
                    onError: () => setShotOk(false),
                  })
                : h('div', { className: 'xhs-mirrorEmpty' }, t('empty.mirror'))),
          ]),
        ]),
        h('div', { key: 'actions', className: 'xhs-row' }, [
          h('button', {
            key: 'start', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
            disabled: booting || busy, onClick: startLogin,
          }, booting ? t('state.loading') : t('action.start')),
          h('button', {
            key: 'refresh', type: 'button', className: 'xhs-btn',
            disabled: status.browser !== 'ready' || busy,
            onClick: () => { setShotOk(true); setShotAt(Date.now()) },
          }, t('action.refresh')),
          h('button', {
            key: 'checkAll', type: 'button', className: 'xhs-btn',
            disabled: booting || busy || healthBusy, onClick: checkAllAccounts,
          }, healthBusy ? '检测中…' : t('action.checkAll')),
          h('button', {
            key: 'qr', type: 'button', className: 'xhs-btn',
            disabled: busy || status.browser !== 'ready' || status.loggedIn,
            onClick: () => { setQrAt(Date.now()); setQrOpen(true) },
          }, t('action.zoomQr')),
          h('button', {
            key: 'win', type: 'button', className: 'xhs-btn',
            disabled: busy || status.browser !== 'ready',
            onClick: () => toggleWindow(!windowVisible),
          }, windowVisible ? t('action.hideWindow') : t('action.showWindow')),
          h('button', {
            key: 'logout', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
            disabled: busy || !status.loggedIn, onClick: logout,
          }, t('action.logout')),
        ]),
        h('div', { key: 'hint', className: 'xhs-hint' }, t('hint.scan')),
        (() => {
          const list = Array.isArray(status.accountsInfo) && status.accountsInfo.length
            ? status.accountsInfo
            : (status.activeAccount || status.account)
              ? [{ name: status.activeAccount || status.account, nickname: status.nickname || '', lastUsedAt: 0, current: true }]
              : []
          return h('div', { key: 'accounts', className: 'xhs-card' }, [
            h('div', { key: 'body', className: 'xhs-cardBody' }, [
              h('div', { key: 'head', className: 'xhs-cardHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, '账号管理'),
                h('div', { key: 'right', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
                  h('span', { key: 'c', className: 'xhs-muted' }, list.length + ' / 20 个账号'),
                  h('button', {
                    key: 'add', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                    disabled: list.length >= 20 || booting || busy,
                    onClick: () => {
                      setNewAccountName(suggestAccountName(list))
                      setAddMode('qr')
                      setPhone('')
                      setCode('')
                      setAddAccountOpen(true)
                    },
                  }, '+ 添加 / 登录'),
                ]),
              ]),
              list.length
                ? list.map((account) => h('div', {
                  key: 'a-' + account.name,
                  className: 'xhs-accountRow',
                  title: account.profileDir || '',
                }, [
                  h('div', { key: 'i', style: { flex: '1 1 auto', minWidth: 0 } }, [
                    h('div', { key: 'n', className: 'xhs-accountName' }, [
                      h('span', { key: 'nick', className: 'xhs-accountNick' }, account.nickname || account.name),
                      account.current ? h('span', { key: 'cur', className: 'xhs-chip', 'data-state': 'ok' }, '当前') : null,
                      account.name === status.defaultAccount ? h('span', { key: 'def', className: 'xhs-chip' }, '默认') : null,
                      (() => {
                        const health = accountHealth[account.name]
                        const logged = health ? Boolean(health.loggedIn) : (account.current ? Boolean(status.loggedIn) : null)
                        if (logged === null) return h('span', { key: 'h', className: 'xhs-chip' }, '未检测')
                        const failed = health && health.error
                        return h('span', {
                          key: 'h',
                          className: 'xhs-chip',
                          'data-state': failed ? 'warn' : (logged ? 'ok' : 'warn'),
                          title: failed || '',
                        }, failed ? '检测失败' : (logged ? '已登录' : '未登录'))
                      })(),
                    ]),
                    h('div', { key: 'meta', className: 'xhs-muted' }, [
                      account.name,
                      account.lastUsedAt ? ' · ' + new Date(account.lastUsedAt).toLocaleString('zh-CN', { hour12: false }) : '',
                    ].join('')),
                  ]),
                  h('button', {
                    key: 'b', type: 'button', className: 'xhs-btn',
                    'data-kind': account.current ? 'ghost' : 'small',
                    disabled: booting || busy || account.current,
                    onClick: () => switchAccount(account.name),
                  }, account.current ? '当前' : '切换'),
                  account.name !== status.defaultAccount
                    ? h('button', {
                        key: 'def', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
                        disabled: booting || busy,
                        onClick: () => makeDefaultAccount(account.name),
                      }, '设为默认')
                    : null,
                  account.name !== 'default' && !account.current
                    ? h('button', {
                        key: 'd', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                        disabled: booting || busy,
                        onClick: () => removeAccount(account.name),
                      }, '删除')
                    : null,
                ]))
                : h('div', { key: 'empty', className: 'xhs-muted' }, '还没有保存的账号'),
            ]),
          ])
        })(),
      ])

      const riskCard = h('div', { key: 'risk', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '风控预检'),
            h('div', { key: 'right', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
              risk ? h('span', {
                key: 'badge',
                className: 'xhs-chip',
                'data-state': risk.level === 'high' ? 'error' : risk.level === 'clean' ? 'ok' : 'warn',
              }, risk.level === 'high' ? '高风险' : risk.level === 'medium' ? '中风险' : risk.level === 'low' ? '低风险' : '通过') : null,
              h('button', {
                key: 'words', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                onClick: openRiskWords,
              }, '词库'),
              h('button', {
                key: 'check', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                disabled: riskBusy || (!title.trim() && !body.trim()),
                onClick: checkRiskNow,
              }, riskBusy ? '检测中…' : '重新检测'),
            ]),
          ]),
          !risk
            ? h('div', { key: 'empty', className: 'xhs-muted' }, '生成文案后自动检测违规词、限流词和隐形风险词')
            : risk.issues.length
              ? h('div', { key: 'list', className: 'xhs-riskList' }, [
                h('div', { key: 'sum', className: 'xhs-muted' }, '发现 ' + risk.issues.length + ' 个风险词，建议修改后再发布'),
                ...risk.issues.map((issue, index) => h('div', { key: 'i' + index, className: 'xhs-riskItem' }, [
                  h('div', { key: 'row', className: 'xhs-riskRow' }, [
                    h('span', { key: 'w', className: 'xhs-riskWord' }, issue.word),
                    h('span', { key: 'c', className: 'xhs-muted' }, issue.category + ' · ' + issue.fields.join('/') + ' · ' + issue.count + ' 次'),
                    h('button', {
                      key: 'fix', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                      onClick: () => applyRiskIssues([issue]),
                    }, issue.suggestion ? '替换为「' + issue.suggestion + '」' : '删除'),
                  ]),
                ])),
                h('div', { key: 'all', className: 'xhs-row' }, [
                  h('button', {
                    key: 'allbtn', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                    onClick: () => applyRiskIssues(risk.issues),
                  }, '全部替换'),
                ]),
              ])
              : h('div', { key: 'clean', className: 'xhs-hint', style: { color: 'var(--dsw-alias-state-success-primary,#0f9d58)' } }, '未发现明显风险词'),
        ]),
      ])

      const accountOptions = Array.isArray(status.accountsInfo) && status.accountsInfo.length
        ? status.accountsInfo
        : [{ name: status.account || 'default', nickname: status.nickname || '' }]

      const groupCard = (group, index) => h('div', {
        key: group.id,
        className: 'xhs-group',
        'data-xhs-group': group.id,
        onDragOver: (event) => { event.preventDefault(); event.stopPropagation() },
        onDrop: (event) => {
          event.preventDefault()
          event.stopPropagation()
          addGroupFiles(group.id, event.dataTransfer?.files)
        },
      }, [
        h('div', { key: 'head', className: 'xhs-groupHead' }, [
          h('span', { key: 'n', className: 'xhs-label' }, '第 ' + (index + 1) + ' 组'),
          h('select', {
            key: 'a',
            className: 'xhs-select',
            value: group.account,
            onChange: (event) => updateGroup(group.id, { account: event.target.value }),
          }, accountOptions.map((account) => h('option', {
            key: account.name,
            value: account.name,
          }, (account.nickname || account.name) + ' · ' + account.name))),
          h('button', {
            key: 'remove', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
            onClick: () => removeGroup(group.id),
          }, '移除'),
        ]),
        h('div', { key: 'drop', className: 'xhs-groupDrop' }, [
          ...group.images.map((image) => h('div', { key: image.id, className: 'xhs-groupThumb' }, [
            h('img', { src: image.dataUrl, alt: image.name, draggable: false }),
            h('button', {
              key: 'x', type: 'button', className: 'xhs-groupRemove',
              onClick: () => removeGroupImage(group.id, image.id),
            }, '×'),
          ])),
          h('label', { key: 'add', className: 'xhs-groupAdd' }, [
            h('span', { key: 't' }, group.images.length ? '继续添加' : '拖入或点击'),
            h('input', {
              key: 'i', type: 'file', multiple: true, accept: 'image/*',
              style: { display: 'none' },
              onChange: (event) => {
                addGroupFiles(group.id, event.target.files)
                event.target.value = ''
              },
            }),
          ]),
        ]),
        h('input', {
          key: 'prompt',
          className: 'xhs-input',
          placeholder: '这组的提示词（可选，不填会生成通用文案）',
          value: group.prompt,
          onChange: (event) => updateGroup(group.id, { prompt: event.target.value }),
        }),
      ])

      const createStep = h('div', { key: 'create', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        false && h('div', { key: 'groups', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '多账号分组'),
              h('div', { key: 'right', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
                h('span', { key: 'c', className: 'xhs-muted' }, groups.length + ' 组'),
                h('button', {
                  key: 'add', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                  onClick: addGroup,
                }, '+ 添加分组'),
              ]),
            ]),
            groups.length
              ? h('div', { key: 'list', className: 'xhs-groupsList' }, groups.map(groupCard))
              : h('div', { key: 'empty', className: 'xhs-muted' }, '添加分组后，把不同图片拖进不同组；每组选一个账号，最后一键发布或定时。'),
            groups.length ? h('div', { key: 'actions', className: 'xhs-groupActions' }, [
              h('label', { key: 'confirm', className: 'xhs-check' }, [
                h('input', {
                  key: 'i', type: 'checkbox', checked: groupConfirm,
                  onChange: (event) => setGroupConfirm(event.target.checked),
                }),
                h('span', { key: 't' }, '我已核对每组账号和图片'),
              ]),
              h('button', {
                key: 'publish', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                disabled: groupBusy || busy || !groupConfirm || groups.some((group) => !group.images.length),
                onClick: publishGroups,
              }, groupBusy ? '执行中…' : '发布全部分组'),
              h('input', {
                key: 'at', type: 'datetime-local', className: 'xhs-input',
                style: { flex: '1 1 170px', width: 'auto' },
                value: groupAt,
                onChange: (event) => setGroupAt(event.target.value),
              }),
              h('button', {
                key: 'schedule', type: 'button', className: 'xhs-btn',
                disabled: groupBusy || busy || !groupConfirm || !groupAt || groups.some((group) => !group.images.length),
                onClick: scheduleGroups,
              }, '定时发布'),
            ]) : null,
          ]),
        ]),
        h('div', { key: 'images', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '图片 · ' + images.length + '/9'),
              images.length ? h('button', {
                key: 'clear', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                onClick: () => setImages([]),
              }, '清空') : null,
            ]),
            h('div', {
              key: 'drop',
              className: 'xhs-drop',
              'data-over': dragOver,
              onClick: () => fileInput.current?.click(),
              onDragOver: (event) => { event.preventDefault(); setDragOver(true) },
              onDragLeave: () => setDragOver(false),
              onDrop: async (event) => {
                event.preventDefault()
                setDragOver(false)
                await addFiles(event.dataTransfer?.files)
              },
            }, t('hint.images')),
            images.length ? h('div', { key: 'grid', className: 'xhs-thumbs' }, images.map((image, index) => h('div', {
              key: image.id, className: 'xhs-thumb', title: image.name,
            }, [
              h('img', { key: 'img', src: image.dataUrl, alt: image.name, draggable: false }),
              h('div', { key: 'bar', className: 'xhs-thumbBar' }, [
                h('button', { key: 'left', type: 'button', className: 'xhs-mini', disabled: index === 0, onClick: () => move(index, -1) }, '‹'),
                h('button', { key: 'remove', type: 'button', className: 'xhs-mini', onClick: () => setImages((current) => current.filter((item) => item.id !== image.id)) }, '×'),
                h('button', { key: 'right', type: 'button', className: 'xhs-mini', disabled: index === images.length - 1, onClick: () => move(index, 1) }, '›'),
              ]),
            ]))) : null,
            h('input', {
              key: 'file',
              ref: fileInput,
              type: 'file',
              accept: 'image/*',
              multiple: true,
              style: { display: 'none' },
              onChange: async (event) => {
                await addFiles(event.target.files)
                event.target.value = ''
              },
            }),
          ]),
        ]),
        h('div', { key: 'prompt', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, t('label.prompt')),
            ]),
            h('textarea', {
              key: 'input', className: 'xhs-textarea', value: prompt,
              placeholder: t('placeholder.prompt'),
              style: { minHeight: '74px' },
              onChange: (event) => setPrompt(event.target.value),
            }),
            h('div', { key: 'row', className: 'xhs-row', style: { alignItems: 'center' } }, [
              h('input', {
                key: 'series', className: 'xhs-input', value: series,
                placeholder: '套系名称（可选）：例如 利川红',
                style: { flex: '1 1 140px', width: 'auto' },
                onChange: (event) => setSeries(event.target.value),
              }),
              h('button', {
                key: 'gen', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                disabled: generating || busy || !prompt.trim(), onClick: generate,
              }, generating ? t('state.loading') : (title ? t('action.regenerate') : t('action.generate'))),
            ]),
          ]),
        ]),
        h('div', { key: 'copy', className: 'xhs-card xhs-copyCard' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'title', className: 'xhs-field' }, [
              h('div', { key: 'h', className: 'xhs-fieldHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, t('label.title')),
                h('span', { key: 'c', className: 'xhs-counter' }, t('hint.titleCount', { count: title.length })),
              ]),
              h('input', {
                key: 'i', className: 'xhs-input', value: title, maxLength: 20,
                placeholder: t('placeholder.title'),
                onChange: (event) => setTitle(event.target.value.slice(0, 20)),
              }),
            ]),
            h('div', { key: 'body', className: 'xhs-field' }, [
              h('div', { key: 'h', className: 'xhs-fieldHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, t('label.body')),
                h('span', { key: 'c', className: 'xhs-counter' }, body.length + ' 字'),
              ]),
              h('textarea', {
                key: 'i', className: 'xhs-textarea', value: body,
                placeholder: t('placeholder.body'),
                onChange: (event) => setBody(event.target.value),
              }),
            ]),
            h('div', { key: 'tags', className: 'xhs-field' }, [
              h('div', { key: 'h', className: 'xhs-fieldHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, t('label.tags')),
                h('span', { key: 'c', className: 'xhs-counter' }, t('hint.tagsCount', { count: tags.length })),
              ]),
              h('div', { key: 'list', className: 'xhs-tags' }, tags.map((tag) => h('span', {
                key: tag, className: 'xhs-tag',
              }, ['#', tag, h('button', {
                key: 'x', type: 'button', 'aria-label': t('action.remove'),
                onClick: () => setTags((current) => current.filter((item) => item !== tag)),
              }, '×')]))),
              h('div', { key: 'add', className: 'xhs-tagAdd' }, [
                h('input', {
                  key: 'i', className: 'xhs-input', value: tagDraft,
                  placeholder: t('placeholder.tag'),
                  onChange: (event) => setTagDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') { event.preventDefault(); addTag() }
                  },
                }),
                h('button', { key: 'b', type: 'button', className: 'xhs-btn', onClick: addTag }, t('action.add')),
              ]),
            ]),
          ]),
        ]),
        riskCard,
        h('div', { key: 'preview', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, t('label.preview')),
              h('span', { key: 's', className: 'xhs-muted' }, '1080×1440'),
            ]),
            collage
              ? h('div', { key: 'p', className: 'xhs-preview' }, h('img', { src: collage, alt: t('label.preview') }))
              : h('div', { key: 'e', className: 'xhs-empty' }, t('empty.collage')),
          ]),
        ]),
      ])

      const publishStep = h('div', { key: 'publish', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        h('div', { key: 'summary', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '发布内容'),
              h('span', { key: 's', className: 'xhs-muted' }, status.loggedIn ? t('status.loggedIn') : t('status.loggedOut')),
            ]),
            collage ? h('div', { key: 's', className: 'xhs-summary' }, [
              h('img', { key: 'img', src: collage, alt: '' }),
              h('div', { key: 'text', className: 'xhs-summaryText' }, [
                h('div', { key: 't', className: 'xhs-summaryTitle' }, title || '（未填写标题）'),
                h('div', { key: 'b', className: 'xhs-summaryBody' }, body || '（未填写正文）'),
                h('div', { key: 'tags', className: 'xhs-tags' }, tags.slice(0, 6).map((tag) => h('span', { key: tag, className: 'xhs-tag' }, '#' + tag))),
              ]),
            ]) : h('div', { key: 'e', className: 'xhs-empty' }, t('empty.collage')),
            missing.length ? h('div', { key: 'm', className: 'xhs-muted' }, t('label.missing') + missing.join('、')) : null,
            draftInfo ? h('div', {
              key: 'imgCount',
              className: 'xhs-hint',
              style: (draftInfo.pageInfo?.imageCount || 0) < (draftInfo.uploaded || 0)
                ? { color: 'var(--dsw-alias-state-warning-primary,#b26a00)' }
                : undefined,
            }, '发布页实际图片：' + (draftInfo.pageInfo?.imageCount ?? '-') + ' 张（上传 ' + (draftInfo.uploaded ?? '-') + ' 张）') : null,
            risk && risk.issues.length ? h('div', { key: 'riskWarn', className: 'xhs-warn' }, '风控预检：还有 ' + risk.issues.length + ' 个风险词未处理') : null,
            h('label', { key: 'opt', className: 'xhs-check' }, [
              h('input', {
                key: 'i', type: 'checkbox', checked: includeOriginals,
                onChange: (event) => setIncludeOriginals(event.target.checked),
              }),
              h('span', { key: 't' }, t('label.includeOriginals')),
            ]),
            h('div', { key: 'row', className: 'xhs-row' }, [
              h('button', {
                key: 'd', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                disabled: drafting || busy || !status.loggedIn || Boolean(missing.length),
                onClick: fillDraft,
              }, drafting ? t('state.loading') : t('action.draft')),
              h('button', {
                key: 'r', type: 'button', className: 'xhs-btn',
                disabled: status.browser !== 'ready',
                onClick: () => setPublishShot(Date.now()),
              }, t('action.refresh')),
              h('button', {
                key: 'win', type: 'button', className: 'xhs-btn',
                disabled: status.browser !== 'ready',
                onClick: () => toggleWindow(!windowVisible),
              }, windowVisible ? t('action.hideWindow') : t('action.showWindow')),
            ]),
            h('div', { key: 'guideHint', className: 'xhs-hint' }, t('hint.guide')),
            !status.loggedIn ? h('div', { key: 'hint', className: 'xhs-hint' }, t('hint.loginFirst')) : null,
          ]),
        ]),
        h('div', { key: 'mirror', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, t('label.mirror')),
              h('span', { key: 's', className: 'xhs-muted' }, draftInfo?.url || ''),
            ]),
            h('div', {
              key: 'screen',
              className: 'xhs-mirror',
              'data-has-image': status.browser === 'ready' ? true : undefined,
            },
              status.browser === 'ready'
                ? h('img', { src: publishSrc, alt: t('label.mirror'), draggable: false })
                : h('div', { className: 'xhs-mirrorEmpty' }, t('empty.mirror'))),
          ]),
        ]),
        h('div', { key: 'submitCard', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('label', { key: 'confirm', className: 'xhs-check' }, [
              h('input', {
                key: 'i', type: 'checkbox', checked: confirm,
                onChange: (event) => setConfirm(event.target.checked),
              }),
              h('span', { key: 't' }, t('label.confirm')),
            ]),
            h('button', {
              key: 'submit', type: 'button', className: 'xhs-btn', 'data-kind': 'danger',
              disabled: submitting || busy || !confirm || !draftInfo,
              onClick: submit,
            }, submitting ? t('state.loading') : t('action.submit')),
            publishResult ? h('div', { key: 'result', className: 'xhs-hint', style: { color: 'var(--dsw-alias-state-success-primary,#0f9d58)' } }, publishResult) : null,
          ]),
        ]),
        (() => {
          const statusText = { pending: '待执行', running: '执行中', done: '已完成', failed: '失败', missed: '已错过', cancelled: '已取消' }
          const pendingCount = schedules.filter((item) => item.status === 'pending').length
          return h('div', { key: 'scheduleCard', className: 'xhs-card' }, [
            h('div', { key: 'body', className: 'xhs-cardBody' }, [
              h('div', { key: 'head', className: 'xhs-cardHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, '定时发布'),
                h('span', { key: 'c', className: 'xhs-muted' }, pendingCount + ' 个待执行'),
              ]),
              schedules.length
                ? h('div', { key: 'list', className: 'xhs-notes' }, schedules.slice(0, 5).map((item) => h('div', {
                  key: item.id, className: 'xhs-note',
                }, [
                  h('div', { key: 't', className: 'xhs-noteTitle' }, new Date(item.at).toLocaleString('zh-CN', { hour12: false }) + ' · ' + ((item.jobs || []).length) + ' 条'),
                  h('div', { key: 'm', className: 'xhs-muted' }, [
                    statusText[item.status] || item.status,
                    [...new Set((item.jobs || []).map((job) => accountLabel(job.account || 'default')))].join(' / '),
                    item.error || '',
                  ].filter(Boolean).join(' · ')),
                  item.status === 'pending'
                    ? h('div', { key: 'a', className: 'xhs-row' }, [
                      h('button', { key: 'cancel', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => cancelSchedule(item.id) }, '取消定时'),
                    ])
                    : item.status !== 'running'
                      ? h('div', { key: 'a', className: 'xhs-row' }, [
                        h('button', { key: 'del', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => deleteSchedule(item.id) }, '删除'),
                      ])
                      : null,
                ])))
                : h('div', { key: 'empty', className: 'xhs-muted' }, '没有定时任务。在审核里给单篇设置时间即可。'),
            ]),
          ])
        })(),
        h('div', { key: 'historyCard', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '发布记录'),
              h('span', { key: 'c', className: 'xhs-muted' }, history.length + ' 条'),
            ]),
            history.length ? h('div', { key: 'list', className: 'xhs-notes' }, history.slice(0, 5).map((item) => h('div', {
              key: item.id, className: 'xhs-note',
            }, [
              h('div', { key: 't', className: 'xhs-noteTitle' }, item.title),
              h('div', { key: 'm', className: 'xhs-muted' }, new Date(item.at).toLocaleString() + ' · ' + item.images + ' 张 · ' + (item.published ? '已发布' : '已提交')),
              h('div', { key: 'a', className: 'xhs-row' }, [
                h('button', { key: 'open', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => openHistory(item) }, '查看'),
                h('button', { key: 'del', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => deleteHistory(item.id) }, '删除'),
              ]),
            ]))) : h('div', { key: 'empty', className: 'xhs-muted' }, '发布成功后会自动记在这里；点「查看」在右侧浏览器打开笔记管理'),
          ]),
        ]),
      ])

      const reviewStatusText = { pending: '待审核', publishing: '发布中', published: '已发布', failed: '失败', cancelled: '已驳回', scheduled: '已错峰定时' }
      const pendingRecords = staging.filter((item) => item.status === 'pending' || item.status === 'publishing')
      const historyRecords = staging.filter((item) => !['pending', 'publishing'].includes(item.status))
      const recordWarnings = (record) => [...new Set([...(record.warnings || []), ...record.jobs.flatMap((job) => job.platformWarnings || [])])]

      const reviewJob = (record, job, jobIndex, editing) => {
        const edit = stagedEdit(record.id, job, jobIndex)
        const accountOptions = (status.accountsInfo || []).slice()
        if (!accountOptions.some((item) => item.name === job.account)) {
          accountOptions.push({ name: job.account, nickname: job.nickname || '未登录' })
        }
        return h('div', { key: 'j' + jobIndex, className: 'xhs-reviewJob' }, [
          h('div', { key: 'head', className: 'xhs-reviewJobHead' }, [
            editing && record.status === 'pending' && !job.publishedAt
              ? h('select', {
                  key: 'a', className: 'xhs-select', value: job.account, disabled: stagingBusy || Boolean(job.publishedAt),
                  onChange: (event) => changeStagingAccount(record.id, jobIndex, event.target.value),
                }, accountOptions.map((item) => h('option', {
                  key: item.name, value: item.name,
                }, (item.nickname || item.name) + ' · ' + item.name)))
              : h('span', { key: 'a', className: 'xhs-chip', 'data-state': 'ok', title: job.account }, job.nickname || accountLabel(job.account)),
            editing
              ? null
              : h('span', { key: 't', className: 'xhs-chip' }, job.coverStyle ? '拼图：' + (COVER_STYLES[job.coverStyle] || '经典') : '原图直发'),
          ]),
          h('div', { key: 'imgs', className: 'xhs-reviewImgs' }, [
            ...(job.images || []).map((image, imageIndex) => h('div', {
              key: imageIndex, className: 'xhs-reviewImgWrap',
            }, [
              h('img', {
                src: '/xhs/api/staging/image?id=' + encodeURIComponent(record.id) + '&job=' + jobIndex + '&index=' + imageIndex + '&v=' + (record.updatedAt || record.createdAt || 0),
                alt: '',
                loading: 'lazy',
                title: imageIndex === 0 ? '点击查看大图' : '',
                onClick: () => setCoverPreview({
                  src: '/xhs/api/staging/image?id=' + encodeURIComponent(record.id) + '&job=' + jobIndex + '&index=' + imageIndex + '&v=' + (record.updatedAt || record.createdAt || 0),
                  title: job.title,
                }),
              }),
              imageIndex === 0 ? h('span', { key: 'cover', className: 'xhs-coverTag' }, '封面') : null,
              editing && record.status === 'pending' && !job.publishedAt && imageIndex > 0
                ? h('button', {
                    key: 'x', type: 'button', className: 'xhs-imgRemove',
                    onClick: () => removeStagingImage(record.id, jobIndex, imageIndex),
                  }, '×')
                : null,
            ])),
            editing && record.status === 'pending' && !job.publishedAt && (job.images || []).length < 9
              ? h('label', { key: 'add', className: 'xhs-reviewAdd' }, [
                h('span', { key: 't' }, '+ 添加'),
                h('input', {
                  key: 'i', type: 'file', multiple: true, accept: 'image/*',
                  style: { display: 'none' },
                  onChange: (event) => {
                    addStagingImages(record.id, jobIndex, event.target.files)
                    event.target.value = ''
                  },
                }),
              ])
              : null,
          ]),
          editing
            ? h('div', { key: 'tools', className: 'xhs-reviewTools' }, [
              job.coverStyle
                ? h('label', { key: 'cover', className: 'xhs-reviewTool' }, [
                  h('span', { key: 'l', className: 'xhs-label' }, '拼图'),
                  h('select', {
                    key: 's', className: 'xhs-select', value: job.coverStyle,
                    disabled: stagingBusy || Boolean(job.publishedAt),
                    onChange: (event) => changeCoverStyle(record.id, jobIndex, event.target.value),
                  }, Object.entries(COVER_STYLES).map(([value, label]) => h('option', { key: value, value }, label))),
                ])
                : h('span', { key: 'plain', className: 'xhs-hint' }, '原图直发，不生成拼图'),
            ])
            : null,
          editing
            ? [
              h('input', {
                key: 'title', className: 'xhs-input', placeholder: '标题',
                value: edit.title, disabled: stagingBusy,
                onChange: (event) => setStagedEdit(record.id, jobIndex, { title: event.target.value }),
              }),
              h('textarea', {
                key: 'body', className: 'xhs-textarea', rows: 4, placeholder: '正文',
                value: edit.body, disabled: stagingBusy,
                onChange: (event) => setStagedEdit(record.id, jobIndex, { body: event.target.value }),
              }),
              h('input', {
                key: 'tags', className: 'xhs-input', placeholder: '标签，用空格或逗号分隔',
                value: edit.tags, disabled: stagingBusy,
                onChange: (event) => setStagedEdit(record.id, jobIndex, { tags: event.target.value }),
              }),
            ]
            : [
              h('div', { key: 'title', className: 'xhs-noteTitle' }, job.title || '（无标题）'),
              h('div', { key: 'body', className: 'xhs-reviewBody' }, job.body || ''),
              h('div', { key: 'tags', className: 'xhs-muted' }, (job.tags || []).map((tag) => '#' + tag).join(' ')),
            ],
          editing
            ? h('div', { key: 'schedule', className: 'xhs-scheduleRow' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '定时'),
              h('input', {
                key: 'at', type: 'datetime-local', className: 'xhs-input',
                value: edit.scheduleAt,
                min: toLocalInput(new Date(Date.now() + 60000).toISOString()),
                disabled: stagingBusy,
                onChange: (event) => setStagedEdit(record.id, jobIndex, { scheduleAt: event.target.value }),
              }),
              h('button', {
                key: 'go', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                disabled: stagingBusy || !edit.scheduleAt,
                onClick: () => scheduleStagedJob(record.id, jobIndex, edit.scheduleAt),
              }, '定时发布'),
              job.scheduleId
                ? h('button', {
                    key: 'cancel', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                    disabled: stagingBusy, onClick: () => cancelJobSchedule(job.scheduleId),
                  }, '取消定时')
                : null,
            ])
            : job.scheduledAt
              ? h('div', { key: 'schedule', className: 'xhs-chip', 'data-state': 'ok' }, '已定时 ' + new Date(job.scheduledAt).toLocaleString('zh-CN', { hour12: false }))
              : null,
          job.risk && job.risk.issues && job.risk.issues.length
            ? h('div', { key: 'risk', className: 'xhs-warn' }, '风控：' + job.risk.issues.map((issue) => issue.word).join('、'))
            : null,
          record.status === 'pending' && !job.publishedAt
            ? h('div', { key: 'jobActions', className: 'xhs-row' }, [
              h('button', {
                key: 'p', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                disabled: stagingBusy || !riskAck,
                onClick: () => publishStagedJob(record.id, jobIndex),
              }, stagingBusy ? '发布中…' : '发布'),
              h('button', {
                key: 'c', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
                disabled: stagingBusy, onClick: () => cancelStagedJob(record.id, jobIndex),
              }, '驳回'),
              job.publishError ? h('span', { key: 'e', className: 'xhs-warn' }, job.publishError) : null,
            ])
            : job.publishedAt
              ? h('div', { key: 'jobDone', className: 'xhs-hint' }, '已发布')
              : null,
        ])
      }

      const pendingRecord = (record) => {
        const editing = Boolean(stagingEditing[record.id]) && record.status === 'pending'
        return h('div', { key: record.id, className: 'xhs-review' }, [
        h('div', { key: 'top', className: 'xhs-reviewTop' }, [
          h('span', { key: 't', className: 'xhs-muted' }, new Date(record.createdAt).toLocaleString('zh-CN', { hour12: false })),
          h('span', {
            key: 's',
            className: 'xhs-chip',
            'data-state': record.status === 'publishing' ? 'busy' : 'warn',
          }, reviewStatusText[record.status] || record.status),
        ]),
        h('div', { key: 'accounts', className: 'xhs-muted' }, '账号：' + record.jobs.map((job) => job.nickname || accountLabel(job.account)).join(' / ')),
        record.status === 'pending'
          ? h('div', { key: 'risk', className: 'xhs-riskWarn' }, [
            h('div', { key: 't' }, '发布前确认：AI 内容请标识；不要出现微信/电话/二维码。每账号每天最多 ' + (riskConfig.dailyLimit ?? 1) + ' 篇。'),
            ...recordWarnings(record).map((warning, index) => h('div', { key: 'w' + index, className: 'xhs-warn' }, warning)),
            h('label', { key: 'ack', className: 'xhs-check' }, [
              h('input', {
                key: 'i', type: 'checkbox', checked: riskAck,
                onChange: (event) => setRiskAck(event.target.checked),
              }),
              h('span', { key: 't' }, '我已确认 AI 标识与无导流风险'),
            ]),
          ])
          : null,
        record.progress
          ? h('div', { key: 'progress', className: 'xhs-progress' }, [
            h('div', { key: 'head', className: 'xhs-progressHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '发布进度'),
              h('span', { key: 'c', className: 'xhs-muted' }, (record.progress.done || 0) + '/' + (record.progress.total || record.jobs.length)),
            ]),
            record.progress.current ? h('div', { key: 'current', className: 'xhs-progressRow' }, [
              h('span', { key: 's', className: 'xhs-chip', 'data-state': 'busy' }, '正在发布'),
              h('span', { key: 'n', className: 'xhs-noteTitle' }, record.progress.current.nickname || accountLabel(record.progress.current.account)),
              h('span', { key: 't', className: 'xhs-muted' }, record.progress.current.title || ''),
            ]) : null,
            ...(record.progress.results || []).map((item, index) => h('div', { key: 'r' + index, className: 'xhs-progressRow' }, [
              h('span', { key: 's', className: 'xhs-chip', 'data-state': item.ok ? 'ok' : 'error' }, item.nickname || accountLabel(item.account)),
              h('span', { key: 'r', className: item.ok ? 'xhs-hint' : 'xhs-warn' }, item.ok ? '已发布' : '失败'),
              h('span', { key: 't', className: 'xhs-muted' }, item.title || ''),
              item.error ? h('span', { key: 'e', className: 'xhs-warn' }, item.error) : null,
            ])),
            ...record.jobs
              .filter((job) => !(record.progress.results || []).some((item) => item.account === job.account && item.title === job.title))
              .map((job, index) => h('div', { key: 'w' + index, className: 'xhs-progressRow' }, [
                h('span', { key: 's', className: 'xhs-chip' }, job.nickname || accountLabel(job.account)),
                h('span', { key: 't', className: 'xhs-muted' }, '等待发布 · ' + job.title),
              ])),
          ])
          : null,
        ...record.jobs.map((job, jobIndex) => reviewJob(record, job, jobIndex, editing)),
        record.error ? h('div', { key: 'err', className: 'xhs-warn' }, record.error) : null,
        record.status === 'pending'
          ? h('div', { key: 'actions', className: 'xhs-row' }, [
            h('button', {
              key: 'edit', type: 'button', className: 'xhs-btn', 'data-kind': editing ? 'primary' : 'ghost',
              disabled: stagingBusy, onClick: () => toggleStagingEditing(record.id),
            }, editing ? '完成编辑' : '编辑'),
            editing ? h('button', {
              key: 'save', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
              disabled: stagingBusy, onClick: () => saveStaged(record.id),
            }, '保存修改') : null,
            h('button', {
              key: 'cancel', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
              disabled: stagingBusy, onClick: () => cancelStaged(record.id),
            }, '驳回整组'),
          ])
          : null,
      ])
      }

      const historyRecord = (record) => h('div', { key: record.id, className: 'xhs-historyRow' }, [
        h('div', { key: 'i', style: { flex: '1 1 auto', minWidth: 0 } }, [
          h('div', { key: 'm', className: 'xhs-muted' }, new Date(record.createdAt).toLocaleString('zh-CN', { hour12: false }) + ' · ' + (reviewStatusText[record.status] || record.status)),
          h('div', { key: 't', className: 'xhs-noteTitle' }, record.jobs.map((job) => job.title).join(' / ')),
          h('div', { key: 'a', className: 'xhs-muted' }, record.jobs.map((job) => (job.nickname || accountLabel(job.account)) + ' ' + job.imageCount + ' 张').join(' · ')),
          record.results && record.results.length
            ? h('div', { key: 'r', className: 'xhs-muted' }, record.results.map((item) => (accountLabel(item.account)) + (item.ok ? ' 成功' : ' 失败')).join(' · '))
            : null,
        ]),
        h('button', {
          key: 'del', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
          onClick: () => deleteStaged(record.id),
        }, '删除'),
      ])

      const riskField = (label, key, min, max, unit) => h('label', { key, className: 'xhs-riskField' }, [
        h('span', { key: 'l', className: 'xhs-label' }, label),
        h('div', { key: 'row', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
          h('input', {
            key: 'i', type: 'number', className: 'xhs-input', min, max,
            value: riskConfig[key] ?? 0,
            onChange: (event) => updateRiskConfig({ [key]: Number(event.target.value) }),
          }),
          h('span', { key: 'u', className: 'xhs-muted' }, unit),
        ]),
      ])

      const riskConfigCard = h('div', { key: 'riskConfig', className: 'xhs-card' }, [
        h('div', { key: 'body', className: 'xhs-cardBody' }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '风控闸门'),
            h('span', { key: 'c', className: 'xhs-chip', 'data-state': riskEditing ? 'warn' : 'ok' }, riskEditing ? '编辑中' : '已生效'),
          ]),
          riskEditing
            ? h('div', { key: 'edit' }, [
              h('div', { key: 'grid', className: 'xhs-riskGrid' }, [
                riskField('每账号每天最多', 'dailyLimit', 1, 20, '篇'),
                riskField('同账号最小间隔', 'minIntervalHours', 0, 72, '小时'),
                riskField('一次最多账号', 'maxAccountsPerBatch', 1, 20, '个'),
              ]),
              h('div', { key: 'auto', className: 'xhs-riskGrid' }, [
                riskField('自动发布最小间隔', 'staggerMinMinutes', 1, 120, '分钟'),
                riskField('自动发布最大间隔', 'staggerMaxMinutes', 1, 240, '分钟'),
              ]),
              h('label', { key: 'manual', className: 'xhs-check' }, [
                h('input', {
                  key: 'i', type: 'checkbox', checked: riskConfig.manualOnly !== false,
                  onChange: (event) => updateRiskConfig({ manualOnly: event.target.checked }),
                }),
                h('span', { key: 't' }, '只允许手动点击发布（拦截 Agent 批量/自动；你手动设置的单个定时任务仍执行）'),
              ]),
              h('div', { key: 'hint', className: 'xhs-hint' }, '保存后立即生效。手动模式下，审核里仍可逐组点「发布」。'),
              h('div', { key: 'actions', className: 'xhs-row' }, [
                h('button', {
                  key: 'save', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                  disabled: riskConfigBusy, onClick: saveRiskConfig,
                }, riskConfigBusy ? '保存中…' : '保存并生效'),
                h('button', {
                  key: 'cancel', type: 'button', className: 'xhs-btn',
                  disabled: riskConfigBusy, onClick: cancelRiskEdit,
                }, '取消'),
              ]),
            ])
            : h('div', { key: 'summary' }, [
              h('div', { key: 'text', className: 'xhs-riskSummary' },
                '每账号每天 ' + (riskConfig.dailyLimit ?? 1) + ' 篇 · 间隔 ' + (riskConfig.minIntervalHours ?? 0) + ' 小时 · 一次最多 ' + (riskConfig.maxAccountsPerBatch ?? 20) + ' 个账号 · ' + (riskConfig.manualOnly !== false ? '手动 + 单个定时' : '允许自动发布')),
              h('div', { key: 'actions', className: 'xhs-row' }, [
                h('button', {
                  key: 'edit', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                  onClick: () => setRiskEditing(true),
                }, '修改风控'),
              ]),
            ]),
        ]),
      ])

      const reviewStep = h('div', { key: 'review', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        riskConfigCard,
        h('div', { key: 'pendingCard', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '待审核'),
              h('div', { key: 'right', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
                h('span', { key: 'c', className: 'xhs-muted' }, pendingRecords.reduce((sum, record) => sum + record.jobs.length, 0) + ' 组'),
                h('button', {
                  key: 'prompts', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                  onClick: openPromptLibrary,
                }, '提示词库'),
              ]),
            ]),
            pendingRecords.length
              ? pendingRecords.map(pendingRecord)
              : h('div', { key: 'empty', className: 'xhs-muted' }, '没有待审核的分组。让 Agent 用指令生成分组，会先出现在这里。'),
          ]),
        ]),
        h('div', { key: 'historyCard', className: 'xhs-card' }, [
          h('div', { key: 'body', className: 'xhs-cardBody' }, [
            h('div', { key: 'head', className: 'xhs-cardHead' }, [
              h('span', { key: 'l', className: 'xhs-label' }, '发布记录'),
              h('div', { key: 'right', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
                h('span', { key: 'c', className: 'xhs-muted' }, historyRecords.length + ' 条'),
                historyRecords.length ? h('button', {
                  key: 'toggle', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                  onClick: () => setShowStagingHistory((value) => !value),
                }, showStagingHistory ? '收起' : '展开') : null,
              ]),
            ]),
            showStagingHistory && historyRecords.length
              ? h('div', { key: 'list', className: 'xhs-historyList' }, historyRecords.map(historyRecord))
              : null,
            historyRecords.length ? null : h('div', { key: 'empty', className: 'xhs-muted' }, '还没有历史记录'),
          ]),
        ]),
        (() => {
          const statusText = { pending: '待执行', running: '执行中', done: '已完成', failed: '失败', missed: '已错过', cancelled: '已取消' }
          const pendingCount = schedules.filter((item) => item.status === 'pending').length
          return h('div', { key: 'scheduleCard', className: 'xhs-card' }, [
            h('div', { key: 'body', className: 'xhs-cardBody' }, [
              h('div', { key: 'head', className: 'xhs-cardHead' }, [
                h('span', { key: 'l', className: 'xhs-label' }, '定时发布'),
                h('span', { key: 'c', className: 'xhs-muted' }, pendingCount + ' 个待执行'),
              ]),
              schedules.length
                ? h('div', { key: 'list', className: 'xhs-notes' }, schedules.slice(0, 5).map((item) => h('div', {
                  key: item.id, className: 'xhs-note',
                }, [
                  h('div', { key: 't', className: 'xhs-noteTitle' }, new Date(item.at).toLocaleString('zh-CN', { hour12: false }) + ' · ' + ((item.jobs || []).length) + ' 条'),
                  h('div', { key: 'm', className: 'xhs-muted' }, [
                    statusText[item.status] || item.status,
                    [...new Set((item.jobs || []).map((job) => accountLabel(job.account || 'default')))].join(' / '),
                    item.error || '',
                  ].filter(Boolean).join(' · ')),
                  item.status === 'pending'
                    ? h('div', { key: 'a', className: 'xhs-row' }, [
                      h('button', { key: 'cancel', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => cancelSchedule(item.id) }, '取消定时'),
                    ])
                    : item.status !== 'running'
                      ? h('div', { key: 'a', className: 'xhs-row' }, [
                        h('button', { key: 'del', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => deleteSchedule(item.id) }, '删除'),
                      ])
                      : null,
                ])))
                : h('div', { key: 'empty', className: 'xhs-muted' }, '没有定时任务。在审核里给单篇设置时间即可。'),
            ]),
          ])
        })(),
      ])

      const groupView = h(XhsErrorBoundary, { key: 'groupBoundary' }, h(GroupStudio, {
        say,
        onCommitted: async () => {
          await loadStaging()
          setStep(2)
          setMoreTab('staging')
        },
      }))

      const publishTab = h('div', { key: 'publishTab', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        loginStep,
        publishStep,
      ])

      const knowledgeView = h('div', { key: 'knowledge', className: 'xhs-know' }, [
        h('div', { key: 'head', className: 'xhs-knowHead' }, [
          h('div', { key: 't', className: 'xhs-knowTitle' }, '本地知识包'),
          h('div', { key: 'p', className: 'xhs-knowPath', title: knowledge.root }, knowledge.root || '（还没有路径）'),
        ]),
        h('div', { key: 'actions', className: 'xhs-row' }, [
          h('button', { key: 'open', type: 'button', className: 'xhs-btn', onClick: () => revealKnowledge('') }, '打开文件夹'),
          h('button', { key: 'reload', type: 'button', className: 'xhs-btn', onClick: loadKnowledge }, '重新读取'),
        ]),
        h('div', { key: 'files', className: 'xhs-knowList' }, knowledge.files.map((file) => h('button', {
          key: file.path, type: 'button', className: 'xhs-knowItem',
          'data-active': knowledgeFile === file.path,
          onClick: () => openKnowledgeFile(file.path),
        }, [
          h('span', { key: 'n', className: 'xhs-knowName' }, file.name),
          h('span', { key: 'd', className: 'xhs-knowDir' }, file.path.split('/').slice(0, -1).join(' / ')),
        ]))),
        knowledgeFile
          ? h('div', { key: 'edit', className: 'xhs-knowEdit' }, [
            h('div', { key: 'bar', className: 'xhs-knowEditBar' }, [
              h('span', { key: 'p', className: 'xhs-knowEditPath' }, knowledgeFile),
              h('div', { key: 'a', className: 'xhs-row' }, [
                h('button', { key: 's', type: 'button', className: 'xhs-btn', 'data-kind': 'primary', disabled: knowledgeBusy, onClick: saveKnowledgeFile }, knowledgeBusy ? '保存中…' : '保存'),
                h('button', { key: 'o', type: 'button', className: 'xhs-btn', onClick: () => revealKnowledge(knowledgeFile) }, '用编辑器打开'),
              ]),
            ]),
            h('textarea', {
              key: 'ta', className: 'xhs-textarea xhs-knowText', value: knowledgeText,
              spellCheck: false,
              onChange: (event) => setKnowledgeText(event.target.value),
            }),
          ])
          : h('div', { key: 'hint', className: 'xhs-knowHint' }, '点上面的文件查看或修改。品牌、产品、标题公式、违禁词、发布记录都在这里。'),
      ])

      const moreView = h('div', { key: 'more', style: { display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        h('div', { key: 'seg', className: 'xhs-seg' }, [
          h('button', { key: 's', type: 'button', className: 'xhs-segBtn', 'data-active': moreTab === 'staging', onClick: () => setMoreTab('staging') }, '审核与记录'),
          h('button', { key: 'g', type: 'button', className: 'xhs-segBtn', 'data-active': moreTab === 'group', onClick: () => setMoreTab('group') }, '分组'),
        ]),
        moreTab === 'staging' ? reviewStep : groupView,
      ])

      const bodyContent = step === 0 ? publishTab : step === 1 ? knowledgeView : moreView


      const riskWordModal = riskWordOpen ? h('div', {
        className: 'xhs-modal',
        onClick: () => setRiskWordOpen(false),
      }, h('div', {
        className: 'xhs-modalCard xhs-riskModal',
        onClick: (event) => event.stopPropagation(),
      }, [
        h('div', { key: 'head', className: 'xhs-modalHead' }, [
          h('span', { key: 'l', className: 'xhs-label' }, '敏感词库'),
          h('button', {
            key: 'x', type: 'button', className: 'xhs-modalClose',
            'aria-label': '关闭', onClick: () => setRiskWordOpen(false),
          }, '×'),
        ]),
        h('div', { key: 'hint', className: 'xhs-muted' }, '每行一个：等级|类别|词|建议。等级填 high/medium/low 或 高/中/低；建议留空表示删除该词。'),
        h('textarea', {
          key: 'text',
          className: 'xhs-textarea xhs-riskTextarea',
          value: riskWordText,
          onChange: (event) => setRiskWordText(event.target.value),
        }),
        h('div', { key: 'actions', className: 'xhs-row' }, [
          h('button', {
            key: 'save', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
            disabled: riskWordBusy, onClick: saveRiskWords,
          }, riskWordBusy ? '保存中…' : '保存词库'),
          h('button', {
            key: 'close', type: 'button', className: 'xhs-btn',
            onClick: () => setRiskWordOpen(false),
          }, '取消'),
        ]),
      ])) : null

      const qrModal = qrOpen && !status.loggedIn ? h('div', {
        className: 'xhs-modal',
        onClick: () => setQrOpen(false),
      }, h('div', {
        className: 'xhs-modalCard',
        onClick: (event) => event.stopPropagation(),
      }, [
        h('div', { key: 'head', className: 'xhs-modalHead' }, [
          h('span', { key: 'l', className: 'xhs-label' }, t('label.scan')),
          h('button', {
            key: 'x', type: 'button', className: 'xhs-modalClose',
            'aria-label': t('action.close'), onClick: () => setQrOpen(false),
          }, '×'),
        ]),
        h('img', { key: 'qr', src: '/xhs/api/qr?t=' + qrAt, alt: t('label.scan') }),
        h('div', { key: 'hint', className: 'xhs-hint', style: { textAlign: 'center' } }, t('hint.scan')),
        h('button', {
          key: 'refresh', type: 'button', className: 'xhs-btn',
          onClick: () => setQrAt(Date.now()),
        }, t('action.refresh')),
      ])) : null

      const browserLabel = status.browser === 'ready' ? '浏览器就绪' : status.browser === 'starting' ? '浏览器启动中' : '浏览器未启动'
      const lastAction = status.lastAction
      let recentText = '最近：暂无操作'
      if (lastAction) {
        if (lastAction.kind === 'batch') {
          recentText = '最近：' + lastAction.count + ' 条 · ' + (lastAction.accounts || []).join(' / ') + ' · ' + (lastAction.ok ? '成功' : '部分失败')
        } else if (lastAction.kind === 'fill') {
          recentText = '最近：已填表 · ' + lastAction.account + ' · ' + lastAction.images + ' 张 · ' + (lastAction.title || '')
        } else if (lastAction.kind === 'publish') {
          recentText = '最近：已发布 · ' + lastAction.account + ' · ' + lastAction.images + ' 张 · ' + (lastAction.title || '')
        } else if (lastAction.kind === 'failed') {
          recentText = '最近失败：' + (lastAction.account || '') + ' · ' + (lastAction.error || '')
        }
      }
      const pendingStaging = staging.filter((item) => item.status === 'pending').reduce((sum, item) => sum + ((item.jobs || []).length), 0)
      const statusBar = h('div', { className: 'xhs-statusBar' }, [
        h('div', { key: 'line', className: 'xhs-statusLine' }, [
          h('span', {
            key: 'dot',
            className: 'xhs-statusDot',
            'data-state': status.busy ? 'busy' : status.loggedIn ? 'ok' : 'warn',
          }),
          h('span', { key: 'text', className: 'xhs-statusText' }, '账号：' + (status.nickname || '未登录') + ((status.activeAccount || status.account) ? '（' + (status.activeAccount || status.account) + '）' : '') + ' · ' + browserLabel + ' · ' + (status.busy ? '执行中：' + status.busy : '空闲')),
        ]),
        h('div', { key: 'recent', className: 'xhs-statusRecent' }, [
          h('span', { key: 't' }, recentText),
          pendingStaging
            ? h('button', {
                key: 'go', type: 'button', className: 'xhs-btn', 'data-kind': 'small',
                onClick: () => { setStep(2); setMoreTab('staging') },
              }, '待审核 ' + pendingStaging + ' 组 · 去审核')
            : null,
        ]),
      ])

      const promptModal = promptOpen ? h('div', {
        className: 'xhs-modal',
        onClick: () => setPromptOpen(false),
      }, [
        h('div', {
          className: 'xhs-modalCard xhs-promptModal',
          onClick: (event) => event.stopPropagation(),
        }, [
          h('div', { key: 'head', className: 'xhs-cardHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '提示词库'),
            h('button', {
              key: 'x', type: 'button', className: 'xhs-btn', 'data-kind': 'ghost',
              onClick: () => setPromptOpen(false),
            }, '关闭'),
          ]),
          h('div', { key: 'hint', className: 'xhs-hint' }, '没有单独给 prompt 时，发布/暂存会用这里设为默认的提示词生成文案。'),
          h('div', { key: 'list', className: 'xhs-promptList' }, prompts.length
            ? prompts.map((item) => h('div', { key: item.id, className: 'xhs-promptItem' }, [
              h('div', { key: 'h', className: 'xhs-promptItemHead' }, [
                h('span', { key: 'n', className: 'xhs-noteTitle' }, item.name || '未命名提示词'),
                item.isDefault ? h('span', { key: 'd', className: 'xhs-chip', 'data-state': 'ok' }, '默认') : null,
              ]),
              h('div', { key: 'c', className: 'xhs-promptText' }, item.content),
              h('div', { key: 'a', className: 'xhs-row' }, [
                h('button', { key: 'e', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => editPrompt(item) }, '编辑'),
                item.isDefault ? null : h('button', { key: 'd', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => setPromptDefault(item.id) }, '设为默认'),
                h('button', { key: 'x', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: () => deletePrompt(item.id) }, '删除'),
              ]),
            ]))
            : h('div', { key: 'empty', className: 'xhs-muted' }, '还没有提示词')),
          h('div', { key: 'editor', className: 'xhs-promptEditor' }, [
            h('div', { key: 'h', className: 'xhs-promptItemHead' }, [
              h('span', { key: 't', className: 'xhs-label' }, promptId ? '编辑提示词' : '新增提示词'),
              h('button', { key: 'new', type: 'button', className: 'xhs-btn', 'data-kind': 'small', onClick: newPrompt }, '新提示词'),
            ]),
            h('input', {
              key: 'name', className: 'xhs-input', placeholder: '名称，例如 利川红伴手礼',
              value: promptName, onChange: (event) => setPromptName(event.target.value),
            }),
            h('textarea', {
              key: 'content', className: 'xhs-textarea', rows: 7,
              placeholder: '粘贴你的默认提示词…',
              value: promptContent, onChange: (event) => setPromptContent(event.target.value),
            }),
            h('label', { key: 'default', className: 'xhs-check' }, [
              h('input', {
                key: 'i', type: 'checkbox', checked: promptIsDefault,
                onChange: (event) => setPromptIsDefault(event.target.checked),
              }),
              h('span', { key: 't' }, '设为默认提示词'),
            ]),
            h('div', { key: 'actions', className: 'xhs-row' }, [
              h('button', {
                key: 'save', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                disabled: promptBusy, onClick: savePrompt,
              }, promptBusy ? '保存中…' : '保存'),
            ]),
          ]),
        ]),
      ]) : null

      const addAccountModal = addAccountOpen ? h('div', {
        className: 'xhs-modal',
        onClick: () => setAddAccountOpen(false),
      }, [
        h('div', {
          className: 'xhs-modalCard xhs-accountModal',
          onClick: (event) => event.stopPropagation(),
        }, [
          h('div', { key: 'head', className: 'xhs-modalHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, '添加 / 登录账号'),
            h('button', {
              key: 'x', type: 'button', className: 'xhs-modalClose',
              onClick: () => setAddAccountOpen(false),
            }, '×'),
          ]),
          h('input', {
            key: 'name', className: 'xhs-input', placeholder: '账号名称，例如 账号C',
            value: newAccountName,
            onChange: (event) => setNewAccountName(event.target.value),
          }),
          h('div', { key: 'tabs', className: 'xhs-addTabs' }, [
            h('button', {
              key: 'qr', type: 'button', className: 'xhs-addTab', 'data-active': addMode === 'qr',
              onClick: () => setAddMode('qr'),
            }, '扫码登录'),
            h('button', {
              key: 'phone', type: 'button', className: 'xhs-addTab', 'data-active': addMode === 'phone',
              onClick: () => setAddMode('phone'),
            }, '手机号验证码'),
          ]),
          addMode === 'qr'
            ? h('div', { key: 'qrBody', className: 'xhs-addBody' }, [
              h('div', { key: 'hint', className: 'xhs-hint' }, '会为新账号创建独立浏览器资料，并打开扫码登录；登录成功后才会保存并出现在账号列表。最多 20 个账号。'),
              h('div', { key: 'actions', className: 'xhs-row', style: { justifyContent: 'flex-end', width: '100%' } }, [
                h('button', {
                  key: 'cancel', type: 'button', className: 'xhs-btn',
                  onClick: () => setAddAccountOpen(false),
                }, '取消'),
                h('button', {
                  key: 'create', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                  onClick: createAccount,
                }, '创建并扫码登录'),
              ]),
            ])
            : h('div', { key: 'phoneBody', className: 'xhs-addBody' }, [
              h('div', { key: 'hint', className: 'xhs-hint' }, '会给这个账号创建/切换独立浏览器，再发验证码登录；登录成功后自动保存。'),
              h('div', { key: 'p', className: 'xhs-field' }, [
                h('span', { key: 'l', className: 'xhs-label' }, '手机号'),
                h('div', { key: 'row', style: { display: 'flex', gap: '6px' } }, [
                  h('input', {
                    key: 'i', className: 'xhs-input', value: phone, inputMode: 'tel',
                    placeholder: '13800138000',
                    onChange: (event) => setPhone(event.target.value),
                  }),
                  h('button', {
                    key: 'send', type: 'button', className: 'xhs-btn',
                    disabled: Boolean(smsBusy) || busy, onClick: sendCode,
                  }, smsBusy === 'send' ? t('state.loading') : '发送验证码'),
                ]),
              ]),
              h('div', { key: 'c', className: 'xhs-field' }, [
                h('span', { key: 'l', className: 'xhs-label' }, '验证码'),
                h('div', { key: 'row', style: { display: 'flex', gap: '6px' } }, [
                  h('input', {
                    key: 'i', className: 'xhs-input', value: code, inputMode: 'numeric',
                    placeholder: '6 位验证码',
                    onChange: (event) => setCode(event.target.value),
                  }),
                  h('button', {
                    key: 'submit', type: 'button', className: 'xhs-btn', 'data-kind': 'primary',
                    disabled: Boolean(smsBusy) || busy, onClick: submitCode,
                  }, smsBusy === 'submit' ? t('state.loading') : '登录'),
                ]),
              ]),
              h('div', { key: 'actions', className: 'xhs-row', style: { justifyContent: 'flex-end', width: '100%' } }, [
                h('button', {
                  key: 'cancel', type: 'button', className: 'xhs-btn',
                  onClick: () => setAddAccountOpen(false),
                }, '取消'),
              ]),
            ]),
        ]),
      ]) : null

      const coverPreviewModal = coverPreview ? h('div', {
        className: 'xhs-modal',
        onClick: () => setCoverPreview(null),
      }, [
        h('div', {
          className: 'xhs-modalCard xhs-previewModal',
          onClick: (event) => event.stopPropagation(),
        }, [
          h('div', { key: 'head', className: 'xhs-modalHead' }, [
            h('span', { key: 'l', className: 'xhs-label' }, coverPreview.title || '封面大图'),
            h('button', {
              key: 'x', type: 'button', className: 'xhs-modalClose',
              onClick: () => setCoverPreview(null),
            }, '×'),
          ]),
          h('img', { key: 'img', src: coverPreview.src, alt: '封面大图' }),
          h('button', {
            key: 'close', type: 'button', className: 'xhs-btn',
            onClick: () => setCoverPreview(null),
          }, '关闭'),
        ]),
      ]) : null

      return h('div', { className: 'xhs-root', ref: rootRef }, [
        head,
        statusBar,
        toast ? h('div', { key: 'toast', className: 'xhs-toast', 'data-kind': toast.kind }, toast.text) : null,
        h('div', { key: 'body', className: 'xhs-body' }, bodyContent),
        qrModal,
        riskWordModal,
        promptModal,
        addAccountModal,
        coverPreviewModal,
      ])
    }

    // ------------------------------------------------------------------ 插件

    function registerStyle() {
      const tagId = '@local/xhs-publisher/studio.css'
      if (document.querySelector('style[data-plugin-css="' + tagId + '"]')) return () => {}
      const style = document.createElement('style')
      style.dataset.plugin = '@local/xhs-publisher'
      style.dataset.pluginCss = tagId
      style.textContent = css
      document.head.append(style)
      return () => { style.remove() }
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'xhs: dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.effect(registerStyle, 'xhs: styles')
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: ID,
        kind: KIND,
        title: () => t('tab.title'),
        guide: [{
          id: 'studio',
          order: 18,
          title: () => t('guide.title'),
          description: () => t('guide.description'),
          icon: GuideIcon,
        }],
      }), 'xhs: tab type')
      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab',
        key: ID,
        locale: NS,
        inject: () => ({
          openBrowser: (url) => {
            try {
              ctx.sidebarRight.openTab('browser', { params: { url } })
            } catch {
              window.open(url, '_blank')
            }
          },
        }),
      }, XhsStudio)), 'xhs: tab body')

      // 插件加载后主动把右侧栏打开到这个标签，避免“插件在、但右侧栏是空的”。
      let revealed = false
      ctx.effect(() => {
        if (revealed) return
        revealed = true
        const timer = setTimeout(() => {
          try { ctx.sidebarRight.openTab(KIND, {}) } catch {}
        }, 200)
        return () => clearTimeout(timer)
      }, 'xhs: reveal tab')
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight'],
      apply,
    }
  },
})

