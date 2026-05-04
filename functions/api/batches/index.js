import { listBatchKeys } from '../../_storage.js'
import { checkAuth, unauthorized } from '../../_auth.js'

export async function onRequestGet(context) {
    const { request, env } = context

    if (!checkAuth(request, env)) return unauthorized()

    try {
        const info = await listBatchKeys(env)
        return new Response(JSON.stringify(info), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
