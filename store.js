const fs = require('fs').promises
const path = require('path')

const MN_DIR = path.join(__dirname, 'mn')
const BATCH_SIZE = 100

let buffer = []
let fileIdx = 0

async function ensureDir() {
    try {
        await fs.mkdir(MN_DIR, { recursive: true })
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }
}

async function scanExistingFiles() {
    await ensureDir()
    let maxIdx = -1
    try {
        const files = await fs.readdir(MN_DIR)
        for (const f of files) {
            if (f.startsWith('minibench') && f.endsWith('.json')) {
                const match = f.match(/(\d+)/)
                if (match) {
                    const idx = parseInt(match[1])
                    if (idx > maxIdx) maxIdx = idx
                }
            }
        }
    } catch (err) {
        if (err.code !== 'ENOENT') throw err
    }
    return maxIdx
}

async function init() {
    const maxIdx = await scanExistingFiles()
    fileIdx = maxIdx + 1
    if (fileIdx > 0) {
        console.log(`🔍 Found existing batches up to minibench${maxIdx}, starting at minibench${fileIdx} 喵`)
    }
}

function jsonToMnibBuffer(batch) {
    const n = batch.nums
    const features = 784

    let offset = 0
    const headerSize = 4 + 4 + 4 + 4
    const sampleSize = 4 + features * 4
    const totalSize = headerSize + n * sampleSize
    const buf = Buffer.alloc(totalSize)

    buf.write('MNIB', offset, 4, 'ascii')
    offset += 4
    buf.writeInt32LE(n, offset)
    offset += 4
    buf.writeInt32LE(1, offset)
    offset += 4
    buf.writeInt32LE(features, offset)
    offset += 4

    for (let i = 0; i < n; i++) {
        const sample = batch.bench[i]
        buf.writeInt32LE(sample.lable, offset)
        offset += 4

        const img = sample.img
        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                buf.writeFloatLE(img[y] ? img[y][x] || 0 : 0, offset)
                offset += 4
            }
        }
    }

    return buf
}

async function saveBatch() {
    if (buffer.length === 0) return
    await ensureDir()
    const batch = {
        nums: buffer.length,
        bench: buffer.splice(0)
    }
    const fileIdxSnapshot = fileIdx
    fileIdx++

    const jsonPath = path.join(MN_DIR, `minibench${fileIdxSnapshot}.json`)
    const mnibPath = path.join(MN_DIR, `minibench${fileIdxSnapshot}.mnib`)

    await fs.writeFile(jsonPath, JSON.stringify(batch, null, 2), 'utf-8')

    const mnibBuf = jsonToMnibBuffer(batch)
    await fs.writeFile(mnibPath, mnibBuf)

    console.log(`🍪 Saved minibench${fileIdxSnapshot} — ${batch.nums} samples (json + mnib) 喵`)
}

async function addSample(label, img) {
    buffer.push({ lable: label, img })
    console.log(`📥 Received sample ${buffer.length}/${BATCH_SIZE} 喵`)
    if (buffer.length >= BATCH_SIZE) {
        await saveBatch()
    }
}

function getCount() {
    return buffer.length
}

async function flush() {
    if (buffer.length > 0) {
        const count = buffer.length
        await saveBatch()
        return { saved: true, count }
    }
    return { saved: false, count: 0 }
}

module.exports = { addSample, flush, getCount, init }
