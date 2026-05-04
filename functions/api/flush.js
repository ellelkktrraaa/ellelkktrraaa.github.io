import { flush } from '../_storage.js'

export async function onRequestPost(context) {
    const { env } = context

    try {
        const result = await flush(env)
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ saved: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
