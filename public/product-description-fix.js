/* Kairos Shopping - reforco da descricao completa do produto */
(function(){
  function pick(root,sel){return (root.querySelector(sel)?.textContent||'').trim();}
  function run(){
    var modal=document.getElementById('productModal');
    if(!modal||modal.hidden||modal.dataset.descOk==='1')return;
    var box=modal.querySelector('.modal-content');
    if(!box)return;
    var title=pick(box,'h2');
    if(!title)return;
    var cat=pick(box,'.product-category');
    var price=pick(box,'.price-row');
    var rating=pick(box,'.rating');
    var old=Array.from(box.querySelectorAll('details')).find(function(d){return /descri/i.test(d.textContent