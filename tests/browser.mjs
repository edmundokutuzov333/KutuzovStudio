const result=document.getElementById('result'),frame=document.getElementById('app');
function check(ok,message){if(!ok)throw Error(message)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await sleep(50)}throw Error('Browser timeout')}
try{await until(()=>frame.contentDocument?.querySelectorAll('#designs article').length===5);
 const d=frame.contentDocument,w=frame.contentWindow,f=d.querySelector('#brief'),field=n=>f.elements.namedItem(n);
 check(!d.querySelector('#editor').hidden,'editor visible');check(d.querySelector('#front').src.startsWith('blob:'),'front preview');
 const first=[...d.querySelectorAll('#designs button')].map(x=>x.dataset.id).join(',');d.querySelector('#remix').click();check([...d.querySelectorAll('#designs button')].map(x=>x.dataset.id).join(',')!==first,'remix changes IDs');
 field('name').value='Ana Teste';field('name').dispatchEvent(new w.Event('input',{bubbles:true}));await until(()=>d.querySelectorAll('#designs article').length===5);
 const svg=await (await w.fetch(d.querySelector('#front').src)).text();check(svg.includes('Ana Teste'),'profile update');
 field('format').value='custom';field('format').dispatchEvent(new w.Event('change',{bubbles:true}));check(!d.querySelector('#custom').hidden,'custom dimensions');field('width').value='90';field('height').value='60';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));check(d.querySelector('#dimensions').textContent.includes('90 × 60'),'custom geometry');
 let download=null;const old=w.HTMLAnchorElement.prototype.click;w.HTMLAnchorElement.prototype.click=function(){if(this.download)download={name:this.download,url:this.href};else old.call(this)};d.querySelector('#download-back').click();check(download?.name.endsWith('-back.svg'),'download back');const back=await (await w.fetch(download.url)).text();check(back.includes('width="96mm"'),'export bleed');w.HTMLAnchorElement.prototype.click=old;
 field('name').value='';f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));check(d.querySelector('#editor').hidden&&d.querySelector('#error').textContent,'invalid input clears stale download');
 result.textContent='STUDIO_BROWSER_PASS';
}catch(e){result.textContent='STUDIO_BROWSER_FAIL '+e.message;document.title=result.textContent}
