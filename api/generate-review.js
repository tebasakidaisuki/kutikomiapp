function parseBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
    star,
    tags: rawTags,
    scene,
    mood,
    freeText,
    shopName,
    targetAudience,
  } = parseBody(req);

  const tags = Array.isArray(rawTags)
    ? rawTags.filter(Boolean)
    : typeof rawTags === 'string'
      ? rawTags.split(/[、,]/).map((s) => s.trim()).filter(Boolean)
      : [];

  const prompt = `
あなたは「${shopName ?? 'お店'}」のプロライターです。
以下のデータから、毎回異なる視点で**200文字以内**のクチコミを作成してください。

【入力】
- 評価: 星${star}
- メニュー: ${tags.length ? tags.join('、') : '（未選択）'} / 場面: ${scene || '（未選択）'} / 気分: ${mood || '（未選択）'}
- メモ: ${freeText || 'なし'}

【ルール】
1. 150〜200文字厳守。
2. 書き出しを「味」「雰囲気」「シーン」のいずれかからランダムに開始。
3. ${targetAudience || '来店客'}が共感する自然な言葉（「最高」等の定型句は避ける）。
4. 本文のみ出力。
`;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      message: 'サーバーに OPENAI_API_KEY が設定されていません（Vercel の Environment Variables を確認）',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data?.error?.message || response.statusText;
      return res.status(502).json({
        message: `OpenAI API エラー: ${detail}`,
      });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return res.status(502).json({
        message: 'OpenAI から本文が返りませんでした',
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '生成失敗';
    return res.status(500).json({ message: msg });
  }
}