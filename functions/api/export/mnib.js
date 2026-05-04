import { mergeAllToMnib } from '../../_storage.js'
import { checkAuth, unauthorized } from '../../_auth.js'

export async function onRequestGet(context) {
    const { request, env } = context

    if (!checkAuth(request, env)) return unauthorized()

    try {
        const result = await mergeAllToMnib(env)
        if (!result) {
            return new Response(JSON.stringify({ error: 'no samples 喵' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        return new Response(result.buffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="all.mnib"`
            }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
