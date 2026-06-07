/* Kairos Shopping - descricao completa no modal */
(function(){
  function txt(root,sel){return (root.querySelector(sel)?.textContent||'').trim();}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function build(title,cat,price,rate){return '<summary>Descrição completa do produto</summary><div style="display:grid;gap:10px;line-height:1.55"><p><strong>'+esc(title)+'</strong></p><p>Produto selecionado pela Kairos Shopping para quem busca praticidade, bom custo-benefício e uma compra simples pelo celular.</p><ul style="margin:0;padding-left:20px"><li>Informações organizadas para facilitar sua decisão.</li><li>Produto