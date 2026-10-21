'use strict';
// Display-only improvements: no accounting or storage mutations.
function deduplicateExportTools(scope){
 const buttons=[...scope.querySelectorAll('button[data-action]')];
 const groups=new Map();
 for(const b of buttons){const parent=b.closest('.toolbar,.file-actions,.actions')||b.parentElement;if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(b)}
 for(const list of groups.values()){
  const full=list.some(b=>b.dataset.action==='productExport'),seen=new Set();
  for(const b of list){const action=b.dataset.action;if(!['xlsx','productExport','pdf','printReport'].includes(action))continue;if((action==='xlsx'&&full)||seen.has(action))b.remove();else seen.add(action)}
 }
}
const polishOriginal=polishUI;
polishUI=function(){for(const scope of [$('#content'),$('#modalBody')])if(scope)deduplicateExportTools(scope);polishOriginal();};
let motionRoute='',bottomDirection=null;
document.addEventListener('click',e=>{
 const link=e.target.closest('#bottomNav a');if(!link)return;
 const current=$('#bottomNav a.active'),target=link.getAttribute('href').slice(1);
 if(!current||target===route){bottomDirection=null;return}
 const a=current.getBoundingClientRect(),b=link.getBoundingClientRect();
 bottomDirection={target,direction:b.left+b.width/2<a.left+a.width/2?'left':'right'};
},true);
function appearanceOptions(){
 modal('حجم النص',`<p class="muted">لغة الواجهة العربية</p><label>حجم النص<select name="size"><option value="normal">عادي</option><option value="large">كبير</option></select></label>`,async data=>{const size=data.get('size');localStorage.setItem('rawan-text-size',size);document.body.classList.toggle('large-text',size==='large');closeModal()});
 const select=$('#modalBody select');if(select)select.value=localStorage.getItem('rawan-text-size')||'normal';enhanceFields();
}
const renderBlueBase=render;
render=function(){
 const changed=route!==motionRoute;renderBlueBase();if(!S)return;
 const bar=$('.header-tools');
 let typography=$('#typographyBtn');if(!typography){typography=document.createElement('button');typography.id='typographyBtn';typography.className='icon-btn';typography.type='button';typography.title='اللغة وحجم النص';typography.setAttribute('aria-label',typography.title);typography.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 5h12M9 3v2m-4 3c1 4 4 7 8 9M13 5c-1 6-5 10-10 12m11 3 4-11 4 11m-7-3h6"/></svg>';typography.onclick=appearanceOptions;bar.append(typography)}
 let profile=$('#profileBtn');if(!profile){profile=document.createElement('button');profile.id='profileBtn';profile.type='button';profile.title='بيانات المؤسسة';profile.setAttribute('aria-label',profile.title);profile.onclick=()=>actions.company();bar.append(profile)}profile.textContent='ر';
 const brand=$('.top-brand');if(brand){const label=S.settings.company||'الوثيق';if(brand.dataset.companyLabel!==label){brand.innerHTML=`<span class="company-symbol">${icon('store')}</span><b>${esc(label)}</b>`;if(!paths.store)brand.querySelector('.company-symbol').innerHTML=icon('reports');brand.dataset.companyLabel=label}}
 document.body.classList.toggle('large-text',localStorage.getItem('rawan-text-size')==='large');
 const content=$('#content');content.classList.remove('slide-left','slide-right');
 if(changed&&bottomDirection?.target===route){content.classList.remove('native-enter');content.classList.add('slide-'+bottomDirection.direction)}
 if(changed){motionRoute=route;bottomDirection=null}
 polishUI();
};

