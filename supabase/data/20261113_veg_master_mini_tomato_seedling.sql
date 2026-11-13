-- ミニトマトに「定植する苗(seedlingQuality)」を追加。2026-11-13。大玉トマトと同じ文(公的機関の資料の共通項。ミニトマト固有の資料が見つかったら差し替える)
-- Supabase SQL Editor で実行する。他の項目・status・regional_scheduleは触らない
begin;
update veg_basic_info_defaults
set basic_info = basic_info || jsonb_build_object(
      'seedlingQuality',
      '茎が太く節間の詰まった苗を選ぶ。第1花房の花が咲き始めたころ(1〜2花開花)が植え付けの適期。若すぎる苗は枝葉ばかり茂って実がつきにくい。'
    ),
    updated_at = now()
where veg_key = 'mini_tomato';

-- 確認: 1行だけ更新され、seedlingQuality が入っていること
select veg_key, status, basic_info->>'seedlingQuality' as seedling_quality
from veg_basic_info_defaults
where veg_key = 'mini_tomato';
commit;
