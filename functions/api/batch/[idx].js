import { getBatch, getBatchMnib } from '../../_storage.js'
import { checkAuth, unauthorized } from '../../_auth.js'

export async function onRequestGet(context) {
    const { request, env, params } = context

    if (!checkAuth(request, env)) return unauthorized()

    try {
        let rawIdx = params.idx
        let wantMnib = false

        if (rawIdx.endsWith('.mnib')) {
            wantMnib = true
            rawIdx = rawIdx.slice(0, -5)
        }

        const idx = parseInt(rawIdx)
        if (isNaN(idx)) {
            return new Response(JSON.stringify({ error: 'invalid batch index 喵' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        if (wantMnib) {
            const mnibBuf = await getBatchMnib(env, idx)
            if (!mnibBuf) {
                return new Response(JSON.stringify({ error: 'batch not found 喵' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                })
            }
            return new Response(mnibBuf, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="minibench${idx}.mnib"`
                }
            })
        }

        const batch = await getBatch(env, idx)
        if (!batch) {
            return new Response(JSON.stringify({ error: 'batch not found 喵' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify(batch), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
