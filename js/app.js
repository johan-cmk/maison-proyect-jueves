// ── STORAGE ──
function getLS(k,def){try{const v=JSON.parse(localStorage.getItem(k));return v!==null?v:def}catch(e){return def}}
function setLS(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

// ── CONSTANTES ──
const ADMIN_USER='admin';
const ADMIN_PASS='admin123';
const CIRC=2*Math.PI*40;
const DELIVERY_SECS=30*60;
const CANCEL_SECS=5*60; // ventana de cancelación: 5 minutos

// ── ESTADO ──
// Eliminar cualquier entrada 'admin' que haya quedado en lmUsers (evita conflictos de login)
(function sanitizeUsers(){
  try{
    const raw=JSON.parse(localStorage.getItem('lmUsers'));
    if(Array.isArray(raw)){
      const clean=raw.filter(u=>u.user!=='admin');
      if(clean.length!==raw.length) localStorage.setItem('lmUsers',JSON.stringify(clean));
    }
  }catch(e){}
})();
let users=getLS('lmUsers',[]);
let currentUser='';
let isAdmin=false;
let cart=[];
let deliveryMode='recoger';
let pagoMode='efectivo';
let recPagoMode='efectivo';
let mesaSelected=1;
let recTabMode='comer'; // 'comer' o 'reservar'
let resMesaSelected=1;
let resPagoMode='efectivo';

// ── PRODUCTOS ──
const defaultProducts=[
  {id:1,name:"Mondongo",category:"Tradicional",price:50000,img:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Soup_with_meat_and_vegetables.jpg/640px-Soup_with_meat_and_vegetables.jpg",badge:null,desc:"El mondongo es un guiso tradicional en la gastronomía latinoamericana, hecho principalmente de tripas de res, verduras y especias."},
  {id:2,name:"Sudado de Pollo",category:"Tradicional",price:15000,img:"https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=640&q=80",badge:null,desc:"El sudado de pollo combina pollo jugoso, papas suaves, yuca y una deliciosa mezcla de especias y verduras."},
  {id:3,name:"Costilla BBQ",category:"BBQ",price:25000,img:"https://images.unsplash.com/photo-1544025162-d76694265947?w=640&q=80",badge:null,desc:"Costillas con sabor ahumado y jugoso, logrado con marinados especiales y cocción lenta."},
  {id:4,name:"Sopa de Res",category:"Sopas",price:10000,img:"https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=640&q=80",badge:null,desc:"Sopa nutritiva y reconfortante con carne de res, verduras y condimentos."},
  {id:5,name:"Hamburguesa paro cardiaco",category:"FastFood",price:30000,img:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&q=80",badge:"🔥 Especial",desc:"Hamburguesa con carne jugosa servida en bollo con ingredientes especiales de la casa."},
  {id:6,name:"Pizza",category:"FastFood",price:45000,img:"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=640&q=80",badge:null,desc:"Pizza italiana con masa horneada, salsa de tomate, queso y toppings seleccionados."},
  {id:7,name:"Ajiaco",category:"Sopas",price:18000,img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80",badge:null,desc:"Sopa tradicional bogotana con pollo, tres tipos de papa y guascas."},
  {id:8,name:"Perro caliente paro cardiaco",category:"FastFood",price:30000,img:"https://images.unsplash.com/photo-1612392061787-2a8bf7e55b49?w=640&q=80",badge:null,desc:"Perro caliente con todos los ingredientes especiales de la casa."}
];
function getProducts(){return getLS('lmProducts',defaultProducts)}
function saveProducts(p){setLS('lmProducts',p)}

// ── PEDIDOS ──
function getOrders(){return getLS('lmOrders',[])}
function saveOrders(o){setLS('lmOrders',o)}

// ── HELPERS ──
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function show(id){document.getElementById(id).classList.add('active')}
function hide(id){document.getElementById(id).classList.remove('active')}
function timeAgo(ts){
  const diff=Math.floor((Date.now()-ts)/1000);
  if(diff<60)return diff+'s';
  if(diff<3600)return Math.floor(diff/60)+'min';
  if(diff<86400)return Math.floor(diff/3600)+'h '+Math.floor((diff%3600)/60)+'min';
  return Math.floor(diff/86400)+'d';
}

// ── LOGIN ──
function switchTab(tab,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.form-section').forEach(s=>s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('section-'+tab).classList.add('active');
  const m=document.getElementById('mensaje');m.innerText='';m.className='';
}

function register(){
  const user=document.getElementById('registerUser').value.trim();
  const pass=document.getElementById('registerPass').value.trim();
  const sec=document.getElementById('registerSec').value.trim();
  const msg=document.getElementById('mensaje');
  if(!user||!pass){msg.className='';msg.innerText='Completa usuario y contraseña.';return}
  if(user===ADMIN_USER){msg.className='';msg.innerText='Ese nombre no está disponible.';return}
  users=getLS('lmUsers',[]);
  if(users.find(u=>u.user===user)){msg.className='';msg.innerText='Ese usuario ya existe.';return}
  users.push({user,pass,sec:sec||'',createdAt:Date.now()});
  setLS('lmUsers',users);
  msg.className='ok';msg.innerText='✓ Cuenta creada. Ya puedes iniciar sesión.';
}

function login(){
  const user=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value.trim();
  const msg=document.getElementById('mensaje');
  if(user===ADMIN_USER&&pass===ADMIN_PASS){
    currentUser=user;isAdmin=true;
    document.getElementById('login-container').style.display='none';
    document.getElementById('admin-panel').style.display='block';
    renderAdminList();
    renderAdminUsers();
    renderAdminOrders();
    startAdminTimerInterval();
    return;
  }
  users=getLS('lmUsers',[]);
  const found=users.find(u=>u.user===user&&u.pass===pass);
  if(found){
    currentUser=user;isAdmin=false;
    document.getElementById('headerUser').innerText='Hola, '+user;
    document.getElementById('login-container').style.display='none';
    document.getElementById('app').style.display='block';
    cart=[];updateCart();renderMenu();
    restoreTimerIfNeeded();
  } else {msg.className='';msg.innerText='Usuario o contraseña incorrectos.';}
}

function salir(){
  document.getElementById('login-container').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('admin-panel').style.display='none';
  ['loginUser','loginPass','registerUser','registerPass','registerSec'].forEach(id=>document.getElementById(id).value='');
  const m=document.getElementById('mensaje');m.innerText='';m.className='';
  cart=[];updateCart();isAdmin=false;currentUser='';
  document.querySelectorAll('.tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('.form-section').forEach((s,i)=>s.classList.toggle('active',i===0));
  hide('cartModal');hide('overlay');
  if(timerInterval){clearInterval(timerInterval);timerInterval=null;}
  document.getElementById('fab-pedido').classList.remove('visible');
  activeOrderId=null;
  if(adminTimerInterval){clearInterval(adminTimerInterval);adminTimerInterval=null;}
}

// ── RECUPERAR CONTRASEÑA ──
function openRecuperar(){
  document.getElementById('rec-user').value='';
  document.getElementById('rec-sec').value='';
  document.getElementById('rec-newpass').value='';
  document.getElementById('rec-newpass2').value='';
  document.getElementById('rec-msg1').innerText='';
  document.getElementById('rec-msg2').innerText='';
  document.getElementById('rec-step1').classList.add('active');
  document.getElementById('rec-step2').classList.remove('active');
  show('recModal');
}
function closeRecuperar(){hide('recModal')}
function recStep2(){
  const user=document.getElementById('rec-user').value.trim();
  const sec=document.getElementById('rec-sec').value.trim();
  const msg=document.getElementById('rec-msg1');
  if(!user||!sec){msg.innerText='Completa todos los campos.';return}
  users=getLS('lmUsers',[]);
  const found=users.find(u=>u.user===user);
  if(!found){msg.innerText='Usuario no encontrado.';return}
  if(!found.sec){msg.innerText='Este usuario no tiene pregunta de seguridad configurada.';return}
  if(found.sec.toLowerCase().trim()!==sec.toLowerCase().trim()){msg.innerText='Respuesta incorrecta.';return}
  document.getElementById('rec-step1').classList.remove('active');
  document.getElementById('rec-step2').classList.add('active');
}
function recSave(){
  const user=document.getElementById('rec-user').value.trim();
  const np=document.getElementById('rec-newpass').value.trim();
  const np2=document.getElementById('rec-newpass2').value.trim();
  const msg=document.getElementById('rec-msg2');
  if(!np||!np2){msg.className='rec-msg err';msg.innerText='Completa los campos de contraseña.';return}
  if(np!==np2){msg.className='rec-msg err';msg.innerText='Las contraseñas no coinciden.';return}
  users=getLS('lmUsers',[]);
  const idx=users.findIndex(u=>u.user===user);
  users[idx].pass=np;
  setLS('lmUsers',users);
  msg.className='rec-msg ok';msg.innerText='✓ Contraseña cambiada correctamente.';
  setTimeout(()=>closeRecuperar(),1800);
}

// ── PERFIL ──
function openPerfil(){
  users=getLS('lmUsers',[]);
  const u=users.find(u=>u.user===currentUser);
  document.getElementById('perfilAvatar').innerText=currentUser[0].toUpperCase();
  document.getElementById('perfilNombreDisplay').innerText=currentUser;
  document.getElementById('perf-newuser').value=currentUser;
  document.getElementById('perf-oldpass').value='';
  document.getElementById('perf-newpass').value='';
  document.getElementById('perf-newpass2').value='';
  document.getElementById('perf-sec').value='';
  document.getElementById('perfil-msg').innerText='';
  document.getElementById('perfil-msg').className='perfil-msg';
  show('perfilModal');
}
function closePerfil(){hide('perfilModal')}
function savePerfil(){
  users=getLS('lmUsers',[]);
  const u=users.find(u=>u.user===currentUser);
  const msg=document.getElementById('perfil-msg');
  const newUser=document.getElementById('perf-newuser').value.trim();
  const oldPass=document.getElementById('perf-oldpass').value.trim();
  const newPass=document.getElementById('perf-newpass').value.trim();
  const newPass2=document.getElementById('perf-newpass2').value.trim();
  const newSec=document.getElementById('perf-sec').value.trim();
  let changed=false;
  if(newUser&&newUser!==currentUser){
    if(newUser===ADMIN_USER||users.find(x=>x.user===newUser&&x.user!==currentUser)){
      msg.className='perfil-msg err';msg.innerText='Ese nombre ya está en uso.';return;
    }
    u.user=newUser;currentUser=newUser;
    document.getElementById('headerUser').innerText='Hola, '+newUser;
    document.getElementById('perfilNombreDisplay').innerText=newUser;
    document.getElementById('perfilAvatar').innerText=newUser[0].toUpperCase();
    changed=true;
  }
  if(oldPass||newPass||newPass2){
    if(!oldPass){msg.className='perfil-msg err';msg.innerText='Ingresa tu contraseña actual.';return}
    if(oldPass!==u.pass){msg.className='perfil-msg err';msg.innerText='La contraseña actual no es correcta.';return}
    if(!newPass||!newPass2){msg.className='perfil-msg err';msg.innerText='Completa los campos de nueva contraseña.';return}
    if(newPass!==newPass2){msg.className='perfil-msg err';msg.innerText='Las contraseñas nuevas no coinciden.';return}
    u.pass=newPass;changed=true;
  }
  if(newSec){u.sec=newSec;changed=true;}
  if(!changed){msg.className='perfil-msg err';msg.innerText='No hay cambios para guardar.';return}
  setLS('lmUsers',users);
  msg.className='perfil-msg ok';msg.innerText='✓ Perfil actualizado correctamente.';
  setTimeout(()=>closePerfil(),1600);
}

// ── MENÚ ──
let currentFilter='todos';
function renderMenu(filter){
  if(filter!==undefined)currentFilter=filter;
  const products=getProducts();
  const c=document.getElementById('menuContainer');
  const filtered=currentFilter==='todos'?products:products.filter(p=>p.category===currentFilter);
  c.innerHTML=filtered.map(p=>`
    <div class="product-card${p.agotado?' agotado':''}">
      ${p.agotado?'<div class="agotado-overlay">🚫 Agotado</div>':''}
      ${p.badge&&!p.agotado?`<div class="product-badge">${p.badge}</div>`:''}
      <img class="product-img" src="${p.img||'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=80'}" alt="${p.name}"
        onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=80'">
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price">$ ${p.price.toLocaleString('es-CO')}</span>
          <button class="add-btn" onclick="addToCart(${p.id})" ${p.agotado?'disabled':''}>${p.agotado?'No disponible':'Agregar'}</button>
        </div>
      </div>
    </div>`).join('');
}
function filterProducts(cat,btn){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');renderMenu(cat);
}

// ── CARRITO ──
function addToCart(id){
  cart.push(getProducts().find(p=>p.id===id));updateCart();
  const icon=document.querySelector('.cart-icon');
  icon.style.background='var(--accent2)';setTimeout(()=>{icon.style.background=''},300);
}
function removeFromCart(i){cart.splice(i,1);updateCart()}
function updateCart(){
  document.getElementById('cartCount').innerText=cart.length;
  document.getElementById('cartTotal').innerText='$ '+cart.reduce((s,p)=>s+p.price,0).toLocaleString('es-CO');
  const ci=document.getElementById('cartItems');
  ci.innerHTML=cart.length?cart.map((p,i)=>`
    <div class="cart-item">
      <span class="cart-item-emoji">🍽️</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">$ ${p.price.toLocaleString('es-CO')}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
    </div>`).join(''):'<div class="cart-empty">Tu carrito está vacío<br>¡Agrega platos!</div>';
}
function toggleCart(){
  document.getElementById('cartModal').classList.toggle('active');
  document.getElementById('overlay').classList.toggle('active');
}

// ── ENTREGA / PAGO ──
function setRecTab(tab){
  recTabMode=tab;
  document.getElementById('rectab-comer').classList.toggle('active',tab==='comer');
  document.getElementById('rectab-reservar').classList.toggle('active',tab==='reservar');
  document.getElementById('recpanel-comer').classList.toggle('active',tab==='comer');
  document.getElementById('recpanel-reservar').classList.toggle('active',tab==='reservar');
}
function setResMesa(n){
  resMesaSelected=n;
  for(let i=1;i<=4;i++) document.getElementById('resmesa-'+i).classList.toggle('active',i===n);
}
function setResPago(mode){
  resPagoMode=mode;
  document.getElementById('res-pago-efectivo').classList.toggle('active',mode==='efectivo');
  document.getElementById('res-pago-credito').classList.toggle('active',mode==='credito');
}
// Storage mesas
function getMesasState(){return JSON.parse(localStorage.getItem('lmMesas')||'{}');}
function saveMesasState(s){localStorage.setItem('lmMesas',JSON.stringify(s));}
// Storage reservas
function getReservas(){return JSON.parse(localStorage.getItem('lmReservas')||'[]');}
function saveReservas(r){localStorage.setItem('lmReservas',JSON.stringify(r));}

function setDelivery(mode){
  deliveryMode=mode;
  document.getElementById('btn-recoger').classList.toggle('active',mode==='recoger');
  document.getElementById('btn-domicilio').classList.toggle('active',mode==='domicilio');
  document.getElementById('domicilio-form').style.display=mode==='domicilio'?'block':'none';
  document.getElementById('recoger-form').style.display=mode==='recoger'?'block':'none';
}
function setPago(mode){
  pagoMode=mode;
  document.getElementById('pago-efectivo').classList.toggle('active',mode==='efectivo');
  document.getElementById('pago-credito').classList.toggle('active',mode==='credito');
}
function setRecPago(mode){
  recPagoMode=mode;
  document.getElementById('rec-pago-efectivo').classList.toggle('active',mode==='efectivo');
  document.getElementById('rec-pago-credito').classList.toggle('active',mode==='credito');
}
function setMesa(n){
  mesaSelected=n;
  for(let i=1;i<=4;i++) document.getElementById('mesa-'+i).classList.toggle('active',i===n);
}

// ── CHECKOUT ──
function checkout(){
  if(!cart.length)return;
  let valid=true;
  if(deliveryMode==='domicilio'){
    ['dom-nombre','dom-celular','dom-direccion'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el.value.trim()){el.classList.add('err');valid=false;setTimeout(()=>el.classList.remove('err'),800);}
    });
    if(!valid)return;
  }
  if(deliveryMode==='recoger'){
    if(recTabMode==='comer'){
      const recNombre=document.getElementById('rec-nombre');
      if(!recNombre.value.trim()){recNombre.classList.add('err');setTimeout(()=>recNombre.classList.remove('err'),800);return;}
    } else {
      // Reservar
      const resNombre=document.getElementById('res-nombre');
      const resCelular=document.getElementById('res-celular');
      const resHora=document.getElementById('res-hora');
      const resPersonas=document.getElementById('res-personas');
      [resNombre,resCelular,resHora,resPersonas].forEach(el=>{
        if(!el.value.trim()){el.classList.add('err');valid=false;setTimeout(()=>el.classList.remove('err'),800);}
      });
      if(!valid)return;
      // Guardar reserva
      const now=Date.now();
      const reservas=getReservas();
      const nueva={
        id:now,
        nombre:resNombre.value.trim(),
        celular:resCelular.value.trim(),
        hora:resHora.value,
        personas:resPersonas.value,
        mesa:resMesaSelected,
        pago:resPagoMode==='efectivo'?'💵 Efectivo':'💳 Crédito',
        timestamp:now,
        activa:true,
        user:currentUser
      };
      reservas.unshift(nueva);
      saveReservas(reservas);
      // Marcar mesa como reservada
      const state=getMesasState();
      state['mesa-'+resMesaSelected]={estado:'reservada',hora:resHora.value,personas:resPersonas.value};
      saveMesasState(state);
      // WhatsApp reserva
      let wRes=`Hola! Soy *${currentUser}* y quiero hacer una *RESERVA* 📅%0A%0A`;
      cart.forEach(p=>{wRes+=`✅ ${p.name} — $${p.price.toLocaleString('es-CO')}%0A`});
      const total=cart.reduce((s,p)=>s+p.price,0);
      wRes+=`%0A💰 *Total:* $${total.toLocaleString('es-CO')}`;
      wRes+=`%0A%0A🪑 *Mesa:* Mesa ${resMesaSelected}`;
      wRes+=`%0A👤 *Nombre:* ${resNombre.value.trim()}`;
      wRes+=`%0A📱 *Celular:* ${resCelular.value.trim()}`;
      wRes+=`%0A⏰ *Hora de llegada:* ${resHora.value}`;
      wRes+=`%0A👥 *Personas:* ${resPersonas.value}`;
      wRes+=`%0A${nueva.pago}`;
      window.open('https://wa.me/573157124132?text='+wRes);
      hide('cartModal');hide('overlay');
      cart=[];updateCart();
      return;
    }
  }
  const nombre=deliveryMode==='domicilio'
    ? document.getElementById('dom-nombre').value.trim()
    : document.getElementById('rec-nombre').value.trim();
  const celular=deliveryMode==='domicilio'
    ? document.getElementById('dom-celular').value.trim()
    : document.getElementById('rec-celular').value.trim();
  const direccion=document.getElementById('dom-direccion').value.trim();
  const pagoTexto=deliveryMode==='domicilio'
    ? (pagoMode==='efectivo'?'💵 Efectivo (contra entrega)':'💳 Crédito / Transferencia')
    : (recPagoMode==='efectivo'?'💵 Efectivo':'💳 Crédito / Transferencia');
  const total=cart.reduce((s,p)=>s+p.price,0);

  const now=Date.now();
  const newOrder={
    id:now,
    user:currentUser,
    items:[...cart],
    total,
    tipo:deliveryMode,
    nombre:nombre||currentUser,
    celular,
    direccion,
    pago:pagoTexto,
    mesa:deliveryMode==='recoger'?'Mesa '+mesaSelected:null,
    estado:'en-camino',
    timestamp:now,
    cancelBefore:now+CANCEL_SECS*1000
  };
  const orders=getOrders();
  orders.unshift(newOrder);
  saveOrders(orders);

  let wMsg=`Hola! Soy *${currentUser}* y quiero hacer un pedido 🍽️%0A%0A`;
  cart.forEach(p=>{wMsg+=`✅ ${p.name} — $${p.price.toLocaleString('es-CO')}%0A`});
  wMsg+=`%0A💰 *Total:* $${total.toLocaleString('es-CO')}`;
  if(deliveryMode==='domicilio'){
    wMsg+=`%0A%0A🛵 *Tipo:* Domicilio`;
    wMsg+=`%0A👤 *Cliente:* ${nombre}`;
    wMsg+=`%0A📱 *Celular:* ${celular}`;
    wMsg+=`%0A📍 *Dirección:* ${direccion}`;
    wMsg+=`%0A${pagoTexto}`;
  } else {
    wMsg+=`%0A%0A🏠 *Tipo:* Recoger en el local`;
    wMsg+=`%0A👤 *Cliente:* ${nombre}`;
    wMsg+=`%0A📱 *Celular:* ${celular}`;
    wMsg+=`%0A🪑 *Mesa:* Mesa ${mesaSelected}`;
    wMsg+=`%0A${pagoTexto}`;
  }
  window.open('https://wa.me/573157124132?text='+wMsg);
  hide('cartModal');hide('overlay');
  startTimer(newOrder);
  cart=[];updateCart();
}

// ── TIMERS (basados en timestamp real — funcionan aunque el usuario se salga) ──
let activeOrderId=null;
let timerInterval=null;

function getSecsFromOrder(order){
  if(!order||!order.timestamp)return{elapsed:0,left:DELIVERY_SECS};
  const elapsed=Math.floor((Date.now()-order.timestamp)/1000);
  const left=Math.max(0,DELIVERY_SECS-elapsed);
  return{elapsed,left};
}

// Ya no se necesita saveTimerState / clearTimerState (el timestamp está en el pedido)
function saveTimerState(){}
function clearTimerState(){}

function restoreTimerIfNeeded(){
  const orders=getOrders();
  const active=orders.find(o=>o.user===currentUser&&o.estado==='en-camino');
  if(!active)return;
  const{left}=getSecsFromOrder(active);
  if(left<=0){
    // marcar entregado si ya expiró mientras estaba fuera
    const idx=orders.findIndex(o=>o.id===active.id);
    if(idx!==-1){orders[idx].estado='entregado';saveOrders(orders);}
    return;
  }
  activeOrderId=active.id;
  buildDeliveryModalInfo(active);
  document.getElementById('fab-pedido').classList.add('visible');
  startTimerInterval();
}

function startTimer(order){
  if(timerInterval)clearInterval(timerInterval);
  activeOrderId=order.id;
  buildDeliveryModalInfo(order);
  refreshTimerDisplay();
  show('deliveryModal');
  document.getElementById('fab-pedido').classList.add('visible');
  startTimerInterval();
}

function startTimerInterval(){
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=setInterval(()=>{
    const orders=getOrders();
    const order=orders.find(o=>o.id===activeOrderId);
    if(!order){clearInterval(timerInterval);timerInterval=null;return;}
    if(order.estado==='cancelado'){
      clearInterval(timerInterval);timerInterval=null;
      document.getElementById('cancelBar').style.display='none';
      document.getElementById('fab-pedido').classList.remove('visible');
      return;
    }
    const{elapsed,left}=getSecsFromOrder(order);
    // Actualizar secsElapsed en storage para que el admin lo vea
    const idx=orders.findIndex(o=>o.id===activeOrderId);
    if(idx!==-1){orders[idx].secsElapsed=elapsed;saveOrders(orders);}
    refreshTimerDisplay();
    updateCancelBar(order);
    if(left<=0){
      clearInterval(timerInterval);timerInterval=null;
      showEntregado();
    }
  },1000);
}

function buildDeliveryModalInfo(order){
  const cc=document.getElementById('circC'),ce=document.getElementById('circE');
  cc.style.strokeDasharray=CIRC;ce.style.strokeDasharray=CIRC;
  document.getElementById('modal-info').innerHTML=
    `<div class="modal-info-row">👤 Usuario: <span>${order.user}</span></div>`+
    (order.tipo==='domicilio'?
      `<div class="modal-info-row">🙋 Cliente: <span>${order.nombre}</span></div>`+
      `<div class="modal-info-row">📱 Celular: <span>${order.celular}</span></div>`+
      `<div class="modal-info-row">📍 Dirección: <span>${order.direccion}</span></div>`+
      `<div class="modal-info-row">💰 Pago: <span>${order.pago}</span></div>`
    :`<div class="modal-info-row">🏠 Tipo: <span>Recoger en local</span></div>`)+
    `<div class="modal-info-row">🧾 Total: <span>$${order.total.toLocaleString('es-CO')}</span></div>`;
  document.getElementById('modal-title').innerText='¡Pedido en camino!';
  document.getElementById('timersRow').style.display='flex';
  document.getElementById('entregadoMsg').style.display='none';
  document.getElementById('entregadoSub').style.display='none';
  updateCancelBar(order);
  refreshTimerDisplay();
}

function updateCancelBar(order){
  const bar=document.getElementById('cancelBar');
  if(!order.cancelBefore){bar.style.display='none';return;}
  const secsLeft=Math.floor((order.cancelBefore-Date.now())/1000);
  if(secsLeft<=0){bar.style.display='none';return;}
  bar.style.display='flex';
  document.getElementById('cancelCountdown').innerText=fmt(secsLeft);
}

function cancelOrder(){
  if(!activeOrderId)return;
  if(!confirm('¿Seguro que deseas cancelar este pedido?'))return;
  const orders=getOrders();
  const idx=orders.findIndex(o=>o.id===activeOrderId);
  if(idx===-1)return;
  orders[idx].estado='cancelado';
  orders[idx].canceladoAt=Date.now();
  saveOrders(orders);
  clearInterval(timerInterval);timerInterval=null;
  document.getElementById('cancelBar').style.display='none';
  document.getElementById('timersRow').style.display='none';
  document.getElementById('modal-title').innerText='Pedido cancelado';
  document.getElementById('modal-info').innerHTML='<div style="text-align:center;padding:16px 0;color:#c0392b;font-size:15px">❌ Tu pedido ha sido cancelado exitosamente.</div>';
  document.getElementById('entregadoMsg').style.display='none';
  document.getElementById('entregadoSub').style.display='none';
  document.getElementById('fab-pedido').classList.remove('visible');
  activeOrderId=null;
}

function refreshTimerDisplay(){
  if(!activeOrderId)return;
  const orders=getOrders();
  const order=orders.find(o=>o.id===activeOrderId);
  if(!order)return;
  const{elapsed,left}=getSecsFromOrder(order);
  document.getElementById('numC').innerText=fmt(left);
  document.getElementById('numE').innerText=fmt(elapsed);
  document.getElementById('fabTimer').innerText=fmt(left);
  document.getElementById('circC').style.strokeDashoffset=CIRC*(1-left/DELIVERY_SECS);
  document.getElementById('circE').style.strokeDashoffset=CIRC*(1-elapsed/DELIVERY_SECS);
}

function showEntregado(){
  if(activeOrderId){
    const orders=getOrders();
    const idx=orders.findIndex(o=>o.id===activeOrderId);
    if(idx!==-1){orders[idx].estado='entregado';saveOrders(orders);}
  }
  document.getElementById('timersRow').style.display='none';
  document.getElementById('cancelBar').style.display='none';
  document.getElementById('modal-title').innerText='';
  document.getElementById('entregadoMsg').style.display='block';
  document.getElementById('entregadoSub').style.display='block';
  document.getElementById('fab-pedido').classList.remove('visible');
  activeOrderId=null;
}
function closeDeliveryModal(){hide('deliveryModal')}

// ── ADMIN: Tabs ──
function switchAdminTab(tab,btn){
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.admin-view').forEach(v=>v.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('admin-view-'+tab).classList.add('active');
  if(tab==='usuarios')renderAdminUsers();
  if(tab==='pedidos')renderAdminOrders();
  if(tab==='productos')renderAdminList();
  if(tab==='mesas')renderAdminMesas();
}

// ── ADMIN: Productos ──
function renderAdminList(){
  const products=getProducts();
  const list=document.getElementById('adminProductList');
  if(!products.length){list.innerHTML='<div class="empty-state"><div class="es-icon">🍽️</div><p>No hay productos.</p></div>';return}
  list.innerHTML=products.map(p=>`
    <div class="admin-product-item" style="${p.agotado?'opacity:.75;border-left:3px solid #c0392b':p.disponible?'border-left:3px solid #16a34a':''}">
      <img class="admin-product-img" src="${p.img||'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&q=60'}" alt="${p.name}"
        onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=320&q=60'" style="${p.agotado?'filter:grayscale(.5)':''}">
      <div class="admin-product-info">
        <div class="admin-product-name">${p.name}${p.agotado?'<span class="badge-agotado">🚫 Agotado</span>':p.disponible?'<span class="badge-disponible">✅ Disponible</span>':''}</div>
        <div class="admin-product-cat">${p.category}${p.badge?' · '+p.badge:''}</div>
        <div class="admin-product-price">$ ${p.price.toLocaleString('es-CO')}</div>
      </div>
      <div class="admin-product-actions">
        <button class="btn-edit-p" onclick="openEditModal(${p.id})">✏️ Editar</button>
        <button class="btn-del-p" onclick="deleteProduct(${p.id})">🗑️ Eliminar</button>
      </div>
    </div>`).join('');
}
function addProduct(){
  const name=document.getElementById('np-name').value.trim();
  const cat=document.getElementById('np-cat').value;
  const price=parseInt(document.getElementById('np-price').value)||0;
  const img=document.getElementById('np-img').value.trim();
  const desc=document.getElementById('np-desc').value.trim();
  const badge=document.getElementById('np-badge').value.trim();
  const amsg=document.getElementById('admin-msg');
  if(!name||!cat||!price||!desc){amsg.style.color='#dc2626';amsg.innerText='Completa nombre, categoría, precio y descripción.';return}
  const products=getProducts();
  const newId=products.length?Math.max(...products.map(p=>p.id))+1:1;
  products.push({id:newId,name,category:cat,price,img,badge:badge||null,desc});
  saveProducts(products);
  ['np-name','np-price','np-img','np-desc','np-badge'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('np-cat').selectedIndex=0;
  amsg.style.color='#27ae60';amsg.innerText='✓ Producto agregado.';
  setTimeout(()=>{amsg.innerText=''},2500);
  renderAdminList();
}
function deleteProduct(id){
  if(!confirm('¿Eliminar este producto?'))return;
  saveProducts(getProducts().filter(p=>p.id!==id));
  renderAdminList();
}
function openEditModal(id){
  const p=getProducts().find(p=>p.id===id);if(!p)return;
  document.getElementById('edit-id').value=p.id;
  document.getElementById('edit-name').value=p.name;
  document.getElementById('edit-cat').value=p.category;
  document.getElementById('edit-price').value=p.price;
  document.getElementById('edit-img').value=p.img||'';
  document.getElementById('edit-desc').value=p.desc;
  document.getElementById('edit-badge').value=p.badge||'';
  document.getElementById('edit-agotado').checked=!!p.agotado;
  document.getElementById('edit-disponible').checked=!!p.disponible && !p.agotado;
  show('editModal');
}
function closeEditModal(){hide('editModal')}
function saveEdit(){
  const id=parseInt(document.getElementById('edit-id').value);
  const name=document.getElementById('edit-name').value.trim();
  const cat=document.getElementById('edit-cat').value;
  const price=parseInt(document.getElementById('edit-price').value)||0;
  const img=document.getElementById('edit-img').value.trim();
  const desc=document.getElementById('edit-desc').value.trim();
  const badge=document.getElementById('edit-badge').value.trim();
  const agotado=document.getElementById('edit-agotado').checked;
  const disponible=document.getElementById('edit-disponible').checked;
  if(!name||!cat||!price||!desc)return;
  const products=getProducts();
  const idx=products.findIndex(p=>p.id===id);if(idx===-1)return;
  // Si se marca disponible, quitar agotado; si se marca agotado, quitar disponible
  const finalAgotado = agotado && !disponible;
  const finalDisponible = disponible && !agotado;
  products[idx]={id,name,category:cat,price,img,badge:badge||null,desc,agotado:finalAgotado,disponible:finalDisponible};
  saveProducts(products);closeEditModal();renderAdminList();
}

// ── ADMIN: Usuarios ──
function renderAdminUsers(){
  const allUsers=getLS('lmUsers',[]);
  const orders=getOrders();
  // Stats
  const totalPedidos=orders.length;
  const stats=document.getElementById('adminStatsRow');
  stats.innerHTML=`
    <div class="stat-card">
      <div class="stat-num">${allUsers.length}</div>
      <div class="stat-lbl">Usuarios</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${totalPedidos}</div>
      <div class="stat-lbl">Pedidos</div>
    </div>
    <div class="stat-card">
      <div class="stat-num">${orders.filter(o=>o.estado==='en-camino').length}</div>
      <div class="stat-lbl">En camino</div>
    </div>`;
  // Lista usuarios
  const list=document.getElementById('adminUserList');
  if(!allUsers.length){
    list.innerHTML='<div class="empty-state"><div class="es-icon">👥</div><p>No hay usuarios registrados aún.</p></div>';
    return;
  }
  list.innerHTML=allUsers.map(u=>{
    const userOrders=orders.filter(o=>o.user===u.user);
    const activeOrder=userOrders.find(o=>o.estado==='en-camino');
    return `<div class="user-card">
      <div class="user-avatar">${u.user[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">@${u.user}</div>
        <div class="user-meta">
          ${userOrders.length} pedido${userOrders.length!==1?'s':''}
          ${u.createdAt?` · Se unió hace ${timeAgo(u.createdAt)}`:''}
        </div>
      </div>
      ${activeOrder?'<span class="user-badge">🟢 Pedido activo</span>':''}
    </div>`;
  }).join('');
}

// ── ADMIN: Mesas y Reservas ──
const MESAS_INFO=[
  {n:1,nombre:'Mesa 1',ubicacion:'Ventana'},
  {n:2,nombre:'Mesa 2',ubicacion:'Centro'},
  {n:3,nombre:'Mesa 3',ubicacion:'Terraza'},
  {n:4,nombre:'Mesa 4',ubicacion:'Fondo'},
];
function renderAdminMesas(){
  const state=getMesasState();
  const reservas=getReservas();
  const grid=document.getElementById('adminMesasGrid');
  grid.innerHTML=MESAS_INFO.map(m=>{
    const ms=state['mesa-'+m.n]||{estado:'disponible'};
    const isReservada=ms.estado==='reservada';
    const res=reservas.find(r=>r.mesa===m.n&&r.activa);
    let info='';
    if(isReservada&&res){
      info=`<div class="admin-mesa-info">👤 ${res.nombre}<br>📱 ${res.celular}<br>⏰ ${res.hora}<br>👥 ${res.personas} persona(s)</div>`;
    }
    return `<div class="admin-mesa-card ${isReservada?'reservada':'disponible'}">
      <div class="admin-mesa-name">🪑 ${m.nombre}</div>
      <div style="font-size:11px;color:#888;margin-bottom:4px">${m.ubicacion}</div>
      ${info}
      <div style="font-size:12px;font-weight:700;color:${isReservada?'#c0392b':'#16a34a'};margin-bottom:6px">${isReservada?'🔴 Reservada':'🟢 Disponible'}</div>
      ${isReservada
        ?`<button class="btn-mesa-accion btn-liberar-mesa" onclick="adminLiberarMesa(${m.n})">✅ Marcar disponible</button>`
        :`<button class="btn-mesa-accion btn-reservar-mesa" onclick="adminReservarMesa(${m.n})">🔴 Marcar reservada</button>`
      }
    </div>`;
  }).join('');

  // Lista reservas
  const lista=document.getElementById('adminReservasList');
  const activas=reservas.filter(r=>r.activa);
  if(!activas.length){
    lista.innerHTML='<div class="empty-state"><div class="es-icon">📅</div><p>No hay reservas activas.</p></div>';
    return;
  }
  lista.innerHTML=activas.map(r=>`
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-user">👤 ${r.nombre}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Reservado hace ${timeAgo(r.timestamp)}</div>
        </div>
        <span class="order-status en-camino">📅 Reserva</span>
      </div>
      <div class="order-details">
        <div class="order-row"><strong>Mesa:</strong> 🪑 Mesa ${r.mesa}</div>
        <div class="order-row"><strong>Celular:</strong> ${r.celular}</div>
        <div class="order-row"><strong>Hora llegada:</strong> ⏰ ${r.hora}</div>
        <div class="order-row"><strong>Personas:</strong> 👥 ${r.personas}</div>
        <div class="order-row"><strong>Pago:</strong> ${r.pago}</div>
      </div>
      <button class="btn-mesa-accion btn-liberar-mesa" style="margin-top:8px" onclick="adminCancelarReserva(${r.id})">✕ Cancelar reserva</button>
    </div>
  `).join('');
}
function adminReservarMesa(n){
  const hora=prompt(`Marcar Mesa ${n} como reservada.\nIngresa la hora de llegada (ej: 19:30):`);
  if(hora===null)return;
  const personas=prompt('¿Cuántas personas?');
  if(personas===null)return;
  const state=getMesasState();
  state['mesa-'+n]={estado:'reservada',hora,personas};
  saveMesasState(state);
  renderAdminMesas();
}
function adminLiberarMesa(n){
  if(!confirm(`¿Marcar Mesa ${n} como disponible?`))return;
  const state=getMesasState();
  state['mesa-'+n]={estado:'disponible'};
  saveMesasState(state);
  // También desactivar reserva asociada
  const reservas=getReservas();
  reservas.forEach(r=>{if(r.mesa===n&&r.activa)r.activa=false;});
  saveReservas(reservas);
  renderAdminMesas();
}
function adminCancelarReserva(id){
  if(!confirm('¿Cancelar esta reserva?'))return;
  const reservas=getReservas();
  const idx=reservas.findIndex(r=>r.id===id);
  if(idx!==-1){
    const mesa=reservas[idx].mesa;
    reservas[idx].activa=false;
    saveReservas(reservas);
    const state=getMesasState();
    state['mesa-'+mesa]={estado:'disponible'};
    saveMesasState(state);
  }
  renderAdminMesas();
}

// ── ADMIN: Pedidos (tiempo real desde timestamp) ──
let adminTimerInterval=null;
function startAdminTimerInterval(){
  if(adminTimerInterval)clearInterval(adminTimerInterval);
  adminTimerInterval=setInterval(()=>{
    if(!isAdmin)return;
    // Solo actualizar si la pestaña pedidos está activa — actualizar chips de tiempo en vivo
    const activeTab=document.querySelector('.admin-tab.active');
    if(activeTab&&activeTab.textContent.includes('Pedidos')){
      updateAdminOrderTimers();
    }
  },1000);
}

function updateAdminOrderTimers(){
  // Actualiza solo los chips de tiempo sin re-renderizar toda la lista
  const orders=getOrders();
  orders.forEach(o=>{
    if(o.estado!=='en-camino')return;
    const{elapsed,left}=getSecsFromOrder(o);
    const elEl=document.getElementById('oc-elapsed-'+o.id);
    const leEl=document.getElementById('oc-left-'+o.id);
    if(elEl)elEl.innerText='⏱ Transcurrido: '+fmt(elapsed);
    if(leEl)leEl.innerText='⏳ Restante: '+fmt(left);
    // marcar entregado si ya pasó
    if(left<=0){
      const idx=orders.findIndex(x=>x.id===o.id);
      if(idx!==-1&&orders[idx].estado==='en-camino'){
        orders[idx].estado='entregado';saveOrders(orders);renderAdminOrders();}
    }
  });
}

function renderAdminOrders(){
  const orders=getOrders();
  const list=document.getElementById('adminOrdersList');
  if(!orders.length){
    list.innerHTML='<div class="empty-state"><div class="es-icon">📦</div><p>No hay pedidos registrados todavía.<br>Cuando un usuario haga un pedido,<br>aparecerá aquí.</p></div>';
    return;
  }
  list.innerHTML=orders.map(o=>{
    const{elapsed,left}=getSecsFromOrder(o);
    const hace=timeAgo(o.timestamp);
    let statusLabel='';
    if(o.estado==='en-camino')statusLabel='🛵 En camino';
    else if(o.estado==='entregado')statusLabel='✅ Entregado';
    else if(o.estado==='cancelado')statusLabel='❌ Cancelado';
    return `<div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-user">👤 @${o.user}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Hace ${hace}</div>
        </div>
        <span class="order-status ${o.estado}">${statusLabel}</span>
      </div>
      ${o.estado==='cancelado'?`<div style="background:#fee2e2;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:13px;color:#c0392b;font-weight:600">❌ El usuario <strong>@${o.user}</strong> canceló este pedido${o.canceladoAt?' hace '+timeAgo(o.canceladoAt):''}.</div>`:''}
      <div class="order-details">
        <div class="order-row"><strong>Tipo:</strong> ${o.tipo==='domicilio'?'🛵 Domicilio':'🏠 Recoger'}</div>
        ${o.tipo==='domicilio'?`
        <div class="order-row"><strong>Cliente:</strong> ${o.nombre}</div>
        <div class="order-row"><strong>Celular:</strong> ${o.celular}</div>
        <div class="order-row"><strong>Dirección:</strong> ${o.direccion}</div>
        <div class="order-row"><strong>Pago:</strong> ${o.pago}</div>`:`
        <div class="order-row"><strong>Cliente:</strong> ${o.nombre||o.user}</div>
        ${o.celular?`<div class="order-row"><strong>Celular:</strong> ${o.celular}</div>`:''}
        ${o.mesa?`<div class="order-row"><strong>Mesa:</strong> 🪑 ${o.mesa}</div>`:''}
        <div class="order-row"><strong>Pago:</strong> ${o.pago||'—'}</div>`}
      </div>
      <div style="font-size:12px;color:var(--muted);font-weight:700;margin-bottom:6px;letter-spacing:.5px">PLATOS PEDIDOS</div>
      <div class="order-items">
        ${o.items.map(i=>`<span class="order-item-tag">🍽️ ${i.name}</span>`).join('')}
      </div>
      ${o.estado==='en-camino'?`
      <div class="order-time-bar">
        <span class="order-timer-chip chip-elapsed" id="oc-elapsed-${o.id}">⏱ Transcurrido: ${fmt(elapsed)}</span>
        <span class="order-timer-chip chip-countdown" id="oc-left-${o.id}">⏳ Restante: ${fmt(left)}</span>
      </div>`:''}
      <div class="order-total">Total: $${o.total.toLocaleString('es-CO')}</div>
    </div>`;
  }).join('');
}

// ── FACTURA ELECTRÓNICA ──
function openInvoice(orderId){
  const orders=getOrders();
  const o=orders.find(x=>x.id===orderId);
  if(!o)return;
  const fecha=new Date(o.timestamp).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'});
  const numFactura='FM-'+String(o.id).slice(-8).toUpperCase();
  document.getElementById('invoice-num').innerText='N° '+numFactura;
  let statusClass=o.estado;
  let statusText=o.estado==='en-camino'?'🛵 En camino':o.estado==='entregado'?'✅ Entregado':'❌ Cancelado';
  const itemsRows=o.items.map(i=>`<tr><td>${i.name}</td><td>$ ${i.price.toLocaleString('es-CO')}</td></tr>`).join('');
  document.getElementById('invoice-body').innerHTML=`
    <div class="invoice-section">Datos del pedido</div>
    <div class="invoice-row"><span>Número de factura</span><strong>${numFactura}</strong></div>
    <div class="invoice-row"><span>Fecha</span><strong>${fecha}</strong></div>
    <div class="invoice-row"><span>Cliente</span><strong>@${o.user}</strong></div>
    <div class="invoice-row"><span>Estado</span><span class="invoice-status-badge ${statusClass}">${statusText}</span></div>
    ${o.tipo==='domicilio'?`
    <div class="invoice-section">Entrega</div>
    <div class="invoice-row"><span>Nombre</span><strong>${o.nombre}</strong></div>
    <div class="invoice-row"><span>Celular</span><strong>${o.celular}</strong></div>
    <div class="invoice-row"><span>Dirección</span><strong>${o.direccion}</strong></div>
    <div class="invoice-row"><span>Pago</span><strong>${o.pago}</strong></div>`
    :`<div class="invoice-section">Entrega</div>
    <div class="invoice-row"><span>Tipo</span><strong>🏠 Recoger en local</strong></div>
    <div class="invoice-row"><span>Cliente</span><strong>${o.nombre||o.user}</strong></div>
    ${o.celular?`<div class="invoice-row"><span>Celular</span><strong>${o.celular}</strong></div>`:''}
    ${o.mesa?`<div class="invoice-row"><span>Mesa</span><strong>🪑 ${o.mesa}</strong></div>`:''}
    <div class="invoice-row"><span>Pago</span><strong>${o.pago||'—'}</strong></div>`}
    <div class="invoice-section">Detalle de platos</div>
    <table class="invoice-items-table">
      <thead><tr><th>Plato</th><th>Valor</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div class="invoice-total-row">
      <span class="invoice-total-lbl">Total</span>
      <span class="invoice-total-val">$ ${o.total.toLocaleString('es-CO')}</span>
    </div>`;
  document.getElementById('invoiceModal').classList.add('active');
}
function closeInvoice(){document.getElementById('invoiceModal').classList.remove('active')}

// ── MIS PEDIDOS ──
function openMisPedidos(){
  const orders=getOrders().filter(o=>o.user===currentUser);
  const body=document.getElementById('misPedidosBody');
  if(!orders.length){
    body.innerHTML='<div class="empty-state"><div class="es-icon">🧾</div><p>Aún no tienes pedidos.<br>¡Haz tu primer pedido!</p></div>';
  } else {
    body.innerHTML=orders.map(o=>{
      const fecha=new Date(o.timestamp).toLocaleString('es-CO',{dateStyle:'short',timeStyle:'short'});
      let statusClass=o.estado;
      let statusText=o.estado==='en-camino'?'🛵 En camino':o.estado==='entregado'?'✅ Entregado':'❌ Cancelado';
      const platos=o.items.map(i=>i.name).join(', ');
      return `<div class="mis-pedido-card">
        <div class="mis-pedido-top">
          <span class="mis-pedido-fecha">${fecha}</span>
          <span class="invoice-status-badge ${statusClass}">${statusText}</span>
        </div>
        <div style="font-size:13px;color:#555;margin-bottom:8px">${platos}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="mis-pedido-total">$ ${o.total.toLocaleString('es-CO')}</span>
          <button class="btn-ver-factura" onclick="closeMisPedidos();openInvoice(${o.id})">🧾 Ver factura</button>
        </div>
      </div>`;
    }).join('');
  }
  document.getElementById('misPedidosModal').classList.add('active');
}
function closeMisPedidos(){document.getElementById('misPedidosModal').classList.remove('active')}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeEditModal();closeDeliveryModal();closeRecuperar();closePerfil();
    closeInvoice();closeMisPedidos();
  }
});

// ── LED TICKER (pure rAF scroll — no CSS animation) ──
(function(){
  const msg = 'BIENVENIDOS A LA MAISON';
  const sep = ' ✦ ';
  const unit = msg + sep;
  // Repeat enough times so content is always wider than screen
  const content = unit.repeat(8);

  const track = document.getElementById('ledTrack');
  if(!track) return;

  let html = '';
  for(const ch of content){
    if(ch === ' '){
      html += '<span class="led-char" style="color:transparent;text-shadow:none">&nbsp;</span>';
    } else if(ch === '✦'){
      html += `<span class="led-sep">✦</span>`;
    } else {
      html += `<span class="led-char">${ch}</span>`;
    }
  }
  // Duplicate the whole thing so loop is seamless
  track.innerHTML = html + html;

  let offset = 0;
  let loopW = 0;
  const SPEED = 1.2;

  function step(){
    offset += SPEED;
    // loopW = width of first half; reset seamlessly when we've scrolled exactly one copy
    if(loopW > 0 && offset >= loopW) offset -= loopW;
    track.style.transform = `translateX(${-offset}px)`;
    requestAnimationFrame(step);
  }

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      // scrollWidth is 2× the unit; we loop every 1×
      loopW = track.scrollWidth / 2;
      step();
    });
  });
})();
