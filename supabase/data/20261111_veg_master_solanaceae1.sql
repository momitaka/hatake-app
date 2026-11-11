-- 基礎知識マスタ整備 #1(ナス科: トマト・ミニトマト・ナス)。2026-11-11。公開(published)で上書き。regional_scheduleは触らない
begin;
insert into veg_basic_info_defaults (veg_key,basic_info,status,updated_by) values ('tomato', $json${
 "family": "ナス科",
 "scientificName": "Solanum lycopersicum",
 "edibleParts": "果実",
 "germinationTemp": "発芽適温は25〜30℃前後(20〜30℃とする資料もある)。15℃以下や30℃以上では発芽率が落ちる。",
 "sproutingTemp": "生育適温は25〜30℃とする資料と、昼20〜25℃・夜8〜13℃とする資料があり、幅がある。8℃以下や35℃以上では生育に障害が出る。",
 "soilPH": "pH6.0〜6.5が目安。",
 "continuousCropping": "ナス科(ナス・ピーマン・ジャガイモなど)を同じ場所に続けて植えると、青枯病などの土壌病害が出やすい。間隔をあけ、続ける場合は接ぎ木苗を使う。",
 "lightPreference": "日当たりを好むが、夏の強い日差しや暑さにはあまり強くない。",
 "wetTolerance": "雨や多湿が苦手で、病気や実割れ(裂果)の原因になる。",
 "pollination": "花を振動させて花粉をめしべにつける作業(支柱を軽くたたくなど)で、実のつきを助ける。",
 "seedlingQuality": "茎が太く節間の詰まった苗を選ぶ。第1花房の花が咲き始めたころ(1〜2花開花)が植え付けの適期。若すぎる苗は枝葉ばかり茂って実がつきにくい。",
 "plantingDepthAndSpacing": "株間は40〜50cm。深植えを避け、株元をやや高く浅めに植える。",
 "harvestSigns": "赤く色づいた実から、実の温度が低い朝夕にハサミで収穫する。開花から約40〜60日で色づく。",
 "seasons": {
  "soilPrep": "植え付けの2週間〜1か月前に、堆肥と石灰(苦土石灰など)を入れて耕し、土づくりをしておく。",
  "sowing": "3月上旬〜4月上旬(群馬県)。長野県(標高500〜600m)の夏秋どりでは3月上旬〜中旬。",
  "planting": "5月上旬〜6月上旬(群馬県)。長野県(標高500〜600m)の夏秋どりでは5月中旬。",
  "harvest": "夏秋どり(露地)で7月上旬〜9月下旬ごろ(長野県・標高500〜600m)。開花から収穫まで約40〜60日。"
 },
 "pests": [
  {
   "name": "アザミウマ類",
   "symptoms": "細く小さな虫で、花に集まって産卵する。6月以降に増える。産卵された部分は、実になったあと白くぶくれて品質が落ちる。"
  },
  {
   "name": "コナジラミ類",
   "symptoms": "新しい葉の裏に白い小さな虫が群がり、汁を吸って卵を産む。トマト黄化葉巻病などのウイルス病を運ぶ種類がいる。"
  }
 ],
 "diseases": [
  {
   "name": "灰色かび病",
   "symptoms": "花びらから菌が入り、幼い実が軟らかく腐って、表面に灰色のかびが密に出る。葉は、先の枯れた部分や落ちた花びらが付いた所から広がる。気温20℃前後の多湿で出やすい。枯れた花や傷んだ実を放置すると広がる。"
  },
  {
   "name": "裂果",
   "symptoms": "実の皮が割れる生理障害。雨や急な水やりで、土の水分が急に変わると出やすい。"
  }
 ],
 "sources": {
  "数値": {
   "URL": "https://www.pref.nagano.lg.jp/nogi/midori/documents/02-2_achitomatomanual.pdf",
   "機関": "長野県・広島市・群馬県",
   "資料": "長野県「栽培指針(トマト・標高500〜600m基準)」、長野県「主な果菜類の発芽適温と育苗温度(生育適温)のめやす」https://www.pref.nagano.lg.jp/sakuchi/nosei-aec/joho/gijutsu/documents/kasai-ondo.pdf、広島市「市民菜園 栽培ごよみ(トマト)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/tomato.pdf、群馬県「家庭菜園サポート(トマト)」https://aic.pref.gunma.jp/vegetable/tomato を加工して作成",
   "確認日": "2026-11-11"
  },
  "時期": {
   "URL": "https://aic.pref.gunma.jp/vegetable/tomato",
   "機関": "群馬県・長野県",
   "資料": "群馬県「家庭菜園サポート(トマト)」、長野県「栽培指針(トマト・標高500〜600m基準)」https://www.pref.nagano.lg.jp/nogi/midori/documents/02-2_achitomatomanual.pdf、広島市「市民菜園 栽培ごよみ(トマト)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/tomato.pdf を加工して作成",
   "確認日": "2026-11-11"
  },
  "一般情報": {
   "URL": "https://www.pref.saitama.lg.jp/documents/63415/25tomatohaiirokabibyo.pdf",
   "機関": "埼玉県・熊本県・群馬県",
   "資料": "埼玉県病害虫防除所「病害虫診断のポイントと防除対策 No.25(トマト灰色かび病)」、熊本県「病害虫防除指針(ナス科)」https://www.pref.kumamoto.jp/uploaded/attachment/306620.pdf、群馬県「家庭菜園サポート(トマト)」https://aic.pref.gunma.jp/vegetable/tomato を加工して作成",
   "確認日": "2026-11-11"
  }
 }
}$json$::jsonb, 'published', 'claude #100')
on conflict (veg_key) do update set basic_info=excluded.basic_info, status='published', updated_by=excluded.updated_by;
insert into veg_basic_info_defaults (veg_key,basic_info,status,updated_by) values ('mini_tomato', $json${
 "family": "ナス科",
 "scientificName": "Solanum lycopersicum",
 "edibleParts": "果実",
 "germinationTemp": "発芽適温は25〜30℃前後(20〜30℃とする資料もある)。15℃以下や30℃以上では発芽率が落ちる。",
 "sproutingTemp": "生育適温は25〜30℃とする資料と、昼20〜25℃・夜8〜13℃とする資料があり、幅がある。8℃以下や35℃以上では生育に障害が出る。",
 "soilPH": "pH6.0〜6.5が目安。",
 "continuousCropping": "ナス科(ナス・ピーマン・ジャガイモなど)を同じ場所に続けて植えると、青枯病などの土壌病害が出やすい。間隔をあけ、続ける場合は接ぎ木苗を使う。",
 "lightPreference": "日当たりを好むが、夏の強い日差しや暑さにはあまり強くない。",
 "wetTolerance": "雨や多湿が苦手で、病気や実割れ(裂果)の原因になる。",
 "pollination": "花を振動させて花粉をめしべにつける作業(支柱を軽くたたくなど)で、実のつきを助ける。",
 "plantingDepthAndSpacing": "株間は40〜50cm。深植えを避け、株元をやや高く浅めに植える。",
 "harvestSigns": "赤く色づいた実から、実の温度が低い朝夕にハサミで収穫する。開花から約40〜60日で色づく。",
 "seasons": {
  "soilPrep": "植え付けの2週間〜1か月前に、堆肥と石灰(苦土石灰など)を入れて耕し、土づくりをしておく。",
  "sowing": "3月上旬〜4月上旬(群馬県)。長野県(標高500〜600m)の夏秋どりでは3月上旬〜中旬。",
  "planting": "5月上旬〜6月上旬(群馬県)。長野県(標高500〜600m)の夏秋どりでは5月中旬。",
  "harvest": "夏秋どり(露地)で7月上旬〜9月下旬ごろ(長野県・標高500〜600m)。開花から収穫まで約40〜60日。"
 },
 "pests": [
  {
   "name": "アザミウマ類",
   "symptoms": "細く小さな虫で、花に集まって産卵する。6月以降に増える。産卵された部分は、実になったあと白くぶくれて品質が落ちる。"
  },
  {
   "name": "コナジラミ類",
   "symptoms": "新しい葉の裏に白い小さな虫が群がり、汁を吸って卵を産む。トマト黄化葉巻病などのウイルス病を運ぶ種類がいる。"
  }
 ],
 "diseases": [
  {
   "name": "灰色かび病",
   "symptoms": "花びらから菌が入り、幼い実が軟らかく腐って、表面に灰色のかびが密に出る。葉は、先の枯れた部分や落ちた花びらが付いた所から広がる。気温20℃前後の多湿で出やすい。枯れた花や傷んだ実を放置すると広がる。"
  },
  {
   "name": "裂果",
   "symptoms": "実の皮が割れる生理障害。雨や急な水やりで、土の水分が急に変わると出やすい。"
  }
 ],
 "sources": {
  "数値": {
   "URL": "https://www.pref.nagano.lg.jp/nogi/midori/documents/02-2_achitomatomanual.pdf",
   "機関": "長野県・広島市・群馬県",
   "資料": "長野県「栽培指針(トマト・標高500〜600m基準)」、長野県「主な果菜類の発芽適温と育苗温度(生育適温)のめやす」https://www.pref.nagano.lg.jp/sakuchi/nosei-aec/joho/gijutsu/documents/kasai-ondo.pdf、広島市「市民菜園 栽培ごよみ(トマト)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/tomato.pdf、群馬県「家庭菜園サポート(トマト)」https://aic.pref.gunma.jp/vegetable/tomato を加工して作成",
   "確認日": "2026-11-11"
  },
  "時期": {
   "URL": "https://aic.pref.gunma.jp/vegetable/tomato",
   "機関": "群馬県・長野県",
   "資料": "群馬県「家庭菜園サポート(トマト)」、長野県「栽培指針(トマト・標高500〜600m基準)」https://www.pref.nagano.lg.jp/nogi/midori/documents/02-2_achitomatomanual.pdf、広島市「市民菜園 栽培ごよみ(トマト)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/tomato.pdf を加工して作成",
   "確認日": "2026-11-11"
  },
  "一般情報": {
   "URL": "https://www.pref.saitama.lg.jp/documents/63415/25tomatohaiirokabibyo.pdf",
   "機関": "埼玉県・熊本県・群馬県",
   "資料": "埼玉県病害虫防除所「病害虫診断のポイントと防除対策 No.25(トマト灰色かび病)」、熊本県「病害虫防除指針(ナス科)」https://www.pref.kumamoto.jp/uploaded/attachment/306620.pdf、群馬県「家庭菜園サポート(トマト)」https://aic.pref.gunma.jp/vegetable/tomato を加工して作成",
   "確認日": "2026-11-11"
  }
 }
}$json$::jsonb, 'published', 'claude #100')
on conflict (veg_key) do update set basic_info=excluded.basic_info, status='published', updated_by=excluded.updated_by;
insert into veg_basic_info_defaults (veg_key,basic_info,status,updated_by) values ('eggplant', $json${
 "family": "ナス科",
 "scientificName": "Solanum melongena",
 "edibleParts": "果実",
 "germinationTemp": "発芽適温は25〜30℃前後(20〜35℃の幅で示す資料もある)。",
 "sproutingTemp": "生育適温は20〜30℃(25〜28℃とする資料もある)。昼23〜28℃・夜15〜18℃が目安で、昼が30〜40℃を超えたり夜が10〜13℃を下回ったりすると生育に障害が出る。",
 "soilPH": "pH6.0〜6.5が目安(6〜7とする資料もある)。",
 "continuousCropping": "3〜5年あけるのが目安。トマト・ピーマン・ジャガイモなど同じナス科も避ける。続けると半身萎凋病などの土壌病害が出やすく、連作する畑では接ぎ木苗を使うと病気が少ない。",
 "lightPreference": "日当たりを好む。光が足りないと花の質や実の太り、実の色が悪くなる。",
 "seedlingQuality": "茎が太く、大きなつぼみがついた苗を選ぶ。本葉6〜7枚で最初の花が咲くころが植え付けの適期。節間が伸びて葉の色が悪い苗は避ける。",
 "plantingDepthAndSpacing": "株間は60〜80cm(50cm以上とする資料もある)。",
 "harvestSigns": "開花から15〜20日(3週間ほど)が収穫の目安。1番果は早めにとり、その後も大きくしすぎず若どりする(大きすぎると株の勢いが落ちる)。朝夕の涼しい時間に収穫する。へたにとげがあるので注意。",
 "seasons": {
  "planting": "4月下旬〜5月上旬(群馬県)。早植えは根づきが悪くなるため、5月上旬ごろから植える地域もある(滋賀県)。",
  "harvest": "6月中旬〜下旬ごろから始まり、初夏から晩秋まで長くとれる。7月末〜8月に枝を1/3〜半分ほど残して切り戻すと、20〜30日ほどで再び収穫でき、秋ナスになる。"
 },
 "pests": [
  {
   "name": "ミナミキイロアザミウマ",
   "symptoms": "小さな虫が葉や果実を傷め、果実に茶色の食害痕が出る。露地では6〜10月ごろに発生する。"
  },
  {
   "name": "チャノホコリダニ",
   "symptoms": "新芽や成長点の近くに寄生し、芯が縮んで伸びが止まったり、奇形になったり、淡い黄色に変わったりする。"
  }
 ],
 "diseases": [
  {
   "name": "半身萎凋病",
   "symptoms": "株の片側の葉だけが黄色くなってしおれ、進むと株全体が枯れる。茎を切ると導管が茶色く変わっている。菌が土の中に長く残る。"
  },
  {
   "name": "青枯病",
   "symptoms": "葉が緑のまま日中にしおれ、夜は戻るが、しだいに戻らなくなって株全体が枯れる。地際の茎を切ると導管が茶色く、水に挿すと白い液が糸を引いて出る。高温期は1週間ほどで枯れる。"
  }
 ],
 "tempZones": {
  "germination": {
   "mean": {
    "optMin": 25,
    "optMax": 30
   },
   "note": "発芽は地温の影響が大きい。気温は目安。出典によって数値に幅がある(20〜30℃、25〜35℃など)。"
  },
  "growth": {
   "mean": {
    "optMin": 20,
    "optMax": 30
   },
   "limit": {
    "dayMax": 35,
    "nightMin": 10
   },
   "note": "適温は資料により20〜30℃、25〜28℃と幅がある。障害域の境界は長野県「野菜栽培指標」の限界温度(昼30〜40℃・夜10〜13℃)の外側寄りに置いた。"
  }
 },
 "sources": {
  "数値": {
   "URL": "https://www.pref.nagano.lg.jp/sakuchi/nosei-aec/joho/gijutsu/documents/kasai-ondo.pdf",
   "機関": "長野県・広島市",
   "資料": "長野県「主な果菜類の発芽適温と育苗温度(生育適温)のめやす」、広島市「市民菜園 栽培ごよみ(ナス)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/nasu.pdf、群馬県「家庭菜園サポート(ナス)」https://aic.pref.gunma.jp/vegetable/nasu を加工して作成",
   "確認日": "2026-11-11"
  },
  "時期": {
   "URL": "https://aic.pref.gunma.jp/vegetable/nasu",
   "機関": "群馬県・広島市",
   "資料": "群馬県「家庭菜園サポート(ナス)」、広島市「市民菜園 栽培ごよみ(ナス)」https://www.haff.city.hiroshima.jp/siminnsaienn/saibaigoyomi/nasu.pdf を加工して作成",
   "確認日": "2026-11-11"
  },
  "一般情報": {
   "URL": "https://www.nogyo.tosa.pref.kochi.lg.jp/info/dtl.php?ID=3524",
   "機関": "高知県・群馬県・熊本県",
   "資料": "高知県「こうち農業ネット(ナス半身萎凋病)」、同(ナス青枯病)https://www.nogyo.tosa.pref.kochi.lg.jp/info/dtl.php?ID=3516、群馬県「家庭菜園サポート(ナス)」https://aic.pref.gunma.jp/vegetable/nasu、熊本県「病害虫防除指針(ナス科)」https://www.pref.kumamoto.jp/uploaded/attachment/306624.pdf を加工して作成",
   "確認日": "2026-11-11"
  }
 }
}$json$::jsonb, 'published', 'claude #100')
on conflict (veg_key) do update set basic_info=excluded.basic_info, status='published', updated_by=excluded.updated_by;
select veg_key,status,jsonb_object_keys(basic_info) is not null as ok from veg_basic_info_defaults where veg_key in ('tomato','mini_tomato','eggplant') group by 1,2,3;
commit;
