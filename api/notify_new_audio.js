import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { runCode, url, duration_s, sender } = req.body

  if (!runCode || !url) {
    return res.status(400).json({ error: 'Missing runCode or url' })
  }

  // 👇 Guardar siempre en audio_messages, sin comprobar tabla runs
  const { error } = await supabase
    .from('audio_messages')
    .insert([{ run_code: runCode, url, duration_s, sender }])

  if (error) {
    console.error(error)
    return res.status(500).json({ error: 'DB insert failed' })
  }

  res.status(200).json({ ok: true })
}

