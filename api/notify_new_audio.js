// /api/notify_new_audio.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Útil para comprobar rápido si las env vars están bien
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      has_SUPABASE_URL: !!process.env.SUPABASE_URL,
      has_SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { runCode, url, duration_s, sender } = req.body || {};
    if (!runCode || !url) {
      return res.status(400).json({ error: 'Missing runCode or url' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return res.status(500).json({
        error: 'Missing env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE',
      });
    }

    // Service Role para que funcione aunque RLS esté activado
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Insert directo SIN validar runs (modo prueba)
    const { data, error } = await supa
      .from('audio_messages')
      .insert({
        run_code: runCode,
        url,
        duration_s: Math.max(1, Number(duration_s || 0)),
        sender: sender || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `insert failed: ${error.message}` });
    }

    return res.status(200).json({ ok: true, id: data?.id || null });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
