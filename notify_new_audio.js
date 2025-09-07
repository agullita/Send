import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { runCode, url, duration_s, sender } = req.body || {};
    if (!runCode || !url) {
      return res.status(400).json({ error: 'Missing runCode or url' });
    }

    const supa = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    const { data: runOk, error: runErr } = await supa
      .from('runs')
      .select('run_code, ended_at')
      .eq('run_code', runCode)
      .is('ended_at', null)
      .maybeSingle();

    if (runErr) return res.status(500).json({ error: runErr.message });
    if (!runOk) return res.status(400).json({ error: 'Run not active or not found' });

    const { error: insErr } = await supa.from('audio_messages').insert({
      run_code: runCode,
      url,
      duration_s: Math.max(1, Math.min(Number(duration_s || 0), 45)),
      sender: sender || null
    });

    if (insErr) return res.status(400).json({ error: insErr.message });

    const payload = {
      to: `/topics/run_${runCode}`,
      data: { audioUrl: url, runCode, sender: sender || '' },
      notification: {
        title: 'Nuevo audio 🙌',
        body: sender ? `${sender} te ha enviado un mensaje` : 'Tienes un nuevo mensaje'
      }
    };

    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!fcmRes.ok) {
      const txt = await fcmRes.text();
      return res.status(500).json({ error: `FCM error: ${txt}` });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
