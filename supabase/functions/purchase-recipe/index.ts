import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) throw new Error('認証が必要です');

    const { recipe_id } = await req.json();
    if (!recipe_id) throw new Error('recipe_id is required');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ログインユーザーをJWTで検証（クライアントの自己申告は信用しない）
    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !user) throw new Error('認証に失敗しました');

    // 以降はService Roleで、価格計算・書き込みを行う
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 会員（usersにレコードがある）か確認。「ログイン＝会員＝サブスク」なので
    // レコードが無ければ会員登録（サブスク決済）が未完了ということ
    const { data: memberRow, error: memberErr } = await admin
      .from('users')
      .select('id')
      .eq('auth_uid', user.id)
      .maybeSingle();
    if (memberErr) throw memberErr;
    if (!memberRow) {
      return new Response(JSON.stringify({ error: '会員登録（サブスク決済）が完了していません' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const userId = memberRow.id;

    // 二重購入チェック（recipe_purchasesのUNIQUE制約と合わせて二重の防止線）
    const { data: existing } = await admin
      .from('recipe_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipe_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, already_owned: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // レシピ本体を取得（公開中のもののみ購入可能）
    const { data: recipe, error: recipeErr } = await admin
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .eq('is_published', true)
      .maybeSingle();
    if (recipeErr) throw recipeErr;
    if (!recipe) throw new Error('レシピが見つかりません');

    // 実効価格の判定（セール期間中かどうか）はクライアントを信用せずサーバー側で計算する
    let price = recipe.price_jpy;
    if (recipe.sale_price_jpy != null && recipe.sale_starts_at && recipe.sale_ends_at) {
      const now = new Date();
      if (now >= new Date(recipe.sale_starts_at) && now <= new Date(recipe.sale_ends_at)) {
        price = recipe.sale_price_jpy;
      }
    }
    const creatorShare = Math.round(price * recipe.creator_share_percent / 100);
    const platformShare = price - creatorShare;

    // 購入・分配台帳に記録
    // stripe_payment_intent_id は現時点ではnull（フェーズ5でStripe連携後に設定する）
    const { error: purchaseErr } = await admin.from('recipe_purchases').insert({
      user_id: userId,
      recipe_id: recipe.id,
      price_paid_jpy: price,
      creator_share_jpy: creatorShare,
      platform_share_jpy: platformShare,
      stripe_payment_intent_id: null,
    });
    if (purchaseErr) throw purchaseErr;

    // 購入時点の内容をuser_recipesにコピー。以後はマスター(recipes)と独立し、
    // ユーザーが自由に編集できる（マスター側の改訂は自動反映しない）
    const { data: userRecipe, error: copyErr } = await admin
      .from('user_recipes')
      .insert({
        user_id: userId,
        source_recipe_id: recipe.id,
        name: recipe.name,
        emoji: recipe.emoji,
        veg_key: recipe.veg_key,
        family: recipe.family,
        grow_method: recipe.grow_method,
        season: recipe.season,
        phases: recipe.phases,
        basic_info: recipe.basic_info,
        reference_video_url: recipe.reference_video_url,
      })
      .select()
      .single();
    if (copyErr) throw copyErr;

    return new Response(JSON.stringify({ ok: true, user_recipe: userRecipe }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
