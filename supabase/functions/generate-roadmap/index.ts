const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { vegName, family, growMethod, season, region, referenceUrl } = await req.json();

    const growMethodLabel =
      growMethod === 'seed_pot' ? '種（ポット）から' :
      growMethod === 'seed_ground' ? '種（地植え）から' : '苗から';

    const isSeed = growMethod === 'seed_pot' || growMethod === 'seed_ground';

    const systemPrompt = `あなたは野菜栽培の専門家です。与えられた野菜の情報をもとに、栽培ロードマップと基礎知識をJSON形式で生成してください。

出力はJSON形式のみで返してください。前後の説明文やコードブロック記号は不要です。

{
  "phases": [
    {
      "id": "p1",
      "majorStatus": "ready",
      "name": "フェーズ名",
      "period": "〜14日",
      "tasks": [
        {
          "id": "t1",
          "name": "タスク名",
          "desc": "簡単な説明（10〜20文字）",
          "day": 0,
          "memo": "詳細メモ（30〜60文字）",
          "url": "",
          "milestone": "",
          "type": ""
        }
      ]
    }
  ],
  "basicInfo": {
    "size": "株の高さと横幅の目安",
    "yieldPerPlant": "1苗あたりの収穫目安",
    "seasons": {
      "soilPrep": "土づくり時期",
      "sowing": "蒔きどき（種まき時期）",
      "planting": "定植時期",
      "firstFlower": "第一花時期",
      "harvest": "収穫時期"
    },
    "germinationTemp": "発芽適温（℃）",
    "germinationAccumulatedTemp": "発芽に必要な積算気温",
    "lightPreference": "好光性 または 嫌光性（理由も一言）",
    "oxygenNeeds": "好気性 または 嫌気性（土の通気・水やりへの影響）",
    "dormancy": "休眠の有無と休眠打破の方法（なければ「なし」）",
    "coldTolerance": "耐寒性（強・中・弱と霜への耐性）",
    "heatTolerance": "耐暑性（強・中・弱と高温障害の目安）",
    "continuousCropping": "連作障害の程度・何年あけるか・輪作の推奨科",
    "photoperiod": "光周性（長日・短日・中性植物かとトウ立ちリスク）",
    "droughtTolerance": "耐乾性（強・中・弱と乾燥時の症状）",
    "wetTolerance": "耐湿性（強・中・弱と過湿時の症状）",
    "soilPH": "適正pH範囲",
    "pollination": "自殖性 または 他殖性（受粉のポイント）",
    "pestResistance": "耐病虫性（強・中・弱と特に注意すべき点）",
    "rootDepth": "深根性 または 浅根性（根の深さの目安と土作りへの影響）",
    "methods": ["推奨育成方法のリスト"],
    "materials": ["必要資材のリスト"],
    "diseases": [
      {"name": "病名", "symptoms": "症状", "treatment": "対策"}
    ],
    "pests": [
      {"name": "害虫名", "symptoms": "症状", "treatment": "対策"}
    ],
    "growthStages": [
      {"label": "発芽", "query": "${vegName} 発芽"},
      {"label": "本葉出始め", "query": "${vegName} 本葉"},
      {"label": "開花", "query": "${vegName} 花"},
      {"label": "収穫期（全体像）", "query": "${vegName} 収穫 株"},
      {"label": "実（つき始め）", "query": "${vegName} 実 つき始め"},
      {"label": "実（食べごろ）", "query": "${vegName} 収穫"}
    ]
  }
}

ロードマップのルール：
- majorStatusは順に "ready" → "growing" → "harvesting" → "done" を使用
- フェーズは3〜5個、各フェーズのタスクは2〜5個
- dayは作業開始日からの経過日数（整数）
- ${isSeed ? '種から育てる場合：p1に「種まき」タスク（milestone:"sowing"）と「発芽確認」タスク（milestone:"germination"）を必ず含める' : '苗から育てる場合：p1に「定植（植付け）」タスク（milestone:"planting"）を必ず含める'}
- 収穫フェーズに「初収穫」タスク（milestone:"firstHarvest"）を含める
- urlは空文字列でOK
- idはp1,p2...およびt1,t2...のように連番
- 各フェーズに病害虫チェックタスクを1件追加する。typeは"pest"を設定すること
  例: {"id":"t_pest","name":"アブラムシ・うどんこ病チェック","desc":"葉の表裏を確認","day":28,"memo":"白い粉や虫がいれば早めに対処","url":"","milestone":"","type":"pest"}

basicInfoのルール：
- growthStagesのqueryは日本語で「${vegName} ステージ名」形式にする
- diseases・pestsはそれぞれ2〜4件
- methodsは育成方法と管理のポイントを3〜6件
- materialsは実際に必要な資材を3〜6件`;

    const seasonLabels: Record<string, string> = {
      spring: '春まき', summer: '夏まき', autumn: '秋まき', winter: '冬まき', year_round: '通年'
    };
    const regionLabels: Record<string, string> = {
      cool: '冷涼地', middle: '中間地', warm: '暖地'
    };
    const seasonLabel = season ? seasonLabels[season] || '' : '';
    const regionLabel = region ? regionLabels[region] || '' : '';

    const userPrompt = `野菜名: ${vegName}
科: ${family}
育成方法: ${growMethodLabel}
${seasonLabel ? `作期: ${seasonLabel}` : ''}
${regionLabel ? `地域: ${regionLabel}` : ''}
${referenceUrl ? `参考URL: ${referenceUrl}` : ''}

この野菜の栽培ロードマップと基礎知識をJSONで生成してください。作期・地域が指定されている場合はその条件に合わせたロードマップにし、basicInfoのseasonsフィールド（soilPrep・sowing・planting・harvest等）もその条件に合わせた時期を記載してください。`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりませんでした');
    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
