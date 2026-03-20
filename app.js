// Service worker managed below

// ── Browser History API (back/forward button support) ──
let _historyPushing = false;

function _pushState(url){
  if(_historyPushing) return;
  // Use full URL to ensure iOS Safari registers it properly
  const fullUrl = window.location.pathname + url;
  history.pushState({url: fullUrl}, '', fullUrl);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(e){
  if(!e.state && !window.location.search) return; // iOS initial load
  _historyPushing = true;
  const p = new URLSearchParams(window.location.search);
  const a = parseInt(p.get('a')), n = parseInt(p.get('n'));
  const page = p.get('page');

  if(a && n){
    // It's a sutra URL
    openSutra(a, n);
  } else if(page === 'home' || !page){
    showAdhyayaList();
  } else if(page === 'adhyaya'){
    const adhyaya = parseInt(p.get('a'));
    if(adhyaya) showSutraList(adhyaya);
    else showAdhyayaList();
  } else if(page === 'about')    { showAbout();    }
  else if(page === 'feedback')   { showFeedback(); }
  else if(page === 'vyakhya')    { showVyakhya();  }
  else if(page === 'install')    { showInstall();  }
  else { showAdhyayaList(); }

  _historyPushing = false;
});

// ── Load data from data.json ──
let RAW, INTRO, SUTRAS, ADHYAYA_META, BY_ADHYAYA, FLAT;

async function loadData(){
  const res = await fetch('data.json');
  RAW = await res.json();
  INTRO = RAW.intro;
  SUTRAS = RAW.sutras;
  ADHYAYA_META = {
    1:{dev:"प्रथमोऽध्यायः",iast:"Prathamo'dhyāyaḥ",topic:"संज्ञाप्रकरणम् — Definitions of Gaṇas & Syllable Weight"},
    2:{dev:"द्वितीयोऽध्यायः",iast:"Dvitīyo'dhyāyaḥ",topic:"छन्दःप्रकरणम् — Classification of Metres"},
    3:{dev:"तृतीयोऽध्यायः",iast:"Tṛtīyo'dhyāyaḥ",topic:"वैदिकछन्दःप्रकरणम् — Vedic Metres"},
    4:{dev:"चतुर्थोऽध्यायः",iast:"Caturtho'dhyāyaḥ",topic:"लौकिकछन्दांसि (पूर्वार्धम्) — Classical Metres I"},
    5:{dev:"पञ्चमोऽध्यायः",iast:"Pañcamo'dhyāyaḥ",topic:"लौकिकछन्दांसि (उत्तरार्धम्) — Classical Metres II"},
    6:{dev:"षष्ठोऽध्यायः",iast:"Ṣaṣṭho'dhyāyaḥ",topic:"वृत्तप्रकरणम् (पूर्वार्धम्) — Metre Patterns I"},
    7:{dev:"सप्तमोऽध्यायः",iast:"Saptamo'dhyāyaḥ",topic:"वृत्तप्रकरणम् (उत्तरार्धम्) — Metre Patterns II"},
    8:{dev:"अष्टमोऽध्यायः",iast:"Aṣṭamo'dhyāyaḥ",topic:"प्रत्ययप्रकरणम् — Combinatorics & Binary Algorithms"},
  };
  BY_ADHYAYA = {};
  for(const s of SUTRAS){ if(!BY_ADHYAYA[s.a]) BY_ADHYAYA[s.a]=[]; BY_ADHYAYA[s.a].push(s); }
  FLAT = [...SUTRAS];
}

let currentSutraIdx=0;

// ════════════════════════════════════════════════════════
// TRANSLITERATION ENGINE — IAST / HK / SLP1 / ITRANS → Devanāgarī
// ════════════════════════════════════════════════════════

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
    // Anusvāra / visarga
    if(s[i]==='ṃ'||s[i]==='ṁ'){r+='ं';i++;afterCons=false;continue;}
    if(s[i]==='ḥ'){r+='ः';i++;afterCons=false;continue;}
    // Consonant
    let cons='';
    for(const k of _CONS_KEYS){if(s.startsWith(k,i)){cons=k;break;}}
    if(cons){
      if(afterCons) r+='्';
      r+=_CONS_IAST[cons]; i+=cons.length; afterCons=true; continue;
    }
    // Vowel
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

// HK → IAST intermediate
function _hkToIast(s){
  let r='', i=0;
  while(i<s.length){
    const two=s.substring(i,i+2);
    if(two==='aa'){r+='ā';i+=2;} else if(two==='ii'){r+='ī';i+=2;}
    else if(two==='uu'){r+='ū';i+=2;} else if(two==='RR'){r+='ṝ';i+=2;}
    else if(two==='lR'){r+='ḷ';i+=2;} else if(two==='sh'){r+='ṣ';i+=2;}
    else if(two==='.n'||two==='.m'){r+='ṃ';i+=2;}
    else {
      const c=s[i];
      if(c==='A')r+='ā'; else if(c==='I')r+='ī'; else if(c==='U')r+='ū';
      else if(c==='R')r+='ṛ'; else if(c==='T')r+='ṭ'; else if(c==='D')r+='ḍ';
      else if(c==='N')r+='ṇ'; else if(c==='G')r+='ṅ'; else if(c==='J')r+='ñ';
      else if(c==='S')r+='ś'; else if(c==='M')r+='ṃ'; else if(c==='H')r+='ḥ';
      else r+=c;
      i++;
    }
  }
  return r;
}

// SLP1 → IAST
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

// ITRANS → IAST (common conventions)
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

// Detect input scheme
function _detectScheme(q){
  if(/[अ-ॿ]/.test(q)) return 'dev';
  if(/[āīūṛṝḷṃḥṭḍṇśṣñ]/i.test(q)) return 'iast';
  // SLP1: uses specific uppercase pattern
  if(/[AEIOUKG]/.test(q) && /[wqSzWQ]/.test(q)) return 'slp1';
  // HK: uppercase A I U R T D N S G J M H
  // R alone (for ṛ) is a strong HK indicator
  if(/[AIU]/.test(q) && /[TDNSR]/.test(q)) return 'hk';
  if(/[AIU]/.test(q)) return 'hk';
  // R alone without A/I/U still indicates HK (e.g. gRl, pRth)
  if(/[A-Z]/.test(q) && /R/.test(q)) return 'hk';
  // ITRANS: common patterns
  if(/aa|ii|oo|ee|Th|Dh|sh/.test(q)) return 'itrans';
  return 'iast'; // default
}

// Main: convert any query to Devanāgarī for matching
// Force a specific transliteration scheme
function queryToDevForced(q, scheme){
  if(!q) return {dev:'',scheme};
  if(scheme==='dev') return {dev:q.toLowerCase(), scheme};
  let iast = q;
  if(scheme==='hk')     iast = _hkToIast(q);
  else if(scheme==='slp1')   iast = _slp1ToIast(q);
  else if(scheme==='itrans')  iast = _itransToIast(q);
  // iast stays as-is
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
  else if(scheme==='itrans')  iast = _itransToIast(q);
  // iast stays as-is
  const dev = _iastToDev(iast);
  return {dev: dev.toLowerCase(), iast: iast.toLowerCase(), scheme};
}

function normDev(text){
  return (text||'').replace(/[।॥\s]+/g,' ').toLowerCase().trim();
}

// Devanāgarī digit converter
function _d(n){return String(n).replace(/[0-9]/g,d=>String.fromCharCode(0x0966+parseInt(d)));}

// Splash
function cpSutra(text){
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.querySelector('.syl-copy-btn');
    if(btn){btn.classList.add('ok');btn.textContent='✓';
      setTimeout(()=>{btn.classList.remove('ok');btn.textContent='⧉';},1400);}
  }).catch(()=>{});
}

// ── Devanāgarī digit → Arabic ──
function _da(s){ return String(s).replace(/[०-९]/g, c=>c.charCodeAt(0)-0x0966); }

// ── Linkify पि०सू० and पा०सू० references in tika text ──
function linkifyRefs(text){
  // पि०सू० X।Y  → clickable internal link
  text = text.replace(
    /(पि०सू०)\s+([०-९]+)।([०-९]+)/g,
    (match, pre, a, n) => {
      const aa=_da(a), nn=_da(n);
      return `<span class="ref-pingala" onclick="openSutra(${aa},${nn})" title="पिङ्गलसूत्रम् ${a}.${n}">${match}</span>`;
    }
  );
  // पा०सू० X।Y।Z  → ashtadhyayi.com link
  text = text.replace(
    /(पा०सू०)\s+([०-९]+)।([०-९]+)।([०-९]+)/g,
    (match, pre, a, p, s) => {
      const url=`https://www.ashtadhyayi.com/sutraani/${_da(a)}/${_da(p)}/${_da(s)}`;
      return `<a class="ref-panini" href="${url}" target="_blank" rel="noopener" title="Aṣṭādhyāyī ${a}.${p}.${s}">${match}</a>`;
    }
  );
  return text;
}

function applyUpdate(){
  if(window._newSW){
    window._newSW.postMessage({type:'SKIP_WAITING'});
  } else {
    window.location.reload();
  }
}

function renderSplash(){
  const lines=["नमस्तुङ्गशिरश्चुम्बिचन्द्रचामरचारवे ।","त्रैलोक्यनगरारम्भमूलस्तम्भाय शम्भवे ॥ १ ॥","",
    "श्रीमत्पिङ्गलनागोक्तच्छन्दःशास्त्रमहोदधेः ।","वृत्तानि मौक्तिकानीव कानिचिदिचिनोम्यहम् ॥ २ ॥","",
    "वेदानां प्रथमाङ्गस्य कवीनां नयनस्य च ।","पिङ्गलाचार्यसूत्रस्य मया वृत्तिर्विधास्यते ॥ ३ ॥","",
    "क्षीराब्धेरमृतं यद्वद्धृतं देवदानवैः ।","छन्दोऽब्धेः पिङ्गलाचार्यच्छन्दोऽमृतं तथोद्धृतम् ॥ ४ ॥"];
  document.getElementById('splash-shlokas').innerHTML=
    lines.map(l=>l?`<span class="sl">${l}</span>`:'<span style="display:block;height:.6rem"></span>').join('');
}

function goSplash(){
  document.getElementById('splash').style.display='flex';
  document.getElementById('app').style.display='none';
  _hist=[]; _hIdx=-1; _updateHistNav();
}
function enterApp(){
  // Show loader
  document.getElementById('splash').style.display='none';
  const loader=document.getElementById('loader');
  loader.style.display='flex';
  const bar=document.getElementById('load-bar');
  const pct=document.getElementById('load-pct');
  let p=0;
  const iv=setInterval(()=>{
    p += Math.random()*18+4;
    if(p>=100){p=100;clearInterval(iv);
      bar.style.width='100%';
      pct.textContent='100%';
      setTimeout(()=>{
        loader.style.display='none';
        const app=document.getElementById('app');
        app.style.display='flex';app.style.flexDirection='column';
        buildSidebar();renderIntroText();renderAdhyayaCards();
        // Always start on adhyAyasuchi, reset history
        showAdhyayaList();
        _hist=[]; _hIdx=-1;
        _updateHistNav();
        // Replace current history state so back from first page exits app
        history.replaceState({url: window.location.pathname+'?page=home'}, '', window.location.pathname+'?page=home');
      },300);
      return;
    }
    bar.style.width=p+'%';
    pct.textContent=Math.floor(p)+'%';
  },40);
}

// Sidebar
function buildSidebar(){
  const nav=document.getElementById('sidebar');
  let h=`<div class="nav-head">सूची · Contents</div>
    <div class="nav-a" id="nav-home" onclick="showAdhyayaList()">॰ अध्यायसूची</div>
    <div class="nav-head">अध्यायाः · Adhyāyāḥ</div>`;
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
    <div class="nav-a" id="nav-install" onclick="showInstall()">॰ ऐपरूपेण स्थापयतु</div>
    <div class="nav-a" id="nav-about" onclick="showAbout()">॰ अस्माकम् विषये</div>
    <div class="nav-a" id="nav-feedback" onclick="showFeedback()">॰ प्रतिक्रिया</div>`;
  nav.innerHTML=h;
  _wrapNav();
}




// Arrow tap:
// ▶ (closed) → open sub list in sidebar + show sutra list page
// ▼ (open)   → collapse sub list in sidebar only, no navigation
function onlyToggleAdhyaya(e, a){
  // ONLY expand/collapse sidebar sutra list — never navigate
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
  // Keep arrows in sync with open nav-sub state
  for(let i=1;i<=8;i++){
    const sub=document.getElementById('nav-sub-'+i);
    const arr=document.getElementById('nav-arr-'+i);
    if(arr && sub) arr.textContent=sub.classList.contains('open')?'▼':'▶';
  }
}

// Adhyaya list view
function renderIntroText(){
  const p=INTRO.split('\n').filter(l=>l.trim()&&!l.includes('॥')).slice(0,2).join(' ');
  document.getElementById('intro-text').textContent=p.substring(0,300)+'…';
}
function renderAdhyayaCards(){
  let h='';
  for(let a=1;a<=8;a++){
    const m=ADHYAYA_META[a], cnt=(BY_ADHYAYA[a]||[]).length;
    h+=`<div class="adhyaya-card" onclick="showSutraList(${a})">
      <div class="ac-num">${_d(a)}</div>
      <div class="ac-body">
        <div class="ac-dev">${m.dev}</div>
        <div class="ac-iast">${m.iast}</div>
        <div class="ac-topic">${m.topic}</div>
      </div>
      <div class="ac-count">${_d(cnt)} सूत्राणि</div>
    </div>`;
  }
  document.getElementById('adhyaya-cards').innerHTML=h;
}
function showAdhyayaList(){closeSidebar();showView('view-adhyaya-list');setNavActive('nav-home');_pushHist({type:'adhyaya-list'});_pushState('?page=home');}

// Sutra list view
function showSutraList(a){
  const m=ADHYAYA_META[a], sutras=BY_ADHYAYA[a]||[];
  document.getElementById('bc-adhyaya').textContent=m.dev;
  document.getElementById('sl-title').textContent=m.dev;
  document.getElementById('sl-sub').textContent=m.iast+' · '+m.topic;
  let h='';
  for(const s of sutras){
    const tag='';
    h+=`<div class="sutra-row" onclick="openSutra(${s.a},${s.n})">
      <div class="sr-num">${_d(s.a)}.${_d(s.n)}</div>
      <div class="sr-sutra">${s.s}${tag}</div>
    </div>`;
  }
  document.getElementById('sutra-rows').innerHTML=h;
  showView('view-sutra-list');setNavActive('nav-a'+a);
  document.getElementById('nav-sub-'+a)?.classList.add('open');
  document.getElementById('main').scrollTop=0;
  _pushHist({type:'sutra-list',a:a});
  _pushState('?page=adhyaya&a='+a);
}

// Single sutra view
function openSutra(a,n){
  const idx=FLAT.findIndex(s=>s.a===a&&s.n===n);
  if(idx<0)return;
  currentSutraIdx=idx;renderSutra(idx);
}
function renderSutra(idx){
  const s=FLAT[idx], m=ADHYAYA_META[s.a];
  document.getElementById('bc2-adhyaya').textContent=m.dev;
  document.getElementById('bc2-adhyaya').onclick=()=>showSutraList(s.a);
  document.getElementById('bc2-sutra').textContent=_d(s.a)+'.'+_d(s.n);
  const refEl=document.getElementById('sv-ref'); refEl.innerHTML=_d(s.a)+'.'+_d(s.n); refEl.style.cssText='display:block;text-align:center;width:fit-content;margin:0 auto;';
  const _esc=t=>t.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const copyBtn=`<button class="syl-copy-btn" title="सूत्रं प्रतिलिप्यताम्" onclick="cpSutra('${_esc(s.s)}')">⧉</button>`;
  document.getElementById('sv-sutra').innerHTML=s.s+copyBtn;
  let sec='';
  // sūtraprakāraḥ as first section
  if(s.p) sec+=`<div class="s-section"><div class="s-label">सूत्रप्रकारः</div><div class="prakar-box">${s.p}</div></div>`;
  sec+=block('पदच्छेदः','Pada-cchedaḥ',s.pc,'',false);
  sec+=block('अनुवृत्तिः','Anuvṛttiḥ',s.av,'anuvr',false);
  sec+=block('अधिकारः','Adhikāraḥ',s.ad,'adhikara',false);
  sec+=block('मृतसञ्जीवनी — हलायुधभट्टविरचिता','Mṛtasañjīvanī',s.h,'tika',true);
  if(s.t) sec+=block('टिप्पण्यः','Ṭippaṇyaḥ',s.t,'',false);

  document.getElementById('sv-sections').innerHTML=sec;
  document.getElementById('btn-prev').disabled=idx===0;
  document.getElementById('btn-next').disabled=idx===FLAT.length-1;

  // Update sequential top nav labels
  const prevS = idx>0 ? FLAT[idx-1] : null;
  const nextS = idx<FLAT.length-1 ? FLAT[idx+1] : null;
  document.getElementById('btn-prev').disabled = idx===0;
  document.getElementById('btn-next').disabled = idx===FLAT.length-1;
  const ref = document.getElementById('stn-ref');
  if(ref) ref.textContent = (prevS?_d(prevS.a)+'.'+_d(prevS.n)+' ◂':'')+' '+_d(s.a)+'.'+_d(s.n)+' '+(nextS?'▸ '+_d(nextS.a)+'.'+_d(nextS.n):'');
  // Push to visit history
  _pushHist({type:'sutra',a:s.a,n:s.n});
  showView('view-sutra');setNavActive('nav-s'+s.a+'-'+s.n);
  document.getElementById('main').scrollTop=0;
  closeSidebar();
  _pushState('?a='+s.a+'&n='+s.n);
}

function block(dev,iast,text,cls,required){
  if(!text&&!required)return'';
  let processed = text;
  if(cls==='tika') processed = linkifyRefs(processed);
  const content=processed
    ?`<div class="s-content ${cls}">${processed.replace(/\n/g,'<br>')}</div>`
    :`<div class="s-empty">—</div>`;
  return`<div class="s-section"><div class="s-label" title="${iast}">${dev}</div>${content}</div>`;
}
function navSutra(dir){
  const next=currentSutraIdx+dir;
  if(next<0||next>=FLAT.length)return;
  currentSutraIdx=next;renderSutra(next);
}

// Search
function _searchSutras(q){
  if(!q) return [];
  const nq = queryToDev(q);
  const qd = nq.dev, ql = q.toLowerCase();
  // Topbar search: सूत्रम् only
  return SUTRAS.filter(s=>{
    const sL=normDev(s.s);
    return sL.includes(qd)||sL.includes(ql);
  });
}

function doSearch(){
  const q=document.getElementById('q').value.trim();
  if(!q)return;
  const hits=_searchSutras(q);
  document.getElementById('sr-title').textContent='खोज-परिणामाः · Search Results';
  document.getElementById('sr-sub').textContent='"'+q+'" — '+_d(hits.length)+' परिणामाः';
  const hl=t=>{
    try{return t.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),m=>`<mark>${m}</mark>`);}
    catch(e){return t;}
  };
  let h='';
  if(!hits.length){
    h='<p style="color:var(--ink-muted);font-style:italic;font-size:.95rem">कोऽपि सूत्रो न प्राप्तः</p>';
  } else {
    for(const s of hits){
      const snip=s.h.substring(0,180).replace(/\n/g,' ');
      h+=`<div class="sr-result" onclick="openSutra(${s.a},${s.n})">
        <div class="res-ref">अध्यायः ${_d(s.a)} · सूत्रम् ${_d(s.a)}.${_d(s.n)} · ${s.p||'—'}</div>
        <div class="res-sutra">${s.s}</div>
        <div class="res-snippet">${snip}…</div>
      </div>`;
    }
  }
  document.getElementById('sr-list').innerHTML=h;
  showView('view-search');
}

function showVyakhya(){
  closeSidebar();showView('view-vyakhya');setNavActive('nav-vyakhya');document.getElementById('main').scrollTop=0;_pushHist({type:'vyakhya'});_pushState('?page=vyakhya');
  setTimeout(()=>document.getElementById('vq')?.focus(),300);
}

function doVyakhya(){
  const q=document.getElementById('vq').value.trim();
  if(!q) return;

  const doSutra = document.getElementById('vs-sutra').checked;
  const doPada  = document.getElementById('vs-pada').checked;
  const doTika  = document.getElementById('vs-tika').checked;
  const doAnuvr = document.getElementById('vs-anuvr').checked;

  const selectedScheme = document.getElementById('vscheme-select')?.value || 'auto';
  const nq = selectedScheme === 'auto' ? queryToDev(q) : queryToDevForced(q, selectedScheme);
  document.getElementById('vscheme').textContent =
    'Detected: ' + ({iast:'IAST',dev:'Devanāgarī',hk:'Harvard-Kyoto',slp1:'SLP1',itrans:'ITRANS'}[nq.scheme]||nq.scheme);

  const hits = SUTRAS.filter(s=>{
    const qd2=nq.dev, qi2=(nq.iast||q.toLowerCase());
    if(doSutra && (normDev(s.s).includes(qd2)||normDev(s.s).includes(qi2))) return true;
    if(doPada  && (normDev(s.pc).includes(qd2)||normDev(s.pc).includes(qi2))) return true;
    if(doTika  && (normDev(s.h).includes(qd2)||normDev(s.h).includes(qi2))) return true;
    if(doAnuvr && (normDev(s.av).includes(qd2)||normDev(s.av).includes(qi2))) return true;
    return false;
  });

  document.getElementById('vq-sub').textContent =
    '"' + q + '" — ' + _d(hits.length) + ' परिणामाः';

  let h='';
  if(!hits.length){
    h='<p style="color:var(--ink-muted);font-style:italic">कोऽपि न प्राप्तः — No results found.</p>';
  } else {
    for(const s of hits){
      // Find the best snippet (which field matched)
      let snip = '';
      const nqd = nq.dev, nqo = (nq.iast||q.toLowerCase());
      const hN = normDev(s.h);
      if(doTika && (hN.includes(nqd)||hN.includes(nqo))){
        const idx = Math.max(hN.indexOf(nqd), hN.indexOf(nqo));
        snip = s.h.substring(Math.max(0,idx-40), idx+140).replace(/\n/g,' ');
      } else if(doPada){
        snip = s.pc;
      }
      h+=`<div class="sr-result" onclick="openSutra(${s.a},${s.n})">
        <div class="res-ref">अध्यायः ${_d(s.a)} · सूत्रम् ${_d(s.a)}.${_d(s.n)}${s.p?' · '+s.p:''}</div>
        <div class="res-sutra">${s.s}</div>
        ${snip?`<div class="res-snippet">…${snip}…</div>`:''}
      </div>`;
    }
  }
  document.getElementById('vq-list').innerHTML = h;
}

function showInstall(){closeSidebar();showView('view-install');setNavActive('nav-install');document.getElementById('main').scrollTop=0;_pushHist({type:'install'});_pushState('?page=install');}
function showAbout(){closeSidebar();showView('view-about');setNavActive('nav-about');document.getElementById('main').scrollTop=0;_pushHist({type:'about'});_pushState('?page=about');}
function showFeedback(){closeSidebar();showView('view-feedback');setNavActive('nav-feedback');document.getElementById('main').scrollTop=0;_pushHist({type:'feedback'});_pushState('?page=feedback');}
function submitFeedback(){
  const name=document.getElementById('fb-name').value.trim();
  const msg=document.getElementById('fb-msg').value.trim();
  if(!msg){alert('कृपया सन्देशं लिखतु।');return;}
  // Open mailto as fallback (no backend)
  const body=encodeURIComponent((name?'From: '+name+'\n\n':'')+msg);
  window.open('mailto:?subject=Feedback: Piṅgala Chandaḥśāstram&body='+body);
  document.getElementById('fb-thanks').style.display='block';
  document.getElementById('fb-name').value='';
  document.getElementById('fb-msg').value='';
}

// ── Full navigation history ──
// Tracks every page visit: {type, data}
// type: 'sutra'|'adhyaya-list'|'sutra-list'|'about'|'feedback'|'vyakhya'|'install'|'search'
let _hist = [];
let _hIdx = -1;
let _skipHist = false;

function _pushHist(entry){
  if(_skipHist) return;
  // Truncate forward history
  _hist = _hist.slice(0, _hIdx + 1);
  // Don't duplicate consecutive same entry
  const last = _hist[_hist.length-1];
  if(last && JSON.stringify(last) === JSON.stringify(entry)) return;
  _hist.push(entry);
  _hIdx = _hist.length - 1;
  _updateHistNav();
}

function _updateHistNav(){
  const bar = document.getElementById('hist-nav');
  const hb  = document.getElementById('hist-back');
  const hf  = document.getElementById('hist-fwd');
  const hl  = document.getElementById('hist-label');
  if(!bar||!hb||!hf||!hl) return;
  // Show bar everywhere except splash (when app is visible)
  const appVisible = document.getElementById('app')?.style.display !== 'none';
  bar.classList.toggle('show', appVisible && _hist.length >= 1);
  const canBack = _hIdx > 0;
  const canFwd  = _hIdx < _hist.length - 1;
  hb.disabled = !canBack;
  hf.disabled = !canFwd;
  hb.style.opacity = canBack ? '1' : '0.3';
  hf.style.opacity = canFwd  ? '1' : '0.3';
  hb.innerHTML = '←';
  hf.innerHTML = '→';
  // Label: show page name of current entry
  const cur = _hist[_hIdx];
  hl.innerHTML = _histLabel(cur);
}

function _histLabel(entry){
  if(!entry) return '';
  if(entry.type==='sutra') return `<span style="font-size:.75rem;color:var(--slink-h)">${_d(entry.a)}.${_d(entry.n)}</span>`;
  const labels = {
    'adhyaya-list':'अध्यायसूची',
    'sutra-list':`अध्यायः ${_d(entry.a)}`,
    'about':'विषये','feedback':'प्रतिक्रिया',
    'vyakhya':'व्याख्या','install':'स्थापनम्','search':'खोज'
  };
  return `<span style="font-size:.72rem;color:var(--slink)">${labels[entry.type]||''}</span>`;
}

function _replayHist(entry){
  _skipHist = true;
  if(entry.type==='sutra') openSutra(entry.a, entry.n);
  else if(entry.type==='adhyaya-list') showAdhyayaList();
  else if(entry.type==='sutra-list') showSutraList(entry.a);
  else if(entry.type==='about') showAbout();
  else if(entry.type==='feedback') showFeedback();
  else if(entry.type==='vyakhya') showVyakhya();
  else if(entry.type==='install') showInstall();
  else if(entry.type==='search') showView('view-search');
  _skipHist = false;
  _updateHistNav();
}

function histBack(){
  if(_hIdx <= 0) return;
  _hIdx--;
  _replayHist(_hist[_hIdx]);
}

function histFwd(){
  if(_hIdx >= _hist.length-1) return;
  _hIdx++;
  _replayHist(_hist[_hIdx]);
}

function toggleSidebar(){
  const sb = document.getElementById('sidebar');
  if(sb.classList.contains('open')){ closeSidebar(); } else { openSidebar(); }
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
    var link = e.target.closest('.nav-a');
    // Only close sidebar if a SUTRA link was clicked (has id like nav-s1-3)
    // NOT adhyaya toggles (id like nav-a1) and NOT More section links
    if(link && link.id && link.id.match(/^nav-s\d+-\d+$/)){
      closeSidebar();
    }
  }, {capture: false});
}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));
  document.getElementById(id)?.classList.add('show');
  _updateHistNav();
}

// ── Boot: load data then initialise ──
loadData().then(() => {
  renderSplash();
  // Deep link / back-button entry support
  (function(){
    const p = new URLSearchParams(window.location.search);
    const a = parseInt(p.get('a')), n = parseInt(p.get('n'));
    const page = p.get('page');
    if(a && n){ enterApp(); openSutra(a, n); }
    else if(page){ enterApp(); }
  })();
}).catch(e => {
  console.error('Failed to load data.json:', e);
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;color:#8b1a1a;text-align:center"><h2>डेटा लोड नहीं हुआ</h2><p>Please check your internet connection and reload.</p></div>';
});

// ── Register Service Worker (PWA) ──
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('service-worker.js')
      .then(reg=>{
        console.log('[PWA] SW registered:', reg.scope);
        reg.update();
        // Detect when a new SW is waiting
        reg.addEventListener('updatefound', ()=>{
          const newSW = reg.installing;
          newSW.addEventListener('statechange', ()=>{
            if(newSW.state === 'installed' && navigator.serviceWorker.controller){
              // New version ready — show banner
              document.getElementById('update-banner')?.classList.add('show');
              window._newSW = newSW;
            }
          });
        });
      })
      .catch(e=>console.log('[PWA] SW failed:',e));

  });
}