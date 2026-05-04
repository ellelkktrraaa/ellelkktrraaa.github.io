import { addSample } from '../_storage.js'

export async function onRequestPost(context) {
    const { request, env } = context

    try {
        const { lable, img } = await request.json()
        const result = await addSample(env, lable, img)
        return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
