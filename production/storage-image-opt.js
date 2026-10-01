(()=>{
  // Cria uma cópia leve SOMENTE para upload. Nunca altera o File/dataURL usado no relatório/PDF.
  async function optimizeForStorage(file,{maxSide=1600,quality=.78,documentImage=false}={}){
    if(window.BPMA50?.isEconomy?.()===false)return file;
    if(documentImage){maxSide=2200;quality=.88;}
    if(!(file instanceof Blob)||!String(file.type||'').startsWith('image/')) return file;
    let bitmap;
    try{bitmap=await createImageBitmap(file)}catch{return file}
    try{
      const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
      if(scale>=.999 && file.size<=700000) return file;
      const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      canvas.width=1;canvas.height=1;
      if(!blob||blob.size>=file.size) return file;
      const base=String(file.name||'imagem').replace(/\.[^.]+$/,'');
      return new File([blob],base+'.webp',{type:'image/webp',lastModified:Date.now()});
    }finally{try{bitmap.close()}catch{}}
  }
  const recent=new Map();
  async function optimizeDataURL(value,documentImage=false){
    if(!/^data:image\/(jpeg|png|webp);base64,/i.test(value)||value.length<120000)return value;
    const key=(documentImage?'doc:':'img:')+value;if(recent.has(key))return recent.get(key);
    try{const original=await (await fetch(value)).blob();const small=await optimizeForStorage(original,{documentImage});if(small===original)return value;const result=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(small)});if(recent.size>=8)recent.delete(recent.keys().next().value);recent.set(key,result);return result;}catch{return value;}
  }
  async function optimizeTree(value,path=''){
    if(window.BPMA50?.isEconomy?.()===false)return value;
    if(typeof value==='string')return optimizeDataURL(value,/signature|assinatura|document|anexo/i.test(path));
    if(Array.isArray(value)){const out=[];for(let i=0;i<value.length;i++)out.push(await optimizeTree(value[i],path+'/'+i));return out;}
    if(value&&typeof value==='object'){const out={};for(const [key,item] of Object.entries(value))out[key]=await optimizeTree(item,path+'/'+key);return out;}
    return value;
  }
  window.BPMA_STORAGE_IMAGE={optimizeForStorage,optimizeTree};
})();
