'use strict';
(()=>{
 let promptEvent=null;
 let installedThisSession=false;
 const standalone=()=>['standalone','fullscreen','minimal-ui','window-controls-overlay'].some(mode=>window.matchMedia('(display-mode: '+mode+')').matches)||navigator.standalone===true;
 const style=document.createElement('style');style.textContent=`
 .pacs-install[hidden]{display:none!important}
 .pacs-install{display:block;margin:14px auto 0;padding:10px 16px;background:#102028;color:#5ed2e5;border:1px solid #31515d;border-radius:9px;font:inherit;cursor:pointer}
 #pwaHelp,#pwaAccess{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;background:#061015;color:#eef8fa;font:16px system-ui;padding:24px;text-align:center}
 #pwaHelp>div,#pwaAccess>div{max-width:430px}#pwaHelp button,#pwaAccess button{padding:12px 20px;margin:12px;background:#5ed2e5;border:0;border-radius:9px;font:inherit}
 `;document.head.appendChild(style);
 const button=document.createElement('button');button.type='button';button.className='pacs-install';button.textContent='Instalar aplicación';
 function mount(){
  button.hidden=standalone()||installedThisSession;
  const host=document.querySelector('#root .center')||document.getElementById('menu');
  if(host&&!host.contains(button))host.appendChild(button);
 }
 function help(){
  let el=document.getElementById('pwaHelp');if(el)return;
  el=document.createElement('div');el.id='pwaHelp';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const text=location.protocol==='file:'?'Primero publica todos los archivos en tu sitio HTTPS. La instalación no funciona abriendo el HTML descargado.':ios?'En Safari abre Compartir y selecciona Añadir a pantalla de inicio.': 'Abre el menú de tu navegador y busca Instalar aplicación o Añadir a pantalla de inicio. Si no aparece, comprueba que se publicaron todos los archivos y vuelve a abrir el sitio.';
  const panel=document.createElement('div'),h=document.createElement('h2'),p=document.createElement('p'),close=document.createElement('button');
  h.textContent='Instalar PACS HSMP';p.textContent=text;close.textContent='Entendido';close.onclick=()=>{el.remove();button.focus()};panel.append(h,p,close);el.append(panel);document.body.append(el);close.focus();
 }
 button.onclick=async()=>{
  if(!promptEvent){help();return;}
  const e=promptEvent;promptEvent=null;
  try{await e.prompt();await e.userChoice;}catch(_){help();}
 };
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;mount()});
 window.addEventListener('appinstalled',()=>{promptEvent=null;installedThisSession=true;mount()});
 for(const mode of ['standalone','fullscreen','minimal-ui','window-controls-overlay']){
  const media=window.matchMedia('(display-mode: '+mode+')');
  if(media.addEventListener)media.addEventListener('change',mount);
 }
 window.addEventListener('pageshow',mount);
 const observer=new MutationObserver(mount);observer.observe(document.getElementById('root')||document.body,{subtree:true,childList:true});mount();
 if('serviceWorker' in navigator&&window.isSecureContext&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(err=>console.warn('No se pudo activar la instalación:',err)));
 }
 // Verificar la autorización al regresar. No recrear ni borrar la identidad local.
 let checking=false,wasAuthorized=false;
 function cover(message){
  let el=document.getElementById('pwaAccess');if(!el){el=document.createElement('div');el.id='pwaAccess';el.setAttribute('role','status');document.body.append(el);}
  const panel=document.createElement('div'),p=document.createElement('p');p.textContent=message;panel.append(p);el.replaceChildren(panel);return panel;
 }
 async function verify(){
  const P=window.PACS;
  if(checking||!P||P.state.role!=='viewer'||(!P.state.logged&&!wasAuthorized))return;
  checking=true;wasAuthorized=true;P.state.logged=false;cover('Verificando autorización del dispositivo…');
  try{
   const result=await P.devices.checkAccess();P.state.deviceStatus=result.status;
   if(result.status==='approved'){
    P.state.logged=true;wasAuthorized=false;document.getElementById('pwaAccess')?.remove();
   }else{
    wasAuthorized=false;P.comments.clear();Object.assign(P.state,{patients:[],selectedPatient:null,selectedImage:0,selectedStudyIndex:0});
    P.app.home();document.getElementById('pwaAccess')?.remove();P.devices.showGate(result.status);
   }
  }catch(_){
   const panel=cover('No se pudo verificar el acceso. Comprueba tu conexión para continuar.');
   const retry=document.createElement('button');retry.textContent='Reintentar';retry.onclick=verify;panel.append(retry);
  }finally{checking=false;}
 }
 document.addEventListener('visibilitychange',()=>{
  const P=window.PACS;if(!P)return;
  if(document.visibilityState==='hidden'&&P.state.role==='viewer'&&P.state.logged){wasAuthorized=true;P.state.logged=false;cover('Verificando autorización del dispositivo…');}
  if(document.visibilityState==='visible')verify();
 },true);
 window.addEventListener('pageshow',e=>{if(e.persisted)verify()});
 setInterval(()=>{if(document.visibilityState==='visible')verify()},60000);
})();
