export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { 
    star, tags, scene, mood, freeText, 
    shopName, features, atmosphere, targetAudience 
  } = req.body;

  const prompt = `
あなたは「${shopName}」のプロライターです。
以下のデータから、毎回異なる視点で**200文字以内**のクチコミを作成してください。

【入力】
- 評価: 星${star}
- メニュー: ${tags.join('、')} / 場面: ${scene} / 気分: ${mood}
- メモ: ${freeText || "なし"}

【ルール】
1. 150〜200文字厳守。
2. 書き出しを「味」「雰囲気」「シーン」のいずれかからランダムに開始。
3. ${targetAudience}が共感する自然な言葉（「最高」等の定型句は避ける）。
4. 本文のみ出力。
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 爆速＆高性能モデルに変更
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    res.status(200).json({ text: data.choices[0].message.content.trim() });
  } catch (error) {
    res.status(500).json({ message: '生成失敗' });
  }
}