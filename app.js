/* ================= SOZLAMALAR ================= */
// Backend (aiogram + aiohttp/FastAPI) manzili. Bo'sh bo'lsa demo rejim ishlaydi.
const API_BASE = "https://sheyxshop.netlify.app";            // masalan: "https://sizning-domen.uz"
const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
tg?.setBackgroundColor?.("#051F20"); tg?.setHeaderColor?.("#051F20");

/* ================= HOLAT ================= */
const S = {
  user: tg?.initDataUnsafe?.user || { id: 0, first_name: "Mehmon" },
  balance: 0,
  prices: [],
  card: { number: "8600 0000 0000 0000", owner: "SHEYX" },
  adBlock: "", adReward: 0.01, adsEntry: false,
  orders: [],
  selUC: null,
};
const DEMO_PRICES = [
  { uc: 60, price: 12000 }, { uc: 325, price: 58000 }, { uc: 660, price: 115000 },
  { uc: 1800, price: 290000 }, { uc: 3850, price: 575000 }, { uc: 8100, price: 1150000 },
];

/* ================= YORDAMCHILAR ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
const sum = n => fmt(n) + " so‘m";
function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2200);
}
async function api(path, method = "GET", body) {
  if (!API_BASE) throw new Error("demo");
  const r = await fetch(API_BASE + path, {
    method,
    headers: { ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }), "X-Init-Data": tg?.initData || "" },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "Xatolik");
  return r.json();
}

/* ================= NAVIGATSIYA ================= */
function go(name) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === "p-" + name));
  $$(".nav button").forEach(b => b.classList.toggle("on", b.dataset.go === name));
  window.scrollTo(0, 0);
  tg?.HapticFeedback?.selectionChanged?.();
  if (name === "orders") loadOrders();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go);
});

/* ================= RENDER ================= */
function renderBalance() {
  $("#balPill").textContent = sum(S.balance);
  $("#balBig").textContent = sum(S.balance);
}
function renderHome() {
  const items = [
    ["◈", "UC narxlari", "PUBG Mobile UC sotib olish", "uc"],
    ["＋", "Hisobni to‘ldirish", "Karta orqali to‘lov", "topup"],
    ["☰", "Buyurtmalarim", "Holat va tarix", "orders"],
    ["▶", "Reklama ko‘rish", "Bonus oling", "ads"],
    ["☺", "Profil", "Ma’lumotlaringiz", "profile"],
  ];
  $("#homeMenu").innerHTML = items.map(([i, t, s, g]) =>
    `<button class="row" data-go="${g}"><i>${i}</i><span>${t}<small>${s}</small></span><em>›</em></button>`).join("");
}
function renderPrices() {
  $("#ucList").innerHTML = S.prices.map(p =>
    `<button class="row" data-uc="${p.uc}"><i>UC</i><span>${fmt(p.uc)} UC</span><b class="price">${sum(p.price)}</b></button>`).join("");
}
function renderOrders() {
  const names = { pending: "Kutilmoqda", done: "Bajarildi", rejected: "Rad etildi" };
  $("#orderList").innerHTML = S.orders.length ? S.orders.map(o =>
    `<div class="row"><i>${o.type === "topup" ? "＋" : "UC"}</i>
     <span>${o.type === "topup" ? "To‘ldirish" : fmt(o.uc) + " UC"}<small>${o.date || ""}${o.pubg_id ? " · ID " + o.pubg_id : ""}</small></span>
     <div style="text-align:right"><b class="price">${o.amount ? sum(o.amount) : "Tekshirilmoqda"}</b><br><span class="tag ${o.status}">${names[o.status] || o.status}</span></div></div>`).join("")
    : `<div class="empty">Hozircha buyurtmalar yo‘q</div>`;
}
function renderProfile() {
  const u = S.user;
  $("#profileCard").innerHTML = `<small>Ism</small><b>${u.first_name || ""} ${u.last_name || ""}</b>
    <small style="margin-top:10px">Username</small><b>${u.username ? "@" + u.username : "—"}</b>
    <small style="margin-top:10px">Telegram ID</small><b>${u.id}</b>`;
}

/* ================= MA'LUMOT YUKLASH ================= */
async function init() {
  renderHome(); renderProfile();
  try {
    const c = await api("/api/config");
    S.prices = c.prices; S.card = c.card; S.adBlock = c.adsgram_block_id || ""; S.balance = c.balance || 0;
    S.adReward = c.ad_reward ?? 0.01; S.adsEntry = !!c.ads_entry;
  } catch { S.prices = DEMO_PRICES; }
  $("#cardNum").textContent = S.card.number;
  $("#cardOwner").textContent = S.card.owner;
  renderBalance(); renderPrices();
  $("#adInfo").textContent = S.adBlock
    ? "Qisqa reklamani oxirigacha ko‘ring: har bir reklama uchun hisobingizga +" + fmt(S.adReward) + " so‘m qo‘shiladi. Limit yo‘q, reklama ixtiyoriy."
    : "Reklama hozircha mavjud emas.";
  // Mini appga kirganda 1 marta (eng katta admin yoqib qo'ygan bo'lsa). Foydalanuvchi yopib davom etishi mumkin.
  if (S.adsEntry && tg?.initData) showAd().then(done => done && refreshBalance());
}
async function loadOrders() {
  try { S.orders = (await api("/api/orders")).orders; }
  catch { /* demo: mavjud ro'yxat qoladi */ }
  renderOrders();
}

/* ================= UC SOTIB OLISH ================= */
const sheet = $("#sheet"), bg = $("#sheetBg");
const openSheet = () => { sheet.classList.add("show"); bg.classList.add("show"); };
const closeSheet = () => { sheet.classList.remove("show"); bg.classList.remove("show"); };
bg.onclick = closeSheet;

$("#ucList").addEventListener("click", e => {
  const b = e.target.closest("[data-uc]"); if (!b) return;
  S.selUC = S.prices.find(p => p.uc == b.dataset.uc);
  $("#shTitle").textContent = fmt(S.selUC.uc) + " UC";
  $("#shInfo").textContent = "Narxi: " + sum(S.selUC.price) + ". Summa hisobingizdan yechiladi, buyurtmani admin tasdiqlaydi.";
  openSheet();
});
$("#buyBtn").onclick = async () => {
  const id = $("#pubgId").value.trim();
  if (id.length < 8) return toast("PUBG ID noto‘g‘ri");
  if (S.balance < S.selUC.price) { closeSheet(); toast("Hisobda mablag‘ yetarli emas"); return go("topup"); }
  const btn = $("#buyBtn"); btn.disabled = true;
  try {
    const r = await api("/api/order", "POST", { pubg_id: id, uc: S.selUC.uc });
    S.balance = r.balance;
  } catch (err) {
    if (err.message !== "demo") { btn.disabled = false; return toast(err.message); }
    S.balance -= S.selUC.price;
    S.orders.unshift({ type: "uc", uc: S.selUC.uc, amount: S.selUC.price, pubg_id: id, status: "pending", date: new Date().toLocaleDateString() });
  }
  btn.disabled = false; closeSheet(); renderBalance();
  toast("Buyurtma yuborildi. Admin tasdiqlashini kuting"); go("orders");
};

/* ================= TO'LDIRISH ================= */
$("#cardNum").onclick = () => {
  navigator.clipboard?.writeText(S.card.number.replace(/\s/g, "")); toast("Karta raqami nusxalandi");
};
const rc = $("#receipt");
rc.onchange = () => {
  const f = rc.files[0], prev = $("#upPrev");
  $("#upBox").classList.toggle("has", !!f);
  prev.hidden = true;
  if (!f) return $("#upText").textContent = "Chekni yuklash uchun bosing";
  $("#upText").textContent = f.name;
  if (f.type.startsWith("image/")) { prev.src = URL.createObjectURL(f); prev.hidden = false; }
};
$("#topBtn").onclick = async () => {
  const f = rc.files[0];
  if (!f) return toast("To‘lov chekini yuklang");
  if (f.size > 10 * 1024 * 1024) return toast("Fayl 10 MB dan oshmasligi kerak");
  const fd = new FormData(); fd.append("receipt", f);
  const btn = $("#topBtn"); btn.disabled = true;
  // Chek yuborilganda reklama ko'rsatiladi (ixtiyoriy: yopilsa ham chek yuboriladi)
  if (S.adBlock && tg?.initData) { const done = await showAd(); if (done) refreshBalance(); }
  try { await api("/api/topup", "POST", fd); }
  catch (err) {
    if (err.message !== "demo") { btn.disabled = false; return toast(err.message); }
    S.orders.unshift({ type: "topup", amount: 0, status: "pending", date: new Date().toLocaleDateString() });
  }
  btn.disabled = false; rc.value = ""; rc.onchange();
  toast("Chek yuborildi. Admin tekshiradi"); go("orders");
};

/* ================= REKLAMA (Adsgram) ================= */
// Pul serverda AdsGram "Reward URL" orqali qo'shiladi (+0.01 so'm), shuning uchun balansni biroz kutib yangilaymiz.
async function showAd() {
  if (!S.adBlock || !window.Adsgram) return false;
  try { const res = await window.Adsgram.init({ blockId: S.adBlock }).show(); return !!res?.done; }
  catch { return false; }
}
function refreshBalance() {
  [2500, 7000].forEach(ms => setTimeout(async () => {
    try { const r = await api("/api/ad-reward", "POST", {}); S.balance = r.balance; renderBalance(); } catch {}
  }, ms));
}
$("#adBtn").onclick = async () => {
  if (!S.adBlock || !window.Adsgram) return toast("Reklama hozircha mavjud emas");
  const btn = $("#adBtn"); btn.disabled = true;
  const done = await showAd();
  btn.disabled = false;
  if (done) { toast("Bonus hisobingizga qo‘shilmoqda..."); refreshBalance(); }
  else toast("Reklama tugallanmadi");
};

init();
