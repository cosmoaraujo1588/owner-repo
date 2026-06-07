(function(){
  var ID='G-M3PTCCK08X';
  if(window.__kairosGa4Loaded)return;
  window.__kairosGa4Loaded=true;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  var s=document.createElement('script');
  s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+ID;
  document.head.appendChild(s);
  gtag('js',new Date());
  gtag('config',ID,{page_path:location.pathname,page_title:document.title});
  document.addEventListener('click',function(e){
    var buy=e.target.closest('[data-action="buy"],[data-modal-action="buy"]');
    var detail=e.target.closest('[data-action="details"]');
    var share=e.target.closest('[data-action="share"],[data-modal-action="share"]');
    var group=e.target.closest('[data-whatsapp-group]');
    if(buy)gtag('event','checkout_click',{item_id:buy.dataset.productId||''});
    if(detail)gtag('event','product_details_click',{item_id:detail.dataset.productId||''});
    if(share)gtag('event','share_product',{item_id:share.dataset.productId||''});
    if(group)gtag('event','whatsapp_group_click',{source:group.dataset.whatsappGroup||'home'});
  });
  var form=document.getElementById('searchForm');
  if(form)form.addEventListener('submit',function(){var q=document.getElementById('searchInput')?.value||'';gtag('event','search',{search_term:q});});
})();
