// @ts-check
// ===== 基礎知識タブ =====
export function youtubeVideoId(url){
  if(!url)return null;
  const m=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m?m[1]:null;
}
export function renderBasicTab(el,veg){
  const wrap=document.createElement('div');wrap.style.cssText='padding:12px 10px';
  const ytId=youtubeVideoId(veg&&veg.referenceUrl);
  if(ytId){
    const frame=document.createElement('div');frame.style.cssText='margin-bottom:16px;border-radius:10px;overflow:hidden;aspect-ratio:16/9;background:#000';
    frame.innerHTML=`<iframe src="https://www.youtube.com/embed/${ytId}" style="width:100%;height:100%;border:none" allowfullscreen loading="lazy"></iframe>`;
    wrap.appendChild(frame);
  }
  const bi=veg&&veg.basicInfo;
  if(!bi){
    const empty=document.createElement('div');
    empty.style.cssText='text-align:center;padding:40px 20px;color:var(--color-text-tertiary);font-size:var(--fs-base)';
    empty.innerHTML='<i class="ti ti-plant" style="font-size:32px;display:block;margin-bottom:8px"></i>栽培レシピでAI生成すると<br>基礎知識が表示されます';
    wrap.appendChild(empty);el.appendChild(wrap);return;
  }

  function section(title,icon){
    const s=document.createElement('div');s.style.cssText='margin-bottom:16px';
    const h=document.createElement('div');h.style.cssText='font-size:var(--fs-sm);font-weight:700;color:var(--color-text-secondary);margin-bottom:8px;display:flex;align-items:center;gap:5px;border-bottom:1px solid var(--color-border-tertiary);padding-bottom:4px';
    h.innerHTML=`<i class="ti ${icon}" style="font-size:var(--fs-base)"></i>${title}`;s.appendChild(h);return s;
  }
  function row(label,value){
    const r=document.createElement('div');r.style.cssText='display:flex;gap:8px;margin-bottom:6px;font-size:var(--fs-sm);align-items:flex-start';
    const l=document.createElement('div');l.style.cssText='min-width:100px;color:var(--color-text-tertiary);flex-shrink:0;font-size:var(--fs-xs);padding-top:1px';l.textContent=label;
    const v=document.createElement('div');v.style.cssText='color:var(--color-text-primary);line-height:1.5;flex:1';v.textContent=value||'—';
    r.append(l,v);return r;
  }

  // 基本情報
  const s1=section('基本情報','ti-info-circle');
  if(bi.size)s1.appendChild(row('サイズ',bi.size));
  if(bi.yieldPerPlant)s1.appendChild(row('収穫目安',bi.yieldPerPlant));
  if(bi.soilPH)s1.appendChild(row('適正pH',bi.soilPH));
  if(bi.rootDepth)s1.appendChild(row('根の深さ',bi.rootDepth));
  wrap.appendChild(s1);

  // 育成時期
  if(bi.seasons){
    const s2=section('育成時期の目安','ti-calendar');
    const seas=[['土づくり','soilPrep'],['蒔きどき','sowing'],['定植時期','planting'],['第一花','firstFlower'],['収穫時期','harvest']];
    seas.forEach(([label,key])=>{if(bi.seasons[key])s2.appendChild(row(label,bi.seasons[key]));});
    wrap.appendChild(s2);
  }

  // 発芽・生育特性
  const s3=section('発芽・生育特性','ti-seedling');
  if(bi.germinationTemp)s3.appendChild(row('発芽適温',bi.germinationTemp));
  if(bi.germinationAccumulatedTemp)s3.appendChild(row('積算気温',bi.germinationAccumulatedTemp));
  if(bi.lightPreference)s3.appendChild(row('光への反応',bi.lightPreference));
  if(bi.oxygenNeeds)s3.appendChild(row('酸素の好み',bi.oxygenNeeds));
  if(bi.dormancy)s3.appendChild(row('休眠',bi.dormancy));
  if(bi.photoperiod)s3.appendChild(row('光周性',bi.photoperiod));
  wrap.appendChild(s3);

  // 耐性
  const s4=section('環境への耐性','ti-thermometer');
  if(bi.coldTolerance)s4.appendChild(row('耐寒性',bi.coldTolerance));
  if(bi.heatTolerance)s4.appendChild(row('耐暑性',bi.heatTolerance));
  if(bi.droughtTolerance)s4.appendChild(row('耐乾性',bi.droughtTolerance));
  if(bi.wetTolerance)s4.appendChild(row('耐湿性',bi.wetTolerance));
  if(bi.pestResistance)s4.appendChild(row('耐病虫性',bi.pestResistance));
  wrap.appendChild(s4);

  // 栽培ポイント
  const s5=section('栽培ポイント','ti-tool');
  if(bi.continuousCropping)s5.appendChild(row('連作障害',bi.continuousCropping));
  if(bi.pollination)s5.appendChild(row('受粉',bi.pollination));
  if(bi.methods&&bi.methods.length){
    const mv=document.createElement('div');mv.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px';
    bi.methods.forEach(m=>{const chip=document.createElement('div');chip.style.cssText='font-size:var(--fs-xs);padding:2px 8px;border-radius:99px;background:var(--color-background-tertiary);color:var(--color-text-secondary)';chip.textContent=m;mv.appendChild(chip);});
    const rr=document.createElement('div');rr.style.cssText='display:flex;gap:8px;margin-bottom:6px;font-size:var(--fs-sm);align-items:flex-start';
    const ll=document.createElement('div');ll.style.cssText='min-width:100px;color:var(--color-text-tertiary);flex-shrink:0;font-size:var(--fs-xs);padding-top:2px';ll.textContent='育成方法';
    rr.append(ll,mv);s5.appendChild(rr);
  }
  if(bi.materials&&bi.materials.length){
    const mv=document.createElement('div');mv.style.cssText='display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px';
    bi.materials.forEach(m=>{const chip=document.createElement('div');chip.style.cssText='font-size:var(--fs-xs);padding:2px 8px;border-radius:99px;background:#E8F4FE;color:#185FA5';chip.textContent=m;mv.appendChild(chip);});
    const rr=document.createElement('div');rr.style.cssText='display:flex;gap:8px;margin-bottom:6px;font-size:var(--fs-sm);align-items:flex-start';
    const ll=document.createElement('div');ll.style.cssText='min-width:100px;color:var(--color-text-tertiary);flex-shrink:0;font-size:var(--fs-xs);padding-top:2px';ll.textContent='必要資材';
    rr.append(ll,mv);s5.appendChild(rr);
  }
  wrap.appendChild(s5);

  // 病気・害虫
  if((bi.diseases&&bi.diseases.length)||(bi.pests&&bi.pests.length)){
    const s6=section('病気・害虫と対策','ti-bug');
    function diseaseCard(item,typeLabel){
      const card=document.createElement('div');card.style.cssText='border:1px solid var(--color-border-secondary);border-radius:8px;padding:8px 10px;margin-bottom:8px;background:var(--color-background-primary)';
      const top=document.createElement('div');top.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px';
      const badge=document.createElement('div');badge.style.cssText='font-size:var(--fs-xs);padding:1px 6px;border-radius:99px;'+(typeLabel==='病気'?'background:#FAECE7;color:#993C1D':'background:#FFF3E0;color:#92600B');badge.textContent=typeLabel;
      const name=document.createElement('div');name.style.cssText='font-size:var(--fs-base);font-weight:600;color:var(--color-text-primary)';name.textContent=item.name;
      top.append(badge,name);
      const sym=document.createElement('div');sym.style.cssText='font-size:var(--fs-xs);color:var(--color-text-secondary);margin-bottom:3px';sym.textContent='症状：'+item.symptoms;
      const treat=document.createElement('div');treat.style.cssText='font-size:var(--fs-xs);color:#2e7a28';treat.textContent='対策：'+item.treatment;
      card.append(top,sym,treat);s6.appendChild(card);
    }
    (bi.diseases||[]).forEach(d=>diseaseCard(d,'病気'));
    (bi.pests||[]).forEach(p=>diseaseCard(p,'害虫'));
    wrap.appendChild(s6);
  }

  // 育成断面写真
  if(bi.growthStages&&bi.growthStages.length){
    const s7=section('育成断面（画像検索）','ti-photo');
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px';
    bi.growthStages.forEach(stage=>{
      const card=document.createElement('a');
      card.href='https://www.google.com/search?tbm=isch&q='+encodeURIComponent(stage.query);
      card.target='_blank';card.rel='noopener';
      card.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 8px;border:1px solid var(--color-border-secondary);border-radius:8px;background:var(--color-background-secondary);text-decoration:none;gap:6px';
      const iconFiles={'発芽':'stage_germination.png','本葉出始め':'stage_firstleaf.png','開花':'stage_flower.png','収穫期（全体像）':'stage_harvest_plant.png','実（つき始め）':'stage_fruit_early.png','実（食べごろ）':'stage_fruit_ripe.png'};
      const icon=document.createElement('div');
      if(iconFiles[stage.label]){const img=document.createElement('img');img.src='images/'+iconFiles[stage.label];img.style.cssText='width:64px;height:64px;object-fit:contain';icon.appendChild(img);}else{icon.style.fontSize='22px';icon.textContent='📷';}
      const lbl=document.createElement('div');lbl.style.cssText='font-size:var(--fs-xs);color:var(--color-text-secondary);text-align:center';lbl.textContent=stage.label;
      const search=document.createElement('div');search.style.cssText='font-size:var(--fs-xs);color:#185FA5';search.textContent='画像を検索 →';
      card.append(icon,lbl,search);grid.appendChild(card);
    });
    s7.appendChild(grid);wrap.appendChild(s7);
  }

  el.appendChild(wrap);
}
