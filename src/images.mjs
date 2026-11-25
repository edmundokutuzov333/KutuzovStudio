export async function readImage(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Selecciona JPG, PNG ou WebP até 12 MB.');
 const url=URL.createObjectURL(file);try{const im=new Image();im.src=url;await im.decode();if(!im.naturalWidth||!im.naturalHeight||im.naturalWidth*im.naturalHeight>40000000)throw Error('Imagem demasiado grande ou inválida.');
 const ratio=Math.min(1,1800/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*ratio));c.height=Math.max(1,Math.round(im.naturalHeight*ratio));const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas indisponível');ctx.drawImage(im,0,0,c.width,c.height);const data=c.toDataURL('image/webp',.94);return {data,width:c.width,height:c.height};}finally{URL.revokeObjectURL(url)}
}
