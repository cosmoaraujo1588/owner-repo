(function(){
  'use strict';

  function ready(fn){
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  }

  function text(el){
    return (el && el.textContent || '').trim();
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function buildDescription(modal){
    var title = text(modal.querySelector('.modal-content h2')) || 'Produto Kairos Shopping';
    var category = text(modal.querySelector('.product-category')) || 'Produto selecionado';
    var price = text(modal.querySelector('.price-row.large strong')) || '';
    var rating = text(modal.querySelector('.rating')) || '';
    var shortDesc = text(modal.querySelector('.modal-short')) || 'Produto selecionado pela Kairos Shopping com envio para todo o Brasil e checkout externo oficial.';

    return ''+
      '<p><strong>'+escapeHtml(title)+'</strong></p>'+
      '<p>'+escapeHtml(shortDesc)+'</p>'+
      '<ul>'+
        '<li>Produto selecionado para facilitar sua compra com mais praticidade.</li>'+
        '<li>Informações organizadas para ajudar na decisão antes do checkout.</li>'+
        '<li>Envio para todo o Brasil, conforme disponibilidade e prazo informado na compra.</li>'+
      '</ul>'+
      '<p><strong>Categoria:</strong> '+escapeHtml(category)+'</p>'+
      (price ? '<p><strong>Preço atual:</strong> '+escapeHtml(price)+'</p>' : '')+
      (rating ? '<p><strong>Avaliação:</strong> '+escapeHtml(rating)+'</p>' : '')+
      '<p><strong>Compra:</strong> finalize pelo botão Comprar agora, usando o checkout externo oficial do produto.</p>'+
      '<p><strong>Importante:</strong> confira disponibilidade, prazo e condições diretamente no checkout antes de finalizar.</p>';
  }

  function improveModal(){
    var modal = document.getElementById('productModal');
    if(!modal || modal.hidden || modal.dataset.descFixed === '1') return;

    var content = modal.querySelector('.modal-content');
    if(!content) return;

    var details = Array.prototype.slice.call(content.querySelectorAll('details'))
      .filter(function(item){ return text(item.querySelector('summary')).toLowerCase().indexOf('descricao completa') !== -1 || text(item.querySelector('summary')).toLowerCase().indexOf('descrição completa') !== -1; })[0];

    if(!details