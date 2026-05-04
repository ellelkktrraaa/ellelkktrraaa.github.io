const BATCH_SIZE = 100

async function ensureInit(env) {
    const idx = await env.MNIST_KV.get('idx')
    if (idx === null) {
        await env.MNIST_KV.put('idx', '0')
        await env.MNIST_KV.put('buffer', JSON.stringify({ nums: 0, bench: [] }))
    }
}

async function getCount(env) {
    await ensureInit(env)
    const buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    return buf.nums
}

async function addSample(env, lable, img) {
    await ensureInit(env)

    let buf = JSON.parse(await env.MNIST_KV.get('buffer'))
    let idx = parseInt(await env.MNIST_KV.get('idx'))

    buf.bench.push({ lable, img })
    buf.nums++

    if (buf.nums >= BATCH_SIZE) {
        await env.MNIST_KV.put(`batch_${idx}`, JSON.stringify(buf))
        await env.MNIST_KV.put('idx', String(idx + 1))
        await env.MNIST_KV.put('buffer', JSON.stringify({ nums: 0, bench: [] }))
        console.log(`🍪 Saved batch_${idx} to KV — ${buf.nums} samples 喵`)
        return { saved: true, count: buf.nums, batchIdx: idx }
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

    const idx = parseInt(await env.MNIST_KV.get('idx'))
    await env.MNIST_KV.put(`batch_${idx}`, JSON.stringify(buf))
    await env.MNIST_KV.put('idx', String(idx + 1))
    await env.MNIST_KV.put('buffer', JSON.stringify({ nums: 0, bench: [] }))
    console.log(`🍪 Flushed batch_${idx} to KV — ${buf.nums} samples 喵`)
    return { saved: true, count: buf.nums, batchIdx: idx }
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

async function getBuffer(env) {
    const val = await env.MNIST_KV.get('buffer')
    if (!val) return { nums: 0, bench: [] }
    return JSON.parse(val)
}

export { getCount, addSample, flush, listBatchKeys, getBatch, getBuffer }
