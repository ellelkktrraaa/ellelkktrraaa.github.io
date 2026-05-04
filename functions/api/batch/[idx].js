import { getBatch } from '../../_storage.js'
import { checkAuth, unauthorized } from '../../_auth.js'

export async function onRequestGet(context) {
    const { request, env, params } = context

    if (!checkAuth(request, env)) return unauthorized()

    try {
        const idx = parseInt(params.idx)
        if (isNaN(idx)) {
            return new Response(JSON.stringify({ error: 'invalid batch index 喵' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
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
