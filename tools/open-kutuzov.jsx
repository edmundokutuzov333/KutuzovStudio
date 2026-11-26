#target illustrator
(function(){
 var src=File.openDialog("Abrir ficheiro .kutuzov");if(!src)return;
 if(!/\.kutuzov$/i.test(src.name)){alert("Selecciona um .kutuzov nativo.");return;}
 var dest=File.saveDialog("Guardar copia AI para editar");if(!dest)return;
 if(!/\.ai$/i.test(dest.name))dest=new File(dest.parent.fsName+'/'+dest.name.replace(/\.kutuzov$/i,'')+'.ai');
 if(dest.exists||src.fsName===dest.fsName){alert("Escolhe um nome novo.");return;}
 var created=false;
 function check(ok,msg){if(!ok)throw new Error(msg);}
 try{
  check(src.copy(dest.fsName),"Copia falhou.");created=true;check(dest.length===src.length,"Tamanho incorrecto.");
  src.encoding='BINARY';dest.encoding='BINARY';check(src.open('r'),"Leitura do original falhou.");check(dest.open('r'),"Leitura da copia falhou.");
  while(!src.eof)check(src.read(65536)===dest.read(65536),"Bytes diferentes.");check(dest.eof,"Bytes adicionais.");src.close();dest.close();
  app.open(dest);
 }catch(e){try{src.close();dest.close();}catch(_){}if(created&&dest.exists)dest.remove();alert("Nao foi possivel abrir: "+e.message+". Verifica se o original e um AI nativo.");}
})();