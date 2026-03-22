export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { 
    star, 
    tags, 
    scene, 
    mood, 
    freeText, 
    shopName, 
    features, 
    atmosphere, 
    targetAudience 
  } = req.body;

  // AIへの指示文（プロンプト）
  const prompt = `
あなたは「${shopName}」の魅力を伝える、型にはまらないプロの短文ライターです。
以下のデータをもとに、生成するたびに異なる視点で、**200文字以内**の新鮮なクチコミを1つ作成してください。

【店舗データ】
- 店名: ${shopName}
- こだわり: ${features}
- 雰囲気: ${atmosphere}
- ターゲット層: ${targetAudience}

【ユーザー入力】
- 満足度: 星${star}個
- 選んだメニュー: ${tags.join('、')}
- 利用シーン: ${scene}
- 今の気分: ${mood}
- 感想メモ: ${freeText || "特になし"}

【執筆ルール（ランダム性と簡潔さの徹底）】
1. **書き出しをランダムに**: 毎回、以下のいずれかのパターンを直感で選んで書き始めてください。
   - パターンA：特定のメニュー（${tags[0]}等）の具体的な味や感動から。
   - パターンB：その日の${mood}や、${atmosphere}を感じるお店の第一印象から。
   - パターンC：${scene}というシチュエーションに、この店がどう寄り添ってくれたか。
2. **文字数制限**: 150文字〜200文字程度。200文字を絶対に超えないこと。
3. **トーン**: ${targetAudience}が共感する、自然で温かみのある言葉遣い。
4. **脱・定型句**: 「最高でした」「おすすめです」といった使い古された表現は避け、「〜という発見があった」「〜に癒やされた」など、心の動きを表現してください。
5. **出力**: 余計な解説や挨拶は一切省き、クチコミの本文のみを出力してください。
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // または 'gpt-4'
        messages: [
          { role: 'system', content: '