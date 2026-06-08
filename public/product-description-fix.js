(function(){
'use strict';
function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
function getText(el){return (el&&el.textContent||'').trim();}
function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
function html(modal){
 var title=getText(modal.querySelector('.modal-content h2'))||'Produto Kairos Shopping';
 var cat=getText(modal.querySelector('.product-category'))||'Produto selecionado';
 var price=getText(modal.querySelector('.price-row.large strong'))||'';
 var rating=getText(modal.querySelector('.rating'))||'';
 var shortDesc=getText(modal.querySelector('.modal-short'))||'Produto selecionado pela Kairos Shopping com envio para todo o Brasil e checkout externo oficial.';
 return '<p><strong>'+esc(title)+'</strong></p>'+
 '<p>'+esc(shortDesc)+'</p>'+
 '<ul><li>Produto selecionado para facilitar sua compra com mais praticidade.</li><li>Informações organizadas para ajudar na decisão antes do checkout.</li><li>Envio para todo o Brasil, conforme disponibilidade e prazo informado na compra.</li></ul>'+
 '<p><strong>Categoria:</strong> '+esc(cat)+'</p>'+
 (price?'<p><strong>Preço atual:</strong> '+esc(price)+'</p>':'')+
 (rating?'<p><strong>Avaliação:</strong> '+esc(rating)+'</p>':'')+
 '<p><strong>Compra:</strong> finalize pelo botão Comprar agora, usando o checkout externo oficial do produto.</p>'+
 '<p><strong>Importante:</strong> confira disponibilidade, prazo e condições diretamente no checkout antes de finalizar.</p>';
}
function fix(){
 var modal=document.getElementById('productModal');
 if(!modal||modal.hidden||modal.dataset.descFixed==='1')return;
 var content=modal.querySelector('.modal-content');
 if(!content)return;
 var details=[].slice.call(content.querySelectorAll('details')).filter(function(d){
  var s=getText(d.querySelector('summary')).toLowerCase();
  return s.indexOf('descricao completa')>-1||s.indexOf('descrição completa