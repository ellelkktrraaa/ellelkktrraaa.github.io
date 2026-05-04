const BATCH_SIZE = 100

function encodeText(buf, str, o) {
    for (let i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i)
}

function writeI32LE(buf, o, v) {
    buf[o] = v & 0xff
    buf[o + 1] = (v >> 8) & 0xff
    buf[o + 2] = (v >> 16) & 0xff
    buf[o + 3] = (v >> 24) & 0xff
}

function writeF32LE(arr, o, v) {
    new DataView(arr.buffer, arr.byteOffset, arr.byteLength).setFloat32(o, v, true)
}

function jsonToMnibBuffer(batch) {
    const n = batch.nums
    const features = 784
    const headerSize = 16
    const sampleSize = 4 + features * 4
    const totalSize = headerSize + n * sampleSize
    const buf = new Uint8Array(totalSize)

    encodeText(buf, 'MNIB', 0)
    writeI32LE(buf, 4, n)
    writeI32LE(buf, 8, 1)
    writeI32LE(buf, 12, features)

    let offset = headerSize
    for (let i = 0; i < n; i++) {
        const sample = batch.bench[i]
        writeI32LE(buf, offset, sample.lable)
        offset += 4
        const img = sample.img
        for (let y = 0; y < 28; y++) {
            for (let x = 0; x < 28; x++) {
                writeF32LE(buf, offset, img[y] ? (img[y][x] || 0) : 0)
                offset += 4
            }
        }
    }
    return buf
}

async function ensureInit(env) {
    const idx = await env.MNIST_KV.get('idx')
    if (idx === null) {
        await env.MNIST_KV.put('idx', '0')
        await env.MNIST_KV.put('buffer', JSON.stringify({ nums: 0, bench: [] }))
    }
}

async function saveBatchToKV(env, buf, reason) {
    const idx = parseInt(await env.MNIST_KV.get('idx'))
    await env.MNIST_KV.put(`batch_${idx}`, JSON.stringify(buf))
    await env.MNIST_KV.put('idx', String(idx + 1))
    await env.MNIST_KV.put('buffer', JSON.stringify({ nums: 0, bench: [] }))
    console.log(`🍪 ${reason} batch_${idx} to KV — ${buf.nums} samples 喵`)
    return { saved: true, count: buf.nums, batchIdx: idx }
}

async function getCount(env) {
    await ensureInit(env)
    const buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    return buf.nums
}

async function addSample(env, lable, img) {
    await ensureInit(env)

    let buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    buf.bench.push({ lable, img })
    buf.nums++

    if (buf.nums >= BATCH_SIZE) {
        return saveBatchToKV(env, buf, 'Saved')
    }

    await env.MNIST_KV.put('buffer', JSON.stringify(buf))
    console.log(`📥 Buffer: ${buf.nums}/${BATCH_SIZE} 喵`)
    return { saved: false, count: buf.nums }
}

async function flush(env) {
    await ensureInit(env)

    const buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    if (buf.nums === 0) {
        return { saved: false, count: 0 }
    }

    return saveBatchToKV(env, buf, 'Flushed')
}

async function listBatchKeys(env) {
    await ensureInit(env)
    const maxIdx = parseInt(await env.MNIST_KV.get('idx'))
    const keys = []
    for (let i = 0; i < maxIdx; i++) {
        const val = await env.MNIST_KV.get(`batch_${i}`)
        if (val) {
            const batch = JSON.parse(val)
            keys.push({ batchIdx: i, nums: batch.nums })
        }
    }
    const buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    return { batches: keys, buffered: buf.nums, totalBatches: keys.length }
}

async function getBatch(env, idx) {
    const val = await env.MNIST_KV.get(`batch_${idx}`)
    if (!val) return null
    return JSON.parse(val)
}

async function getBatchMnib(env, idx) {
    const batch = await getBatch(env, idx)
    if (!batch) return null
    return jsonToMnibBuffer(batch)
}

async function getBuffer(env) {
    const val = await env.MNIST_KV.get('buffer')
    if (!val) return { nums: 0, bench: [] }
    return JSON.parse(val)
}

async function mergeAllToMnib(env) {
    const all = []
    const info = await listBatchKeys(env)

    for (const b of info.batches) {
        const batch = await getBatch(env, b.batchIdx)
        if (batch) all.push(batch)
    }

    const buf = await getBuffer(env)
    if (buf.nums > 0) all.push(buf)

    const totalN = all.reduce((s, b) => s + b.nums, 0)
    if (totalN === 0) return null

    const features = 784
    const headerSize = 16
    const sampleSize = 4 + features * 4
    const totalSize = headerSize + totalN * sampleSize
    const out = new Uint8Array(totalSize)

    encodeText(out, 'MNIB', 0)
    writeI32LE(out, 4, totalN)
    writeI32LE(out, 8, 1)
    writeI32LE(out, 12, features)

    let offset = headerSize
    for (const batch of all) {
        for (let i = 0; i < batch.nums; i++) {
            const sample = batch.bench[i]
            writeI32LE(out, offset, sample.lable)
            offset += 4
            const img = sample.img
            for (let y = 0; y < 28; y++) {
                for (let x = 0; x < 28; x++) {
                    writeF32LE(out, offset, img[y] ? (img[y][x] || 0) : 0)
                    offset += 4
                }
            }
        }
    }

    return { buffer: out, total: totalN }
}

export { getCount, addSample, flush, listBatchKeys, getBatch, getBatchMnib, getBuffer, jsonToMnibBuffer, mergeAllToMnib }
