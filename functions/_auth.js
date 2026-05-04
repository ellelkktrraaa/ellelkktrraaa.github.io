function unauthorized() {
    return new Response(JSON.stringify({ error: 'unauthorized 喵' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    })
}

function checkAuth(request, env) {
    const secret = env.SECRET_KEY
    if (!secret) return false

    const url = new URL(request.url)
    const keyParam = url.searchParams.get('key')
    if (keyParam === secret) return true

    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader === `Bearer ${secret}`) return true

    return false
}

export { checkAuth, unauthorized }
