import { listBatchKeys, getBatch, getBuffer } from '../../_storage.js'
import { checkAuth, unauthorized } from '../../_auth.js'

export async function onRequestGet(context) {
    const { request, env } = context

    if (!checkAuth(request, env)) return unauthorized()

    try {
        const info = await listBatchKeys(env)
        const all = []

        for (const b of info.batches) {
            const batch = await getBatch(env, b.batchIdx)
            if (batch) all.push(batch)
        }

        const buf = await getBuffer(env)
        if (buf.nums > 0) {
            all.push(buf)
        }

        return new Response(JSON.stringify({ batches: all, total: info.buffered + info.batches.reduce((s, b) => s + b.nums, 0) }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
