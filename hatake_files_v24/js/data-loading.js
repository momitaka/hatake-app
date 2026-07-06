// @ts-check
// ===== 初期データ読込後の反映 =====
import { masterData, gridState, farmMeta } from './state.js';
import { TOMATO_SAMPLE } from './helpers.js';
import { buildSegs } from './segments.js';
import { updateFarmNameDisplay } from './storage.js';
import { renderGrid } from './grid.js';
import { renderSegList } from './grid-settings.js';

/** @param {boolean} loaded */
export function _applyLoadedData(loaded){
  if(loaded){
    if(!masterData.vegMaster['tomato'])masterData.vegMaster['tomato']=JSON.parse(JSON.stringify(TOMATO_SAMPLE));
    document.getElementById('s-cols').value=gridState.cols;
    document.getElementById('s-rows').value=gridState.rows;
    document.getElementById('s-farm-name').value=farmMeta.name;
    updateFarmNameDisplay();
    buildSegs();
    renderGrid();
    renderSegList();
    const splashNameEl=document.getElementById('splash-farm-name');
    if(splashNameEl)splashNameEl.textContent=farmMeta.name||((window.APP_CONFIG&&window.APP_CONFIG.appName)||'私の畑');
  }
}
