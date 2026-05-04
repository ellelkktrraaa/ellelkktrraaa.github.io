import { getCount } from '../_storage.js'

export async function onRequestGet(context) {
    const { env } = context

    try {
        const count = await getCount(env)
        return new Response(JSON.stringify({ count }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ count: 0, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
