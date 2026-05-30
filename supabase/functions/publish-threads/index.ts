import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const THREADS_API = 'https://graph.threads.net/v1.0'

async function threadsRequest(path: string, params: Record<string, string>, method = 'POST') {
  const url = `${THREADS_API}/${path}`
  const body = new URLSearchParams(params)
  const res = await fetch(url, { method, body })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Threads API error: ${res.status} ${err}`)
  }
  return res.json()
}

async function threadsGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params)
  const url = `${THREADS_API}/${path}?${qs}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Threads API error: ${res.status}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { post_id } = await req.json()
  if (!post_id) {
    return new Response(JSON.stringify({ error: 'post_id required' }), { status: 400 })
  }

  const { data: post, error: postError } = await supabase
    .from('threads_posts')
    .select('*, threads_post_segments(*)')
    .eq('id', post_id)
    .single()

  if (postError || !post) {
    return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404 })
  }

  if (post.status === 'published') {
    return new Response(JSON.stringify({ error: 'Already published' }), { status: 409 })
  }

  // 계정(account)별 자격증명 분기. growthwave(테스트) | onketing(실제).
  // THREADS_USER_ID_<ACCOUNT> / THREADS_ACCESS_TOKEN_<ACCOUNT> 로 라우팅.
  // account 가 지정됐는데 해당 계정 토큰이 없으면 명확히 에러 (엉뚱한 계정 발행 방지).
  // account 가 없을 때(레거시 행)만 단일 THREADS_USER_ID / THREADS_ACCESS_TOKEN 폴백.
  const accountKey = String(post.account ?? '').toUpperCase()
  const USER_ID = accountKey ? Deno.env.get(`THREADS_USER_ID_${accountKey}`) : Deno.env.get('THREADS_USER_ID')
  const TOKEN = accountKey ? Deno.env.get(`THREADS_ACCESS_TOKEN_${accountKey}`) : Deno.env.get('THREADS_ACCESS_TOKEN')

  if (!USER_ID || !TOKEN) {
    return new Response(
      JSON.stringify({
        error: `Threads 자격증명 없음 (account=${post.account ?? 'null'}). THREADS_USER_ID_${accountKey || '<ACCOUNT>'} / THREADS_ACCESS_TOKEN_${accountKey || '<ACCOUNT>'} 시크릿을 설정하세요.`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const segments = (post.threads_post_segments as { id: string; order_index: number; content: string }[]).sort(
    (a, b) => a.order_index - b.order_index,
  )

  // 본문 생성 및 발행
  // 토픽 태그는 최상위 글에만 적용 (1~50자, 마침표·앰퍼샌드 불가). 답글에는 적용되지 않는다.
  const topicTag = String(post.topic_tag ?? '')
    .replace(/^#/, '')
    .replace(/[.&]/g, '')
    .trim()
    .slice(0, 50)
  const mainParams: Record<string, string> = {
    media_type: 'TEXT',
    text: segments[0].content,
    access_token: TOKEN,
  }
  if (topicTag) mainParams.topic_tag = topicTag
  const mainCreated = await threadsRequest(`${USER_ID}/threads`, mainParams)
  const mainPublished = await threadsRequest(`${USER_ID}/threads_publish`, {
    creation_id: mainCreated.id,
    access_token: TOKEN,
  })
  const mainPostId: string = mainPublished.id

  // 댓글 발행 (sequential chain: 각 댓글이 직전 댓글에 연결)
  let previousPublishedId = mainPostId
  for (const seg of segments.slice(1)) {
    await new Promise((r) => setTimeout(r, 1500))
    const replyCreated = await threadsRequest(`${USER_ID}/threads`, {
      media_type: 'TEXT',
      text: seg.content,
      reply_to_id: previousPublishedId,
      access_token: TOKEN,
    })
    const replyPublished = await threadsRequest(`${USER_ID}/threads_publish`, {
      creation_id: replyCreated.id,
      access_token: TOKEN,
    })
    previousPublishedId = replyPublished.id
    await supabase.from('threads_post_segments').update({ reply_thread_id: replyPublished.id }).eq('id', seg.id)
    await new Promise((r) => setTimeout(r, 500))
  }

  // 블로그 링크는 본문/체인이 아니라 마지막 별도 답글로 부착 (Threads 도달 보호)
  // 계정별 블로그: BLOG_URL_<ACCOUNT> → BLOG_URL → 기본값
  const BLOG_URL =
    (accountKey && Deno.env.get(`BLOG_URL_${accountKey}`)) ||
    Deno.env.get('BLOG_URL') ||
    'https://blog.naver.com/onketing-'
  if (BLOG_URL) {
    try {
      await new Promise((r) => setTimeout(r, 1500))
      const linkCreated = await threadsRequest(`${USER_ID}/threads`, {
        media_type: 'TEXT',
        text: `이 주제 더 깊이 ↓\n${BLOG_URL}`,
        reply_to_id: previousPublishedId,
        access_token: TOKEN,
      })
      const linkPublished = await threadsRequest(`${USER_ID}/threads_publish`, {
        creation_id: linkCreated.id,
        access_token: TOKEN,
      })
      previousPublishedId = linkPublished.id
    } catch (_e) {
      // 링크 답글 실패는 발행 전체를 막지 않는다 (본문/체인은 이미 게시됨)
    }
  }

  // permalink 조회
  let threadPostUrl = `https://www.threads.net/t/${mainPostId}`
  try {
    const permalinkData = await threadsGet(mainPostId, {
      fields: 'permalink',
      access_token: TOKEN,
    })
    if (permalinkData.permalink) threadPostUrl = permalinkData.permalink
  } catch {
    // permalink 조회 실패 시 기본 URL 사용
  }

  // 게시글 상태 업데이트
  await supabase
    .from('threads_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      thread_post_id: mainPostId,
      thread_post_url: threadPostUrl,
    })
    .eq('id', post_id)

  return new Response(JSON.stringify({ success: true, thread_post_url: threadPostUrl }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
