export const config = {
  runtime: 'edge', // Edge Function（Request/Response ベース）
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY が設定されていません。Vercel の環境変数に追加してください。' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'リクエストボディの解析に失敗しました。' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const star = body.star || '';
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const freeText = body.freeText || '';

  const systemInstruction = `
あなたは「アイレット キャンティーン」のクチコミを執筆する専門ライターです。
必ずレビュー文の中で、
- 「金沢市高柳」にあるお店であること
- 「アジア料理」であること
- 「本格的な味」であること
といったニュアンスを、自然な日本語で含めてください。
過剰な誇張や事実と異なる表現は避け、実際に訪れたお客さまの声のように書いてください。
`.trim();

  const userContext = `
星評価: ${star || '未入力'}
選択されたタグ: ${tags.length ? tags.join('、') : '未選択'}
メモ（自由記述）: ${freeText || '特になし'}
`.trim();

  const prompt = `
[システム指示]
${systemInstruction}

[ユーザーからの情報]
${userContext}

[出力フォーマットの条件]
- 日本語で、自然な一人称のクチコミとして書いてください。
- 店名「アイレット キャンティーン」を1回以上含めてください。
- 星評価が高いほどポジティブなトーン、低いほど改善点にも触れるトーンにしてください。
- 絵文字は使わず、丁寧で読みやすい文体にしてください。
`.trim();

  try {
    const modelId = 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Gemini API error:', response.status, response.statusText, errorText);
      return new Response(
        JSON.stringify({
          error: 'Gemini API からエラー応答が返されました。',
          detail: errorText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    if (!generatedText) {
      return new Response(
        JSON.stringify({
          error: 'Gemini のレスポンスからテキストを取得できませんでした。',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text: generatedText }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return new Response(
      JSON.stringify({ error: 'Gemini API 呼び出し中にエラーが発生しました。' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}