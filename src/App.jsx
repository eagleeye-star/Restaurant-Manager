import { useState, useEffect, useMemo, useCallback } from "react";

const STORAGE_KEY = "restaurantMgr_v2";
const LICENSE_KEY = "restaurantMgr_v2_license";
const TRIAL_DAYS = 14;
const VALID_KEYS = ["RESTO-DEMO-TRIAL-0001", "RESTO-AIFARMS-VIP-002"];

function daysLeft(expiry) { if (!expiry) return 0; return Math.max(0, Math.ceil((new Date(expiry) - new Date()) / 86400000)); }
function isExpired(expiry) { if (!expiry) return true; return new Date(expiry) < new Date(); }
function loadLicense() { try { const r = localStorage.getItem(LICENSE_KEY); if (r) return JSON.parse(r); } catch (_) {} return null; }
function saveLicense(lic) { try { localStorage.setItem(LICENSE_KEY, JSON.stringify(lic)); } catch (_) {} }

const C = {
  bg:"#0f1117", card:"#1a1d27", surface:"#252836", border:"#2a2d3a",
  accent:"#f59e0b", green:"#22c55e", red:"#ef4444", blue:"#3b82f6",
  purple:"#a855f7", text:"#f1f5f9", muted:"#94a3b8",
};

const MENU_CATEGORIES = ["Starters","Mains","Grills","Rice & Sides","Drinks","Desserts"];

// ── Tab access rules ───────────────────────────────────────────────────────
// Each tab lists which roles can access it WITHOUT a PIN prompt.
// Any role not in the list must enter their PIN to access that tab.
// "Owner" and "Manager" can access everything without PIN.
const TAB_ACCESS = {
  tables:       ["Owner","Manager","Waiter","Cashier"],
  orders:       ["Owner","Manager","Waiter"],
  kitchen:      ["Owner","Manager","Chef"],
  menu:         ["Owner","Manager"],
  reservations: ["Owner","Manager","Waiter"],
  inventory:    ["Owner","Manager","Chef"],
  reports:      ["Owner","Manager"],
  staff:        ["Owner","Manager"],
};

const seedMenu = [
  { id:"m1",  name:"Spring Rolls (4pcs)",    category:"Starters",     price:25,  costPrice:10, available:true,  emoji:"🥟" },
  { id:"m2",  name:"Pepper Soup",            category:"Starters",     price:35,  costPrice:14, available:true,  emoji:"🍲" },
  { id:"m3",  name:"Grilled Tilapia",        category:"Mains",        price:120, costPrice:55, available:true,  emoji:"🐟" },
  { id:"m4",  name:"Jollof Rice + Chicken",  category:"Mains",        price:80,  costPrice:35, available:true,  emoji:"🍛" },
  { id:"m5",  name:"Fried Rice + Beef",      category:"Mains",        price:75,  costPrice:30, available:true,  emoji:"🍚" },
  { id:"m6",  name:"Grilled Chicken",        category:"Grills",       price:110, costPrice:50, available:true,  emoji:"🍗" },
  { id:"m7",  name:"Suya Platter",           category:"Grills",       price:95,  costPrice:40, available:true,  emoji:"🥩" },
  { id:"m8",  name:"Plain Rice",             category:"Rice & Sides", price:20,  costPrice:8,  available:true,  emoji:"🍚" },
  { id:"m9",  name:"Plantain (Fried)",       category:"Rice & Sides", price:20,  costPrice:7,  available:true,  emoji:"🍌" },
  { id:"m10", name:"Malt Drink",             category:"Drinks",       price:12,  costPrice:7,  available:true,  emoji:"🥤" },
  { id:"m11", name:"Coca-Cola",              category:"Drinks",       price:10,  costPrice:6,  available:true,  emoji:"🥫" },
  { id:"m12", name:"Water (500ml)",          category:"Drinks",       price:5,   costPrice:2,  available:true,  emoji:"💧" },
  { id:"m13", name:"Fanta",                  category:"Drinks",       price:10,  costPrice:6,  available:true,  emoji:"🍊" },
  { id:"m14", name:"Puff Puff",              category:"Desserts",     price:15,  costPrice:5,  available:true,  emoji:"🍩" },
  { id:"m15", name:"Ice Cream",              category:"Desserts",     price:25,  costPrice:10, available:true,  emoji:"🍦" },
];

const seedTables = [
  { id:"t1",  number:1,  capacity:2, status:"available", section:"Indoor"  },
  { id:"t2",  number:2,  capacity:2, status:"available", section:"Indoor"  },
  { id:"t3",  number:3,  capacity:4, status:"available", section:"Indoor"  },
  { id:"t4",  number:4,  capacity:4, status:"available", section:"Indoor"  },
  { id:"t5",  number:5,  capacity:6, status:"available", section:"Indoor"  },
  { id:"t6",  number:6,  capacity:6, status:"available", section:"Outdoor" },
  { id:"t7",  number:7,  capacity:8, status:"available", section:"Outdoor" },
  { id:"t8",  number:8,  capacity:4, status:"available", section:"Outdoor" },
  { id:"t9",  number:9,  capacity:2, status:"available", section:"Bar"     },
  { id:"t10", number:10, capacity:4, status:"available", section:"Bar"     },
];

const seedIngredients = [
  { id:"i1", name:"Chicken (kg)",      unit:"kg",     qty:12, minQty:5,  costPerUnit:30  },
  { id:"i2", name:"Rice (kg)",         unit:"kg",     qty:25, minQty:10, costPerUnit:8   },
  { id:"i3", name:"Tomatoes (kg)",     unit:"kg",     qty:8,  minQty:5,  costPerUnit:12  },
  { id:"i4", name:"Tilapia (kg)",      unit:"kg",     qty:10, minQty:4,  costPerUnit:40  },
  { id:"i5", name:"Cooking Oil (L)",   unit:"L",      qty:6,  minQty:3,  costPerUnit:18  },
  { id:"i6", name:"Onions (kg)",       unit:"kg",     qty:5,  minQty:3,  costPerUnit:6   },
  { id:"i7", name:"Beef (kg)",         unit:"kg",     qty:8,  minQty:4,  costPerUnit:55  },
  { id:"i8", name:"Plantain (bunch)",  unit:"bunch",  qty:4,  minQty:2,  costPerUnit:15  },
];

const seedOrders = [];

const seedReservations = [];

const seedSales = [];

const seedStaff = [
  { id:"st1", name:"Admin",  role:"Owner",   roles:["Owner"],   pin:"1234", shift:"All Day" },
  { id:"st2", name:"Waiter", role:"Waiter",  roles:["Waiter"],  pin:"2222", shift:"Morning" },
  { id:"st3", name:"Chef",   role:"Chef",    roles:["Chef"],    pin:"3333", shift:"All Day" },
  { id:"st4", name:"Cashier",role:"Cashier", roles:["Cashier"], pin:"4444", shift:"Morning" },
];

function loadData() {
  try { const r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); } catch(_){}
  return { menu:seedMenu, tables:seedTables, ingredients:seedIngredients, orders:seedOrders, reservations:seedReservations, sales:seedSales, staff:seedStaff };
}

const uid   = () => Math.random().toString(36).slice(2,9);
const fmt   = n  => `GH₵ ${Number(n).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0,10);
const nowTime=() => new Date().toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"});

// ── Role colour ────────────────────────────────────────────────────────────
function roleColor(role){
  return role==="Owner"?"#f59e0b":role==="Manager"?"#a855f7":role==="Chef"?"#22c55e":role==="Cashier"?"#3b82f6":"#94a3b8";
}

// ── Tiny components ────────────────────────────────────────────────────────
const Bdg = ({bg,tc,children}) =>
  <span style={{background:bg,color:tc,borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{children}</span>;

function StatCard({label,value,color,icon}){
  return(
    <div style={{background:C.card,borderRadius:12,padding:"14px 18px",border:`1px solid ${C.border}`}}>
      <div style={{fontSize:18,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:color||C.accent}}>{value}</div>
    </div>
  );
}

function Modal({title,onClose,wide,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}} onClick={onClose}>
      <div style={{background:C.card,borderRadius:14,padding:"24px 26px",width:`min(96vw,${wide?"720px":"500px"})`,maxHeight:"90vh",overflowY:"auto",border:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.muted}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const iS={width:"100%",padding:"9px 11px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:14,boxSizing:"border-box",outline:"none",background:C.surface,color:C.text};
function Row({label,children}){ return <div style={{marginBottom:12}}><label style={{display:"block",fontSize:12,fontWeight:600,color:C.muted,marginBottom:4}}>{label}</label>{children}</div>; }

// ══════════════════════════════════════════════════════════════════════════
// PIN LOCK SCREEN — shown when a staff member tries to access a restricted tab
// ══════════════════════════════════════════════════════════════════════════
function PinLockScreen({ tabName, tabIcon, allowedRoles, staff, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    const found = staff.find(s => s.pin === pin);
    if (!found) {
      setErr("Wrong PIN. Try again.");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!allowedRoles.includes(found.role)) {
      setErr(`${found.name} (${found.role}) does not have access to this section.`);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
      return;
    }
    onSuccess(found);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,0.92)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:400,
    }}>
      <div style={{
        background:C.card, borderRadius:20, padding:"36px 40px",
        width:"min(92vw,420px)", border:`2px solid ${C.accent}44`,
        textAlign:"center",
        animation: shake ? "shake 0.4s ease" : "none",
      }}>
        {/* Icon */}
        <div style={{fontSize:48, marginBottom:12}}>{tabIcon}</div>

        {/* Tab name */}
        <div style={{fontSize:22, fontWeight:900, color:C.accent, marginBottom:6}}>{tabName}</div>
        <div style={{fontSize:13, color:C.muted, marginBottom:24}}>Enter your staff PIN to access this section</div>

        {/* Allowed roles badge */}
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
          {allowedRoles.map(r=>(
            <span key={r} style={{background:roleColor(r)+"22",color:roleColor(r),borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:700}}>
              {r}
            </span>
          ))}
        </div>

        {/* PIN dots display */}
        <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{
              width:14, height:14, borderRadius:"50%",
              background: pin.length > i ? C.accent : C.border,
              transition:"background 0.15s",
            }}/>
          ))}
        </div>

        {/* Hidden input */}
        <input
          autoFocus
          type="password"
          maxLength={6}
          value={pin}
          onChange={e=>{setPin(e.target.value);setErr("");}}
          onKeyDown={handleKey}
          style={{
            ...iS,
            textAlign:"center",
            fontSize:28,
            letterSpacing:12,
            marginBottom:8,
            border:`2px solid ${err?C.red:pin.length>0?C.accent:C.border}`,
            borderRadius:12,
          }}
          placeholder="• • • •"
        />

        {/* Error */}
        {err && (
          <div style={{color:C.red, fontSize:13, fontWeight:600, marginBottom:12, padding:"8px 12px", background:"#7f1d1d44", borderRadius:8}}>
            ⚠️ {err}
          </div>
        )}

        {/* Number pad */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16,marginTop:8}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
            <button key={i} onClick={()=>{
              if(k==="⌫") setPin(p=>p.slice(0,-1));
              else if(k!=="") setPin(p=>p.length<6?p+k:p);
            }}
            style={{
              background:k==="⌫"?C.surface:C.surface,
              color:k==="⌫"?C.red:C.text,
              border:`1px solid ${C.border}`,
              borderRadius:10,
              padding:"14px 0",
              fontSize:18,
              fontWeight:700,
              cursor:k===""?"default":"pointer",
              opacity:k===""?0:1,
            }}>
              {k}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",fontWeight:700,cursor:"pointer",fontSize:14}}>
            ← Back
          </button>
          <button onClick={handleSubmit} style={{flex:2,background:pin.length>=4?C.accent:C.surface,color:pin.length>=4?C.bg:C.muted,border:"none",borderRadius:10,padding:"11px 0",fontWeight:800,cursor:pin.length>=4?"pointer":"default",fontSize:14,transition:"all 0.2s"}}>
            Unlock →
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LICENSE SCREEN
// ══════════════════════════════════════════════════════════════════════════

// ── INSTITUTION HELPERS (Update 5) ───────────────────────────────────────────
function loadInstitution(key) {
  try { return JSON.parse(localStorage.getItem(key + "_inst")) || { name: "", address: "" }; } catch { return { name: "", address: "" }; }
}
function saveInstitution(key, inst) {
  try { localStorage.setItem(key + "_inst", JSON.stringify(inst)); } catch {}
}


// ── LICENCE EXPIRY BANNER (Update 8) ─────────────────────────────────────────
function ExpiryBanner({ expiry, phone }) {
  if (!expiry || expiry === "—") return null;
  const days = Math.ceil((new Date(expiry) - new Date()) / 86400000);
  if (days > 30) return null;
  const bg  = days <= 7 ? "#dc2626" : "#d97706";
  const msg = days <= 0
    ? `Licence has expired — contact ${phone||"0597147460"} to renew`
    : days <= 7
      ? `⚠ Licence expires in ${days} day${days!==1?"s":""} — renew immediately`
      : `Licence expires in ${days} day${days!==1?"s":""} — contact ${phone||"0597147460"} to renew`;
  return (
    <div style={{ background: bg, color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
      {msg}
    </div>
  );
}


// ── RESET MODAL (Update 1) ───────────────────────────────────────────────────
function ResetModal({ onConfirm, onCancel, adminPin, accent, cardBg }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [step, setStep] = useState(1);
  const check = () => {
    if (!adminPin) { setErr("No admin PIN set yet. Complete the setup wizard first."); return; }
    if (pin !== String(adminPin)) { setErr("Incorrect PIN. Try again."); setPin(""); return; }
    setStep(2);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
      <div style={{ background: cardBg||"#1f2330", border:"1px solid #ef444455", borderRadius:14, padding:28, width:"min(94vw,400px)" }}>
        {step === 1 ? (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>🔐 Admin PIN Required</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:16 }}>Enter your admin PIN to access the reset function.</p>
          <input type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&check()} placeholder="••••" autoFocus
            style={{ width:"100%", padding:12, background:"rgba(255,255,255,0.06)", border:`1.5px solid ${err?"#ef4444":"rgba(255,255,255,0.15)"}`, borderRadius:8, color:"#fff", fontSize:20, textAlign:"center", letterSpacing:6, outline:"none", boxSizing:"border-box", marginBottom:8, fontFamily:"inherit" }} />
          {err && <div style={{ color:"#fca5a5", fontSize:12, marginBottom:8 }}>{err}</div>}
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button onClick={onCancel} style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={check}    style={{ flex:1, padding:"10px 0", background:accent||"#2E86AB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Verify PIN</button>
          </div>
        </>) : (<>
          <div style={{ fontSize:18, fontWeight:800, color:"#ef4444", marginBottom:8 }}>⚠️ Confirm Full Reset</div>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:6, lineHeight:1.7 }}>This will <strong style={{ color:"#ef4444" }}>permanently delete ALL data</strong> in this app — records, settings, everything.</p>
          <p style={{ fontSize:13, color:"#ef4444", fontWeight:700, marginBottom:20 }}>This cannot be undone.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onCancel}  style={{ flex:1, padding:"10px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, color:"#94a3b8", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:1, padding:"10px 0", background:"#dc2626", color:"#fff", border:"none", borderRadius:8, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Delete All Data</button>
          </div>
        </>)}
      </div>
    </div>
  );
}


// ── FIRST-TIME SETUP WIZARD (Update 4) ───────────────────────────────────────
function SetupWizard({ onComplete, instLabel, accentColor, bgGrad }) {
  const [step,     setStep]     = useState(1);
  const [instName, setInstName] = useState("");
  const [instAddr, setInstAddr] = useState("");
  const [username, setUsername] = useState("");
  const [pin,      setPin]      = useState("");
  const [pin2,     setPin2]     = useState("");
  const [err,      setErr]      = useState("");

  const nextStep = () => {
    if (!instName.trim()) { setErr((instLabel||"Institution") + " name is required."); return; }
    setErr(""); setStep(2);
  };
  const finish = () => {
    if (!username.trim())  { setErr("Admin username is required."); return; }
    if (pin.length < 4)    { setErr("PIN must be at least 4 digits."); return; }
    if (pin !== pin2)      { setErr("PINs do not match."); return; }
    onComplete({ instName: instName.trim(), instAddr: instAddr.trim(), username: username.trim(), pin });
  };

  const inp = { width:"100%", padding:"11px 13px", background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.2)", borderRadius:8, color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background: bgGrad||"#0a1628", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:18, padding:"36px 32px", width:"min(94vw,460px)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⚙️</div>
          <div style={{ fontSize:22, fontWeight:900, color: accentColor||"#c9a84c", marginBottom:4 }}>First-Time Setup</div>
          <div style={{ color:"rgba(255,255,255,0.55)", fontSize:13 }}>Step {step} of 2 — {step===1?"Institution Details":"Admin Account"}</div>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:24 }}>
          {[1,2].map(s=>(
            <div key={s} style={{ flex:1, height:4, borderRadius:2, background: s<=step ? (accentColor||"#c9a84c") : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>{instLabel||"Institution"} Name *</label>
              <input value={instName} onChange={e=>{setInstName(e.target.value);setErr("");}} placeholder={`e.g. My ${instLabel||"Business"}`} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Address</label>
              <input value={instAddr} onChange={e=>setInstAddr(e.target.value)} placeholder="e.g. Kumasi, Ashanti Region" style={inp} />
            </div>
            {err && <div style={{ color:"#fca5a5", fontSize:12 }}>{err}</div>}
            <button onClick={nextStep} style={{ width:"100%", padding:"13px 0", background: accentColor||"#c9a84c", color:"#000", border:"none", borderRadius:10, fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"inherit", marginTop:4 }}>Next →</button>
          </div>
        )}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Admin Username *</label>
              <input value={username} onChange={e=>{setUsername(e.target.value);setErr("");}} placeholder="e.g. admin" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Admin PIN * (4–6 digits)</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,""));setErr("");}} placeholder="••••" style={{...inp, letterSpacing:4, textAlign:"center"}} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:5 }}>Confirm PIN *</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={e=>{setPin2(e.target.value.replace(/\D/g,""));setErr("");}} placeholder="••••" style={{...inp, letterSpacing:4, textAlign:"center"}} />
            </div>
            {err && <div style={{ color:"#fca5a5", fontSize:12 }}>{err}</div>}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={()=>{setStep(1);setErr("");}} style={{ flex:1, padding:"12px 0", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, color:"rgba(255,255,255,0.7)", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
              <button onClick={finish} style={{ flex:2, padding:"12px 0", background: accentColor||"#c9a84c", color:"#000", border:"none", borderRadius:8, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Complete Setup ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseScreen({ onActivate }) {
  const [mode, setMode] = useState("trial");
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");

  const startTrial = () => {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + TRIAL_DAYS);
    const lic = { type: "trial", key: null, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  const activateKey = () => {
    const k = key.toUpperCase().trim();
    if (!k) { setErr("Enter a license key."); return; }
    const validFormat = /^RESTO-[A-Z0-9]{2,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k) || VALID_KEYS.includes(k);
    if (!validFormat) { setErr("Invalid license key. Format: RESTO-XXXX-XXXX-XXXX"); return; }
    const planSeg = k.split("-")[1] || "";
    let days = 365;
    if (planSeg === "TRIAL") days = TRIAL_DAYS;
    else if (planSeg === "1M") days = 30;
    else if (planSeg === "6M") days = 182;
    else if (planSeg === "12M") days = 365;
    else if (/^\d+Y$/.test(planSeg)) days = Math.round(parseInt(planSeg) * 365);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
    const lic = { type: "licensed", key: k, expiry: expiry.toISOString(), issued: new Date().toISOString() };
    saveLicense(lic); onActivate(lic);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🍽</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>Restaurant Manager</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Restaurant & Order Management</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={() => { setMode("trial"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${C.border}`, background: mode === "trial" ? C.accent : "transparent", color: mode === "trial" ? C.bg : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Free Trial</button>
          <button onClick={() => { setMode("activate"); setErr(""); }} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${C.border}`, background: mode === "activate" ? C.accent : "transparent", color: mode === "activate" ? C.bg : C.muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Activate License</button>
        </div>

        {mode === "trial" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 14px" }}>
              Start a <strong>{TRIAL_DAYS}-day free trial</strong>. All features unlocked — tables, orders, kitchen, menu, reservations, and reports. No card required.
            </p>
            <div style={{ background: "#3a2a0f", border: `1px solid ${C.accent}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#fcd9a8" }}>
              Trial includes full access. Purchase a license before expiry to keep your data.
            </div>
            <button onClick={startTrial} style={{ width: "100%", padding: "13px 0", background: C.accent, color: C.bg, border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Start Free Trial
            </button>
          </div>
        )}

        {mode === "activate" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px" }}>Enter your license key to activate.</p>
            <input value={key} onChange={e => { setKey(e.target.value.toUpperCase()); setErr(""); }} onKeyDown={e => e.key === "Enter" && activateKey()}
              placeholder="RESTO-XXXX-XXXX-XXXX"
              style={{ width: "100%", padding: 11, border: `2px solid ${C.border}`, borderRadius: 8, fontSize: 14, textAlign: "center", boxSizing: "border-box", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace", background: C.surface, color: C.text, outline: "none" }} />
            {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <button onClick={activateKey} style={{ width: "100%", padding: "13px 0", background: C.accent, color: C.bg, border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Activate
            </button>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 12, textAlign: "center" }}>
              To purchase a license, contact: gilbert@aifarms.gh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LicenseExpiredScreen({ license, onRenew }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 30px", width: "min(94vw,420px)", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>⏰</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f87171", marginBottom: 6 }}>
          {license.type === "trial" ? "Trial Expired" : "License Expired"}
        </div>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Your {license.type === "trial" ? "free trial" : "license"} ended on {new Date(license.expiry).toLocaleDateString()}.
          Activate a new license key to keep using Restaurant Manager.
        </p>
        <button onClick={onRenew} style={{ width: "100%", padding: "13px 0", background: "#991b1b", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Activate License
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STAFF LOGIN SCREEN — shown on first load, choose who you are
// ══════════════════════════════════════════════════════════════════════════
function StaffLoginScreen({ staff, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const handleLogin = () => {
    if (!selected) return;
    if (selected.pin !== pin) {
      setErr("Wrong PIN. Try again.");
      setShake(true); setPin("");
      setTimeout(()=>setShake(false),500);
      return;
    }
    onLogin(selected);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <div style={{width:"min(94vw,480px)",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>🍽</div>
        <div style={{fontSize:28,fontWeight:900,color:C.accent,marginBottom:4}}>Restaurant Manager</div>
        <div style={{fontSize:14,color:C.muted,marginBottom:32}}>Select your name and enter your PIN to continue</div>

        {/* Staff grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:28}}>
          {staff.map(s=>(
            <button key={s.id} onClick={()=>{setSelected(s);setPin("");setErr("");}}
              style={{
                background:selected?.id===s.id?roleColor(s.role)+"33":C.card,
                border:`2px solid ${selected?.id===s.id?roleColor(s.role):C.border}`,
                borderRadius:12, padding:"14px 10px", cursor:"pointer",
                transition:"all 0.15s",
              }}>
              <div style={{fontSize:28,marginBottom:6}}>
                {s.role==="Owner"?"👑":s.role==="Chef"?"👨‍🍳":s.role==="Cashier"?"💰":"🧑‍💼"}
              </div>
              <div style={{fontSize:13,fontWeight:800,color:C.text}}>{s.name}</div>
              <div style={{fontSize:11,color:roleColor(s.role),fontWeight:600}}>{s.role}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{background:C.card,borderRadius:16,padding:"24px",border:`1px solid ${C.border}`,animation:shake?"shake 0.4s ease":"none"}}>
            <div style={{fontSize:14,color:C.muted,marginBottom:16}}>
              Welcome, <b style={{color:C.text}}>{selected.name}</b>. Enter your PIN:
            </div>

            {/* PIN dots */}
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?roleColor(selected.role):C.border,transition:"background 0.15s"}}/>
              ))}
            </div>

            <input autoFocus type="password" maxLength={6} value={pin}
              onChange={e=>{setPin(e.target.value);setErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={{...iS,textAlign:"center",fontSize:26,letterSpacing:12,marginBottom:8,border:`2px solid ${err?C.red:pin.length>0?roleColor(selected.role):C.border}`,borderRadius:12}}
              placeholder="• • • •"
            />

            {/* Number pad */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"12px 0"}}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
                <button key={i} onClick={()=>{
                  if(k==="⌫") setPin(p=>p.slice(0,-1));
                  else if(k!=="") setPin(p=>p.length<6?p+k:p);
                }}
                style={{background:C.surface,color:k==="⌫"?C.red:C.text,border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 0",fontSize:17,fontWeight:700,cursor:k===""?"default":"pointer",opacity:k===""?0:1}}>
                  {k}
                </button>
              ))}
            </div>

            {err&&<div style={{color:C.red,fontSize:13,padding:"8px 12px",background:"#7f1d1d44",borderRadius:8,marginBottom:10}}>⚠️ {err}</div>}

            <button onClick={handleLogin} style={{width:"100%",background:pin.length>=4?roleColor(selected.role):C.surface,color:pin.length>=4?C.bg:C.muted,border:"none",borderRadius:10,padding:"12px 0",fontWeight:800,cursor:pin.length>=4?"pointer":"default",fontSize:15,marginTop:4,transition:"all 0.2s"}}>
              Sign In →
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── Receipt ────────────────────────────────────────────────────────────────
function printReceipt(sale){
  const discAmt=sale.total*((sale.discount||0)/100);
  const final=sale.total-discAmt;
  const w=window.open("","_blank","width=380,height=640");
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
    body{font-family:'Courier New',monospace;padding:20px;max-width:300px;margin:0 auto;font-size:13px}
    .c{text-align:center}.b{font-weight:bold}.d{border:none;border-top:1px dashed #999;margin:10px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 0}
  </style></head><body>
  <div class="c b" style="font-size:18px">🍽 My Restaurant</div>
  <div class="c" style="font-size:11px">Table ${sale.tableNumber} · ${sale.date} ${sale.time}</div>
  <div class="c" style="font-size:11px">Ref: ${sale.id?.toUpperCase()||"—"} · Served by: ${sale.waiter||"—"}</div>
  <hr class="d"/>
  <table>${sale.items.map(i=>`<tr><td>${i.qty}× ${i.name}</td><td style="text-align:right">${fmt(i.price*i.qty)}</td></tr>`).join("")}</table>
  <hr class="d"/>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${fmt(sale.total)}</td></tr>
    ${sale.discount?`<tr><td>Discount (${sale.discount}%)</td><td style="text-align:right;color:red">-${fmt(discAmt)}</td></tr>`:""}
    <tr><td class="b" style="font-size:15px">TOTAL</td><td class="b" style="text-align:right">${fmt(final)}</td></tr>
    <tr><td>Payment</td><td style="text-align:right">${sale.paymentMethod||"Cash"}</td></tr>
  </table>
  <hr class="d"/>
  <div class="c" style="font-size:11px">Thank you for dining with us! 🙏</div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`);
  w.document.close();
}


// ── BACKUP COMPONENT ─────────────────────────────────────────────────────────
function RestaurantBackup({ db, setDb, showToast, institution, saveInst, onShowReset }) {
  const [confirmRestore,setConfirmRestore]=useState(null);
  const [fileError,setFileError]=useState("");
  const stats2=[["Menu Items",(db.menu||[]).length],["Tables",(db.tables||[]).length],["Sales",(db.sales||[]).length],["Staff",(db.staff||[]).length]];
  const download=()=>{
    const blob=new Blob([JSON.stringify({app:"Restaurant Manager",exportedAt:new Date().toISOString(),version:1,data:db},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`Restaurant-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    showToast("Backup downloaded","ok");
  };
  const onFile=(e)=>{
    const file=e.target.files?.[0];if(!file)return;setFileError("");
    const reader=new FileReader();
    reader.onload=()=>{try{const p=JSON.parse(reader.result);if(!p.data){setFileError("Not a valid backup file.");return;}setConfirmRestore(p);}catch{setFileError("Could not read file.");}};
    reader.readAsText(file);e.target.value="";
  };
  const exportCSV=()=>{
    const rows=[["Item","Category","Price (GH₵)","Cost (GH₵)","Available"]];
    (db.menu||[]).forEach(m=>rows.push([m.name,m.category,m.price,m.costPrice,m.available?"Yes":"No"]));
    const csv=rows.map(r=>r.map(x=>`"${String(x||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download=`Restaurant-menu-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);a.click();a.remove();
    showToast("CSV exported","ok");
  };
  return(
    <>
      <div style={{fontWeight:800,fontSize:17,marginBottom:6}}>💾 Backup & Restore</div>
      <p style={{color:C.muted,fontSize:13,marginBottom:20,maxWidth:560,lineHeight:1.6}}>All data lives in this browser. Download a backup regularly and store it in Google Drive, email, or USB.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:800,marginBottom:12}}>⬇️ Export Backup</div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {stats2.map(([l,v])=>(
              <div key={l} style={{background:C.surface,borderRadius:7,padding:"8px 12px"}}>
                <div style={{fontSize:10,color:C.muted}}>{l}</div>
                <div style={{fontSize:15,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <button onClick={download} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer",width:"100%",marginBottom:8}}>⬇️ Download Backup (.json)</button>
          <button onClick={exportCSV} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer",width:"100%"}}>📊 Export Menu CSV</button>
        </div>
        <div style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:800,marginBottom:10}}>⬆️ Restore from Backup</div>
          <div style={{background:"#7c2d12",border:"1px solid #f59e0b",borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:"#fbbf24"}}>⚠️ Restoring overwrites all current data.</div>
          <label style={{display:"block",textAlign:"center",padding:"10px 16px",borderRadius:8,border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",fontWeight:600,background:C.surface}}>
            📂 Choose Backup File…
            <input type="file" accept="application/json" onChange={onFile} style={{display:"none"}}/>
          </label>
          {fileError&&<div style={{color:C.red,fontSize:12,marginTop:8}}>{fileError}</div>}
        </div>
      </div>

      <div style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{fontWeight:800,marginBottom:8}}>🏢 Restaurant Profile</div>
        <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Name and address appear on receipts and in the app header.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <input value={institution?.name||""} onChange={e=>saveInst({...institution,name:e.target.value})} placeholder="Restaurant Name" style={{padding:"9px 11px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <input value={institution?.address||""} onChange={e=>saveInst({...institution,address:e.target.value})} placeholder="Address" style={{padding:"9px 11px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
        </div>
      </div>

      <div style={{background:C.card,borderRadius:12,padding:18,border:"1px solid #ef444444",marginBottom:14}}>
        <div style={{fontWeight:800,marginBottom:8,color:C.red}}>🗑 Reset All Data</div>
        <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Permanently deletes all data and resets the app. Requires admin PIN.</p>
        <button onClick={onShowReset} style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontSize:13}}>🗑 Reset App Data</button>
      </div>

      {confirmRestore&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}} onClick={()=>setConfirmRestore(null)}>
          <div style={{background:C.card,borderRadius:14,padding:28,width:"min(94vw,400px)",border:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",color:C.text}}>⚠️ Confirm Restore</h3>
            <p style={{fontSize:13,color:C.muted,marginBottom:16}}>Backup from <strong>{new Date(confirmRestore.exportedAt).toLocaleString()}</strong>.<br/>This replaces ALL current data and cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmRestore(null)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 0",fontWeight:600,cursor:"pointer",color:C.muted}}>Cancel</button>
              <button onClick={()=>{setDb(confirmRestore.data);setConfirmRestore(null);showToast("Data restored","ok");}} style={{flex:1,background:"#991b1b",color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:700,cursor:"pointer"}}>✅ Yes, Restore</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App(){
  const [license,setLicense]=useState(loadLicense);
  const [setupDone, setSetupDone] = useState(()=>!!localStorage.getItem("resto_setup"));
  const [institution, setInstitution] = useState(()=>loadInstitution("restaurantMgr_v2_license"));
  const [showReset, setShowReset] = useState(false);
  useEffect(() => {
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (urlKey && !loadLicense()) {
      const k = urlKey.toUpperCase().trim();
      if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k)) {
        const plan = k.split("-")[1]||"";
        const days = plan==="TRIAL"?14:plan==="1M"?30:plan==="6M"?182:plan==="12M"?365:/^\d+Y$/.test(plan)?Math.round(parseInt(plan)*365):365;
        const expiry = new Date(); expiry.setDate(expiry.getDate()+days);
        const lic = { type:"licensed", key:k, expiry:expiry.toISOString(), issued:new Date().toISOString() };
        saveLicense(lic); setLicense(lic);
        window.history.replaceState({},document.title,window.location.pathname);
      }
    }
  }, []);
  const [db,setDb]=useState(loadData);
  const [loggedInStaff,setLoggedInStaff]=useState(null); // null = show login screen
  const [view,setView]=useState("tables");
  const [pendingView,setPendingView]=useState(null); // tab waiting for PIN
  const [showPinLock,setShowPinLock]=useState(false);
  const [modal,setModal]=useState(null);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({});
  const [toast,setToast]=useState(null);
  const [orderTable,setOrderTable]=useState(null);
  const [orderItems,setOrderItems]=useState([]);
  const [menuCat,setMenuCat]=useState("All");
  const [reportPeriod,setReportPeriod]=useState("today");
  const [reservPeriod,setReservPeriod]=useState("active"); // active | history
  const [reportCustom,setReportCustom]=useState({from:"",to:""});
  const [reservAlert,setReservAlert]=useState(null);
  const [billOrder,setBillOrder]=useState(null);
  const [kitchenFilter,setKitchenFilter]=useState("active");

  useEffect(()=>{ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}catch(_){} },[db]);

  const {menu=[],tables=[],ingredients=[],orders=[],reservations=[],sales=[],staff=[]}=db;

  const showToast=(msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };
  const close=()=>{ setModal(null); setEditing(null); setForm({}); setOrderTable(null); setOrderItems([]); setBillOrder(null); };
  const fld=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  // ── Tab access check ───────────────────────────────────────────────────
  const canAccessTab = useCallback((tabId, staffMember) => {
    if (!staffMember) return false;
    const allowed = TAB_ACCESS[tabId] || [];
    return allowed.includes(staffMember.role);
  }, []);

  const handleTabClick = (tabId) => {
    if (!loggedInStaff) return;
    if (canAccessTab(tabId, loggedInStaff)) {
      setView(tabId);
    } else {
      // Needs PIN verification
      setPendingView(tabId);
      setShowPinLock(true);
    }
  };

  const handlePinSuccess = (staffMember) => {
    setShowPinLock(false);
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    }
  };

  const handlePinCancel = () => {
    setShowPinLock(false);
    setPendingView(null);
  };

  // ── Derived stats ──────────────────────────────────────────────────────
  const todaySales=sales.filter(s=>s.date===today());
  const todayRevenue=todaySales.reduce((a,s)=>a+s.total,0);
  const todayCost=todaySales.reduce((a,s)=>a+s.items.reduce((b,i)=>{ const m=menu.find(x=>x.name===i.name); return b+(m?m.costPrice*i.qty:0); },0),0);
  const todayProfit=todayRevenue-todayCost;
  const activeOrders=orders.filter(o=>o.status!=="paid"&&o.status!=="cancelled");
  const lowIngredients=ingredients.filter(i=>i.qty<=i.minQty);
  const todayReservations=reservations.filter(r=>r.date===today());

  // ── Order helpers ──────────────────────────────────────────────────────
  const addToOrder=item=>{ setOrderItems(prev=>{ const ex=prev.find(x=>x.menuId===item.id); if(ex) return prev.map(x=>x.menuId===item.id?{...x,qty:x.qty+1}:x); return [...prev,{menuId:item.id,name:item.name,price:item.price,qty:1}]; }); };
  const removeFromOrder=menuId=>setOrderItems(prev=>prev.map(x=>x.menuId===menuId&&x.qty>1?{...x,qty:x.qty-1}:x).filter(x=>x.qty>0));
  const orderTotal=orderItems.reduce((a,x)=>a+x.price*x.qty,0);

  const submitOrder=()=>{
    if(!orderTable||!orderItems.length) return;
    const existing=orders.find(o=>o.tableId===orderTable.id&&o.status!=="paid"&&o.status!=="cancelled");
    if(existing){
      const merged=[...existing.items];
      orderItems.forEach(ni=>{ const ex=merged.find(x=>x.menuId===ni.menuId); if(ex) ex.qty+=ni.qty; else merged.push(ni); });
      const newTotal=merged.reduce((a,x)=>a+x.price*x.qty,0);
      setDb(prev=>({...prev,orders:prev.orders.map(o=>o.id===existing.id?{...o,items:merged,total:newTotal,status:"preparing"}:o)}));
      showToast("Items added to existing order.");
    } else {
      const order={id:uid(),tableId:orderTable?.id||"takeaway",tableNumber:orderTable?.number||"—",items:orderItems,status:"preparing",waiter:loggedInStaff?.name||"",total:orderTotal+Number(form.deliveryFee||0),createdAt:`${today()} ${nowTime()}`,note:form.orderNote||"",orderType:form.orderType||"dine-in",deliveryAddress:form.deliveryAddress||"",deliveryFee:Number(form.deliveryFee||0)};
      setDb(prev=>({...prev,orders:[...prev.orders,order],tables:prev.tables.map(t=>t.id===orderTable.id?{...t,status:"occupied"}:t)}));
      showToast(`Order sent to kitchen — Table ${orderTable.number}`);
    }
    close();
  };

  const updateOrderStatus=(orderId,status)=>{ setDb(prev=>({...prev,orders:prev.orders.map(o=>o.id===orderId?{...o,status}:o)})); showToast(`Order marked as ${status}.`); };

  const settleBill=()=>{
    if(!billOrder) return;
    const disc=Number(form.discount)||0;
    const discAmt=billOrder.total*(disc/100);
    const final=billOrder.total-discAmt;
    const sale={id:uid(),tableNumber:billOrder.tableNumber,items:billOrder.items,total:billOrder.total,discount:disc,finalTotal:final,paymentMethod:form.paymentMethod||"Cash",waiter:billOrder.waiter,date:today(),time:nowTime()};
    setDb(prev=>({
      ...prev,
      sales:[...prev.sales,sale],
      orders:prev.orders.map(o=>o.id===billOrder.id?{...o,status:"paid"}:o),
      tables:prev.tables.map(t=>t.id===billOrder.tableId?{...t,status:"available"}:t),
      // Mark linked reservation as served
      reservations:prev.reservations.map(r=>r.tableId===billOrder.tableId&&r.status==="in-progress"?{...r,status:"served"}:r),
    }));
    printReceipt(sale);
    showToast(`Bill settled — ${fmt(final)} via ${sale.paymentMethod}`);
    close();
  };

  // ── Menu CRUD ──────────────────────────────────────────────────────────
  const saveMenuItem=()=>{ const item={id:editing?editing.id:uid(),name:form.mname||"",category:form.mcat||"Mains",price:Number(form.mprice)||0,costPrice:Number(form.mcost)||0,available:form.mavail!=="false",emoji:form.memoji||"🍽"}; setDb(prev=>({...prev,menu:editing?prev.menu.map(x=>x.id===editing.id?item:x):[...prev.menu,item]})); showToast(editing?"Item updated.":"Item added."); close(); };
  const deleteMenuItem=id=>{ setDb(prev=>({...prev,menu:prev.menu.filter(x=>x.id!==id)})); showToast("Removed.","warn"); close(); };

  // ── Ingredient CRUD ───────────────────────────────────────────────────
  const saveIngredient=()=>{ const item={id:editing?editing.id:uid(),name:form.iname||"",unit:form.iunit||"",qty:Number(form.iqty)||0,minQty:Number(form.iminqty)||0,costPerUnit:Number(form.icost)||0}; setDb(prev=>({...prev,ingredients:editing?prev.ingredients.map(x=>x.id===editing.id?item:x):[...prev.ingredients,item]})); showToast(editing?"Updated.":"Added."); close(); };
  const restockIngredient=()=>{ const add=Number(form.addQty)||0; setDb(prev=>({...prev,ingredients:prev.ingredients.map(i=>i.id===editing.id?{...i,qty:i.qty+add}:i)})); showToast(`Restocked +${add} ${editing.unit}`); close(); };

  // ── Reservation CRUD ──────────────────────────────────────────────────
  const seatGuest=(reservation)=>{
    const order={id:uid(),tableId:reservation.tableId,tableNumber:reservation.tableNumber,items:[],status:"preparing",waiter:loggedInStaff?.name||"",total:0,createdAt:`${today()} ${nowTime()}`,note:`Guest: ${reservation.name} (${reservation.guests} guests)`,orderType:"dine-in",deliveryAddress:"",deliveryFee:0};
    setDb(prev=>({
      ...prev,
      reservations: prev.reservations.map(r=>r.id===reservation.id?{...r,status:"in-progress"}:r),
      tables: prev.tables.map(t=>t.id===reservation.tableId?{...t,status:"occupied"}:t),
      orders: [...prev.orders,order],
    }));
    showToast(`${reservation.name} seated at Table ${reservation.tableNumber}. Order created.`);
  };

  const makeTableAvailable=(tableId)=>{
    if(!window.confirm("Mark this table as Available? Use only if the table has been cleared manually.")) return;
    setDb(prev=>({...prev,tables:prev.tables.map(t=>t.id===tableId?{...t,status:"available"}:t)}));
    showToast("Table marked as available.");
  };

  const saveReservation=()=>{ const r={id:editing?editing.id:uid(),name:form.rname||"",phone:form.rphone||"",date:form.rdate||today(),time:form.rtime||"12:00",guests:Number(form.rguests)||2,tableId:form.rtableId||"",tableNumber:tables.find(t=>t.id===form.rtableId)?.number||"—",note:form.rnote||"",status:"confirmed"}; setDb(prev=>({...prev,reservations:editing?prev.reservations.map(x=>x.id===editing.id?r:x):[...prev.reservations,r],tables:prev.tables.map(t=>t.id===r.tableId?{...t,status:"reserved"}:t)})); showToast(editing?"Updated.":"Reservation confirmed!"); close(); };
  const cancelReservation=id=>{
    setDb(prev=>{
      const res=prev.reservations.find(r=>r.id===id);
      const otherActive=prev.reservations.filter(r=>r.id!==id&&r.tableId===res?.tableId&&r.status==="confirmed");
      return {
        ...prev,
        reservations: prev.reservations.map(r=>r.id===id?{...r,status:"cancelled"}:r),
        tables: prev.tables.map(t=> res&&t.id===res.tableId&&otherActive.length===0&&t.status==="reserved" ? {...t,status:"available"} : t),
      };
    });
    showToast("Reservation cancelled. Table is now available.","warn");
  };

  // ── Staff CRUD ────────────────────────────────────────────────────────
  const saveStaff=()=>{
    const roles=(form.sroles||[form.srole||"Waiter"]).filter(Boolean);
    const s={id:editing?editing.id:uid(),name:form.sname||"",role:roles[0]||"Waiter",roles:roles,pin:form.spin||"0000",shift:form.sshift||"Morning"};
    setDb(prev=>({...prev,staff:editing?prev.staff.map(x=>x.id===editing.id?s:x):[...prev.staff,s]}));
    showToast(editing?"Updated.":"Staff added."); close();
  };

  // ── Report data ───────────────────────────────────────────────────────
  const reportSales=useMemo(()=>{
    if(reportPeriod==="today") return todaySales;
    if(reportPeriod==="year"){
      const yr=new Date().getFullYear().toString();
      return sales.filter(s=>s.date&&s.date.startsWith(yr));
    }
    if(reportPeriod==="custom"&&reportCustom.from&&reportCustom.to){
      return sales.filter(s=>s.date&&s.date>=reportCustom.from&&s.date<=reportCustom.to);
    }
    const days=reportPeriod==="week"?7:30;
    const cutoff=new Date("2026-06-27"); cutoff.setDate(cutoff.getDate()-days+1);
    return sales.filter(s=>new Date(s.date)>=cutoff);
  },[sales,reportPeriod,todaySales]);

  const reportRevenue=reportSales.reduce((a,s)=>a+s.total,0);
  const reportProfit=reportSales.reduce((a,s)=>{ const cost=s.items.reduce((b,i)=>{ const m=menu.find(x=>x.name===i.name); return b+(m?m.costPrice*i.qty:0); },0); return a+s.total-cost; },0);

  const topItems=useMemo(()=>{ const map={}; reportSales.forEach(s=>s.items.forEach(i=>{ map[i.name]=(map[i.name]||0)+i.qty; })); return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6); },[reportSales]);

  const salesByDay=useMemo(()=>{
    const days=reportPeriod==="today"?1:reportPeriod==="week"?7:14;
    return Array.from({length:days},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(days-1-i)); const ds=d.toISOString().slice(0,10); return {l:ds.slice(5),v:reportSales.filter(s=>s.date===ds).reduce((a,s)=>a+s.total,0)}; });
  },[reportSales,reportPeriod]);
  const maxBar=Math.max(...salesByDay.map(d=>d.v),1);

  const toastBg={ok:C.green,warn:C.accent,err:C.red};
  const tableStatusColor=s=>s==="available"?C.green:s==="occupied"?C.red:s==="reserved"?C.blue:C.muted;
  const tableStatusBg=s=>s==="available"?"#14532d":s==="occupied"?"#7f1d1d":s==="reserved"?"#1e3a5f":"#1e293b";
  const filtMenuItems=menu.filter(m=>(menuCat==="All"||m.category===menuCat)&&m.available);

  // ── Nav items with lock indicator ─────────────────────────────────────
  const navItems=[
    {id:"tables",       label:"🪑 Tables",       badge:null},
    {id:"orders",       label:"📋 Orders",       badge:activeOrders.length||null},
    {id:"kitchen",      label:"👨‍🍳 Kitchen",      badge:orders.filter(o=>o.status==="preparing").length||null},
    {id:"menu",         label:"🍽 Menu",          badge:null},
    {id:"reservations", label:"📅 Reservations",  badge:todayReservations.length||null},
    {id:"inventory",    label:"📦 Inventory",     badge:lowIngredients.length||null},
    {id:"reports",      label:"📊 Reports",       badge:null},
    {id:"staff",        label:"👥 Staff",         badge:null},
    {id:"backup",       label:"💾 Backup",        badge:null},
  ];

  // ── License gate ───────────────────────────────────────────────────────
  if (!license) return <LicenseScreen onActivate={setLicense} />;
  if (isExpired(license.expiry)) return <LicenseExpiredScreen license={license} onRenew={()=>setLicense(null)} />;
  if (!setupDone) return <SetupWizard
    instLabel="Restaurant"
    accentColor="#f59e0b"
    bgGrad="linear-gradient(135deg,#0f1117,#1a1d27)"
    onComplete={({instName,instAddr,username,pin})=>{
      setDb(prev=>({...prev,staff:[{id:"st1",name:username,role:"Owner",pin,shift:"All Day"},...(prev?.staff||[]).filter(s=>s.role!=="Owner")]}));
      setInstitution({name:instName,address:instAddr}); saveInstitution("restaurantMgr_v2_license",{name:instName,address:instAddr});
      localStorage.setItem("resto_setup","1"); setSetupDone(true);
    }}
  />;
  // ── Show login screen if not logged in ────────────────────────────────
  if(!loggedInStaff){
    return <StaffLoginScreen staff={staff} onLogin={s=>{ setLoggedInStaff(s); showToast(`Welcome, ${s.name}!`); }} />;
  }

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>

      {showReset&&(
        <ResetModal
          adminPin={(db?.staff||[]).find(s=>(s.roles||[s.role]).includes("Owner"))?.pin||""}
          accent={C.accent}
          cardBg={C.card}
          onCancel={()=>setShowReset(false)}
          onConfirm={()=>{
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LICENSE_KEY);
            localStorage.removeItem("resto_setup");
            localStorage.removeItem(LICENSE_KEY+"_inst");
            setShowReset(false);
            window.location.reload();
          }}
        />
      )}
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:999,background:toastBg[toast.type],color:"#fff",padding:"11px 20px",borderRadius:10,fontWeight:700,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>{toast.msg}</div>}

      {/* PIN LOCK OVERLAY */}
      {showPinLock&&pendingView&&(
        <PinLockScreen
          tabName={navItems.find(n=>n.id===pendingView)?.label||pendingView}
          tabIcon={navItems.find(n=>n.id===pendingView)?.label?.split(" ")[0]||"🔒"}
          allowedRoles={TAB_ACCESS[pendingView]||[]}
          staff={staff}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}

      {/* HEADER */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"14px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:C.accent}}>🍽 Restaurant Manager</div>
            <div style={{fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:8}}>
              <span style={{background:roleColor(loggedInStaff.role)+"22",color:roleColor(loggedInStaff.role),borderRadius:20,padding:"2px 10px",fontWeight:700,fontSize:12}}>
                {loggedInStaff.role==="Owner"?"👑":loggedInStaff.role==="Chef"?"👨‍🍳":loggedInStaff.role==="Cashier"?"💰":"🧑‍💼"} {loggedInStaff.name} · {loggedInStaff.role}
              </span>
              <button onClick={()=>setLoggedInStaff(null)} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:20,padding:"2px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>
                Switch Staff
              </button>
              {license.type==="trial" && <span style={{background:"#3a2a0f",color:C.accent,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>Trial: {daysLeft(license.expiry)}d left</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <StatCard label="Today's Revenue" value={fmt(todayRevenue)} color={C.accent} icon="💰"/>
            <StatCard label="Today's Profit"  value={fmt(todayProfit)}  color={C.green}  icon="📈"/>
            <StatCard label="Active Orders"   value={activeOrders.length} color={C.blue}  icon="📋"/>
            <StatCard label="Low Stock"       value={lowIngredients.length} color={lowIngredients.length>0?C.red:C.green} icon="📦"/>
          </div>
        </div>

        {/* Nav tabs — show lock icon on restricted tabs */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {navItems.map(n=>{
            const hasAccess=canAccessTab(n.id,loggedInStaff);
            const isActive=view===n.id;
            return(
              <button key={n.id} onClick={()=>handleTabClick(n.id)}
                style={{
                  background:isActive?C.accent:"transparent",
                  color:isActive?C.bg:hasAccess?C.text:C.muted,
                  border:"none", borderRadius:"8px 8px 0 0",
                  padding:"7px 12px", fontWeight:700, fontSize:12, cursor:"pointer",
                  whiteSpace:"nowrap", position:"relative",
                  opacity:hasAccess?1:0.7,
                }}>
                {n.label}
                {!hasAccess&&<span style={{marginLeft:4,fontSize:10}}>🔒</span>}
                {n.badge&&<span style={{position:"absolute",top:2,right:2,background:C.red,color:"#fff",borderRadius:10,fontSize:10,padding:"0 5px",fontWeight:800}}>{n.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reservation due alert (Update D) */}
      {reservAlert&&(
        <div style={{background:"#92400e",color:"#fef3c7",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,fontWeight:700}}>
          <span>⏰ Table {reservAlert.tableNumber} reservation for <strong>{reservAlert.name}</strong> ({reservAlert.guests} guests) is now due — {reservAlert.time}</span>
          <button onClick={()=>setReservAlert(null)} style={{background:"transparent",border:"1px solid #fef3c7",borderRadius:6,color:"#fef3c7",padding:"3px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>Dismiss</button>
        </div>
      )}

      <div style={{padding:"20px",maxWidth:1200,margin:"0 auto"}}>

        {/* ── TABLES ── */}
        {view==="tables"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>🪑 Table Overview</div>
              <div style={{display:"flex",gap:10}}>
                {[["available",C.green],["occupied",C.red],["reserved",C.blue]].map(([s,c])=>(
                  <span key={s} style={{fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:"50%",background:c,display:"inline-block"}}/>{s.charAt(0).toUpperCase()+s.slice(1)}: {tables.filter(t=>t.status===s).length}</span>
                ))}
              </div>
            </div>
            {["Indoor","Outdoor","Bar"].map(section=>(
              <div key={section} style={{marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:10,letterSpacing:1}}>{section.toUpperCase()}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                  {tables.filter(t=>t.section===section).map(t=>{
                    const order=orders.find(o=>o.tableId===t.id&&o.status!=="paid"&&o.status!=="cancelled");
                    return(
                      <div key={t.id} style={{background:tableStatusBg(t.status),borderRadius:12,padding:16,border:`1px solid ${tableStatusColor(t.status)}55`,cursor:"pointer"}}
                        onClick={()=>{ if(t.status==="available"){setOrderTable(t);setOrderItems([]);setForm({});setModal("newOrder");} else if(order){setBillOrder(order);setForm({discount:0,paymentMethod:"Cash"});setModal("bill");} }}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div style={{fontSize:24,fontWeight:900,color:tableStatusColor(t.status)}}>T{t.number}</div>
                          <Bdg bg={tableStatusBg(t.status)} tc={tableStatusColor(t.status)}>{t.status}</Bdg>
                        </div>
                        <div style={{fontSize:12,color:C.muted,marginTop:6}}>👥 {t.capacity} seats</div>
                        {order&&<div style={{fontSize:11,color:C.accent,marginTop:4}}>{order.items.length} items · {fmt(order.total)}</div>}
                        {order&&<div style={{fontSize:11,color:C.muted}}>{order.waiter} · {order.status}</div>}
                        <div style={{fontSize:11,color:C.muted,marginTop:8,fontWeight:600}}>{t.status==="available"?"Tap to take order":t.status==="occupied"?"Tap to view bill":"Reserved"}</div>
                        {/* Seat guest button for reserved tables */}
                        {t.status==="reserved"&&(()=>{
                          const res=reservations.find(r=>r.tableId===t.id&&(r.status==="confirmed"||r.status==="in-progress"));
                          if(!res) return null;
                          return(
                            <div style={{marginTop:8,display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                              {res.status==="confirmed"&&<button onClick={()=>seatGuest(res)} style={{flex:1,background:"#14532d",color:"#86efac",border:"none",borderRadius:6,padding:"5px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>🪑 Seat Guest</button>}
                              <button onClick={()=>makeTableAvailable(t.id)} style={{flex:1,background:"#1e3a5f",color:"#93c5fd",border:"none",borderRadius:6,padding:"5px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Free Table</button>
                            </div>
                          );
                        })()}
                        {/* Manual override for occupied tables */}
                        {t.status==="occupied"&&(
                          <div style={{marginTop:6}} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>makeTableAvailable(t.id)} style={{width:"100%",background:"#1e3a5f",color:"#93c5fd",border:"none",borderRadius:6,padding:"5px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Make Available</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── ORDERS ── */}
        {view==="orders"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>📋 All Orders</div>
              <button onClick={()=>{setOrderTable(null);setOrderItems([]);setForm({orderType:"dine-in"});setModal("selectTable");}} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"8px 18px",fontWeight:800,cursor:"pointer",fontSize:13}}>+ New Order</button>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["all","All"],["dine-in","🍽 Dine In"],["takeaway","🥡 Takeaway"],["delivery","🚚 Delivery"]].map(([k,l])=>(
                <button key={k} onClick={()=>setForm(p=>({...p,orderFilter:k}))} style={{background:(form.orderFilter||"all")===k?C.accent:"transparent",color:(form.orderFilter||"all")===k?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 12px",fontWeight:700,cursor:"pointer",fontSize:12}}>{l}</button>
              ))}
            </div>
            <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))"}}>
              {orders.filter(o=>(form.orderFilter||"all")==="all"||(o.orderType||"dine-in")===(form.orderFilter||"all")).length===0&&<div style={{color:C.muted,textAlign:"center",padding:32}}>No orders yet.</div>}
              {[...orders].reverse().filter(o=>(form.orderFilter||"all")==="all"||(o.orderType||"dine-in")===(form.orderFilter||"all")).map(o=>{
                const statusColor=o.status==="preparing"?C.accent:o.status==="serving"?C.green:o.status==="paid"?C.muted:C.red;
                return(
                  <div key={o.id} style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div><div style={{fontWeight:800,fontSize:16,color:C.text}}>Table {o.tableNumber}</div><div style={{fontSize:12,color:C.muted}}>{o.waiter} · {o.createdAt}</div></div>
                      <Bdg bg={statusColor+"22"} tc={statusColor}>{o.status}</Bdg>
                    </div>
                    {o.note&&<div style={{fontSize:12,color:C.accent,marginBottom:8,fontStyle:"italic"}}>📝 {o.note}</div>}
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginBottom:10}}>
                      {o.items.map((item,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                          <span style={{color:C.text}}>{item.qty}× {item.name}</span>
                          <span style={{color:C.muted}}>{fmt(item.price*item.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                      <div style={{fontWeight:800,color:C.accent}}>{fmt(o.total)}</div>
                      <div style={{display:"flex",gap:6}}>
                        {o.status==="preparing"&&<button onClick={()=>updateOrderStatus(o.id,"serving")} style={{background:"#14532d",color:C.green,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Mark Served</button>}
                        {o.status==="serving"&&<button onClick={()=>{setBillOrder(o);setForm({discount:0,paymentMethod:"Cash"});setModal("bill");}} style={{background:"#1e3a5f",color:C.blue,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Settle Bill</button>}
                        {o.status!=="paid"&&o.status!=="cancelled"&&<button onClick={()=>updateOrderStatus(o.id,"cancelled")} style={{background:"#7f1d1d22",color:C.red,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Cancel</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── KITCHEN ── */}
        {view==="kitchen"&&(
          <div style={{background:C.card,borderRadius:16,padding:20,border:`2px solid ${C.accent}44`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:900,fontSize:20,color:C.accent}}>👨‍🍳 Kitchen Display</div>
              <div style={{display:"flex",gap:6}}>
                {[["active","Active"],["all","All"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setKitchenFilter(k)} style={{background:kitchenFilter===k?C.accent:"transparent",color:kitchenFilter===k?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
              {orders.filter(o=>kitchenFilter==="all"||(o.status!=="paid"&&o.status!=="cancelled")).length===0&&(
                <div style={{color:C.muted,textAlign:"center",padding:40,gridColumn:"1/-1"}}>No active orders. Kitchen is clear! ✅</div>
              )}
              {orders.filter(o=>kitchenFilter==="all"||(o.status!=="paid"&&o.status!=="cancelled")).map(o=>{
                const isPreparing=o.status==="preparing";
                const borderCol=isPreparing?C.accent:o.status==="serving"?C.green:C.muted;
                return(
                  <div key={o.id} style={{background:isPreparing?"#1a1500":C.surface,borderRadius:12,padding:16,border:`2px solid ${borderCol}`,position:"relative"}}>
                    {isPreparing&&<div style={{position:"absolute",top:10,right:10,width:10,height:10,borderRadius:"50%",background:C.accent,animation:"pulse 1.5s infinite"}}/>}
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{fontSize:20,fontWeight:900,color:borderCol}}>TABLE {o.tableNumber}</div>
                      <Bdg bg={borderCol+"22"} tc={borderCol}>{o.status.toUpperCase()}</Bdg>
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{o.createdAt} · {o.waiter}</div>
                    {o.note&&<div style={{background:"#7f1d1d44",borderRadius:6,padding:"6px 10px",fontSize:12,color:C.red,marginBottom:10}}>⚠️ {o.note}</div>}
                    {o.items.map((item,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                        <div style={{fontSize:22,fontWeight:900,color:C.accent,minWidth:28}}>{item.qty}×</div>
                        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{item.name}</div>
                      </div>
                    ))}
                    {isPreparing&&<button onClick={()=>updateOrderStatus(o.id,"serving")} style={{width:"100%",marginTop:12,background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontWeight:800,cursor:"pointer",fontSize:14}}>✓ Mark as Ready</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MENU ── */}
        {view==="menu"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>🍽 Menu Management</div>
              <button onClick={()=>{setEditing(null);setForm({mcat:"Mains",mavail:"true",memoji:"🍽"});setModal("editMenuItem");}} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"8px 18px",fontWeight:800,cursor:"pointer",fontSize:13}}>+ Add Item</button>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {["All",...MENU_CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setMenuCat(c)} style={{background:menuCat===c?C.accent:"transparent",color:menuCat===c?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{c}</button>
              ))}
            </div>
            <div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
              {menu.filter(m=>menuCat==="All"||m.category===menuCat).map(m=>{
                const mgn=m.price>0?Math.round(((m.price-m.costPrice)/m.price)*100):0;
                return(
                  <div key={m.id} style={{background:C.card,borderRadius:12,padding:16,border:`1px solid ${m.available?C.border:"#7f1d1d"}`,opacity:m.available?1:0.6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{fontSize:28}}>{m.emoji}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <Bdg bg="#1a2744" tc={C.blue}>{m.category}</Bdg>
                        {!m.available&&<Bdg bg="#7f1d1d" tc={C.red}>OFF</Bdg>}
                      </div>
                    </div>
                    <div style={{fontWeight:700,fontSize:14,marginTop:8,marginBottom:4,color:C.text}}>{m.name}</div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:16,fontWeight:900,color:C.accent}}>{fmt(m.price)}</div>
                      <Bdg bg={mgn>=40?"#14532d":mgn>=20?"#92400e22":"#7f1d1d22"} tc={mgn>=40?C.green:mgn>=20?C.accent:C.red}>{mgn}% margin</Bdg>
                    </div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Cost: {fmt(m.costPrice)} · Profit: {fmt(m.price-m.costPrice)}</div>
                    <button onClick={()=>{setEditing(m);setForm({mname:m.name,mcat:m.category,mprice:m.price,mcost:m.costPrice,mavail:String(m.available),memoji:m.emoji});setModal("editMenuItem");}}
                      style={{width:"100%",background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── RESERVATIONS ── */}
        {view==="reservations"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>📅 Reservations</div>
              <div style={{display:"flex",gap:8}}>
                {[["active","Active"],["history","History"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setReservPeriod(k)} style={{background:reservPeriod===k?C.accent:"transparent",color:reservPeriod===k?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",fontWeight:700,cursor:"pointer",fontSize:12}}>{l}</button>
                ))}
                <button onClick={()=>{setEditing(null);setForm({rdate:today(),rtime:"12:00",rguests:2});setModal("editReservation");}} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"6px 18px",fontWeight:800,cursor:"pointer",fontSize:13}}>+ New</button>
              </div>
            </div>
            <div style={{display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))"}}>
              {(()=>{
                const active=["confirmed","in-progress"];
                const hist=["cancelled","served"];
                const filtered=reservPeriod==="active"
                  ? [...reservations].filter(r=>active.includes(r.status)).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))
                  : [...reservations].filter(r=>hist.includes(r.status)).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
                if(filtered.length===0) return <div style={{color:C.muted,textAlign:"center",padding:32,gridColumn:"1/-1"}}>{reservPeriod==="active"?"No active reservations.":"No reservation history yet."}</div>;
                return filtered.map(r=>{
                  const isToday=r.date===today();
                  const isCancelled=r.status==="cancelled";
                  const isServed=r.status==="served";
                  const isInProgress=r.status==="in-progress";
                  const statusColor=isCancelled?C.red:isServed?C.green:isInProgress?C.accent:isToday?C.accent:C.blue;
                  const statusBg=isCancelled?"#7f1d1d":isServed?"#14532d":isInProgress?"#92400e":isToday?"#92400e":"#1a2744";
                  const statusLabel=isCancelled?"Cancelled":isServed?"Served":isInProgress?"In Progress":isToday?"TODAY":r.date;
                  return(
                    <div key={r.id} style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${statusColor}33`,opacity:(isCancelled||isServed)?0.75:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                        <div><div style={{fontWeight:800,fontSize:15,color:C.text}}>{r.name}</div><div style={{fontSize:12,color:C.muted}}>📞 {r.phone}</div></div>
                        <Bdg bg={statusBg} tc={statusColor}>{statusLabel}</Bdg>
                      </div>
                      <div style={{display:"flex",gap:12,marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,color:C.text}}>🕐 {r.time}</span>
                        <span style={{fontSize:13,color:C.text}}>👥 {r.guests} guests</span>
                        <span style={{fontSize:13,color:C.text}}>🪑 Table {r.tableNumber}</span>
                      </div>
                      {r.note&&<div style={{fontSize:12,color:C.accent,marginBottom:8,fontStyle:"italic"}}>"{r.note}"</div>}
                      {reservPeriod==="active"&&!isCancelled&&!isServed&&(
                        <div style={{display:"flex",gap:6,marginTop:8}}>
                          {!isInProgress&&<button onClick={()=>{setEditing(r);setForm({rname:r.name,rphone:r.phone,rdate:r.date,rtime:r.time,rguests:r.guests,rtableId:r.tableId,rnote:r.note});setModal("editReservation");}}
                            style={{flex:1,background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Edit</button>}
                          {!isInProgress&&<button onClick={()=>seatGuest(r)} style={{flex:1,background:"#14532d",color:C.green,border:"none",borderRadius:7,padding:"6px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>🪑 Seat</button>}
                          <button onClick={()=>cancelReservation(r.id)} style={{flex:1,background:"#7f1d1d44",color:C.red,border:"none",borderRadius:7,padding:"6px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}

        {/* ── INVENTORY ── */}
        {view==="inventory"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>📦 Ingredients & Inventory</div>
              <button onClick={()=>{setEditing(null);setForm({});setModal("editIngredient");}} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"8px 18px",fontWeight:800,cursor:"pointer",fontSize:13}}>+ Add Ingredient</button>
            </div>
            {lowIngredients.length>0&&(
              <div style={{background:"#7f1d1d33",border:`1px solid ${C.red}55`,borderRadius:10,padding:"12px 16px",marginBottom:14}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:6}}>⚠️ Low Stock Alert ({lowIngredients.length} items)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{lowIngredients.map(i=><Bdg key={i.id} bg="#7f1d1d" tc={C.red}>{i.name}: {i.qty} {i.unit}</Bdg>)}</div>
              </div>
            )}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:C.surface}}>
                  {["Ingredient","Unit","In Stock","Min. Level","Cost/Unit","Stock Value","Status",""].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:C.muted,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {ingredients.map((ing,i)=>{
                    const isLow=ing.qty<=ing.minQty,isOut=ing.qty===0;
                    return(
                      <tr key={ing.id} style={{borderTop:`1px solid ${C.border}`,background:i%2===0?C.card:C.surface}}>
                        <td style={{padding:"10px 12px",fontWeight:600,color:C.text}}>{ing.name}</td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:13}}>{ing.unit}</td>
                        <td style={{padding:"10px 12px",fontWeight:800,fontSize:15,color:isOut?C.red:isLow?C.accent:C.green}}>{ing.qty}</td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:13}}>{ing.minQty}</td>
                        <td style={{padding:"10px 12px",color:C.muted,fontSize:13}}>{fmt(ing.costPerUnit)}</td>
                        <td style={{padding:"10px 12px",fontWeight:700,color:C.accent,fontSize:13}}>{fmt(ing.qty*ing.costPerUnit)}</td>
                        <td style={{padding:"10px 12px"}}><Bdg bg={isOut?"#7f1d1d":isLow?"#92400e":"#14532d"} tc={isOut?C.red:isLow?C.accent:C.green}>{isOut?"OUT":isLow?"LOW":"OK"}</Bdg></td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>{setEditing(ing);setForm({});setModal("restockIngredient");}} style={{background:"#14532d",color:C.green,border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+Restock</button>
                            <button onClick={()=>{setEditing(ing);setForm({iname:ing.name,iunit:ing.unit,iqty:ing.qty,iminqty:ing.minQty,icost:ing.costPerUnit});setModal("editIngredient");}} style={{background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Edit</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── REPORTS ── */}
        {view==="reports"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{fontWeight:800,fontSize:17}}>📊 Sales Reports</div>
              <div style={{display:"flex",gap:6}}>
                {[["today","Today"],["week","7 Days"],["month","30 Days"],["year","This Year"],["custom","Custom"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setReportPeriod(k)} style={{background:reportPeriod===k?C.accent:"transparent",color:reportPeriod===k?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",fontWeight:700,cursor:"pointer",fontSize:12}}>{l}</button>
                ))}
              </div>
            </div>
            {reportPeriod==="custom"&&(
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
                <span style={{fontSize:13,color:C.muted}}>From:</span>
                <input type="date" value={reportCustom.from} onChange={e=>setReportCustom(p=>({...p,from:e.target.value}))} style={{padding:"7px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:"none"}}/>
                <span style={{fontSize:13,color:C.muted}}>To:</span>
                <input type="date" value={reportCustom.to} onChange={e=>setReportCustom(p=>({...p,to:e.target.value}))} style={{padding:"7px 10px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,outline:"none"}}/>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:16}}>
              {[
                {l:"Revenue",      v:fmt(reportRevenue),    color:C.accent, icon:"💰"},
                {l:"Gross Profit", v:fmt(reportProfit),     color:C.green,  icon:"📈"},
                {l:"Transactions", v:reportSales.length,    color:C.blue,   icon:"🧾"},
                {l:"Avg. Bill",    v:fmt(reportSales.length?reportRevenue/reportSales.length:0), color:C.purple, icon:"📊"},
                {l:"Profit Margin",v:reportRevenue>0?Math.round((reportProfit/reportRevenue)*100)+"%":"0%", color:C.green, icon:"%"},
              ].map(s=><StatCard key={s.l} label={s.l} value={s.v} color={s.color} icon={s.icon}/>)}
            </div>
            <div style={{background:C.card,borderRadius:12,padding:18,marginBottom:14,border:`1px solid ${C.border}`}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:16}}>📈 Revenue Trend</div>
              {salesByDay.every(d=>d.v===0)?<div style={{textAlign:"center",color:C.muted,padding:24}}>No sales in this period.</div>
                :<div style={{display:"flex",alignItems:"flex-end",gap:6,height:140,paddingBottom:20}}>
                  {salesByDay.map((d,i)=>{ const h=Math.max(4,(d.v/maxBar)*116); return(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div title={fmt(d.v)} style={{width:"100%",height:h,background:C.accent,borderRadius:"4px 4px 0 0",opacity:0.85}}/>
                      <div style={{fontSize:9,color:C.muted,transform:"rotate(-30deg)",transformOrigin:"top center",whiteSpace:"nowrap"}}>{d.l}</div>
                    </div>
                  ); })}
                </div>
              }
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>🏆 Top Selling Items</div>
                {topItems.length===0?<div style={{color:C.muted,textAlign:"center",padding:16}}>No data.</div>
                  :topItems.map(([name,qty],i)=>{ const max=topItems[0][1]; return(
                    <div key={name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{width:20,fontSize:12,fontWeight:700,color:i===0?C.accent:C.muted,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                        <div style={{height:5,background:C.border,borderRadius:3,marginTop:3}}><div style={{width:`${(qty/max)*100}%`,height:"100%",background:C.accent,borderRadius:3}}/></div>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.accent,whiteSpace:"nowrap"}}>{qty} sold</div>
                    </div>
                  ); })
                }
              </div>
              <div style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>🧾 Recent Bills</div>
                <div style={{maxHeight:240,overflowY:"auto"}}>
                  {reportSales.length===0?<div style={{color:C.muted,textAlign:"center",padding:16}}>No sales yet.</div>
                    :[...reportSales].reverse().slice(0,10).map(s=>(
                      <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:C.text}}>Table {s.tableNumber} · {s.waiter}</div>
                          <div style={{fontSize:11,color:C.muted}}>{s.date} {s.time} · {s.paymentMethod}</div>
                        </div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <div style={{fontWeight:800,color:C.accent,fontSize:14}}>{fmt(s.finalTotal||s.total)}</div>
                          <button onClick={()=>printReceipt(s)} style={{background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>🖨</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STAFF ── */}
        {view==="staff"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:17}}>👥 Staff Management</div>
                <div style={{fontSize:13,color:C.muted}}>Manage staff roles, PINs, and tab access permissions.</div>
              </div>
              <button onClick={()=>{setEditing(null);setForm({srole:"Waiter",sshift:"Morning"});setModal("editStaff");}} style={{background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"8px 18px",fontWeight:800,cursor:"pointer",fontSize:13}}>+ Add Staff</button>
            </div>

            {/* Access matrix */}
            <div style={{background:C.card,borderRadius:12,padding:18,marginBottom:16,border:`1px solid ${C.border}`}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>🔒 Tab Access Permissions by Role</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.surface}}>
                    <th style={{padding:"8px 12px",textAlign:"left",color:C.muted,fontWeight:700}}>Tab</th>
                    {["Owner","Manager","Waiter","Chef","Cashier"].map(r=>(
                      <th key={r} style={{padding:"8px 12px",textAlign:"center",color:roleColor(r),fontWeight:700}}>{r}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {navItems.map((n,i)=>(
                      <tr key={n.id} style={{borderTop:`1px solid ${C.border}`,background:i%2===0?C.card:C.surface}}>
                        <td style={{padding:"8px 12px",color:C.text,fontWeight:600}}>{n.label}</td>
                        {["Owner","Manager","Waiter","Chef","Cashier"].map(r=>(
                          <td key={r} style={{padding:"8px 12px",textAlign:"center"}}>
                            {TAB_ACCESS[n.id]?.includes(r)
                              ?<span style={{color:C.green,fontSize:16}}>✓</span>
                              :<span style={{color:"#7f1d1d",fontSize:14}}>🔒</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))"}}>
              {staff.map(s=>{
                const sSales=Object.values(db.sales).flat().filter(x=>x.waiter===s.name);
                const sRevenue=sSales.reduce((a,x)=>a+x.total,0);
                return(
                  <div key={s.id} style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:17,color:C.text}}>{s.name}</div>
                        <Bdg bg={roleColor(s.role)+"22"} tc={roleColor(s.role)}>{s.role}</Bdg>
                      </div>
                      <button onClick={()=>{setEditing(s);setForm({sname:s.name,srole:s.role,spin:s.pin,sshift:s.shift});setModal("editStaff");}}
                        style={{background:C.surface,color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Edit</button>
                    </div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:4}}>🕐 Shift: {s.shift}</div>
                    <div style={{fontSize:12,color:C.muted,marginBottom:12}}>PIN: {"•".repeat(s.pin?.length||4)}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:C.muted}}>Bills</div><div style={{fontSize:16,fontWeight:800,color:C.accent}}>{sSales.length}</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:C.muted}}>Revenue</div><div style={{fontSize:12,fontWeight:800,color:C.green}}>{fmt(sRevenue)}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view==="backup"&&<RestaurantBackup db={db} setDb={setDb} showToast={showToast} institution={institution} saveInst={inst=>{setInstitution(inst);saveInstitution(LICENSE_KEY,inst);}} onShowReset={()=>setShowReset(true)} />}
      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {modal==="selectTable"&&(
        <Modal title="Select a Table" onClose={close}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:8}}>
            {tables.map(t=>(
              <button key={t.id} onClick={()=>{setOrderTable(t);setOrderItems([]);setModal("newOrder");}}
                style={{background:tableStatusBg(t.status),color:tableStatusColor(t.status),border:`1px solid ${tableStatusColor(t.status)}55`,borderRadius:10,padding:"12px",fontWeight:800,cursor:"pointer",fontSize:14}}>
                T{t.number}<div style={{fontSize:11,fontWeight:400}}>{t.section}</div><div style={{fontSize:10}}>{t.status}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal==="newOrder"&&orderTable&&(
        <Modal title={`New Order — Table ${orderTable.number}`} onClose={close} wide>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.muted,marginBottom:10}}>MENU</div>
              <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                {["All",...MENU_CATEGORIES].map(c=>(
                  <button key={c} onClick={()=>setMenuCat(c)} style={{background:menuCat===c?C.accent:"transparent",color:menuCat===c?C.bg:C.muted,border:`1px solid ${C.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{c}</button>
                ))}
              </div>
              <div style={{maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
                {filtMenuItems.map(m=>(
                  <button key={m.id} onClick={()=>addToOrder(m)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left"}}>
                    <span style={{fontSize:13,color:C.text,fontWeight:600}}>{m.emoji} {m.name}</span>
                    <span style={{fontSize:13,fontWeight:800,color:C.accent}}>{fmt(m.price)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.muted,marginBottom:10}}>ORDER</div>
              <div style={{flex:1,minHeight:200,maxHeight:300,overflowY:"auto"}}>
                {orderItems.length===0&&<div style={{color:C.muted,textAlign:"center",padding:32,fontSize:13}}>Tap menu items to add</div>}
                {orderItems.map(item=>(
                  <div key={item.menuId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                    <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{item.name}</div><div style={{fontSize:12,color:C.muted}}>{fmt(item.price)} each</div></div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <button onClick={()=>removeFromOrder(item.menuId)} style={{background:C.surface,color:C.text,border:`1px solid ${C.border}`,borderRadius:6,width:26,height:26,cursor:"pointer",fontWeight:800}}>−</button>
                      <span style={{fontWeight:800,color:C.accent,minWidth:20,textAlign:"center"}}>{item.qty}</span>
                      <button onClick={()=>addToOrder(menu.find(m=>m.id===item.menuId))} style={{background:C.surface,color:C.text,border:`1px solid ${C.border}`,borderRadius:6,width:26,height:26,cursor:"pointer",fontWeight:800}}>+</button>
                      <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:60,textAlign:"right"}}>{fmt(item.price*item.qty)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Row label="Special instructions"><input style={iS} type="text" placeholder="e.g. No pepper…" value={form.orderNote||""} onChange={fld("orderNote")}/></Row>
              <div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:16,color:C.accent}}>
                  <span>Total</span><span>{fmt(orderTotal)}</span>
                </div>
              </div>
              <button onClick={submitOrder} disabled={!orderItems.length} style={{background:orderItems.length?C.accent:C.surface,color:orderItems.length?C.bg:C.muted,border:"none",borderRadius:8,padding:"12px 0",fontWeight:800,cursor:orderItems.length?"pointer":"default",fontSize:15}}>
                🍳 Send to Kitchen
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal==="bill"&&billOrder&&(
        <Modal title={`Bill — Table ${billOrder.tableNumber}`} onClose={close}>
          <div style={{background:C.surface,borderRadius:10,padding:14,marginBottom:14}}>
            {billOrder.items.map((item,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderTop:i>0?`1px solid ${C.border}`:"none"}}>
                <span style={{color:C.text}}>{item.qty}× {item.name}</span>
                <span style={{color:C.muted}}>{fmt(item.price*item.qty)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:16,color:C.accent,borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:8}}>
              <span>Subtotal</span><span>{fmt(billOrder.total)}</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Discount %"><input style={iS} type="number" min="0" max="100" value={form.discount??0} onChange={fld("discount")}/></Row>
            <Row label="Payment Method">
              <select style={iS} value={form.paymentMethod||"Cash"} onChange={fld("paymentMethod")}>
                {["Cash","MoMo","Card","Bank Transfer"].map(m=><option key={m}>{m}</option>)}
              </select>
            </Row>
          </div>
          {form.discount>0&&<div style={{background:"#14532d33",borderRadius:8,padding:"9px 14px",marginBottom:12,fontSize:14,color:C.green}}>After discount: <b>{fmt(billOrder.total*(1-Number(form.discount)/100))}</b></div>}
          <button onClick={settleBill} style={{width:"100%",background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"12px 0",fontWeight:800,cursor:"pointer",fontSize:15}}>✓ Settle & Print Receipt</button>
        </Modal>
      )}

      {modal==="editMenuItem"&&(
        <Modal title={editing?"Edit Menu Item":"Add Menu Item"} onClose={close}>
          <Row label="Item Name"><input style={iS} type="text" value={form.mname||""} onChange={fld("mname")}/></Row>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Category"><select style={iS} value={form.mcat||"Mains"} onChange={fld("mcat")}>{MENU_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Row>
            <Row label="Emoji"><input style={iS} type="text" maxLength={2} value={form.memoji||""} onChange={fld("memoji")}/></Row>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Selling Price (GH₵)"><input style={iS} type="number" value={form.mprice||""} onChange={fld("mprice")}/></Row>
            <Row label="Cost Price (GH₵)"><input style={iS} type="number" value={form.mcost||""} onChange={fld("mcost")}/></Row>
          </div>
          <Row label="Available?"><select style={iS} value={form.mavail||"true"} onChange={fld("mavail")}><option value="true">Yes — on menu</option><option value="false">No — hide from menu</option></select></Row>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveMenuItem} style={{flex:1,background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"10px 0",fontWeight:800,cursor:"pointer"}}>{editing?"Save Changes":"Add Item"}</button>
            {editing&&<button onClick={()=>{if(window.confirm("Remove?")) deleteMenuItem(editing.id);}} style={{background:"#7f1d1d",color:C.red,border:"none",borderRadius:8,padding:"10px 14px",fontWeight:800,cursor:"pointer"}}>Delete</button>}
          </div>
        </Modal>
      )}

      {modal==="editIngredient"&&(
        <Modal title={editing?"Edit Ingredient":"Add Ingredient"} onClose={close}>
          <Row label="Name"><input style={iS} type="text" value={form.iname||""} onChange={fld("iname")}/></Row>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Unit"><input style={iS} type="text" placeholder="kg, L, carton…" value={form.iunit||""} onChange={fld("iunit")}/></Row>
            <Row label="Cost per Unit (GH₵)"><input style={iS} type="number" value={form.icost||""} onChange={fld("icost")}/></Row>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Current Qty"><input style={iS} type="number" value={form.iqty||""} onChange={fld("iqty")}/></Row>
            <Row label="Min. Qty (alert level)"><input style={iS} type="number" value={form.iminqty||""} onChange={fld("iminqty")}/></Row>
          </div>
          <button onClick={saveIngredient} style={{width:"100%",background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"10px 0",fontWeight:800,cursor:"pointer",marginTop:6}}>{editing?"Save Changes":"Add Ingredient"}</button>
        </Modal>
      )}

      {modal==="restockIngredient"&&editing&&(
        <Modal title={`Restock — ${editing.name}`} onClose={close}>
          <div style={{background:C.surface,borderRadius:8,padding:"10px 14px",marginBottom:14,color:C.muted,fontSize:14}}>Current: <b style={{color:C.text}}>{editing.qty} {editing.unit}</b></div>
          <Row label={`Add Qty (${editing.unit})`}><input style={iS} type="number" min="1" value={form.addQty||""} onChange={fld("addQty")}/></Row>
          <button onClick={restockIngredient} style={{width:"100%",background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontWeight:800,cursor:"pointer"}}>Confirm Restock</button>
        </Modal>
      )}

      {modal==="editReservation"&&(
        <Modal title={editing?"Edit Reservation":"New Reservation"} onClose={close}>
          <Row label="Guest Name"><input style={iS} type="text" value={form.rname||""} onChange={fld("rname")}/></Row>
          <Row label="Phone"><input style={iS} type="text" value={form.rphone||""} onChange={fld("rphone")}/></Row>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Date"><input style={iS} type="date" value={form.rdate||today()} onChange={fld("rdate")}/></Row>
            <Row label="Time"><input style={iS} type="time" value={form.rtime||"12:00"} onChange={fld("rtime")}/></Row>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Row label="Guests"><input style={iS} type="number" min="1" value={form.rguests||2} onChange={fld("rguests")}/></Row>
            <Row label="Table"><select style={iS} value={form.rtableId||""} onChange={fld("rtableId")}><option value="">— Select table —</option>{tables.map(t=><option key={t.id} value={t.id}>Table {t.number} ({t.capacity} seats · {t.section})</option>)}</select></Row>
          </div>
          <Row label="Note"><input style={iS} type="text" placeholder="e.g. Birthday…" value={form.rnote||""} onChange={fld("rnote")}/></Row>
          <button onClick={saveReservation} style={{width:"100%",background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"10px 0",fontWeight:800,cursor:"pointer",marginTop:6}}>{editing?"Save Changes":"Confirm Reservation"}</button>
        </Modal>
      )}

      {modal==="editStaff"&&(
        <Modal title={editing?"Edit Staff":"Add Staff"} onClose={close}>
          <Row label="Name"><input style={iS} type="text" value={form.sname||""} onChange={fld("sname")}/></Row>
          <div>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Roles (select all that apply)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {["Owner","Manager","Waiter","Chef","Cashier","Bartender","Delivery"].map(r=>{
                const cur=form.sroles||(editing?.roles)||[editing?.role||"Waiter"];
                const checked=cur.includes(r);
                return(
                  <button key={r} type="button" onClick={()=>setForm(p=>{
                    const prev2=p.sroles||(editing?.roles)||[editing?.role||"Waiter"];
                    const next=checked?prev2.filter(x=>x!==r):[...prev2,r];
                    return{...p,sroles:next.length?next:prev2};
                  })} style={{padding:"5px 12px",borderRadius:6,border:`1.5px solid ${checked?C.accent:C.border}`,background:checked?C.accent+"22":"transparent",color:checked?C.accent:C.muted,fontWeight:checked?700:400,cursor:"pointer",fontSize:12}}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <Row label="Shift">
            <select style={iS} value={form.sshift||"Morning"} onChange={fld("sshift")}>
              {["Morning","Evening","All Day","Night"].map(s=><option key={s}>{s}</option>)}
            </select>
          </Row>
          <Row label="PIN (4 digits)"><input style={iS} type="password" maxLength={6} value={form.spin||""} onChange={fld("spin")}/></Row>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={saveStaff} style={{flex:1,background:C.accent,color:C.bg,border:"none",borderRadius:8,padding:"10px 0",fontWeight:800,cursor:"pointer"}}>{editing?"Save Changes":"Add Staff"}</button>
            {editing&&<button onClick={()=>{setDb(prev=>({...prev,staff:prev.staff.filter(s=>s.id!==editing.id)})); showToast("Removed.","warn"); close();}} style={{background:"#7f1d1d",color:C.red,border:"none",borderRadius:8,padding:"10px 14px",fontWeight:800,cursor:"pointer"}}>Remove</button>}
          </div>
        </Modal>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
