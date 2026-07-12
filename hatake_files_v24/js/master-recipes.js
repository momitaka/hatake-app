// @ts-check
// ===== 栽培レシピ（マスタ）画面 =====
import { masterData, navState, permState, gridState, addVegState, SUPABASE_ANON_KEY } from './state.js';
import { vegIconHtml, FAMILIES } from './helpers.js';
import { showAlert, showConfirm } from './dialogs.js';
import { saveLS } from './storage.js';
import { permCanEditFarm } from './add-veg.js';
import { permRequireSupervisor } from './permissions.js';
import { populateCropSelect } from './grid.js';
import { closeMaster } from './grid-settings.js';

export function renderMasterList(){
  const el=document.getElementById('master-list-items');el.innerHTML='';
  Object.values(masterData.vegMaster).sort((a,b)=>a.name.localeCompare(b.name,'ja')).forEach(veg=>{
    const item=document.createElement('div');item.className='master-list-item'+(navState.masterVeg===veg.id?' active':'');const hasRM=veg.phases&&veg.phases.length>0;
    item.innerHTML=`<span style="display:inline-flex;align-items:center">${vegIconHtml(veg,20)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--fs-sm)">${veg.name}${veg.variety?'<br><span style="font-size:var(--fs-xs);color:#9c9a93">'+veg.variety+'</span>':''}</span><span class="master-list-item-badge ${hasRM?'':'empty'}">${hasRM?'有':'未'}</span>`;
    item.addEventListener('click',()=>{navState.masterVeg=veg.id;renderMasterList();renderMasterDetail();});el.appendChild(item);
  });
}

export function renderMasterDetail(){
  const col=document.getElementById('master-detail-col');
  col.innerHTML='<div class="master-detail-scroll" id="master-detail-scroll"></div>';
  const scroll=document.getElementById('master-detail-scroll');
  const veg=masterData.vegMaster[navState.masterVeg];
  if(!veg){scroll.innerHTML='<div class="master-detail-empty"><i class="ti ti-plant-2" style="font-size:24px;color:#9c9a93"></i>左のリストから野菜を選択</div>';const s=document.getElementById('master-toolbar-btns');if(s)s.style.display='none';return;}
  const hdr=document.createElement('div');hdr.className='master-detail-header';hdr.innerHTML=`<span class="master-detail-icon">${vegIconHtml(veg,30)}</span><div><div class="master-detail-name">${veg.name}</div><div class="master-detail-sub">${veg.variety||'標準'} ／ ${veg.family||'科未設定'}</div></div>`;
  const growBlock=document.createElement('div');growBlock.classList.add('admin-only');growBlock.style.cssText='margin-bottom:12px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:var(--color-background-secondary)';const growLabel=document.createElement('div');growLabel.style.cssText='font-size:var(--fs-xs);font-weight:500;color:var(--color-text-secondary);margin-bottom:8px';growLabel.textContent='栽培設定';const growRow=document.createElement('div');growRow.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end';const growMethodWrap=document.createElement('div');growMethodWrap.style.cssText='display:flex;flex-direction:column;gap:3px;flex:1;min-width:120px';const growMethodLbl=document.createElement('div');growMethodLbl.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary)';growMethodLbl.textContent='育成方法';const growMethodSel=document.createElement('select');growMethodSel.style.cssText='font-size:var(--fs-sm);padding:5px 7px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary)';[{v:'seedling',l:'苗から'},{v:'seed_pot',l:'種（ポット）から'},{v:'seed_ground',l:'種（地植え）から'}].forEach(opt=>{const o=document.createElement('option');o.value=opt.v;o.textContent=opt.l;if((veg.growMethod||'seedling')===opt.v)o.selected=true;growMethodSel.appendChild(o);});if(!permCanEditFarm())growMethodSel.disabled=true;else growMethodSel.addEventListener('change',()=>{masterData.vegMaster[veg.id].growMethod=growMethodSel.value;});growMethodWrap.append(growMethodLbl,growMethodSel);const refUrlWrap=document.createElement('div');refUrlWrap.style.cssText='display:flex;flex-direction:column;gap:3px;flex:2;min-width:160px';const refUrlLbl=document.createElement('div');refUrlLbl.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary)';refUrlLbl.innerHTML='<i class="ti ti-link" style="font-size:var(--fs-xs)"></i> 参考URL（AI生成に使用）';const refUrlIn=document.createElement('input');refUrlIn.type='url';refUrlIn.style.cssText='font-size:var(--fs-sm);padding:5px 7px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);width:100%';refUrlIn.placeholder='https://...';refUrlIn.value=veg.referenceUrl||'';if(!permCanEditFarm())refUrlIn.readOnly=true;else refUrlIn.addEventListener('input',()=>{masterData.vegMaster[veg.id].referenceUrl=refUrlIn.value;});refUrlWrap.append(refUrlLbl,refUrlIn);growRow.append(growMethodWrap,refUrlWrap);growBlock.append(growLabel,growRow);scroll.appendChild(growBlock);const familyBlock=document.createElement('div');familyBlock.style.cssText='margin-bottom:12px;padding:10px 12px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:var(--color-background-secondary)';const familyBlockLbl=document.createElement('div');familyBlockLbl.style.cssText='font-size:var(--fs-xs);font-weight:500;color:var(--color-text-secondary);margin-bottom:8px';familyBlockLbl.textContent='科';const familySel=document.createElement('select');familySel.style.cssText='font-size:var(--fs-sm);padding:5px 7px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);width:100%;max-width:200px';const familyNone=document.createElement('option');familyNone.value='';familyNone.textContent='— 未設定 —';familySel.appendChild(familyNone);Object.keys(FAMILIES).forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=f;if((veg.family||'')===f)o.selected=true;familySel.appendChild(o);});if(!permCanEditFarm())familySel.disabled=true;else familySel.addEventListener('change',()=>{masterData.vegMaster[veg.id].family=familySel.value;const sub=hdr.querySelector('.master-detail-sub');if(sub)sub.textContent=`${veg.variety||'標準'} ／ ${familySel.value||'科未設定'}`;});familyBlock.append(familyBlockLbl,familySel);scroll.appendChild(familyBlock);const aiBanner=document.createElement('div');aiBanner.className='ai-banner';aiBanner.style.margin='0 0 12px';const hasRM=veg.phases&&veg.phases.length>0;
  if(permState.isAdmin){aiBanner.innerHTML=`<div class="ai-banner-text">${hasRM?'工程表・基礎情報が生成済みです。再生成で上書きできます。':'工程表と基礎情報がありません。AIで自動生成できます。'}</div><button class="btn-ai" id="btn-ai-gen"><i class="ti ti-sparkles"></i>${hasRM?'再生成':'AIで生成'}</button>`;aiBanner.querySelector('#btn-ai-gen').addEventListener('click',()=>aiGenerate(veg.id));scroll.append(hdr,aiBanner);}else{scroll.appendChild(hdr);}
  // タブバー（基礎知識 / 工程表）
  // end_userで basicInfo がない場合（手入力レシピ）は基礎知識タブを非表示
  // 基礎知識タブは、監修者は常に表示（空の状態から書き込むため）。
  // end_userは basicInfo が存在する場合のみ表示する。end_userの手入力レシピには
  // basicInfoが無いため非表示になる（購入・転写したレシピはAI生成済みなので表示される）。
  const showBasicTab=permCanEditFarm()||permState.isSupervisor||(veg.basicInfo&&Object.keys(veg.basicInfo).length>0);
  if(!showBasicTab&&navState.masterTab==='basic')navState.masterTab='roadmap';
  const tabBar=document.createElement('div');tabBar.className='tab-bar';tabBar.style.margin='0 0 12px';
  const tabDefs=showBasicTab?[{id:'basic',label:'基礎知識',icon:'ti-info-circle'},{id:'roadmap',label:'工程表',icon:'ti-road'}]:[{id:'roadmap',label:'工程表',icon:'ti-road'}];
  tabDefs.forEach(t=>{
    const btn=document.createElement('div');btn.className='tab-btn'+(navState.masterTab===t.id?' active':'');
    btn.innerHTML=`<i class="ti ${t.icon}" style="font-size:var(--fs-sm)"></i>${t.label}`;
    btn.addEventListener('click',()=>{navState.masterTab=t.id;renderMasterDetail();});
    tabBar.appendChild(btn);
  });
  scroll.appendChild(tabBar);
  if(navState.masterTab==='basic'){
    // 基礎情報タブ
    const canEdit=permCanEditFarm();
    if(!veg.basicInfo){
      if(canEdit){masterData.vegMaster[veg.id].basicInfo={};}
      else{const emp=document.createElement('div');emp.style.cssText='text-align:center;padding:40px 20px;color:var(--color-text-tertiary);font-size:var(--fs-sm)';emp.innerHTML='<i class="ti ti-sparkles" style="font-size:28px;display:block;margin-bottom:8px"></i>AIで生成すると基礎知識が表示されます';scroll.appendChild(emp);renderMasterSaveBar(col,veg);return;}
    }
    const bi=veg.basicInfo;
    function biField(label,key,subkey,multiline){
      const wrap=document.createElement('div');wrap.style.cssText='margin-bottom:10px';
      const lbl=document.createElement('div');lbl.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-bottom:3px';lbl.textContent=label;
      const val=subkey?(bi[key]&&bi[key][subkey])||'':(bi[key]||'');
      let inp;
      if(multiline){inp=document.createElement('textarea');inp.style.cssText='width:100%;font-size:var(--fs-sm);padding:6px 8px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);resize:vertical;min-height:60px;box-sizing:border-box';inp.rows=2;}
      else{inp=document.createElement('input');inp.type='text';inp.style.cssText='width:100%;font-size:var(--fs-sm);padding:6px 8px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);box-sizing:border-box';}
      inp.value=val;inp.readOnly=!canEdit;
      if(canEdit)inp.addEventListener('input',()=>{if(!masterData.vegMaster[veg.id].basicInfo)masterData.vegMaster[veg.id].basicInfo={};if(subkey){if(!masterData.vegMaster[veg.id].basicInfo[key])masterData.vegMaster[veg.id].basicInfo[key]={};masterData.vegMaster[veg.id].basicInfo[key][subkey]=inp.value;}else{masterData.vegMaster[veg.id].basicInfo[key]=inp.value;}});
      wrap.append(lbl,inp);return wrap;
    }
    function biSection(title,icon){const s=document.createElement('div');s.style.cssText='margin-bottom:14px';const h=document.createElement('div');h.style.cssText='font-size:var(--fs-sm);font-weight:700;color:var(--color-text-secondary);margin-bottom:8px;display:flex;align-items:center;gap:5px;border-bottom:1px solid var(--color-border-tertiary);padding-bottom:4px';h.innerHTML=`<i class="ti ${icon}" style="font-size:var(--fs-base)"></i>${title}`;s.appendChild(h);return s;}
    const s1=biSection('基本情報','ti-info-circle');
    s1.append(biField('サイズ','size',null,false),biField('収穫目安','yieldPerPlant',null,false),biField('適正pH','soilPH',null,false),biField('根の深さ','rootDepth',null,false));
    scroll.appendChild(s1);
    const s2=biSection('育成時期の目安','ti-calendar');
    [['土づくり','soilPrep'],['蒔きどき','sowing'],['定植時期','planting'],['第一花','firstFlower'],['収穫時期','harvest']].forEach(([label,key])=>s2.appendChild(biField(label,'seasons',key,false)));
    scroll.appendChild(s2);
    const s3=biSection('発芽・生育特性','ti-seedling');
    s3.append(biField('発芽適温','germinationTemp',null,false),biField('積算気温','germinationAccumulatedTemp',null,false),biField('光への反応','lightPreference',null,false),biField('酸素の好み','oxygenNeeds',null,false),biField('休眠','dormancy',null,false),biField('光周性','photoperiod',null,false));
    scroll.appendChild(s3);
    const s4=biSection('環境への耐性','ti-thermometer');
    s4.append(biField('耐寒性','coldTolerance',null,false),biField('耐暑性','heatTolerance',null,false),biField('耐乾性','droughtTolerance',null,false),biField('耐湿性','wetTolerance',null,false),biField('耐病虫性','pestResistance',null,false));
    scroll.appendChild(s4);
    const s5=biSection('栽培ポイント','ti-tool');
    s5.append(biField('連作障害','continuousCropping',null,true),biField('受粉','pollination',null,false));
    scroll.appendChild(s5);
    // 病気・害虫
    const s6=biSection('病気・害虫と対策','ti-bug');
    function renderDiseaseSection(){
      s6.querySelectorAll('.disease-card,.disease-add-row').forEach(el=>el.remove());
      function diseaseBlock(typeKey,typeLabel){
        if(!masterData.vegMaster[veg.id].basicInfo[typeKey])masterData.vegMaster[veg.id].basicInfo[typeKey]=[];
        const items=masterData.vegMaster[veg.id].basicInfo[typeKey];
        const badgeStyle=typeLabel==='病気'?'background:#FAECE7;color:#993C1D':'background:#FFF3E0;color:#92600B';
        items.forEach((item,idx)=>{
          const card=document.createElement('div');card.className='disease-card';card.style.cssText='border:0.5px solid var(--color-border-secondary);border-radius:8px;padding:8px 10px;margin-bottom:8px;background:var(--color-background-primary);position:relative';
          const topRow=document.createElement('div');topRow.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
          const badge=document.createElement('div');badge.style.cssText='font-size:var(--fs-xs);padding:1px 6px;border-radius:99px;'+badgeStyle;badge.textContent=typeLabel;
          topRow.appendChild(badge);
          if(canEdit){
            const upBtn=document.createElement('button');upBtn.innerHTML='<i class="ti ti-chevron-up" style="font-size:var(--fs-xs)"></i>';upBtn.style.cssText='background:none;border:none;cursor:pointer;color:var(--color-text-tertiary);padding:2px';upBtn.addEventListener('click',()=>{if(idx===0)return;const arr=masterData.vegMaster[veg.id].basicInfo[typeKey];[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];renderDiseaseSection();});
            const downBtn=document.createElement('button');downBtn.innerHTML='<i class="ti ti-chevron-down" style="font-size:var(--fs-xs)"></i>';downBtn.style.cssText='background:none;border:none;cursor:pointer;color:var(--color-text-tertiary);padding:2px';downBtn.addEventListener('click',()=>{const arr=masterData.vegMaster[veg.id].basicInfo[typeKey];if(idx>=arr.length-1)return;[arr[idx],arr[idx+1]]=[arr[idx+1],arr[idx]];renderDiseaseSection();});
            const delBtn=document.createElement('button');delBtn.innerHTML='<i class="ti ti-x" style="font-size:var(--fs-xs)"></i>';delBtn.style.cssText='background:none;border:none;cursor:pointer;color:var(--color-text-tertiary);padding:2px';delBtn.addEventListener('click',()=>{masterData.vegMaster[veg.id].basicInfo[typeKey].splice(idx,1);renderDiseaseSection();});
            topRow.append(upBtn,downBtn,delBtn);
          }
          card.appendChild(topRow);
          function cardField(label,key2){
            const w=document.createElement('div');w.style.cssText='margin-bottom:6px';
            const l=document.createElement('div');l.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);margin-bottom:2px';l.textContent=label;
            const inp=document.createElement('input');inp.type='text';inp.style.cssText='width:100%;font-size:var(--fs-sm);padding:4px 7px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);box-sizing:border-box';
            inp.value=item[key2]||'';inp.readOnly=!canEdit;
            if(canEdit)inp.addEventListener('input',()=>{masterData.vegMaster[veg.id].basicInfo[typeKey][idx][key2]=inp.value;});
            w.append(l,inp);return w;
          }
          card.append(cardField('名前','name'),cardField('症状','symptoms'),cardField('対策','treatment'));
          s6.appendChild(card);
        });
      }
      diseaseBlock('diseases','病気');
      diseaseBlock('pests','害虫');
      if(!(bi.diseases&&bi.diseases.length)&&!(bi.pests&&bi.pests.length)){const emp=document.createElement('div');emp.className='disease-card';emp.style.cssText='font-size:var(--fs-xs);color:var(--color-text-tertiary);padding:4px 0 8px';emp.textContent='データがありません';s6.appendChild(emp);}
      if(canEdit){
        const addRow=document.createElement('div');addRow.className='disease-add-row';addRow.style.cssText='display:flex;gap:8px;margin-top:4px';
        ['病気','害虫'].forEach(label=>{
          const typeKey=label==='病気'?'diseases':'pests';
          const btn=document.createElement('button');btn.className='master-add-task-btn';btn.innerHTML=`<i class="ti ti-plus" style="font-size:var(--fs-xs)"></i>${label}を追加`;
          btn.addEventListener('click',()=>{if(!masterData.vegMaster[veg.id].basicInfo[typeKey])masterData.vegMaster[veg.id].basicInfo[typeKey]=[];masterData.vegMaster[veg.id].basicInfo[typeKey].push({name:'',symptoms:'',treatment:''});renderDiseaseSection();});
          addRow.appendChild(btn);
        });
        s6.appendChild(addRow);
      }
    }
    renderDiseaseSection();
    scroll.appendChild(s6);
  } else {
    // 工程表タブ
    if(!hasRM){const emp=document.createElement('div');emp.style.cssText='font-size:var(--fs-xs);color:#9c9a93;padding:12px 0;text-align:center';emp.textContent='工程表を生成すると編集できます';scroll.appendChild(emp);renderMasterSaveBar(col,veg);return;}
    const hint=document.createElement('div');hint.style.cssText='font-size:var(--fs-xs);color:var(--color-text-secondary);background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:8px 12px;margin-bottom:10px;line-height:1.6';
    const _gm2=veg.growMethod||'seedling';const _isSeed2=_gm2==='seed_pot'||_gm2==='seed_ground';
    hint.textContent=_isSeed2?'日数は種まき（播種）を0日とした目安です。工程表で種まきの実施日/予定日を記録すると、それを基準に各タスクのスケジュールが自動計算されます。':'日数は苗を植えた日（定植）を0日とした目安です。工程表で定植の実施日/予定日を記録すると、それを基準に各タスクのスケジュールが自動計算されます。';
    scroll.appendChild(hint);
    veg.phases.forEach((phase,pi)=>{
      const pb=document.createElement('div');pb.className='master-phase-block';const ph=document.createElement('div');ph.className='master-phase-header';ph.innerHTML=`<div class="phase-radio active" style="flex-shrink:0"></div><span class="master-phase-label">${phase.name}${phase.period?'（'+phase.period+'）':''}</span>`;pb.appendChild(ph);
      phase.tasks.forEach((task,ti)=>{
        const tr=document.createElement('div');tr.className='master-task-row';const th=document.createElement('div');th.className='master-task-header';
        const nameIn=document.createElement('input');nameIn.type='text';nameIn.className='master-task-name-input';nameIn.value=task.name;nameIn.placeholder='タスク名';
        const dayIn=document.createElement('input');dayIn.type='number';dayIn.className='master-task-day-input';dayIn.value=task.day;const dayLbl=document.createElement('span');dayLbl.style.cssText='font-size:var(--fs-xs);color:#9c9a93';dayLbl.textContent='日';
        const upBtn=document.createElement('button');upBtn.className='master-task-del';upBtn.innerHTML='<i class="ti ti-chevron-up" style="font-size:var(--fs-sm)"></i>';upBtn.title='上へ';
        const downBtn=document.createElement('button');downBtn.className='master-task-del';downBtn.innerHTML='<i class="ti ti-chevron-down" style="font-size:var(--fs-sm)"></i>';downBtn.title='下へ';
        const delBtn=document.createElement('button');delBtn.className='master-task-del';delBtn.innerHTML='<i class="ti ti-x" style="font-size:var(--fs-sm)"></i>';th.append(nameIn,dayIn,dayLbl,upBtn,downBtn,delBtn);
        const tbody=document.createElement('div');tbody.className='master-task-body';const memoLbl=document.createElement('div');memoLbl.className='master-task-label';memoLbl.textContent='作業メモ';const memoIn=document.createElement('textarea');memoIn.className='master-task-memo';memoIn.placeholder='作業内容の補足';memoIn.value=task.memo||'';const urlLbl=document.createElement('div');urlLbl.className='master-task-label';urlLbl.innerHTML='<i class="ti ti-brand-youtube" style="font-size:var(--fs-xs);margin-right:2px"></i>参考動画URL';const urlIn=document.createElement('input');urlIn.type='url';urlIn.className='master-task-url';urlIn.placeholder='https://...';urlIn.value=task.url||'';
        tbody.append(memoLbl,memoIn,urlLbl,urlIn);tr.append(th,tbody);pb.appendChild(tr);
        if(!permRequireSupervisor()){nameIn.readOnly=true;dayIn.readOnly=true;memoIn.readOnly=true;urlIn.readOnly=true;upBtn.style.display='none';downBtn.style.display='none';delBtn.style.display='none';}else{
          const inUse=Object.values(gridState.cells).some(c=>c.crop===veg.id);
          nameIn.addEventListener('input',()=>{masterData.vegMaster[veg.id].phases[pi].tasks[ti].name=nameIn.value;});
          dayIn.addEventListener('input',()=>{masterData.vegMaster[veg.id].phases[pi].tasks[ti].day=parseInt(dayIn.value)||0;});
          memoIn.addEventListener('input',()=>{masterData.vegMaster[veg.id].phases[pi].tasks[ti].memo=memoIn.value;});
          urlIn.addEventListener('input',()=>{masterData.vegMaster[veg.id].phases[pi].tasks[ti].url=urlIn.value;});
          upBtn.addEventListener('click',()=>{if(ti===0)return;const tasks=masterData.vegMaster[veg.id].phases[pi].tasks;[tasks[ti-1],tasks[ti]]=[tasks[ti],tasks[ti-1]];saveLS();renderMasterDetail();});
          downBtn.addEventListener('click',()=>{const tasks=masterData.vegMaster[veg.id].phases[pi].tasks;if(ti>=tasks.length-1)return;[tasks[ti],tasks[ti+1]]=[tasks[ti+1],tasks[ti]];saveLS();renderMasterDetail();});
          delBtn.addEventListener('click',()=>{
            const doDelete=()=>{masterData.vegMaster[veg.id].phases[pi].tasks.splice(ti,1);saveLS();renderMasterDetail();};
            if(inUse){showConfirm(`このタスクを削除すると、この野菜を使用中の区画の記録が参照できなくなる場合があります。\n削除しますか？`,doDelete);return;}
            doDelete();
          });
        }
      });
      const addTaskBtn=document.createElement('button');addTaskBtn.className='master-add-task-btn';addTaskBtn.innerHTML='<i class="ti ti-plus" style="font-size:var(--fs-xs)"></i>タスクを追加';addTaskBtn.classList.add('supervisor-only');if(permState.isSupervisor){addTaskBtn.addEventListener('click',()=>{masterData.vegMaster[veg.id].phases[pi].tasks.push({id:`t_${Date.now()}`,name:'',desc:'',day:0,memo:'',url:''});renderMasterDetail();});}
      const addPestBtn=document.createElement('button');addPestBtn.className='master-add-task-btn';addPestBtn.style.cssText='color:#92400e;border-color:#f59e0b';addPestBtn.innerHTML='<i class="ti ti-bug" style="font-size:var(--fs-xs)"></i>病害虫チェックを追加';addPestBtn.classList.add('supervisor-only');if(permState.isSupervisor){addPestBtn.addEventListener('click',()=>{masterData.vegMaster[veg.id].phases[pi].tasks.push({id:`t_${Date.now()}`,name:'',desc:'',day:0,memo:'',url:'',type:'pest'});renderMasterDetail();});}
      const btnRow=document.createElement('div');btnRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap';btnRow.append(addTaskBtn,addPestBtn);pb.appendChild(btnRow);scroll.appendChild(pb);
    });
  }
  renderMasterSaveBar(col,veg);
}

export function renderMasterSaveBar(col,veg){
  const slot=document.getElementById('master-toolbar-btns');
  if(!slot)return;
  slot.innerHTML='';
  if(!permCanEditFarm()){slot.style.display='none';return;}
  const delBtn=document.createElement('button');delBtn.className='btn-delete-master';delBtn.innerHTML='<i class="ti ti-trash" style="font-size:var(--fs-sm)"></i>削除';delBtn.addEventListener('click',()=>{const usedCells=Object.values(gridState.cells).filter(c=>c&&c.crop===veg.id);if(usedCells.length>0){showAlert(`「${veg.name}」は現在${usedCells.length}つの区画で使用中のため削除できません。\n区画の管理画面から野菜を外すか、区画を削除してから再度お試しください。`);return;}showConfirm(`「${veg.name}」をレシピから削除しますか？`,()=>{delete masterData.vegMaster[veg.id];navState.masterVeg=null;saveLS();renderMasterList();renderMasterDetail();});});
  const saveBtn=document.createElement('button');saveBtn.className='btn-save-master';saveBtn.innerHTML='<i class="ti ti-device-floppy"></i>保存';saveBtn.addEventListener('click',()=>{saveLS();if(addVegState.fromReg){addVegState.fromReg=false;saveBtn.textContent='完了';setTimeout(()=>{closeMaster();populateCropSelect();/** @type {HTMLSelectElement} */ (document.getElementById('dlg-crop')).value=navState.masterVeg||'';/** @type {HTMLButtonElement} */ (document.getElementById('dlg-save')).disabled=!navState.masterVeg;document.getElementById('dlg-register').style.display='flex';},1200);}else{saveBtn.textContent='完了';setTimeout(()=>closeMaster(),1200);}});
  slot.append(delBtn,saveBtn);slot.style.display='flex';
}

const SUPABASE_FUNCTION_URL='https://rkubnugczjlsxskomknm.supabase.co/functions/v1/generate-roadmap';

export async function aiGenerate(vegId){
  const veg=masterData.vegMaster[vegId];if(!veg)return;
  const inUse=Object.values(gridState.cells).some(c=>c.crop===vegId);
  const doGenerate=async()=>{
    const btn=/** @type {HTMLButtonElement|null} */ (document.getElementById('btn-ai-gen'));
    if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i>生成中...';}
    try{
      const res=await fetch(SUPABASE_FUNCTION_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+SUPABASE_ANON_KEY},
        body:JSON.stringify({
          vegName:veg.name,
          family:veg.family||'',
          growMethod:veg.growMethod||'seedling',
          season:veg.season||'',
          region:veg.region||'',
          referenceUrl:veg.referenceUrl||'',
          vegKey:vegId
        })
      });
      if(!res.ok){const e=await res.json();throw new Error(e.error||'生成に失敗しました');}
      const data=await res.json();
      if(!data.phases||!data.phases.length)throw new Error('工程表データが空です');
      data.phases.forEach((p,pi)=>{
        p.id=`p${pi+1}`;
        p.tasks.forEach((t,ti)=>{t.id=`t_${pi+1}_${ti+1}_${Math.random().toString(36).slice(2,5)}`;});
      });
      masterData.vegMaster[vegId].phases=data.phases;
      if(data.basicInfo)masterData.vegMaster[vegId].basicInfo=data.basicInfo;
      saveLS();renderMasterDetail();
      const basicInfoMsg=data.basicInfoSource==='existing'
        ?`基礎知識は「${veg.name}」の既存の初期値を使用しました（このレシピ内で自由に編集できます）。`
        :`基礎知識は「${veg.name}」として新規生成し、この品種の初期値として保存しました。`;
      showAlert(`「${veg.name}」の工程表をAIで生成しました！\n${basicInfoMsg}`);
    }catch(e){
      showAlert(`生成エラー：${e.message}`);
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-sparkles"></i>再生成';}
    }
  };
  if(inUse){showConfirm(`「${veg.name}」は区画に登録されています。\n工程表を再生成するとタスクの記録（チェック済み）がリセットされます。続けますか？`,doGenerate);return;}
  doGenerate();
}
