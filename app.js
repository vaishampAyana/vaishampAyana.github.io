/* ═══════════════════════════════════════════
   पिङ्गलछन्दःशास्त्रम् — app.js
   ═══════════════════════════════════════════ */

/* ── Data (loaded from data.json) ── */
let INTRO = '', SUTRAS = [], BY_ADHYAYA = {}, FLAT = [];
let currentSutraIdx = 0;

const ADHYAYA_META = {
  1:{dev:"प्रथमोऽध्यायः"},
  2:{dev:"द्वितीयोऽध्यायः"},
  3:{dev:"तृतीयोऽध्यायः"},
  4:{dev:"चतुर्थोऽध्यायः"},
  5:{dev:"पञ्चमोऽध्यायः"},
  6:{dev:"षष्ठोऽध्यायः"},
  7:{dev:"सप्तमोऽध्यायः"},
  8:{dev:"अष्टमोऽध्यायः"},
};

/* ── Load data ── */
async function loadData() {
  const res = await fetch('data.json');
  const raw = await res.json();
  INTRO = raw.intro;
  SUTRAS = raw.sutras;
  for (const s of SUTRAS) {
    if (!BY_ADHYAYA[s.a]) BY_ADHYAYA[s.a] = [];
    BY_ADHYAYA[s.a].push(s);
  }
  FLAT = [...SUTRAS];
}

/* ══════════════════════════════════════════════════════
   TRANSLITERATION ENGINE — IAST / HK / SLP1 / ITRANS → Devanāgarī
══════════════════════════════════════════════════════ */

const _CONS_IAST = {
  'kh':'ख','gh':'घ','ṭh':'ठ','ḍh':'ढ','th':'थ','dh':'ध','ph':'फ','bh':'भ','ch':'छ','jh':'झ',
  'k':'क','g':'ग','ṅ':'ङ','c':'च','j':'ज','ñ':'ञ',
  'ṭ':'ट','ḍ':'ड','ṇ':'ण','t':'त','d':'द','n':'न',
  'p':'प','b':'ब','m':'म','y':'य','r':'र','l':'ल','v':'व','w':'व',
  'ś':'श','ṣ':'ष','s':'स','h':'ह','ḻ':'ळ'
};
const _IVOWEL = {
  'ai':'ऐ','au':'औ','ā':'आ','ī':'ई','ū':'ऊ','ṝ':'ॠ','ṛ':'ऋ','ḷ':'ऌ',
  'e':'ए','o':'ओ','a':'अ','i':'इ','u':'उ'
};
const _MVOWEL = {
  'ai':'ै','au':'ौ','ā':'ा','ī':'ी','ū':'ू','ṝ':'ॄ','ṛ':'ृ','ḷ':'ॢ',
  'e':'े','o':'ो','a':'','i':'ि','u':'ु'
};
const _CONS_KEYS = Object.keys(_CONS_IAST).sort((a,b)=>b.length-a.length);
const _VOW_KEYS  = ['ai','au','ā','ī','ū','ṝ','ṛ','ḷ','e','o','a','i','u'];

function _iastToDev(s){
  s = s.toLowerCase();
  let r='', i=0, afterCons=false;
  while(i<s.length){
    if(s[i]==='ṃ'||s[i]==='ṁ'){r+='ं';i++;afterCons=false;continue;}
    if(s[i]==='ḥ'){r+='ः';i++;afterCons=false;continue;}
    let cons='';
    for(const k of _CONS_KEYS){if(s.startsWith(k,i)){cons=k;break;}}
    if(cons){
      if(afterCons) r+='्';
      r+=_CONS_IAST[cons]; i+=cons.length; afterCons=true; continue;
    }
    let vow='';
    for(const k of _VOW_KEYS){if(s.startsWith(k,i)){vow=k;break;}}
    if(vow){
      r += afterCons ? _MVOWEL[vow] : _IVOWEL[vow];
      i+=vow.length; afterCons=false; continue;
    }
    if(afterCons){r+='्';afterCons=false;}
    r+=s[i]; i++;
  }
  if(afterCons) r+='्';
  return r;
}

function _hkToIast(s){
  /* Harvard-Kyoto → IAST
     Full mapping per Monier-Williams / standard HK convention:
     Vowels:  a A i I u U R RR lR lRR e ai o au M H
     Gutturals: k K g G G
     Palatals:  c C j J J
     Retroflexes: T Th D Dh N
     Dentals: t th d dh n
     Labials: p ph b bh m
     Semivowels: y r l v
     Sibilants: z S s
     Aspirate: h                                        */
  let r='', i=0;
  while(i<s.length){
    const two=s.substring(i,i+2);
    const three=s.substring(i,i+3);
    // Three-char sequences first
    if(three==='lRR'){r+='ḹ';i+=3;continue;}
    if(three==='RRR'){r+='ṝ';i+=3;continue;} // edge guard
    // Two-char sequences
    if(two==='aa'||two==='AA'){r+='ā';i+=2;continue;}
    if(two==='ii'||two==='II'){r+='ī';i+=2;continue;}
    if(two==='uu'||two==='UU'){r+='ū';i+=2;continue;}
    if(two==='RR'){r+='ṝ';i+=2;continue;}
    if(two==='lR'){r+='ḷ';i+=2;continue;}
    if(two==='Th'){r+='ṭh';i+=2;continue;}
    if(two==='Dh'){r+='ḍh';i+=2;continue;}
    if(two==='kh'){r+='kh';i+=2;continue;}
    if(two==='gh'){r+='gh';i+=2;continue;}
    if(two==='ch'){r+='ch';i+=2;continue;}
    if(two==='jh'){r+='jh';i+=2;continue;}
    if(two==='Th'){r+='ṭh';i+=2;continue;}
    if(two==='Dh'){r+='ḍh';i+=2;continue;}
    if(two==='th'){r+='th';i+=2;continue;}
    if(two==='dh'){r+='dh';i+=2;continue;}
    if(two==='ph'){r+='ph';i+=2;continue;}
    if(two==='bh'){r+='bh';i+=2;continue;}
    if(two==='.n'||two==='.m'){r+='ṃ';i+=2;continue;}
    if(two==='.h'){r+='ḥ';i+=2;continue;}
    // Single chars
    const c=s[i];
    switch(c){
      case 'a': r+='a'; break;
      case 'A': r+='ā'; break;
      case 'i': r+='i'; break;
      case 'I': r+='ī'; break;
      case 'u': r+='u'; break;
      case 'U': r+='ū'; break;
      case 'R': r+='ṛ'; break;      // ṛ  (short vocalic r)
      case 'e': r+='e'; break;
      case 'E': r+='ai'; break;     // ai
      case 'o': r+='o'; break;
      case 'O': r+='au'; break;     // au
      case 'M': r+='ṃ'; break;      // anusvāra
      case 'H': r+='ḥ'; break;      // visarga
      case 'k': r+='k'; break;
      case 'K': r+='kh'; break;     // kh (alternate)
      case 'g': r+='g'; break;
      case 'G': r+='ṅ'; break;      // ṅ
      case 'c': r+='c'; break;
      case 'C': r+='ch'; break;     // ch (alternate)
      case 'j': r+='j'; break;
      case 'J': r+='ñ'; break;      // ñ
      case 'T': r+='ṭ'; break;      // ṭ
      case 'D': r+='ḍ'; break;      // ḍ
      case 'N': r+='ṇ'; break;      // ṇ
      case 't': r+='t'; break;
      case 'd': r+='d'; break;
      case 'n': r+='n'; break;
      case 'p': r+='p'; break;
      case 'b': r+='b'; break;
      case 'm': r+='m'; break;
      case 'y': r+='y'; break;
      case 'r': r+='r'; break;
      case 'l': r+='l'; break;
      case 'L': r+='ḷ'; break;      // ḷ (vocalic l)
      case 'v': r+='v'; break;
      case 'w': r+='v'; break;      // alternate v
      case 'z': r+='ś'; break;      // ś  ← THE KEY FIX (zrI = śrī)
      case 'S': r+='ṣ'; break;      // ṣ
      case 's': r+='s'; break;
      case 'h': r+='h'; break;
      case 'f': r+='ṛ'; break;      // some HK variants use f for ṛ
      default:  r+=c;
    }
    i++;
  }
  return r;
}

function _slp1ToIast(s){
  return s.replace(/A/g,'ā').replace(/I/g,'ī').replace(/U/g,'ū')
    .replace(/f/g,'ṛ').replace(/F/g,'ṝ').replace(/x/g,'ḷ')
    .replace(/E/g,'ai').replace(/O/g,'au')
    .replace(/K/g,'kh').replace(/G/g,'gh').replace(/N/g,'ṅ')
    .replace(/C/g,'ch').replace(/J/g,'jh').replace(/Y/g,'ñ')
    .replace(/W/g,'ṭh').replace(/Q/g,'ḍh').replace(/R/g,'ṇ')
    .replace(/T/g,'th').replace(/D/g,'dh').replace(/P/g,'ph')
    .replace(/B/g,'bh').replace(/w/g,'ṭ').replace(/q/g,'ḍ')
    .replace(/S/g,'ś').replace(/z/g,'ṣ')
    .replace(/M/g,'ṃ').replace(/H/g,'ḥ');
}

function _itransToIast(s){
  return s
    .replace(/aa/g,'ā').replace(/ee/g,'ī').replace(/oo/g,'ū')
    .replace(/ii/g,'ī').replace(/uu/g,'ū')
    .replace(/A/g,'ā').replace(/I/g,'ī').replace(/U/g,'ū')
    .replace(/RRI/g,'ṝ').replace(/RR/g,'ṛ').replace(/R/g,'ṛ')
    .replace(/\.n/g,'ṃ').replace(/M/g,'ṃ').replace(/H/g,'ḥ')
    .replace(/Th/g,'ṭh').replace(/Dh/g,'ḍh').replace(/T/g,'ṭ').replace(/D/g,'ḍ')
    .replace(/N/g,'ṇ').replace(/sh/g,'ś').replace(/Sh/g,'ṣ').replace(/\.h/g,'ḥ')
    .replace(/chh/g,'ch').replace(/jn/g,'jñ').replace(/GY/g,'jñ');
}

function _detectScheme(q){
  if(!q) return 'dev';
  // Devanāgarī
  if(/[अ-ॿ]/.test(q)) return 'dev';
  // IAST diacritics are unambiguous
  if(/[āīūṛṝḷṃḥṭḍṇśṣñ]/i.test(q)) return 'iast';
  // HK-specific characters:
  //   z = ś,  S = ṣ,  T/D/N = retroflex,  G = ṅ,  J = ñ
  //   E = ai, O = au, M = ṃ, H = ḥ, R = ṛ
  //   Long vowels via doubling: aa, ii, uu, RR
  if(/aa|ii|uu|RR|lR/.test(q)) return 'hk';
  if(/[zSTDNGJEOMH]/.test(q)) return 'hk';        // unambiguous HK uppercase
  if(/[AIU]/.test(q)) return 'hk';                 // long vowels
  if(/[A-Z]/.test(q) && /[Rr]/.test(q)) return 'hk';
  // ITRANS patterns
  if(/aa|ii|oo|ee|Th|Dh|sh|RR/.test(q)) return 'itrans';
  return 'iast';
}

function queryToDevForced(q, scheme){
  if(!q) return {dev:'',scheme};
  if(scheme==='dev') return {dev:q.toLowerCase(), scheme};
  let iast = q;
  if(scheme==='hk')      iast = _hkToIast(q);
  else if(scheme==='slp1')    iast = _slp1ToIast(q);
  else if(scheme==='itrans')  iast = _itransToIast(q);
  const dev = _iastToDev(iast);
  return {dev: dev.toLowerCase(), iast: iast.toLowerCase(), scheme};
}

function queryToDev(q){
  if(!q) return {dev:'',scheme:'dev'};
  const scheme = _detectScheme(q);
  let iast = q;
  if(scheme==='dev')    return {dev:q.toLowerCase(), scheme};
  if(scheme==='hk')     iast = _hkToIast(q);
  else if(scheme==='slp1')   iast = _slp1ToIast(q);
  else if(scheme==='itrans') iast = _itransToIast(q);
  const dev = _iastToDev(iast);
  return {dev: dev.toLowerCase(), iast: iast.toLowerCase(), scheme};
}

function normDev(text){
  return (text||'').replace(/[।॥\s]+/g,' ').toLowerCase().trim();
}

/* ── Helpers ── */
function _d(n){ return String(n).replace(/[0-9]/g, d=>String.fromCharCode(0x0966+parseInt(d))); }
function _da(s){ return String(s).replace(/[०-९]/g, c=>c.charCodeAt(0)-0x0966); }

function cpSutra(text){
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.querySelector('.syl-copy-btn');
    if(btn){btn.classList.add('ok');btn.textContent='✓';
      setTimeout(()=>{btn.classList.remove('ok');btn.textContent='⧉';},1400);}
  }).catch(()=>{});
}

function linkifyRefs(text){
  text = text.replace(
    /(पि०सू०)\s+([०-९]+)।([०-९]+)/g,
    (match, pre, a, n) => {
      const aa=_da(a), nn=_da(n);
      return `<span class="ref-pingala" onclick="openSutra(${aa},${nn})" title="पिङ्गलसूत्रम् ${a}.${n}">${match}</span>`;
    }
  );
  text = text.replace(
    /(पा०सू०)\s+([०-९]+)।([०-९]+)।([०-९]+)/g,
    (match, pre, a, p, s) => {
      const url=`https://www.ashtadhyayi.com/sutraani/${_da(a)}/${_da(p)}/${_da(s)}`;
      return `<a class="ref-panini" href="${url}" target="_blank" rel="noopener" title="Aṣṭādhyāyī ${a}.${p}.${s}">${match}</a>`;
    }
  );
  return text;
}

/* ══════════════════════════════════════
   BROWSER HISTORY
══════════════════════════════════════ */
let _historyPushing = false;

function _pushState(url){
  if(_historyPushing) return;
  const base = window.location.origin + window.location.pathname;
  const fullUrl = base + url;
  try { history.pushState({url: fullUrl, ts: Date.now()}, document.title, fullUrl); }
  catch(e) { console.log('pushState failed:', e); }
}

window.addEventListener('popstate', function(e){
  if(!e.state && !window.location.search) return;
  _historyPushing = true;
  const p = new URLSearchParams(window.location.search);
  const a = parseInt(p.get('a')), n = parseInt(p.get('n'));
  const page = p.get('page');
  if(a && n)              { openSutra(a, n); }
  else if(!page || page==='home') { showAdhyayaList(); }
  else if(page==='adhyaya')   { const ad=parseInt(p.get('a')); if(ad) showSutraList(ad); else showAdhyayaList(); }
  else if(page==='about')     { showAbout(); }
  else if(page==='feedback')  { showFeedback(); }
  else if(page==='vyakhya')   { showVyakhya(); }
  else if(page==='install')   { showInstall(); }
  else { showAdhyayaList(); }
  _historyPushing = false;
});

/* ── Splash ── */
function renderSplash(){
  const lines=[
    "नमस्तुङ्गशिरश्चुम्बिचन्द्रचामरचारवे ।",
    "त्रैलोक्यनगरारम्भमूलस्तम्भाय शम्भवे ॥ १ ॥","",
    "श्रीमत्पिङ्गलनागोक्तच्छन्दःशास्त्रमहोदधौ ।",
    "वृत्तानि मौक्तिकानीव कानिचिद्वचिनोम्यहम् ॥ २ ॥"
  ];
  document.getElementById('splash-shlokas').innerHTML =
    lines.map(l=>l
      ? `<span class="sl">${l}</span>`
      : '<span style="display:block;height:.6rem"></span>'
    ).join('');
}

function goSplash(){
  document.getElementById('splash').style.display='flex';
  document.getElementById('app').style.display='none';
  _hist=[]; _hIdx=-1; _updateHistNav();
}

function enterApp(){
  document.getElementById('splash').style.display='none';
  const loader=document.getElementById('loader');
  loader.style.display='flex';
  const bar=document.getElementById('load-bar');
  const pct=document.getElementById('load-pct');
  let p=0;
  const iv=setInterval(()=>{
    p += Math.random()*18+4;
    if(p>=100){
      p=100; clearInterval(iv);
      bar.style.width='100%';
      if(pct) pct.textContent='100%';
      setTimeout(()=>{
        loader.style.display='none';
        const app=document.getElementById('app');
        app.style.display='flex'; app.style.flexDirection='column';
        buildSidebar(); renderIntroText(); renderAdhyayaCards();
        _hist=[]; _hIdx=-1;
        showAdhyayaList();
        _updateHistNav();
        history.replaceState(
          {url: window.location.origin+window.location.pathname+'?page=home', ts: Date.now()},
          document.title,
          window.location.origin+window.location.pathname+'?page=home'
        );
      },300);
      return;
    }
    bar.style.width=p+'%';
    if(pct) pct.textContent=Math.floor(p)+'%';
  },40);
}

/* ── Sidebar ── */
function buildSidebar(){
  const nav=document.getElementById('sidebar');
  let h=`<div class="nav-head">सूची</div>
    <div class="nav-a" id="nav-home" onclick="showAdhyayaList()">॰ अध्यायसूची</div>
    <div class="nav-head">अध्यायाः</div>`;
  for(let a=1;a<=8;a++){
    const m=ADHYAYA_META[a];
    h+=`<div class="nav-a" id="nav-a${a}" onclick="onlyToggleAdhyaya(event,${a})" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
      <span><span class="nav-num">${_d(a)}.</span>${m.dev}</span>
      <span id="nav-arr-${a}" style="font-size:.75rem;color:var(--iaccent-lt);flex-shrink:0;padding:0 .4rem">▶</span>
    </div>
    <div class="nav-sub" id="nav-sub-${a}">`;
    for(const s of (BY_ADHYAYA[a]||[]))
      h+=`<div class="nav-a" id="nav-s${s.a}-${s.n}" onclick="openSutra(${s.a},${s.n})">
        <span class="nav-num">${_d(s.a)}.${_d(s.n)}</span>${s.s}</div>`;
    h+=`</div>`;
  }
  h+=`<div class="nav-head">अन्यत् · More</div>
    <div class="nav-a" id="nav-vyakhya" onclick="showVyakhya()">॰ व्याख्यान्वेषणम्</div>
    <div class="nav-a" id="nav-install" onclick="showInstall()">॰ ऍपरूपेण स्थापयतु</div>
    <div class="nav-a" id="nav-about" onclick="showAbout()">॰ अस्माकं विषये</div>
    <div class="nav-a" id="nav-feedback" onclick="showFeedback()">॰ प्रतिक्रिया</div>`;
  nav.innerHTML=h;
  _wrapNav();
}

function onlyToggleAdhyaya(e, a){
  const sub = document.getElementById('nav-sub-'+a);
  const isOpen = sub?.classList.contains('open');
  for(let i=1;i<=8;i++){
    document.getElementById('nav-sub-'+i)?.classList.remove('open');
    const arr=document.getElementById('nav-arr-'+i);
    if(arr) arr.textContent='▶';
  }
  if(!isOpen){
    sub?.classList.add('open');
    const arr=document.getElementById('nav-arr-'+a);
    if(arr) arr.textContent='▼';
  }
}

function setNavActive(id){
  document.querySelectorAll('#sidebar .nav-a').forEach(el=>el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  for(let i=1;i<=8;i++){
    const sub=document.getElementById('nav-sub-'+i);
    const arr=document.getElementById('nav-arr-'+i);
    if(arr && sub) arr.textContent=sub.classList.contains('open')?'▼':'▶';
  }
}

/* ── Adhyaya list ── */
function renderIntroText(){
  const shlokaLines = [
    'नमस्तुङ्गशिरश्चुम्बिचन्द्रचामरचारवे ।',
    'त्रैलोक्यनगरारम्भमूलस्तम्भाय शम्भवे ॥ १ ॥','',
    'वेदानां प्रथमाङ्गस्य कवीनां नयनस्य च ।',
    'पिङ्गलाचार्यसूत्रस्य मया वृत्तिर्विधास्यते ॥ २ ॥','',
    'क्षीराब्धेरमृतं यद्वद्धृतं देवैः सदानवैः ।',
    'छन्दोऽब्धेः पिङ्गलाचार्य्यैश्छन्दोऽमृतं तथोद्धृतम् ॥ ३ ॥','',
    'श्रीमत्पिङ्गलनागोक्तछन्दः शास्त्रमहोदधौ ।',
    'वृत्तानि मौक्तिकानीव कानिचिद्वचिनोम्यहम् ॥ ४ ॥',
  ];
  const shlokas = shlokaLines.map(l =>
    l==='' ? '<span style="display:block;height:.5rem"></span>'
           : '<span style="display:block">'+l+'</span>'
  ).join('');
  const introPara = `इह हि त्रैवर्णिकानां साङ्गवेदाध्ययनमाम्नायते । अर्थावबोधपर्यन्तश्चाध्ययनविधिः । वेदाङ्गं च छन्दः । ततस्तदध्ययनविधित्वात्तदनुष्ठेयम्‌ । अथ ‘त्रिष्टुभा यजति, बृहत्या गायति, गायत्र्या स्तौति’ इत्येवमादिश्रवणात्‌ अर्थायातमनुष्टुभादिज्ञानम् ‌। किं च छन्दसामपरिज्ञानात्प्रत्युत प्रत्यवायः श्रूयते । यथा — ‘यो ह वा अविदितार्षेयच्छन्दोदैवतब्राह्मणेन मन्त्रेण याजयति वाध्यापयति वा स्थाणुं वर्च्छति गर्तं वा पद्यते वा म्रियते पापीयान्‌ भवति । यातयामान्यस्य छन्दांसि भवन्ति ।’ (छं०ब्रा० ३।७।५) तस्माच्छन्दोज्ञानं कर्तव्यं, तदर्थमिदं शास्त्रमारभ्यते । तथा लघुनोपायेन शास्त्रावबोधसिद्ध्यर्थ संज्ञाः परिभाषते सूत्रकारः —`;
  const el = document.getElementById('intro-text');
  if(el){
    el.innerHTML =
      `<div style="font-family:'Noto Serif Devanagari',serif;font-size:1.15rem;color:#8b2a2a;line-height:2.2;margin-bottom:1.5rem;text-align:center">${shlokas}</div>
       <div style="font-family:'Noto Serif Devanagari',serif;font-size:1.05rem;color:#4a6a8a;line-height:2.1;font-style:normal;border-left:3px solid #7a9ab0;padding-left:1rem">${introPara}</div>`;
    el.style.cssText = 'margin-bottom:2rem';
  }
}

function renderAdhyayaCards(){
  let h='';
  for(let a=1;a<=8;a++){
    const m=ADHYAYA_META[a], cnt=(BY_ADHYAYA[a]||[]).length;
    h+=`<div class="adhyaya-card" onclick="showSutraList(${a})">
      <div class="ac-num">${_d(a)}</div>
      <div class="ac-body">
        <div class="ac-dev">${m.dev}</div>
      </div>
      <div class="ac-count">${_d(cnt)} सूत्राणि</div>
    </div>`;
  }
  document.getElementById('adhyaya-cards').innerHTML=h;
}

function showAdhyayaList(){
  closeSidebar(); showView('view-adhyaya-list');
  setNavActive('nav-home');
  _pushHist({type:'adhyaya-list'});
  _pushState('?page=home');
}

/* ── Sutra list ── */
function showSutraList(a){
  const m=ADHYAYA_META[a], sutras=BY_ADHYAYA[a]||[];
  document.getElementById('bc-adhyaya').textContent=m.dev;
  document.getElementById('sl-title').textContent=m.dev;
  document.getElementById('sl-sub').textContent='';
  let h='';
  for(const s of sutras){
    h+=`<div class="sutra-row" onclick="openSutra(${s.a},${s.n})">
      <div class="sr-num">${_d(s.a)}.${_d(s.n)}</div>
      <div class="sr-sutra">${s.s}</div>
    </div>`;
  }
  document.getElementById('sutra-rows').innerHTML=h;
  showView('view-sutra-list'); setNavActive('nav-a'+a);
  document.getElementById('nav-sub-'+a)?.classList.add('open');
  document.getElementById('main').scrollTop=0;
  _pushHist({type:'sutra-list',a:a});
  _pushState('?page=adhyaya&a='+a);
}

/* ── Single sutra ── */
function openSutra(a,n){
  const idx=FLAT.findIndex(s=>s.a===a&&s.n===n);
  if(idx<0)return;
  currentSutraIdx=idx; renderSutra(idx);
}

function renderSutra(idx){
  const s=FLAT[idx], m=ADHYAYA_META[s.a];
  document.getElementById('bc2-adhyaya').textContent=m.dev;
  document.getElementById('bc2-adhyaya').onclick=()=>showSutraList(s.a);
  document.getElementById('bc2-sutra').textContent=_d(s.a)+'.'+_d(s.n);

  const refEl=document.getElementById('sv-ref');
  refEl.innerHTML=_d(s.a)+'.'+_d(s.n);
  refEl.style.cssText='display:block;text-align:center;width:fit-content;margin:0 auto;';

  const _esc=t=>t.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const copyBtn=`<button class="syl-copy-btn" title="सूत्रं प्रतिलिप्यताम्" onclick="cpSutra('${_esc(s.s)}')">⧉</button>`;
  document.getElementById('sv-sutra').innerHTML=s.s+copyBtn;

  let sec='';
  if(s.p) sec+=`<div class="s-section"><div class="s-label">सूत्रप्रकारः</div><div class="prakar-box">${s.p}</div></div>`;
  sec+=block('पदच्छेदः','Pada-cchedaḥ',s.pc,'',false);
  sec+=block('अनुवृत्तिः','Anuvṛttiḥ',s.av,'anuvr',false);
  sec+=block('अधिकारः','Adhikāraḥ',s.ad,'adhikara',false);
  sec+=block('मृतसञ्जीवनी — हलायुधभट्टविरचिता','Mṛtasañjīvanī',s.h,'tika',true);
  if(s.t) sec+=block('टिप्पण्यः','Ṭippaṇyaḥ',s.t,'',false);
  document.getElementById('sv-sections').innerHTML=sec;

  const prevS = idx>0 ? FLAT[idx-1] : null;
  const nextS = idx<FLAT.length-1 ? FLAT[idx+1] : null;
  document.getElementById('btn-prev').disabled = idx===0;
  document.getElementById('btn-next').disabled = idx===FLAT.length-1;
  const ref = document.getElementById('stn-ref');
  if(ref) ref.textContent =
    (prevS?_d(prevS.a)+'.'+_d(prevS.n)+' ◂':'')+' '+_d(s.a)+'.'+_d(s.n)+' '+(nextS?'▸ '+_d(nextS.a)+'.'+_d(nextS.n):'');

  _pushHist({type:'sutra',a:s.a,n:s.n});
  showView('view-sutra'); setNavActive('nav-s'+s.a+'-'+s.n);
  document.getElementById('main').scrollTop=0;
  closeSidebar();
  _pushState('?a='+s.a+'&n='+s.n);
}

function block(dev, iast, text, cls, required){
  if(!text && !required) return '';
  let processed = text;
  if(cls==='tika') processed = linkifyRefs(processed);
  const content = processed
    ? `<div class="s-content ${cls}">${processed.replace(/\n/g,'<br>')}</div>`
    : `<div class="s-empty">—</div>`;
  return `<div class="s-section"><div class="s-label" title="${iast}">${dev}</div>${content}</div>`;
}

function navSutra(dir){
  const next=currentSutraIdx+dir;
  if(next<0||next>=FLAT.length)return;
  currentSutraIdx=next; renderSutra(next);
}

/* ── Top-bar Search — sūtra text only ── */
function _searchSutras(q){
  if(!q || q.length < 1) return [];
  const nq = queryToDev(q);
  const qd = nq.dev;
  const qi = (nq.iast || q).toLowerCase();
  const ql = q.toLowerCase();
  return SUTRAS.filter(s=>{
    const sL = normDev(s.s);
    return sL.includes(qd) || sL.includes(qi) || sL.includes(ql);
  });
}

/* ── highlight helper: wraps every match of devQuery in <mark> ── */
function _highlight(text, devQuery, rawQuery){
  if(!text) return '';
  // Escape for regex
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  // Try to highlight by dev form first, then raw input
  let out = text;
  if(devQuery && devQuery.length > 0){
    try { out = out.replace(new RegExp(esc(devQuery),'g'), m=>`<mark>${m}</mark>`); } catch(e){}
  }
  if(rawQuery && rawQuery.length > 0 && rawQuery !== devQuery){
    try { out = out.replace(new RegExp(esc(rawQuery),'gi'), m=>`<mark>${m}</mark>`); } catch(e){}
  }
  return out;
}

function doSearch(){
  const q = document.getElementById('q').value.trim();

  // Clear results if empty
  if(!q){
    document.getElementById('sr-list').innerHTML='';
    document.getElementById('sr-title').textContent='';
    document.getElementById('sr-sub').textContent='';
    return;
  }

  // Show hint for very short single-char queries that are ambiguous
  const nq   = queryToDev(q);
  const hits  = _searchSutras(q);

  document.getElementById('sr-title').textContent = 'परिणामाः · Search Results';
  document.getElementById('sr-sub').textContent   = '"'+q+'" — '+_d(hits.length)+' परिणामाः';

  const qd = nq.dev;
  const qi = (nq.iast||q).toLowerCase();

  let h='';
  if(!hits.length){
    h='<p style="color:var(--ink-muted);font-style:italic;font-size:.95rem">कोऽपि सूत्रो न प्राप्तः</p>';
  } else {
    for(const s of hits){
      // Find best snippet: prefer tika match, fallback to sutra
      let snip = '';
      const hN = normDev(s.h);
      const matchIdx = hN.includes(qd) ? hN.indexOf(qd)
                     : hN.includes(qi) ? hN.indexOf(qi) : -1;
      if(matchIdx >= 0){
        snip = s.h.substring(Math.max(0, matchIdx-30), matchIdx+160).replace(/\n/g,' ');
        snip = _highlight(snip, qd, qi);
      }
      const highlightedSutra = _highlight(s.s, qd, qi);
      h+=`<div class="sr-result" onclick="openSutra(${s.a},${s.n})">
        <div class="res-ref">अध्यायः ${_d(s.a)} · सूत्रम् ${_d(s.a)}.${_d(s.n)} · ${s.p||'—'}</div>
        <div class="res-sutra">${highlightedSutra}</div>
        ${snip ? `<div class="res-snippet">…${snip}…</div>` : ''}
      </div>`;
    }
  }
  document.getElementById('sr-list').innerHTML=h;
  showView('view-search');
}

/* ── Advanced Vyākhya Search ── */
function showVyakhya(){
  closeSidebar(); showView('view-vyakhya');
  setNavActive('nav-vyakhya');
  document.getElementById('main').scrollTop=0;
  _pushHist({type:'vyakhya'}); _pushState('?page=vyakhya');
  setTimeout(()=>document.getElementById('vq')?.focus(),300);
}

function doVyakhya(){
  const q = document.getElementById('vq').value.trim();
  if(!q) return;

  const doSutra = document.getElementById('vs-sutra').checked;
  const doPada  = document.getElementById('vs-pada').checked;
  const doTika  = document.getElementById('vs-tika').checked;
  const doAnuvr = document.getElementById('vs-anuvr').checked;

  const selectedScheme = document.getElementById('vscheme-select')?.value || 'auto';
  const nq = selectedScheme==='auto' ? queryToDev(q) : queryToDevForced(q, selectedScheme);

  document.getElementById('vscheme').textContent =
    'Detected: '+({iast:'IAST',dev:'Devanāgarī',hk:'Harvard-Kyoto',slp1:'SLP1',itrans:'ITRANS'}[nq.scheme]||nq.scheme);

  const qd = nq.dev;
  const qi = (nq.iast || q).toLowerCase();

  const hits = SUTRAS.filter(s=>{
    if(doSutra && (normDev(s.s).includes(qd)  || normDev(s.s).includes(qi)))  return true;
    if(doPada  && (normDev(s.pc).includes(qd) || normDev(s.pc).includes(qi))) return true;
    if(doTika  && (normDev(s.h).includes(qd)  || normDev(s.h).includes(qi)))  return true;
    if(doAnuvr && (normDev(s.av).includes(qd) || normDev(s.av).includes(qi))) return true;
    return false;
  });

  document.getElementById('vq-sub').textContent='"'+q+'" — '+_d(hits.length)+' परिणामाः';

  let h='';
  if(!hits.length){
    h='<p style="color:var(--ink-muted);font-style:italic">कोऽपि न प्राप्तः — No results found.</p>';
  } else {
    for(const s of hits){
      const highlightedSutra = _highlight(s.s, qd, qi);

      // Find best snippet across enabled fields, with highlighting
      let snip = '';
      const tryField = (raw) => {
        if(!raw) return '';
        const norm = normDev(raw);
        const idx  = norm.includes(qd) ? norm.indexOf(qd)
                   : norm.includes(qi) ? norm.indexOf(qi) : -1;
        if(idx < 0) return '';
        let excerpt = raw.substring(Math.max(0,idx-40), Math.min(raw.length, idx+180)).replace(/\n/g,' ');
        return _highlight(excerpt, qd, qi);
      };

      if(doTika  && !snip) snip = tryField(s.h);
      if(doSutra && !snip) snip = tryField(s.s);
      if(doPada  && !snip) snip = tryField(s.pc);
      if(doAnuvr && !snip) snip = tryField(s.av);

      h+=`<div class="sr-result" onclick="openSutra(${s.a},${s.n})">
        <div class="res-ref">अध्यायः ${_d(s.a)} · सूत्रम् ${_d(s.a)}.${_d(s.n)}${s.p?' · '+s.p:''}</div>
        <div class="res-sutra">${highlightedSutra}</div>
        ${snip ? `<div class="res-snippet">…${snip}…</div>` : ''}
      </div>`;
    }
  }
  document.getElementById('vq-list').innerHTML=h;
}

/* ── Other pages ── */
function showInstall(){ closeSidebar(); showView('view-install'); setNavActive('nav-install'); document.getElementById('main').scrollTop=0; _pushHist({type:'install'}); _pushState('?page=install'); }
function showAbout(){ closeSidebar(); showView('view-about'); setNavActive('nav-about'); document.getElementById('main').scrollTop=0; _pushHist({type:'about'}); _pushState('?page=about'); }
function showFeedback(){ closeSidebar(); showView('view-feedback'); setNavActive('nav-feedback'); document.getElementById('main').scrollTop=0; _pushHist({type:'feedback'}); _pushState('?page=feedback'); }

/* ── Feedback — posts directly to Gmail via Formspree ── */
async function submitFeedback(){
  const name = document.getElementById('fb-name').value.trim();
  const msg  = document.getElementById('fb-msg').value.trim();
  if(!msg){ alert('Please write your message.'); return; }

  const btn = document.querySelector('#view-feedback button[onclick="submitFeedback()"]');
  const originalText = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = 'Sending…'; }

  try {
    const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name:    name || 'Anonymous',
        message: msg,
        _subject: 'Feedback — Piṅgala Chandaḥśāstram'
      })
    });
    if(res.ok){
      document.getElementById('fb-thanks').style.display = 'block';
      document.getElementById('fb-name').value = '';
      document.getElementById('fb-msg').value  = '';
    } else {
      alert('Message failed. Please try again.');
    }
  } catch(e){
    alert('Network error. Please check your connection.');
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = originalText; }
  }
}

/* ══════════════════════════════════════
   IN-APP NAVIGATION HISTORY
══════════════════════════════════════ */
let _hist = [], _hIdx = -1, _skipHist = false;

function _pushHist(entry){
  if(_skipHist) return;
  _hist = _hist.slice(0, _hIdx+1);
  const last = _hist[_hist.length-1];
  if(last && JSON.stringify(last)===JSON.stringify(entry)) return;
  _hist.push(entry);
  _hIdx = _hist.length-1;
  _updateHistNav();
}

function _updateHistNav(){
  const bar=document.getElementById('hist-nav');
  const hb=document.getElementById('hist-back');
  const hf=document.getElementById('hist-fwd');
  if(!bar||!hb||!hf) return;
  const appVisible = document.getElementById('app')?.style.display!=='none';
  bar.classList.toggle('show', appVisible);
  const canBack=_hIdx>0, canFwd=_hIdx<_hist.length-1;
  hb.disabled=!canBack; hf.disabled=!canFwd;
  hb.style.opacity=canBack?'1':'0.3';
  hf.style.opacity=canFwd?'1':'0.3';
  hb.innerHTML='←'; hf.innerHTML='→';
}

function _replayHist(entry){
  _skipHist=true;
  if(entry.type==='sutra')            openSutra(entry.a, entry.n);
  else if(entry.type==='adhyaya-list') showAdhyayaList();
  else if(entry.type==='sutra-list')   showSutraList(entry.a);
  else if(entry.type==='about')        showAbout();
  else if(entry.type==='feedback')     showFeedback();
  else if(entry.type==='vyakhya')      showVyakhya();
  else if(entry.type==='install')      showInstall();
  else if(entry.type==='search')       showView('view-search');
  _skipHist=false;
  _updateHistNav();
}

function sharePage(){
  const p=new URLSearchParams(window.location.search);
  const a=parseInt(p.get('a')), n=parseInt(p.get('n'));
  let title='पिङ्गलछन्दःशास्त्रम्', text='';
  if(a&&n){
    title=`पि०सू० ${_d(a)}.${_d(n)} — पिङ्गलछन्दःशास्त्रम्`;
    const s=FLAT&&FLAT.find(x=>x.a===a&&x.n===n);
    if(s&&s.sutra) text=s.sutra;
  }
  if(navigator.share){
    navigator.share({title,text,url:window.location.href}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(window.location.href).then(()=>{
      const btn=document.getElementById('hist-share');
      if(btn){const o=btn.innerHTML; btn.textContent='✓ Copied'; setTimeout(()=>{btn.innerHTML=o;},1500);}
    }).catch(()=>prompt('Copy URL:',window.location.href));
  }
}

function histBack(){ if(_hIdx<=0)return; _hIdx--; _replayHist(_hist[_hIdx]); }
function histFwd(){ if(_hIdx>=_hist.length-1)return; _hIdx++; _replayHist(_hist[_hIdx]); }

/* ── Sidebar open/close ── */
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  sb.classList.contains('open') ? closeSidebar() : openSidebar();
}
function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
  document.body.classList.remove('sidebar-closed');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
  document.body.classList.add('sidebar-closed');
}
function _wrapNav(){
  document.getElementById('sidebar').addEventListener('click', function(e){
    const link=e.target.closest('.nav-a');
    if(link && link.id && link.id.match(/^nav-s\d+-\d+$/)) closeSidebar();
  }, {capture:false});
}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));
  document.getElementById(id)?.classList.add('show');
  _updateHistNav();
}

/* ── Init ── */
async function init(){
  // Force clear old caches
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(regs=>{
      regs.forEach(r=>{ if(!r.active||!r.active.scriptURL.includes('service-worker.js')) r.unregister(); });
    });
    caches.keys().then(keys=>keys.forEach(k=>{ if(!k.includes('v11')) caches.delete(k); }));
  }

  await loadData();
  renderSplash();

  // Deep link support
  const p=new URLSearchParams(window.location.search);
  const a=parseInt(p.get('a')), n=parseInt(p.get('n'));
  if(a&&n){ enterApp(); openSutra(a,n); }

  // Register Service Worker
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('service-worker.js')
        .then(reg=>{ console.log('[PWA] SW registered:', reg.scope); reg.update(); })
        .catch(e=>console.log('[PWA] SW failed:',e));
    });
  }
}

init();
