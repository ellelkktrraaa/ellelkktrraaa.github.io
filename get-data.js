const fs = require('fs')
const path = require('path')

const SECRET = process.env.MNIST_SECRET || 'ngismun!-!ellelktrraaa'
const BASE = 'https://numsign.pages.dev'

const ROUTER = {
    all_mnib() {
        return { url: `${BASE}/api/export/mnib?key=${SECRET}`, type: 'all_mnib', ext: '.mnib' }
    },
    mnib(idx) {
        return { url: `${BASE}/api/batch/${idx}.mnib?key=${SECRET}`, type: 'mnib', ext: '.mnib' }
    },
    json(idx) {
        return { url: `${BASE}/api/batch/${idx}?key=${SECRET}`, type: 'json', ext: '.json' }
    },
    all_json() {
        return { url: `${BASE}/api/export?key=${SECRET}`, type: 'all_json', ext: '.json' }
    }
}

async function getKv(router) {
    const res = await fetch(router.url)
    if (!res.ok) {
        throw new Error(`[ERROR] HTTP ${res.status}: ${res.statusText}`)
    }
    if (router.type === 'all_mnib' || router.type === 'mnib') {
        const buf = await res.arrayBuffer()
        return { type: router.type, data: Buffer.from(buf) }
    }
    const json = await res.json()
    return { type: router.type, data: json }
}

async function save(router, savePath = null) {
    const { type, data } = await getKv(router)

    if (!savePath) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        savePath = path.join(__dirname, 'data', `${type}_${ts}${router.ext}`)
    }

    const dir = path.dirname(savePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    if (Buffer.isBuffer(data)) {
        fs.writeFileSync(savePath, data)
        const kb = (data.length / 1024).toFixed(1)
        console.log(`💾 Saved ${savePath} — ${kb} KB nia~`)
    } else {
        fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8')
        const total = data.total || (data.batches ? data.batches.length : '?')
        console.log(`💾 Saved ${savePath} — ${total} total samples nia`)
    }
}

function printUsage() {
    console.log(`
🍪  get-data.js — 从 Cloudflare KV 拉取数据喵

  node get-data.js all_mnib              一键下载全部 MNIB
  node get-data.js mnib 0                下载第0批 MNIB
  node get-data.js json 0                下载第0批 JSON
  node get-data.js all_json              一键下载全部 JSON
  node get-data.js batch                 下载全部批次 (逐个下载)

  设置环境变量 MNIST_SECRET 可替换默认 key 喵~
`)
}

async function main() {
    const args = process.argv.slice(2)
    const cmd = args[0]

    if (!cmd || cmd === 'help') {
        printUsage()
        return
    }

    try {
        if (cmd === 'all_mnib') {
            await save(ROUTER.all_mnib())
        } else if (cmd === 'all_json') {
            await save(ROUTER.all_json())
        } else if (cmd === 'mnib') {
            const idx = parseInt(args[1])
            if (isNaN(idx)) { console.error('[ERROR] usage: node get-data.js mnib <idx>'); return }
            await save(ROUTER.mnib(idx))
        } else if (cmd === 'json') {
            const idx = parseInt(args[1])
            if (isNaN(idx)) { console.error('[ERROR] usage: node get-data.js json <idx>'); return }
            await save(ROUTER.json(idx))
        } else if (cmd === 'batch') {
            const res = await fetch(`${BASE}/api/batches?key=${SECRET}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const info = await res.json()
            console.log(`📋 Found ${info.totalBatches} batch(es) + ${info.buffered} buffered nia`)

            for (const b of info.batches) {
                await save(ROUTER.mnib(b.batchIdx))
            }
            console.log(`\n✅ All ${info.totalBatches} batches downloaded nia~`)
        } else {
            console.error(`[ERROR] Unknown command: ${cmd}`)
            printUsage()
        }
    } catch (err) {
        console.error(`[ERROR] ${err.message}`)
    }
}

main()
