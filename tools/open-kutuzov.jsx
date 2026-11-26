#target illustrator
(function(){
 var src=File.openDialog("Abrir ficheiro .kutuzov");if(!src)return;
 if(!/\.kutuzov$/i.test(src.name)){alert("Selecciona um .kutuzov nativo.");return;}
 var dest=File.saveDialog("Guardar copia AI para editar");if(!dest)return;
 if(!/\.ai$/i.test(dest.name))dest=new File(dest.fsName+'.ai');
 if(dest.exists){alert("Escolhe um nome novo.");return;}
 try{if(!src.copy(dest.fsName))throw new Error("Copia falhou.");if(dest.length!==src.length)throw new Error("Tamanho incorrecto.");app.open(dest);}
 catch(e){alert("Nao foi possivel abrir: "+e.message+"; verifica se o original e um AI nativo.");}
})();