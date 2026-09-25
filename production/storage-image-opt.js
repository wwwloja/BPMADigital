(()=>{
  // Cria uma cópia leve SOMENTE para upload. Nunca altera o File/dataURL usado no relatório/PDF.
  async function optimizeForStorage(file,{maxSide=1600,quality=.78}={}){
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
  window.BPMA_STORAGE_IMAGE={optimizeForStorage};
})();
