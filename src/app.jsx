import { useState, useEffect } from "react";



/* ══════════════════════════════════════════
   ثوابت
══════════════════════════════════════════ */
/*
  قريش: خزامي #4A3382 (رئيسي)، بيج #CFB88F (ثانوي)، خزامي فاتح #6B5CA6 (مساعد)
  أذان:  أخضر تيلي #00917C (رئيسي)، بني داكن #5D3E38 (ثانوي)، برتقالي محروق #CB704A، بيج فاتح #E4D8C2
*/
const COMPANIES = [
  {
    id:"quraish", name:"قريش", fullName:"شركة قريش المحدودة",
    color:"#4A3382",       /* خزامي رئيسي */
    light:"#EDE8F8",       /* خلفية فاتحة مشتقة من الخزامي */
    accent:"#6B5CA6",      /* خزامي فاتح */
    beige:"#CFB88F",       /* بيج ثانوي */
    bg:"#F2EEF9",          /* خلفية عامة للنظام */
    headerGrad:"linear-gradient(135deg,#2E1F5E,#4A3382)", /* هيدر متدرج */
  },
  {
    id:"adhan", name:"أذان", fullName:"شركة أذان المحدودة",
    color:"#00917C",       /* أخضر تيلي رئيسي */
    light:"#E4D8C2",       /* بيج فاتح */
    accent:"#CB704A",      /* برتقالي محروق */
    beige:"#E4D8C2",       /* بيج */
    bg:"#EFF7F5",          /* خلفية عامة للنظام */
    headerGrad:"linear-gradient(135deg,#5D3E38,#00917C)", /* هيدر متدرج */
  },
];
const DEPT_LIST = [
  {id:"d01",name:"مخيم منى"},{id:"d02",name:"الشؤون الإدارية والمالية"},{id:"d03",name:"التسجيل"},
  {id:"d04",name:"اللجنة الثقافية"},{id:"d05",name:"التقنية ومتابعة التقييم"},{id:"d06",name:"اللجنة الإعلامية"},
  {id:"d07",name:"تجهيز موقع منى"},{id:"d08",name:"عرفة"},{id:"d09",name:"مزدلفة"},
  {id:"d10",name:"المستودعات وتجهيزات منى وعرفة ومزدلفة"},{id:"d11",name:"الإشراف على المشرفين المرافقين"},
  {id:"d12",name:"لجنة الجودة"},{id:"d13",name:"الحركة والنقل"},{id:"d14",name:"المرشدين والمفوجين"},
  {id:"d15",name:"المشرفين المساندين الطائف"},{id:"d16",name:"الإشراف على التغذية"},
  {id:"d17",name:"البرامج الثقافية والدعوية النسائية"},{id:"d18",name:"فريق السعادة"},
  {id:"d19",name:"الإبداع والريادة"},{id:"d20",name:"مبادرة حج بلا حقيبة"},{id:"d21",name:"التدريب"},
];

/* قاعدة البيانات */
const defaultDB = {
  users:[
    {id:"u0",username:"superadmin",password:"123456",role:"superadmin",name:"المدير العام",    companyIds:[],            deptIds:[],  createdBy:null},
    {id:"u1",username:"admin_q",   password:"123456",role:"admin",     name:"مدير قريش",      companyIds:["quraish"],   deptIds:[],  createdBy:null},
    {id:"u2",username:"admin_a",   password:"123456",role:"admin",     name:"مدير أذان",       companyIds:["adhan"],     deptIds:[],  createdBy:null},
  ],
  minutes:[],
  departments: DEPT_LIST.flatMap(d => COMPANIES.map(c => ({id: c.id+"-"+d.id, name: d.name, companyId: c.id, baseDeptId: d.id}))),
  counters:{},
  logos:{},
  loginLogo: null,
};

/* ── helpers ── */
const co  = id => COMPANIES.find(c=>c.id===id);
const dep = id => DEPT_LIST.find(d=>d.id===id);
const getDbDepts = (db, companyId) => {
  const depts = db.departments || DEPT_LIST.flatMap(d => COMPANIES.map(c => ({id: c.id+"-"+d.id, name: d.name, companyId: c.id, baseDeptId: d.id})));
  return companyId ? depts.filter(d => d.companyId === companyId) : depts;
};

/*
  deptIds في المستخدم قد تكون بصيغتين:
  - "d01"           (baseDeptId — الصيغة القديمة)
  - "quraish-d01"   (id كامل — الصيغة الجديدة)
  الدالة التالية تتحقق من كلا الصيغتين
*/
const userCanSeeDept = (user, dept) => {
  if(!user||!dept) return false;
  if(isSA(user)||isAdm(user)) return true;
  const ids = user.deptIds||[];
  /* تطابق مباشر بالـ id الكامل */
  if(ids.includes(dept.id)) return true;
  /* تطابق بالـ baseDeptId */
  if(dept.baseDeptId && ids.includes(dept.baseDeptId)) return true;
  /* المستخدم قد يكون مسنداً بـ baseDeptId مباشرة */
  const baseDeptId = dept.id.includes("-") ? dept.id.split("-").slice(1).join("-") : dept.id;
  if(ids.includes(baseDeptId)) return true;
  return false;
};

/* دعم مصفوفة الشركات للمستخدم */
const getUserCompanyIds = u => {
  if(!u) return [];
  if(isSA(u)) return COMPANIES.map(c=>c.id);
  return u.companyIds || (u.companyId ? [u.companyId] : []);
};
/* الشركة الأساسية للعرض (الأولى في القائمة) */
const getPrimaryCompany = u => {
  const ids = getUserCompanyIds(u);
  return ids.length ? co(ids[0]) : null;
};

function hijriDate(){
  try{
    const p=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value||"";
    return g("year")+"/"+g("month")+"/"+g("day");
  }catch{return"1447/01/01";}
}
function hijriYear(){try{const y=new Intl.DateTimeFormat("en-u-ca-islamic-umalqura",{year:"numeric"}).format(new Date());return y.replace(/[^0-9]/g,"");}catch{return"1447";}}
const arabicDay=()=>["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][new Date().getDay()];
function mkSerial(counters,key){const n=(counters[key]||0)+1;return{n,serial:hijriYear()+"/"+String(n).padStart(4,"0")};}

const isSA  = u => !!(u&&u.role==="superadmin");
const isAdm = u => !!(u&&(u.role==="admin"||u.role==="superadmin"));
const isDM  = u => !!(u&&u.role==="deptmanager");
const isUsr = u => !!(u&&u.role==="user");

/*
  ══════════════════════════════════════════════════
  هيكل الصلاحيات:
  superadmin  → أعلى صلاحية، يرى ويدير كل شيء
  admin       → مدير الشركة: يدير مدراء الإدارات والمستخدمين داخل شركته
  deptmanager → مدير الإدارة: يدير المستخدمين داخل إدارته فقط
  user        → مستخدم عادي: يرى ويُنشئ محاضر في إدارته فقط
  ══════════════════════════════════════════════════
*/

/* هل يمكن لـ actor إنشاء/تعديل/حذف target؟ */
function canManage(actor, target){
  if(!actor||!target) return false;
  if(actor.id===target.id) return false;      /* لا يُدير نفسه عبر هذه الدالة */
  if(isSA(actor)) return true;               /* superadmin يدير الجميع */

  const actorCos = getUserCompanyIds(actor);
  const targetCos = getUserCompanyIds(target);
  const sharedCo = actorCos.some(c=>targetCos.includes(c));

  /* مدير الشركة: يدير deptmanager و user داخل شركته فقط */
  if(isAdm(actor) && sharedCo && !isSA(target) && !isAdm(target)) return true;

  /* مدير الإدارة: يدير user داخل إدارته فقط (لا يدير deptmanager آخر) */
  if(isDM(actor) && sharedCo && isUsr(target)){
    /* يجب أن يكون المستخدم منشأ من هذا المدير أو مرتبطاً بنفس إدارته */
    const actorDepts = actor.deptIds||[];
    const targetDepts = target.deptIds||[];
    const sameDept = actorDepts.some(d => targetDepts.includes(d));
    const createdByMe = target.createdBy === actor.id;
    return sameDept || createdByMe;
  }
  return false;
}

/* هل يمكن لـ actor إضافة مستخدم بدور معيّن؟ */
function canCreateRole(actor, role){
  if(isSA(actor)) return true;
  if(isAdm(actor)) return role==="deptmanager" || role==="user";
  if(isDM(actor)) return role==="user";       /* مدير الإدارة يضيف مستخدمين فقط */
  return false;
}

/* الأدوار المتاحة للإضافة حسب صلاحية الـ actor */
function availableRoles(actor){
  if(isSA(actor)) return [{v:"admin",l:"مدير شركة"},{v:"deptmanager",l:"مدير إدارة"},{v:"user",l:"مستخدم"}];
  if(isAdm(actor)) return [{v:"deptmanager",l:"مدير إدارة"},{v:"user",l:"مستخدم"}];
  if(isDM(actor)) return [{v:"user",l:"مستخدم"}];
  return [];
}

function visibleDepts(u){
  if(!u)return[];
  if(isSA(u)||isAdm(u))return DEPT_LIST.map(d=>d.id);
  return u.deptIds||[];
}
function visibleCos(u){
  if(!u)return[];
  return getUserCompanyIds(u);
}
function canSee(u,doc){
  if(!u||!doc)return false;
  if(!visibleCos(u).includes(doc.companyId))return false;
  if(isSA(u)||isAdm(u))return true;
  /* deptmanager و user: يرون محاضر إداراتهم فقط */
  const ids=u.deptIds||[];
  if(ids.includes(doc.deptId))return true;
  const base=doc.deptId?.includes("-")?doc.deptId.split("-").slice(1).join("-"):doc.deptId;
  return ids.includes(base);
}



/* ── PDF ── */
/* ── PDF (محسن لدعم RTL 100%) ── */
function rgb(hex){const h=(hex||"#888").replace(/[^0-9a-fA-F]/g,"").padEnd(6,"0").slice(0,6);return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}

function arTxt(text,wMM,hMM,bgHex,fgHex,fsPt,bold){
  const DPI=3.78,SC=2.5,W=Math.max(1,Math.round(wMM*DPI*SC)),H=Math.max(1,Math.round(hMM*DPI*SC));
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const ctx=cv.getContext("2d");
  ctx.fillStyle=bgHex||"#fff";ctx.fillRect(0,0,W,H);
  ctx.fillStyle=fgHex||"#1A1A2E";
  const px=Math.round((fsPt||9)*DPI*SC/2.83);
  ctx.font=(bold?"700":"500")+" "+px+"px 'Noto Kufi Arabic',Tahoma,Arial";
  ctx.direction="rtl";ctx.textAlign="right";ctx.textBaseline="middle";
  const padding=Math.round(5*SC);
  ctx.fillText(String(text||""),W-padding,H/2+(px*0.1));
  return cv.toDataURL("image/png");
}

function pCell(pdf,text,x,y,w,h,bg,fg,pt,bold){
  pdf.setFillColor(...rgb(bg||"#fff"));pdf.rect(x,y,w,h,"F");
  pdf.addImage(arTxt(text,w,h,bg||"#fff",fg||"#1A1A2E",pt||9,bold),"PNG",x,y,w,h,"","FAST");
  pdf.setDrawColor(210,210,210);pdf.rect(x,y,w,h,"S");
}

function pHd(pdf,title,x,y,w,h,bg){
  pdf.setFillColor(...rgb(bg||"#7C6DAF"));pdf.rect(x,y,w,h,"F");
  pdf.addImage(arTxt(title,w,h,bg||"#7C6DAF","#fff",10,true),"PNG",x,y,w,h,"","FAST");
}

async function ensureJsPDF(){
  if(!window.jspdf){
    await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  return window.jspdf.jsPDF;
}

/* ألوان PDF — تُأخذ من COMPANIES */
const getPdfColors = (companyId) => {
  const c = COMPANIES.find(x=>x.id===companyId);
  return {
    main:   c?.color   || "#4A3382",
    dark:   c?.id==="quraish" ? "#2E1F5E" : (c?.id==="adhan" ? "#5D3E38" : "#2E1F5E"),
    light:  c?.light   || "#EDE8F8",
    beige:  c?.beige   || "#CFB88F",
  };
};

/* PDF المحضر */
async function buildMinutePDF(item,logo,db,creatorName){
  const jsPDF=await ensureJsPDF();
  const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const PW=210,M=14,CW=PW-M*2;let y=M;
  const company=co(item.companyId);
  const PC=getPdfColors(item.companyId);
  const dept=(db?.departments||[]).find(d=>d.id===item.deptId)||dep(item.deptId);
  const chk=(n=10)=>{if(y+n>282){pdf.addPage();y=M;}};

  /* ═══ الشريط العلوي ═══ */
  const HDR_H=30, LOGO_BOX=24, LOGO_PAD=3;
  pdf.setFillColor(...rgb(PC.dark));
  pdf.rect(M,y,CW,HDR_H,"F");
  pdf.setFillColor(...rgb(PC.main));
  pdf.rect(M+CW*0.4,y,CW*0.6,HDR_H,"F");

  const logoX=M+3, logoY=y+(HDR_H-LOGO_BOX)/2;
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(logoX,logoY,LOGO_BOX,LOGO_BOX,3,3,"F");
  if(logo){
    try{ pdf.addImage(logo,"PNG",logoX+LOGO_PAD,logoY+LOGO_PAD,LOGO_BOX-LOGO_PAD*2,LOGO_BOX-LOGO_PAD*2,"","FAST"); }catch(e){}
  } else {
    pdf.addImage(arTxt(company?.name?.[0]||"؟",LOGO_BOX,LOGO_BOX,"#fff",PC.main,16,true),"PNG",logoX,logoY,LOGO_BOX,LOGO_BOX,"","FAST");
  }

  const TW=CW-LOGO_BOX-14;
  pdf.addImage(arTxt(company?.fullName||"",TW,14,PC.main,"#fff",13,true),"PNG",M+LOGO_BOX+8,y+2,TW,14,"","FAST");
  pdf.addImage(arTxt(dept?.name||"",TW,10,PC.dark,"rgba(255,255,255,0.88)",9,false),"PNG",M+LOGO_BOX+8,y+16,TW,10,"","FAST");
  y+=HDR_H+2;

  /* شريط "محضر اجتماع" */
  pdf.setFillColor(...rgb(PC.light));
  pdf.rect(M,y,CW,9,"F");
  pdf.addImage(arTxt("محضر اجتماع",CW,9,PC.light,PC.dark,11,true),"PNG",M,y,CW,9,"","FAST");
  y+=13;

  const RH=8,LW=26,halfCW=CW/2;
  pCell(pdf,item.hijriDate||"",M,y,halfCW-LW,RH,"#fff","#1A1A2E",8);
  pCell(pdf,"التاريخ",M+halfCW-LW,y,LW,RH,PC.light,PC.dark,8,true);
  pCell(pdf,item.day||"",M+halfCW,y,halfCW-LW,RH,"#fff","#1A1A2E",8);
  pCell(pdf,"اليوم",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true); y+=RH;
  pCell(pdf,item.title||"",M,y,CW-LW,RH,"#fff","#1A1A2E",9,true);
  pCell(pdf,"العنوان",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true); y+=RH;
  if(item.location){
    pCell(pdf,item.location||"",M,y,CW-LW,RH,"#fff","#1A1A2E",8);
    pCell(pdf,"المكان",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true); y+=RH;
  }
  y+=5;

  const sec=(title,rows)=>{
    if(!rows||!rows.filter(Boolean).length)return;
    chk(14);pHd(pdf,title,M,y,CW,9,PC.main);y+=9;
    rows.filter(Boolean).forEach((r,i)=>{
      chk(8);
      pCell(pdf,String(i+1),M+CW-10,y,10,8,PC.light,PC.dark,8,true);
      pCell(pdf,r,M,y,CW-10,8,"#fff","#1A1A2E",8);
      y+=8;
    });
    y+=4;
  };
  const blk=(title,text)=>{
    if(!text?.trim())return;
    chk(18);pHd(pdf,title,M,y,CW,9,PC.main);y+=9;
    const bh=Math.max(10,Math.ceil(text.length/55)*7+4);chk(bh);
    pCell(pdf,text,M,y,CW,bh,"#fff","#1A1A2E",8);y+=bh+4;
  };

  sec("الأهداف",item.objectives);
  sec("التوصيات",item.recommendations);
  sec("الحضور",item.attendees);
  if(item.evidenceFiles?.length){
    chk(14);pHd(pdf,"الشواهد والمرفقات",M,y,CW,9,PC.main);y+=9;
    item.evidenceFiles.forEach((f,i)=>{
      chk(9);
      pCell(pdf,String(i+1),M+CW-10,y,10,8,PC.light,PC.dark,8,true);
      pCell(pdf,f.name||"",M+20,y,CW-30,8,"#fff","#1A1A2E",8);
      if(f.url){
        pdf.setFillColor(22,163,74);pdf.roundedRect(M,y+1,18,6,1,1,"F");
        pdf.addImage(arTxt("فتح",18,6,"#16A34A","#fff",7,true),"PNG",M,y+1,18,6,"","FAST");
        pdf.link(M,y+1,18,6,{url:f.url});
      }
      y+=8;
    });
    y+=4;
  }
  blk("ملاحظات",item.notes);

  /* ═══ خانة مُعدّ التقرير — فوق الشريط السفلي مباشرة ═══
     محاذاة اليسار | تصميم رسمي بخط فاصل وخلفية فاتحة      */
  if(creatorName){
    chk(16);
    y+=4;
    /* خط فاصل رفيع */
    pdf.setDrawColor(...rgb(PC.main+"88"));
    pdf.setLineWidth(0.3);
    pdf.line(M,y,M+CW,y);
    y+=2;

    /* خلفية فاتحة للخانة */
    pdf.setFillColor(...rgb(PC.light));
    pdf.rect(M,y,CW,10,"F");

    /* عنوان "مُعدّ التقرير:" — على اليمين */
    const labelW=38;
    pdf.addImage(arTxt("مُعدّ التقرير:",labelW,10,PC.light,PC.dark,8,true),"PNG",M+CW-labelW,y,labelW,10,"","FAST");

    /* الاسم — بجانب العنوان */
    const nameW=CW-labelW-4;
    pdf.addImage(arTxt(creatorName,nameW,10,PC.light,PC.main,9,false),"PNG",M,y,nameW,10,"","FAST");

    y+=12;
  }

  /* ═══ الشريط السفلي ═══
     يمين: اسم المنشأة بخط عريض
     يسار: الرقم المرجعي/التسلسلي   */
  chk(9);y+=2;
  pdf.setFillColor(...rgb(PC.dark));
  pdf.rect(M,y,CW,9,"F");
  const halfFtr=CW*0.6;
  pdf.addImage(arTxt(company?.fullName||"",halfFtr,9,PC.dark,"#fff",8,true),"PNG",M+CW-halfFtr,y,halfFtr,9,"","FAST");
  pdf.addImage(arTxt(item.serialNumber||"",CW*0.35,9,PC.dark,"rgba(255,255,255,.82)",8,false),"PNG",M,y,CW*0.35,9,"","FAST");

  /* تنزيل PDF مباشرة بدون فتح تبويب جديد — يعمل على iOS/Android */
  const pdfName = "محضر-"+(item.serialNumber||"doc").replace("/","-")+".pdf";
  const pdfBlob = pdf.output("blob");
  const pdfUrl  = URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = pdfUrl;
  a.download = pdfName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(pdfUrl); document.body.removeChild(a); }, 1500);
}



/* ══════════════════════════════════════════
   CSS
══════════════════════════════════════════ */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --c:#4A3382;--cl:#EDE8F8;--ca:#6B5CA6;--cb:#CFB88F;
  --bg:#F2EEF9;--sf:#FFF;--tx:#1A1230;--ts:#5A4E7A;--bd:#DDD6F0;
  --hg:linear-gradient(135deg,#2E1F5E,#4A3382);
  --r:14px;--rs:8px;--f:'Noto Kufi Arabic',sans-serif
}
body,html,#root{font-family:var(--f);direction:rtl;background:var(--bg);color:var(--tx);min-height:100vh}
.fi{animation:fi .3s ease}@keyframes fi{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.si{animation:si .25s ease}@keyframes si{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
input,textarea,select{font-family:var(--f);font-size:13px;border:1.5px solid var(--bd);border-radius:var(--rs);padding:7px 11px;width:100%;outline:none;transition:all .2s;background:var(--sf);color:var(--tx)}
input:focus,textarea:focus,select:focus{border-color:var(--c);box-shadow:0 0 0 3px var(--cl)}
textarea{resize:vertical;min-height:68px}
button{font-family:var(--f);cursor:pointer;border:none;border-radius:var(--rs);padding:7px 14px;font-size:12px;font-weight:600;transition:all .18s;display:inline-flex;align-items:center;gap:5px;justify-content:center}
button:hover{transform:translateY(-1px)}button:active{transform:none}
.bp{background:var(--c);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.2)}.bp:hover{filter:brightness(1.12)}
.bs{background:var(--cl);color:var(--c)}.bs:hover{background:var(--ca);color:#fff}
.bdr{background:#FEE2E2;color:#DC2626}.bdr:hover{background:#DC2626;color:#fff}
.bg{background:transparent;color:var(--ts);padding:6px 9px}.bg:hover{background:var(--cl);color:var(--c)}
.bi{width:28px;height:28px;padding:0;border-radius:7px;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--ts)}.bi:hover{background:var(--cl);color:var(--c)}
.cd{background:var(--sf);border-radius:var(--r);border:1px solid var(--bd);box-shadow:0 1px 4px rgba(0,0,0,.05);overflow:hidden}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px}
th{background:var(--cl);color:var(--c);font-weight:600;padding:8px 12px;text-align:right;white-space:nowrap;font-size:11px}
th:first-child{border-radius:0 var(--rs) var(--rs) 0}th:last-child{border-radius:var(--rs) 0 0 var(--rs)}
td{padding:8px 12px;border-bottom:1px solid var(--bd)}tr:last-child td{border-bottom:none}tr:hover td{background:rgba(0,0,0,.015)}
.es{text-align:center;padding:44px 20px;color:var(--ts)}
.chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;background:var(--bg);color:var(--ts);margin:2px;cursor:pointer;border:1.5px solid transparent;transition:all .15s}
.chip.on{background:var(--cl);color:var(--c);border-color:var(--c)}
.rtag{display:inline-flex;padding:2px 7px;border-radius:12px;font-size:10px;font-weight:600;background:var(--cl);color:var(--c);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prog-bar{height:5px;background:var(--bd);border-radius:3px;overflow:hidden;margin-top:3px}
.prog-fill{height:100%;border-radius:3px;transition:width .4s}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
/* Sidebar responsive */
.sb-toggle{display:flex}
@media(max-width:767px){
  .sb-overlay{display:block !important}
  .main-content{margin-right:0 !important;padding-left:12px;padding-right:12px}
  .sb-toggle{top:10px;right:10px !important}
}
`;

/* ══ Icons ══ */
const I={
  min:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16"y1="13"x2="8"y2="13"/><line x1="16"y1="17"x2="8"y2="17"/></svg>,
  eval:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  home:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9"cy="7"r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  chart:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><line x1="18"y1="20"x2="18"y2="10"/><line x1="12"y1="20"x2="12"y2="4"/><line x1="6"y1="20"x2="6"y2="14"/></svg>,
  arch:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1"y="3"width="22"height="5"/></svg>,
  plus:<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"><line x1="12"y1="5"x2="12"y2="19"/><line x1="5"y1="12"x2="19"y2="12"/></svg>,
  trash:<svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  eye:<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12"cy="12"r="3"/></svg>,
  edit:<svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  back:<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  close:<svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"strokeLinecap="round"><line x1="18"y1="6"x2="6"y2="18"/><line x1="6"y1="6"x2="18"y2="18"/></svg>,
  up:<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12"y1="12"x2="12"y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  link:<svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  logout:<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21"y1="12"x2="9"y2="12"/></svg>,
  set:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  file:<svg width="12"height="12"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  archive:<svg width="16"height="16"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1"y="3"width="22"height="5"/><line x1="10"y1="12"x2="14"y2="12"/></svg>,
  download:<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12"y1="15"x2="12"y2="3"/></svg>,
  search:<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><circle cx="11"cy="11"r="8"/><line x1="21"y1="21"x2="16.65"y2="16.65"/></svg>,
  attach:<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
};

/* ── UI helpers ── */
/* CoLogo: يعرض الشعار الفعلي من db إن وُجد، وإلا يعرض خلفية بلون هوية الشركة */
function CoLogo({coId,size,db}){
  size=size||32;
  const c=co(coId);
  const logo=db?.logos?.[coId]||null;
  if(logo) return(
    <div style={{width:size,height:size,borderRadius:Math.round(size*.22),overflow:"hidden",
      background:"#fff",border:"1px solid rgba(0,0,0,.08)",flexShrink:0,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <img src={logo} alt={c?.name||""} style={{width:"88%",height:"88%",objectFit:"contain"}}/>
    </div>
  );
  /* بدون شعار: خلفية متدرجة بألوان هوية الشركة */
  const grad = c?.headerGrad||`linear-gradient(135deg,${c?.color||"#444"},${c?.accent||"#666"})`;
  return(
    <div style={{width:size,height:size,borderRadius:Math.round(size*.22),
      background:grad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{color:"#fff",fontSize:Math.round(size*.42),fontWeight:800}}>{c?.name?.[0]||"?"}</span>
    </div>
  );
}
function RoleBadge({role}){
  const m={superadmin:{l:"مدير عام",bg:"#FEE2E2",c:"#DC2626"},admin:{l:"مدير شركة",bg:"#FEF3C7",c:"#D97706"},deptmanager:{l:"مدير إدارة",bg:"#E0F2FE",c:"#0284C7"},user:{l:"مستخدم",bg:"var(--cl)",c:"var(--c)"}};
  const s=m[role]||m.user;return<span className="badge" style={{background:s.bg,color:s.c}}>{s.l}</span>;
}
function DeptChips({selected,onToggle}){return(<div style={{display:"flex",flexWrap:"wrap",gap:3,padding:9,background:"#F8FAFC",borderRadius:8,border:"1.5px solid var(--bd)"}}>{DEPT_LIST.map(d=>(<span key={d.id} className={"chip"+(selected?.includes(d.id)?" on":"")} onClick={()=>onToggle(d.id)}>{selected?.includes(d.id)&&"✓ "}{d.name}</span>))}</div>);}
function ProgBar({pct,color}){return<div className="prog-bar"><div className="prog-fill" style={{width:(pct||0)+"%",background:color||"var(--c)"}}/></div>;}

/* ── Company/Dept selectors ── */
function CoSelector({user,value,onChange}){
  const myCos=isSA(user)?COMPANIES:COMPANIES.filter(c=>getUserCompanyIds(user).includes(c.id));
  return(<div style={{marginBottom:12}}>
    <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>الشركة</label>
    <div style={{display:"flex",gap:7}}>{myCos.map(c=>(<span key={c.id} className={"chip"+(value===c.id?" on":"")} onClick={()=>onChange(c.id)} style={{padding:"6px 16px",fontSize:12}}>{c.name}</span>))}</div>
  </div>);
}
function DeptSelector({user,value,onChange,db,companyId}){
  const allDepts = db ? getDbDepts(db, null) : [];
  const dynDepts = allDepts.filter(d => {
    if(companyId && d.companyId !== companyId) return false;
    return userCanSeeDept(user, d);
  });
  if(!dynDepts.length) return(
    <div style={{marginBottom:12}}>
      <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>الإدارة</label>
      <div style={{padding:"9px 13px",background:"#FEF2F2",borderRadius:8,border:"1.5px solid #FECACA",fontSize:11,color:"#DC2626",display:"flex",alignItems:"center",gap:6}}>
        <span>⚠️</span>
        <span>لا توجد إدارات مخصصة لك في هذه الشركة. تواصل مع المدير لإضافة إدارتك.</span>
      </div>
    </div>
  );
  /* إذا القيمة الحالية غير موجودة في القائمة → اختر أول واحدة تلقائياً */
  const validValue = dynDepts.find(d=>d.id===value) ? value : dynDepts[0]?.id||"";
  if(validValue !== value) { setTimeout(()=>onChange(validValue),0); }
  return(<div style={{marginBottom:12}}>
    <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>الإدارة</label>
    <select value={validValue} onChange={e=>onChange(e.target.value)} style={{maxWidth:420}}>
      {dynDepts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  </div>);
}
function DocFilters({user,fCo,setFCo,fDep,setFDep,db}){
  const allDepts = db ? getDbDepts(db, null) : [];
  const filterDepts = allDepts.filter(d => {
    if(!visibleCos(user).includes(d.companyId)) return false;
    if(fCo && d.companyId !== fCo) return false;
    return userCanSeeDept(user, d);
  });
  return(<div className="cd" style={{padding:10,marginBottom:10}}>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      {isSA(user)&&<><span style={{fontSize:11,color:"var(--ts)",fontWeight:600}}>الشركة:</span>
        <span className={"chip"+(fCo===""?" on":"")} onClick={()=>{setFCo("");setFDep("");}}>الكل</span>
        {COMPANIES.map(c=><span key={c.id} className={"chip"+(fCo===c.id?" on":"")} onClick={()=>{setFCo(fCo===c.id?"":c.id);setFDep("");}}>{c.name}</span>)}
        <div style={{width:1,height:16,background:"var(--bd)",margin:"0 2px"}}/>
      </>}
      <span style={{fontSize:11,color:"var(--ts)",fontWeight:600}}>الإدارة:</span>
      <span className={"chip"+(fDep===""?" on":"")} onClick={()=>setFDep("")}>الكل</span>
      {filterDepts.map(d=>{
        const company=co(d.companyId);
        const label=(isSA(user)&&!fCo) ? d.name+" — "+company?.name : d.name;
        return(<span key={d.id} className={"chip"+(fDep===d.id?" on":"")} onClick={()=>setFDep(fDep===d.id?"":d.id)}>{label}</span>);
      })}
    </div>
  </div>);
}

/* ══════════════════════════════════════════
   نظام المحاضر — مستقل
══════════════════════════════════════════ */
function ListField({label,items,onChange}){
  const up=(i,v)=>{const a=[...items];a[i]=v;onChange(a);};
  return(<div style={{marginBottom:13}}>
    <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>{label}</label>
    {items.map((it,i)=>(<div key={i} style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
      <span style={{fontSize:10,color:"var(--ts)",minWidth:16,textAlign:"center"}}>{i+1}</span>
      <input value={it} onChange={e=>up(i,e.target.value)} placeholder={label+" "+(i+1)}/>
      {items.length>1&&<button className="bi bdr" style={{width:24,height:24,flexShrink:0}} onClick={()=>onChange(items.filter((_,j)=>j!==i))}>{I.trash}</button>}
    </div>))}
    <button className="bs" style={{padding:"2px 9px",fontSize:10}} onClick={()=>onChange([...items,""])}>{I.plus}</button>
  </div>);
}
function EvidenceField({files,onChange,api,apiReady,companyId}){
  const[uploading,setUploading]=useState(false);
  const add=async(e)=>{
    const newFiles=Array.from(e.target.files||[]);
    if(!newFiles.length) return;
    e.target.value="";

    /* رفع عبر API إذا متاح */
    if(apiReady&&api){
      setUploading(true);
      try{
        const results=[...(files||[])];
        for(const f of newFiles){
          try{
            const res=await api.uploadFile(f,{companyId:companyId||""});
            results.push({name:f.name,size:f.size,type:f.type,url:res.url,key:res.key});
          }catch(err){
            console.warn("API upload failed for",f.name,err.message);
            /* Fallback: base64 محلي */
            const url=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(f);});
            results.push({name:f.name,size:f.size,type:f.type,url});
          }
        }
        onChange(results);
      }finally{ setUploading(false); }
      return;
    }

    /* Local fallback: base64 */
    let done=0;
    const results=[...(files||[])];
    newFiles.forEach(f=>{
      const r=new FileReader();
      r.onload=ev=>{results.push({name:f.name,size:f.size,type:f.type,url:ev.target.result});done++;if(done===newFiles.length)onChange(results);};
      r.readAsDataURL(f);
    });
  };
  const rm=i=>onChange((files||[]).filter((_,j)=>j!==i));
  return(<div style={{marginBottom:13}}>
    <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>الشواهد والمرفقات</label>
    <label style={{cursor:uploading?"wait":"pointer",display:"block",marginBottom:7}}>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:"var(--cl)",borderRadius:8,border:"1.5px dashed var(--c)",fontSize:11,fontWeight:600,color:"var(--c)",opacity:uploading?.7:1}}>
        {uploading?<><span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>⟳</span> جاري الرفع...</>:<>{I.up} رفع ملفات الشواهد</>}
      </div>
      <input type="file" multiple accept="*/*" style={{display:"none"}} onChange={add} disabled={uploading}/>
    </label>
    {(files||[]).map((f,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"#F0FDF4",borderRadius:7,border:"1px solid #86EFAC",marginBottom:4,fontSize:11}}>
      <span style={{color:"#16A34A"}}>{I.file}</span>
      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{f.name}</span>
      {f.url&&<a href={f.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",background:"#16A34A",color:"#fff",borderRadius:5,fontSize:10,fontWeight:600,textDecoration:"none"}}>{I.link} عرض</a>}
      <button className="bi" style={{color:"#DC2626",width:22,height:22}} onClick={()=>rm(i)}>{I.trash}</button>
    </div>))}
  </div>);
}

/* نموذج المحضر */
function MinuteForm({user,db,setDb,editing,onDone,api,apiReady}){
  const myCos=isSA(user)?COMPANIES:COMPANIES.filter(c=>getUserCompanyIds(user).includes(c.id));
  const allDepts = db ? getDbDepts(db, null) : [];
  const getAvailDepts = (coId) => allDepts.filter(d => {
    if(coId && d.companyId !== coId) return false;
    return userCanSeeDept(user, d);
  });
  const[f,setF]=useState(()=>{
    if(editing) return editing;
    const coId = myCos[0]?.id||"";
    const depts = getAvailDepts(coId);
    return {
      companyId:coId, deptId:depts[0]?.id||"",
      title:"",hijriDate:hijriDate(),day:arabicDay(),
      location:"",
      objectives:[""],recommendations:[""],attendees:[""],
      evidenceFiles:[],notes:"",
    };
  });
  const up=(k,v)=>setF(p=>({...p,[k]:v}));
  const handleCoChange=(v)=>{
    const depts=getAvailDepts(v);
    setF(p=>({...p,companyId:v,deptId:depts[0]?.id||""}));
  };
  const save=async()=>{
    if(!f.title.trim())return alert("يرجى إدخال عنوان المحضر");
    if(!f.companyId||!f.deptId)return alert("يرجى اختيار الشركة والإدارة");
    if(!isSA(user)&&!isAdm(user)){
      const targetDept = allDepts.find(d=>d.id===f.deptId);
      if(!targetDept || !userCanSeeDept(user, targetDept)){
        return alert("غير مصرح لك بإنشاء محضر في هذه الإدارة");
      }
    }
    const d=JSON.parse(JSON.stringify(db));

    /* محاولة الحفظ عبر API */
    if(apiReady&&api){
      try{
        const res = await api.saveMinute(
          editing ? {...f,id:editing.id} : f,
          !!editing
        );
        const saved = res.minute;
        if(editing){
          d.minutes=d.minutes.map(m=>m.id===editing.id?saved:m);
        } else {
          d.minutes.push(saved);
        }
        setDb(d);onDone();
        return;
      }catch(e){ console.warn("API save failed, using local:",e.message); }
    }

    /* Local fallback */
    if(editing){d.minutes=d.minutes.map(m=>m.id===editing.id?{...m,...f}:m);}
    else{
      const key=f.companyId+"-min";
      const{n,serial}=mkSerial(d.counters,key);d.counters[key]=n;
      d.minutes.push({...f,id:"min-"+Date.now(),serialNumber:serial,createdAt:new Date().toISOString(),createdBy:user?.id||null});
    }
    setDb(d);onDone();
  };
  const availDepts=getAvailDepts(f.companyId);
  return(
    <div className="si">
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:18}}>
        <button className="bg" onClick={onDone}>{I.back}</button>
        <h2 style={{fontSize:17,fontWeight:700}}>{editing?"تعديل المحضر":"محضر اجتماع جديد"}</h2>
      </div>
      <div className="cd" style={{padding:20}}>
        <CoSelector user={user} value={f.companyId} onChange={handleCoChange}/>
        <DeptSelector user={user} value={f.deptId} onChange={v=>up("deptId",v)} db={db} companyId={f.companyId}/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>عنوان المحضر</label><input value={f.title} onChange={e=>up("title",e.target.value)} style={{fontWeight:600}}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>التاريخ الهجري</label><input value={f.hijriDate} onChange={e=>up("hijriDate",e.target.value)}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>اليوم</label><input value={f.day} onChange={e=>up("day",e.target.value)}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>مكان الاجتماع</label><input value={f.location||""} onChange={e=>up("location",e.target.value)} placeholder="أدخل مكان انعقاد الاجتماع..."/></div>
        <ListField label="الأهداف" items={f.objectives} onChange={v=>up("objectives",v)}/>
        <ListField label="التوصيات" items={f.recommendations} onChange={v=>up("recommendations",v)}/>
        <ListField label="الحضور" items={f.attendees} onChange={v=>up("attendees",v)}/>
        <EvidenceField files={f.evidenceFiles} onChange={v=>up("evidenceFiles",v)} api={api} apiReady={apiReady} companyId={f.companyId}/>
        <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>ملاحظات</label><textarea value={f.notes} onChange={e=>up("notes",e.target.value)} placeholder="ملاحظات إضافية..."/></div>
        <div style={{display:"flex",gap:7,paddingTop:14,borderTop:"1px solid var(--bd)"}}>
          <button className="bp" onClick={save} style={{padding:"9px 24px"}}>{editing?"تحديث المحضر":"حفظ المحضر"}</button>
          <button className="bg" onClick={onDone}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

/* معاينة المحضر */
function MinutePreview({item,db,onClose,currentUser}){
  const[dl,setDl]=useState(false);
  const company=co(item.companyId);
  const PC=getPdfColors(item.companyId);
  const dept=(db.departments||[]).find(d=>d.id===item.deptId)||dep(item.deptId);
  const logo=db.logos?.[item.companyId]||null;
  const hdrGrad=company?.headerGrad||`linear-gradient(135deg,${PC.dark},${PC.main})`;
  /* مُعدّ التقرير: من أنشأ المحضر (createdBy) */
  const creator = item.createdBy ? db.users?.find(u=>u.id===item.createdBy) : null;
  const creatorName = creator?.name || "";
  const download=async()=>{if(dl)return;setDl(true);try{await buildMinutePDF(item,logo,db,creatorName);}catch(e){alert("خطأ: "+e.message);}setDl(false);};
  const Sec=({title,children})=>(<div style={{marginBottom:14}}>
    <div style={{background:PC.main,color:"#fff",padding:"6px 13px",borderRadius:"7px 7px 0 0",fontWeight:700,fontSize:11,direction:"rtl",textAlign:"right"}}>{title}</div>
    {children}
  </div>);
  const NumList=({items})=>(<table style={{width:"100%",borderCollapse:"collapse"}}><tbody>{(items||[]).filter(Boolean).map((o,i)=>(<tr key={i}>
    <td style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",width:26,textAlign:"center",fontWeight:700,background:PC.light,fontSize:10,color:PC.dark}}>{i+1}</td>
    <td style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",fontSize:10,direction:"rtl",textAlign:"right"}}>{o}</td>
  </tr>))}</tbody></table>);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:14}} onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:840,maxHeight:"94vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.35)"}}>
        <div style={{padding:"10px 18px",borderBottom:"1px solid #E2E8F0",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#F8FAFC"}}>
          <div style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:PC.main,direction:"ltr"}}>{item.serialNumber}</span>
            <span style={{color:"#94A3B8"}}>|</span>
            <span>{company?.fullName}</span>
            <span style={{color:"#94A3B8"}}>—</span>
            <span style={{color:"#64748B",fontSize:11}}>{dept?.name}</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={download} disabled={dl} style={{padding:"5px 14px",fontSize:11,borderRadius:8,border:"none",cursor:"pointer",background:PC.main,color:"#fff",fontWeight:700,opacity:dl?0.6:1,boxShadow:`0 2px 8px ${PC.main}44`}}>{dl?"⏳ جاري...":"⬇️ PDF"}</button>
            <button className="bg" onClick={onClose}>{I.close}</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:16,background:"#E8EBF0"}}>
          <div style={{background:"#fff",maxWidth:"210mm",margin:"0 auto",boxShadow:"0 4px 20px rgba(0,0,0,.12)",direction:"rtl"}}>
            <div style={{background:hdrGrad,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{company?.fullName}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.82)",marginTop:3}}>{dept?.name}</div>
              </div>
              <div style={{width:50,height:50,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid rgba(255,255,255,.3)",overflow:"hidden",flexShrink:0}}>
                {logo?<img src={logo} alt="logo" style={{width:"90%",height:"90%",objectFit:"contain"}}/>:<span style={{fontSize:24,fontWeight:800,color:"#fff"}}>{company?.name?.[0]||"؟"}</span>}
              </div>
            </div>
            <div style={{background:PC.light,padding:"6px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:800,color:PC.dark}}>محضر اجتماع</span>
              <span style={{fontSize:11,fontWeight:700,color:PC.main,direction:"ltr"}}>{item.serialNumber}</span>
            </div>
            <div style={{padding:"14px 18px"}}>
              <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
                <tbody>
                  <tr>
                    <td style={{padding:"5px 9px",background:PC.light,fontWeight:700,border:"1px solid "+PC.main+"33",fontSize:10,color:PC.dark,width:"12%"}}>التاريخ</td>
                    <td style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",fontSize:10,width:"28%"}}>{item.hijriDate}</td>
                    <td style={{padding:"5px 9px",background:PC.light,fontWeight:700,border:"1px solid "+PC.main+"33",fontSize:10,color:PC.dark,width:"12%"}}>اليوم</td>
                    <td style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",fontSize:10,width:"48%"}}>{item.day}</td>
                  </tr>
                  <tr>
                    <td style={{padding:"5px 9px",background:PC.light,fontWeight:700,border:"1px solid "+PC.main+"33",fontSize:10,color:PC.dark}}>العنوان</td>
                    <td colSpan={3} style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",fontWeight:700,fontSize:11}}>{item.title}</td>
                  </tr>
                  {item.location&&<tr>
                    <td style={{padding:"5px 9px",background:PC.light,fontWeight:700,border:"1px solid "+PC.main+"33",fontSize:10,color:PC.dark}}>المكان</td>
                    <td colSpan={3} style={{padding:"5px 9px",border:"1px solid "+PC.main+"33",fontSize:10}}>{item.location}</td>
                  </tr>}
                </tbody>
              </table>
              {item.objectives?.some(Boolean)&&<Sec title="الأهداف"><NumList items={item.objectives}/></Sec>}
              {item.recommendations?.some(Boolean)&&<Sec title="التوصيات"><NumList items={item.recommendations}/></Sec>}
              {item.attendees?.some(Boolean)&&<Sec title="الحضور"><NumList items={item.attendees}/></Sec>}
              {item.evidenceFiles?.length>0&&<Sec title="الشواهد والمرفقات">
                <div style={{border:"1px solid "+PC.main+"33",borderTop:"none",borderRadius:"0 0 7px 7px",padding:8}}>
                  {item.evidenceFiles.map((f,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:i<item.evidenceFiles.length-1?"1px solid #f0f0f0":"none",fontSize:10}}>
                    <span style={{color:"#16A34A"}}>{I.file}</span><span style={{flex:1}}>{f.name}</span>
                    {f.url&&<a href={f.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",background:"#16A34A",color:"#fff",borderRadius:5,fontSize:9,fontWeight:600,textDecoration:"none"}}>{I.link} فتح</a>}
                  </div>))}
                </div>
              </Sec>}
              {item.notes&&<Sec title="ملاحظات"><div style={{padding:"8px 12px",border:"1px solid "+PC.main+"33",borderTop:"none",borderRadius:"0 0 7px 7px",fontSize:10,lineHeight:1.8}}>{item.notes}</div></Sec>}
            </div>
            {/* خانة مُعدّ التقرير — فوق الشريط السفلي */}
            {creatorName&&(
              <div style={{padding:"6px 16px",borderTop:"1px solid "+PC.main+"22",background:PC.light,
                display:"flex",alignItems:"center",gap:8,direction:"rtl"}}>
                <span style={{fontSize:10,fontWeight:700,color:PC.dark,flexShrink:0}}>مُعدّ التقرير:</span>
                <span style={{fontSize:11,fontWeight:600,color:PC.main}}>{creatorName}</span>
              </div>
            )}
            {/* فوتر: اسم المنشأة يمين + رقم مرجعي يسار */}
            <div style={{background:PC.dark,padding:"7px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:600,direction:"ltr"}}>{item.serialNumber}</span>
              <span style={{color:"#fff",fontSize:11,fontWeight:800}}>{company?.fullName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* قائمة المحاضر */
function MinutesList({db,setDb,user,onPreview,api,apiReady}){
  const[show,setShow]=useState(false),[ ed,setEd]=useState(null);
  const[fCo,setFCo]=useState(""),[ fDep,setFDep]=useState("");
  const items=db.minutes.filter(m=>canSee(user,m)&&(fCo?m.companyId===fCo:true)&&(fDep?m.deptId===fDep:true));
  const depName=id=>{const d=(db.departments||[]).find(x=>x.id===id)||dep(id);return d?.name||id;};
  if(show||ed)return<MinuteForm user={user} db={db} setDb={setDb} editing={ed} onDone={()=>{setEd(null);setShow(false)}} api={api} apiReady={apiReady}/>;
  const del=async(id)=>{
    if(!confirm("حذف المحضر؟"))return;
    /* محاولة الحذف عبر API */
    if(apiReady&&api){
      try{ await api.deleteMinute(id); }catch(e){ console.warn("API delete failed:",e.message); }
    }
    /* تحديث الـ local state دائماً */
    const d=JSON.parse(JSON.stringify(db));
    d.minutes=d.minutes.filter(m=>m.id!==id);
    setDb(d);
  };
  return(
    <div className="fi">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{fontSize:19,fontWeight:800}}>المحاضر</h2>
        <button className="bp" onClick={()=>setShow(true)}>{I.plus} محضر جديد</button>
      </div>
      <DocFilters user={user} fCo={fCo} setFCo={setFCo} fDep={fDep} setFDep={setFDep} db={db}/>
      {items.length===0?<div className="cd es" style={{padding:40}}><p style={{fontSize:13,fontWeight:600}}>لا توجد محاضر</p></div>:(
        <div className="cd"><table><thead><tr>
          {isSA(user)&&<th>الشركة</th>}<th>الرقم</th><th>العنوان</th><th>الإدارة</th><th>التاريخ</th><th>الحضور</th><th>مرفقات</th><th>إجراءات</th>
        </tr></thead>
          <tbody>{items.slice().reverse().map(m=>(<tr key={m.id}>
            {isSA(user)&&<td><CoLogo coId={m.companyId} size={22}/></td>}
            <td><span className="badge" style={{background:"var(--cl)",color:"var(--c)",direction:"ltr"}}>{m.serialNumber}</span></td>
            <td style={{fontWeight:600,fontSize:11}}>{m.title}</td>
            <td><span className="rtag">{depName(m.deptId)}</span></td>
            <td style={{fontSize:10,color:"var(--ts)"}}>{m.hijriDate}</td>
            <td><span className="badge" style={{background:"#F0FDF4",color:"#16A34A"}}>{m.attendees?.filter(Boolean).length||0}</span></td>
            <td>{m.evidenceFiles?.length>0&&<span className="badge" style={{background:"#E0F2FE",color:"#0284C7"}}>{m.evidenceFiles.length} 📎</span>}</td>
            <td><div style={{display:"flex",gap:2}}>
              <button className="bi" onClick={()=>onPreview(m,"minute")}>{I.eye}</button>
              <button className="bi" onClick={()=>setEd(m)}>{I.edit}</button>
              <button className="bi" style={{color:"#DC2626"}} onClick={()=>del(m.id)}>{I.trash}</button>
            </div></td>
          </tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
function DeptAnalytics({db,user,companyId,color}){
  /* جمع الإدارات الفريدة التي لها محاضر في هذه الشركة */
  const minutesForCo = db.minutes.filter(x=>x.companyId===companyId);
  if(!minutesForCo.length) return<div className="es" style={{padding:18}}><p style={{fontSize:11}}>لا توجد بيانات للإدارات بعد</p></div>;

  /* تجميع المحاضر حسب الإدارة مع الاحترام لصلاحيات المستخدم */
  const deptMap = {};
  minutesForCo.forEach(m=>{
    if(!canSee(user,m)) return;
    const deptObj = (db.departments||[]).find(d=>d.id===m.deptId) || dep(m.deptId);
    if(!deptObj) return;
    const key = m.deptId;
    if(!deptMap[key]) deptMap[key]={name:deptObj.name||m.deptId, count:0};
    deptMap[key].count++;
  });

  const deptStats = Object.values(deptMap).filter(d=>d.count>0);
  if(!deptStats.length) return<div className="es" style={{padding:18}}><p style={{fontSize:11}}>لا توجد بيانات للإدارات بعد</p></div>;

  const maxVal=Math.max(...deptStats.map(d=>d.count),1);
  return(
    <div style={{padding:"0 2px"}}>
      {deptStats.map((d,idx)=>(
        <div key={idx} style={{padding:"8px 12px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:"var(--ts)",minWidth:42}}>المحاضر</span>
              <div style={{flex:1,height:6,background:"var(--bd)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:3,background:color,transition:"width .4s",width:Math.round(d.count/maxVal*100)+"%"}}/>
              </div>
              <span style={{fontSize:10,fontWeight:700,color:color,minWidth:20,textAlign:"left"}}>{d.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dash({db,user}){
  const myCos=isSA(user)?COMPANIES:COMPANIES.filter(c=>getUserCompanyIds(user).includes(c.id));
  const[expandedCo,setExpandedCo]=useState(myCos[0]?.id||"");
  return(
    <div className="fi">
      <div style={{marginBottom:16}}><h2 style={{fontSize:19,fontWeight:800,marginBottom:2}}>لوحة التحكم</h2><p style={{color:"var(--ts)",fontSize:11}}>{hijriDate()} — {arabicDay()}</p></div>
      {/* ملخص الشركات */}
      <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.max(1,myCos.length)+",1fr)",gap:12,marginBottom:16}}>
        {myCos.map(c=>{
          const visMin=db.minutes.filter(x=>x.companyId===c.id&&canSee(user,x));
          const m=visMin.length;
          const activeDepts=new Set(visMin.map(x=>x.deptId)).size;
          return(
            <div key={c.id} className="cd" style={{padding:14,borderTop:"4px solid "+c.color}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                {db.logos?.[c.id]?<img src={db.logos[c.id]} alt="" style={{height:30,objectFit:"contain",borderRadius:6}}/>:<CoLogo coId={c.id} size={30}/>}
                <div style={{fontWeight:700,fontSize:12}}>{c.fullName}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                {[{l:"المحاضر",v:m,cl:c.color},{l:"إدارات نشطة",v:activeDepts,cl:"#8B5CF6"}].map((s,i)=>(
                  <div key={i} style={{textAlign:"center",padding:7,background:"#F8FAFC",borderRadius:7}}><div style={{fontSize:17,fontWeight:800,color:s.cl}}>{s.v}</div><div style={{fontSize:9,color:"var(--ts)",marginTop:1}}>{s.l}</div></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* تحليلات الإدارات */}
      <div className="cd" style={{marginBottom:16}}>
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6}}>{I.chart} تحليلات الإدارات</div>
          {myCos.length>1&&<div style={{display:"flex",gap:4}}>{myCos.map(c=>(<span key={c.id} className={"chip"+(expandedCo===c.id?" on":"")} onClick={()=>setExpandedCo(c.id)} style={{padding:"4px 12px",fontSize:11}}>{c.name}</span>))}</div>}
        </div>
        {myCos.filter(c=>expandedCo===""||expandedCo===c.id).map(c=>(
          <div key={c.id}>
            {myCos.length>1&&expandedCo===""&&<div style={{padding:"6px 14px",background:c.light,fontWeight:600,fontSize:11,color:c.color,borderBottom:"1px solid var(--bd)"}}>{c.fullName}</div>}
            <DeptAnalytics db={db} user={user} companyId={c.id} color={c.color}/>
          </div>
        ))}
      </div>
      {/* آخر المحاضر */}
      <div className="cd" style={{marginBottom:12}}>
        <div style={{padding:"9px 13px",borderBottom:"1px solid var(--bd)",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6}}>{I.min} آخر المحاضر</div>
        {db.minutes.filter(m=>canSee(user,m)).length===0?<div className="es" style={{padding:22}}><p>لا توجد محاضر بعد</p></div>
          :<table><thead><tr><th>الرقم</th><th>العنوان</th><th>الإدارة</th><th>التاريخ</th></tr></thead>
            <tbody>{db.minutes.filter(m=>canSee(user,m)).slice(-5).reverse().map(m=>{const d=(db.departments||[]).find(x=>x.id===m.deptId)||dep(m.deptId);return(<tr key={m.id}><td><span className="badge" style={{background:"var(--cl)",color:"var(--c)",direction:"ltr"}}>{m.serialNumber}</span></td><td style={{fontWeight:600,fontSize:11}}>{m.title}</td><td><span className="rtag">{d?.name}</span></td><td style={{fontSize:10,color:"var(--ts)"}}>{m.hijriDate}</td></tr>);})}</tbody>
          </table>}
      </div>
    </div>
  );
}

/* ══ USERS ══ */
function Users({db,setDb,user:actor}){
  const[show,setShow]=useState(false);
  const[selId,setSelId]=useState(null);
  const[editPw,setEditPw]=useState({});   /* {uid: newPassword} */

  const roles = availableRoles(actor);
  const myCos = isSA(actor)?COMPANIES:COMPANIES.filter(c=>getUserCompanyIds(actor).includes(c.id));

  /* الإدارات المتاحة للـ actor لإضافة مستخدمين فيها */
  const actorDepts = (coId) => {
    const allD = getDbDepts(db, coId||null);
    if(isSA(actor)||isAdm(actor)) return allD;
    return allD.filter(d=>userCanSeeDept(actor,d));
  };

  const initNu = ()=>({
    username:"",password:"",name:"",
    role: roles[0]?.v||"user",
    companyIds:[getUserCompanyIds(actor)[0]||""],
    deptIds:[],
    createdBy: actor.id,
  });
  const[nu,setNu]=useState(initNu);

  /* المستخدمون الذين يمكن للـ actor رؤيتهم */
  const visible = db.users.filter(u=>{
    if(u.id===actor.id) return true;        /* نفسه دائماً */
    return canManage(actor,u);
  });

  const selUser = db.users.find(u=>u.id===selId);

  const toggleNuCo=(cid)=>setNu(p=>{
    if(!isSA(actor)&&!isAdm(actor)) return p; /* deptmanager لا يغير الشركة */
    const ids=p.companyIds||[];
    return {...p,companyIds:ids.includes(cid)?ids.filter(x=>x!==cid):[...ids,cid],deptIds:[]};
  });

  const add=()=>{
    if(!nu.username.trim()||!nu.password.trim()||!nu.name.trim())
      return alert("يرجى تعبئة الاسم واسم المستخدم وكلمة المرور");
    if(db.users.find(u=>u.username===nu.username))
      return alert("اسم المستخدم مستخدم بالفعل");
    if(!canCreateRole(actor,nu.role))
      return alert("ليس لديك صلاحية لإنشاء هذا الدور");
    if((nu.role==="user"||nu.role==="deptmanager")&&!nu.deptIds.length)
      return alert("يرجى ربط المستخدم بإدارة واحدة على الأقل");
    if(!nu.companyIds?.length)
      return alert("يرجى اختيار شركة");

    /* مدير الإدارة: يربط المستخدم بنفس إداراته تلقائياً */
    let finalDeptIds = nu.deptIds;
    if(isDM(actor) && !finalDeptIds.length){
      finalDeptIds = actor.deptIds||[];
    }
    /* مدير الإدارة: يضع الشركة نفسها */
    let finalCos = nu.companyIds;
    if(isDM(actor)) finalCos = getUserCompanyIds(actor);

    const newUser = {
      ...nu,
      id:"u-"+Date.now(),
      companyIds: finalCos,
      deptIds: finalDeptIds,
      createdBy: actor.id,
    };
    const d=JSON.parse(JSON.stringify(db));
    d.users.push(newUser);
    setDb(d);
    setNu(initNu());
    setShow(false);
  };

  const del=(id)=>{
    const target=db.users.find(u=>u.id===id);
    if(!target||!canManage(actor,target))return alert("لا تملك صلاحية الحذف");
    if(!confirm("حذف المستخدم؟"))return;
    const d=JSON.parse(JSON.stringify(db));
    d.users=d.users.filter(u=>u.id!==id);
    setDb(d);
    if(selId===id)setSelId(null);
  };

  const tDept=(uid,dId)=>{
    const target=db.users.find(u=>u.id===uid);
    if(!canManage(actor,target))return;
    const d=JSON.parse(JSON.stringify(db));
    d.users=d.users.map(u=>u.id===uid?{...u,deptIds:u.deptIds?.includes(dId)?u.deptIds.filter(x=>x!==dId):[...(u.deptIds||[]),dId]}:u);
    setDb(d);
  };

  const toggleUserCo=(uid,cid)=>{
    if(!isSA(actor)) return; /* فقط superadmin يغير شركة المستخدم */
    const d=JSON.parse(JSON.stringify(db));
    d.users=d.users.map(u=>{
      if(u.id!==uid)return u;
      const ids=u.companyIds||(u.companyId?[u.companyId]:[]);
      return {...u,companyIds:ids.includes(cid)?ids.filter(x=>x!==cid):[...ids,cid]};
    });
    setDb(d);
  };

  const savePassword=(uid)=>{
    const pw=editPw[uid]?.trim();
    if(!pw||pw.length<4)return alert("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
    const target=db.users.find(u=>u.id===uid);
    if(!canManage(actor,target)&&uid!==actor.id)return alert("لا تملك صلاحية تغيير كلمة المرور");
    const d=JSON.parse(JSON.stringify(db));
    d.users=d.users.map(u=>u.id===uid?{...u,password:pw}:u);
    setDb(d);
    setEditPw(p=>({...p,[uid]:""}));
    alert("تم تحديث كلمة المرور");
  };

  /* عرض الدور بالعربية */
  const roleName = r => ({superadmin:"مدير عام",admin:"مدير شركة",deptmanager:"مدير إدارة",user:"مستخدم"}[r]||r);

  /* الإدارات المرتبطة بمستخدم للعرض */
  const userDeptNames=(u)=>{
    if(!u.deptIds?.length) return isSA(u)||isAdm(u)?"كل الإدارات":"—";
    return u.deptIds.slice(0,2).map(id=>{
      const d=(db.departments||[]).find(x=>x.id===id||x.baseDeptId===id);
      return d?.name||id;
    }).join("، ")+(u.deptIds.length>2?" +"+( u.deptIds.length-2):"");
  };

  return(
    <div className="fi">
      {/* العنوان */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{fontSize:19,fontWeight:800,marginBottom:2}}>المستخدمون</h2>
          <p style={{fontSize:11,color:"var(--ts)"}}>إجمالي: {visible.length} مستخدم</p>
        </div>
        {roles.length>0&&<button className="bp" onClick={()=>{setNu(initNu());setShow(!show);setSelId(null);}}>
          {I.plus} إضافة مستخدم
        </button>}
      </div>

      {/* نموذج الإضافة */}
      {show&&<div className="cd si" style={{padding:18,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"var(--c)",borderBottom:"1px solid var(--bd)",paddingBottom:8}}>
          مستخدم جديد
        </div>
        {/* المعلومات الأساسية */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>الاسم الكامل *</label>
            <input value={nu.name} onChange={e=>setNu(p=>({...p,name:e.target.value}))} placeholder="اسم المستخدم"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>اسم الدخول *</label>
            <input value={nu.username} onChange={e=>setNu(p=>({...p,username:e.target.value}))} placeholder="username"/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>كلمة المرور *</label>
            <input type="password" value={nu.password} onChange={e=>setNu(p=>({...p,password:e.target.value}))} placeholder="••••••"/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {/* الدور */}
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>الدور / الصلاحية *</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {roles.map(r=>(
                <span key={r.v} className={"chip"+(nu.role===r.v?" on":"")} onClick={()=>setNu(p=>({...p,role:r.v,deptIds:[]}))}
                  style={{padding:"5px 12px",fontSize:11}}>
                  {r.l}
                </span>
              ))}
            </div>
          </div>
          {/* الشركة — فقط للـ SA والـ admin */}
          {(isSA(actor)||isAdm(actor))&&<div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>الشركة *</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {myCos.map(c=>(
                <span key={c.id} className={"chip"+((nu.companyIds||[]).includes(c.id)?" on":"")}
                  onClick={()=>toggleNuCo(c.id)} style={{padding:"5px 12px",fontSize:11}}>
                  {(nu.companyIds||[]).includes(c.id)?"✓ ":""}{c.name}
                </span>
              ))}
            </div>
          </div>}
        </div>

        {/* الإدارات — للـ deptmanager و user */}
        {(nu.role==="user"||nu.role==="deptmanager")&&(
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:6}}>
              الإدارة * &nbsp;<span style={{fontWeight:400,color:"var(--ts)",fontSize:10}}>
                {nu.role==="deptmanager"?"مدير الإدارة يرى كل محاضر إدارته":"المستخدم يرى محاضر إدارته المخصصة"}
              </span>
            </label>
            {(nu.companyIds||[]).map(coId=>{
              const depts=actorDepts(coId);
              const companyName=co(coId)?.name||coId;
              return(<div key={coId} style={{marginBottom:8}}>
                {myCos.length>1&&<div style={{fontSize:10,fontWeight:700,color:"var(--ts)",marginBottom:4}}>{companyName}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:3,padding:8,background:"var(--bg)",borderRadius:8,border:"1.5px solid var(--bd)"}}>
                  {depts.map(d=>(
                    <span key={d.id} className={"chip"+(nu.deptIds.includes(d.id)?" on":"")}
                      onClick={()=>setNu(p=>({...p,deptIds:p.deptIds.includes(d.id)?p.deptIds.filter(x=>x!==d.id):[...p.deptIds,d.id]}))}>
                      {nu.deptIds.includes(d.id)&&"✓ "}{d.name}
                    </span>
                  ))}
                </div>
              </div>);
            })}
          </div>
        )}

        <div style={{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid var(--bd)"}}>
          <button className="bp" onClick={add} style={{padding:"8px 20px"}}>{I.plus} إضافة</button>
          <button className="bg" onClick={()=>setShow(false)}>إلغاء</button>
        </div>
      </div>}

      {/* جدول المستخدمين */}
      <div style={{display:"grid",gridTemplateColumns:selUser&&canManage(actor,selUser)?"3fr 2fr":"1fr",gap:12}}>
        <div className="cd">
          <table>
            <thead><tr>
              {isSA(actor)&&<th>الشركة</th>}
              <th>الاسم</th>
              <th>اسم الدخول</th>
              <th>الدور</th>
              <th>الإدارات</th>
              <th>أُنشئ بواسطة</th>
              <th></th>
            </tr></thead>
            <tbody>{visible.map(u=>{
              const uCos=getUserCompanyIds(u);
              const creator=u.createdBy?db.users.find(x=>x.id===u.createdBy):null;
              const isMe=u.id===actor.id;
              return(
                <tr key={u.id}
                  style={{cursor:"pointer",background:selId===u.id?"var(--cl)":"transparent"}}
                  onClick={()=>setSelId(selId===u.id?null:u.id)}>
                  {isSA(actor)&&<td style={{fontSize:10}}>
                    {uCos.map(cid=>{const c=co(cid);return c?(<span key={cid} style={{display:"inline-flex",alignItems:"center",gap:3,marginLeft:4,fontSize:10}}>
                      <CoLogo coId={cid} size={14}/>{c.name}
                    </span>):null})}
                  </td>}
                  <td style={{fontWeight:700,fontSize:11}}>
                    {u.name}{isMe&&<span style={{fontSize:9,background:"var(--c)",color:"#fff",borderRadius:10,padding:"1px 6px",marginRight:5}}>أنت</span>}
                  </td>
                  <td style={{fontFamily:"monospace",fontSize:10,color:"var(--ts)"}}>{u.username}</td>
                  <td><RoleBadge role={u.role}/></td>
                  <td style={{fontSize:10,color:"var(--ts)",maxWidth:160}}>{userDeptNames(u)}</td>
                  <td style={{fontSize:10,color:"var(--ts)"}}>{creator?.name||"—"}</td>
                  <td>
                    {!isMe&&canManage(actor,u)&&(
                      <button className="bi" style={{color:"#DC2626"}} onClick={e=>{e.stopPropagation();del(u.id);}}>
                        {I.trash}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* لوحة التفاصيل / التعديل */}
        {selUser&&canManage(actor,selUser)&&(
          <div className="cd" style={{padding:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:"1px solid var(--bd)"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{selUser.name}</div>
                <div style={{fontSize:10,color:"var(--ts)",marginTop:2}}>{selUser.username}</div>
              </div>
              <RoleBadge role={selUser.role}/>
            </div>

            {/* تعديل الشركات — superadmin فقط */}
            {isSA(actor)&&!isSA(selUser)&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:6}}>الشركات المرتبطة:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {COMPANIES.map(c=>{
                    const ids=getUserCompanyIds(selUser);
                    return(<span key={c.id} className={"chip"+(ids.includes(c.id)?" on":"")}
                      onClick={()=>toggleUserCo(selUser.id,c.id)} style={{fontSize:11}}>
                      {ids.includes(c.id)?"✓ ":""}{c.name}
                    </span>);
                  })}
                </div>
              </div>
            )}

            {/* تعديل الإدارات — للـ deptmanager و user */}
            {(selUser.role==="user"||selUser.role==="deptmanager")&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:6}}>
                  الإدارات المرتبطة: <span style={{color:"var(--c)",fontWeight:700}}>{selUser.deptIds?.length||0}</span>
                </div>
                <div style={{fontSize:9,color:"var(--ts)",marginBottom:6}}>انقر للتفعيل / الإلغاء</div>
                {getUserCompanyIds(selUser).map(coId=>{
                  const depts=actorDepts(coId);
                  return(<div key={coId}>
                    {getUserCompanyIds(selUser).length>1&&<div style={{fontSize:10,fontWeight:700,color:"var(--ts)",marginBottom:3}}>{co(coId)?.name}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,padding:8,background:"var(--bg)",borderRadius:8,border:"1.5px solid var(--bd)",marginBottom:6}}>
                      {depts.map(d=>(
                        <span key={d.id} className={"chip"+(selUser.deptIds?.includes(d.id)?" on":"")}
                          onClick={()=>tDept(selUser.id,d.id)} style={{fontSize:10}}>
                          {selUser.deptIds?.includes(d.id)&&"✓ "}{d.name}
                        </span>
                      ))}
                    </div>
                  </div>);
                })}
              </div>
            )}

            {selUser.role==="admin"&&(
              <div style={{padding:8,background:"var(--cl)",borderRadius:8,fontSize:11,color:"var(--c)",marginBottom:12}}>
                🔑 مدير الشركة يرى جميع إدارات شركته تلقائياً
              </div>
            )}

            {/* تغيير كلمة المرور */}
            <div style={{paddingTop:10,borderTop:"1px solid var(--bd)"}}>
              <div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:6}}>تغيير كلمة المرور:</div>
              <div style={{display:"flex",gap:6}}>
                <input type="password" value={editPw[selUser.id]||""}
                  onChange={e=>setEditPw(p=>({...p,[selUser.id]:e.target.value}))}
                  placeholder="كلمة المرور الجديدة" style={{flex:1,fontSize:11}}/>
                <button className="bs" style={{padding:"6px 12px",fontSize:11,flexShrink:0}}
                  onClick={()=>savePassword(selUser.id)}>حفظ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   أرشيف الشركة
══════════════════════════════════════════ */

/* تحميل مكتبة JSZip ديناميكياً */
async function ensureJSZip(){
  if(window.JSZip) return window.JSZip;
  await new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload=res;s.onerror=rej;
    document.head.appendChild(s);
  });
  return window.JSZip;
}

/* تحويل dataURL إلى Blob */
function dataURLtoBlob(dataURL){
  const arr=dataURL.split(",");
  const mime=arr[0].match(/:(.*?);/)[1];
  const bstr=atob(arr[1]);
  let n=bstr.length;
  const u8=new Uint8Array(n);
  while(n--){u8[n]=bstr.charCodeAt(n);}
  return new Blob([u8],{type:mime});
}

/* تصدير أرشيف الشركة كـ ZIP */
async function exportArchiveZip(companyId,minutes,db,setExporting){
  setExporting(true);
  try{
    const JSZip=await ensureJSZip();
    const zip=new JSZip();
    const company=co(companyId);
    const companyName=company?.name||companyId;
    const jsPDF_=await ensureJsPDF();

    const companyMins=minutes.filter(m=>m.companyId===companyId);
    if(!companyMins.length){alert("لا توجد محاضر للتصدير");setExporting(false);return;}

    /* مجلد PDF للمحاضر */
    const pdfFolder=zip.folder("محاضر-"+companyName);
    /* مجلد المرفقات */
    const attachFolder=zip.folder("مرفقات-"+companyName);

    for(let i=0;i<companyMins.length;i++){
      const m=companyMins[i];
      const logo=db.logos?.[m.companyId]||null;
      /* مُعدّ التقرير من createdBy */
      const minuteCreator=m.createdBy?db.users?.find(u=>u.id===m.createdBy):null;
      const minuteCreatorName=minuteCreator?.name||"";

      /* بناء PDF للمحضر */
      try{
        const pdf=new jsPDF_({orientation:"portrait",unit:"mm",format:"a4"});
        const PW=210,M=14,CW=PW-M*2;let y=M;
        const PC=getPdfColors(m.companyId);
        const dept=(db?.departments||[]).find(d=>d.id===m.deptId)||dep(m.deptId);
        const HDR_H=30,LOGO_BOX=24,LOGO_PAD=3;

        pdf.setFillColor(...rgb(PC.dark));pdf.rect(M,y,CW,HDR_H,"F");
        pdf.setFillColor(...rgb(PC.main));pdf.rect(M+CW*0.4,y,CW*0.6,HDR_H,"F");

        const logoX=M+3,logoY=y+(HDR_H-LOGO_BOX)/2;
        pdf.setFillColor(255,255,255);pdf.roundedRect(logoX,logoY,LOGO_BOX,LOGO_BOX,3,3,"F");
        if(logo){try{pdf.addImage(logo,"PNG",logoX+LOGO_PAD,logoY+LOGO_PAD,LOGO_BOX-LOGO_PAD*2,LOGO_BOX-LOGO_PAD*2,"","FAST");}catch(e){}}
        else{pdf.addImage(arTxt(company?.name?.[0]||"؟",LOGO_BOX,LOGO_BOX,"#fff",PC.main,16,true),"PNG",logoX,logoY,LOGO_BOX,LOGO_BOX,"","FAST");}

        const TW=CW-LOGO_BOX-14;
        pdf.addImage(arTxt(company?.fullName||"",TW,14,PC.main,"#fff",13,true),"PNG",M+LOGO_BOX+8,y+2,TW,14,"","FAST");
        pdf.addImage(arTxt(dept?.name||"",TW,10,PC.dark,"rgba(255,255,255,0.88)",9,false),"PNG",M+LOGO_BOX+8,y+16,TW,10,"","FAST");
        y+=HDR_H+2;

        pdf.setFillColor(...rgb(PC.light));pdf.rect(M,y,CW,9,"F");
        pdf.addImage(arTxt("محضر اجتماع",CW,9,PC.light,PC.dark,11,true),"PNG",M,y,CW,9,"","FAST");y+=13;

        const RH=8,LW=26,halfCW=CW/2;
        pCell(pdf,m.hijriDate||"",M,y,halfCW-LW,RH,"#fff","#1A1A2E",8);
        pCell(pdf,"التاريخ",M+halfCW-LW,y,LW,RH,PC.light,PC.dark,8,true);
        pCell(pdf,m.day||"",M+halfCW,y,halfCW-LW,RH,"#fff","#1A1A2E",8);
        pCell(pdf,"اليوم",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true);y+=RH;
        pCell(pdf,m.title||"",M,y,CW-LW,RH,"#fff","#1A1A2E",9,true);
        pCell(pdf,"العنوان",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true);y+=RH;
        if(m.location){pCell(pdf,m.location||"",M,y,CW-LW,RH,"#fff","#1A1A2E",8);pCell(pdf,"المكان",M+CW-LW,y,LW,RH,PC.light,PC.dark,8,true);y+=RH;}
        y+=5;

        const chk=(n=10)=>{if(y+n>282){pdf.addPage();y=M;}};
        const sec=(title,rows)=>{if(!rows||!rows.filter(Boolean).length)return;chk(14);pHd(pdf,title,M,y,CW,9,PC.main);y+=9;rows.filter(Boolean).forEach((r,idx)=>{chk(8);pCell(pdf,String(idx+1),M+CW-10,y,10,8,PC.light,PC.dark,8,true);pCell(pdf,r,M,y,CW-10,8,"#fff","#1A1A2E",8);y+=8;});y+=4;};
        sec("الأهداف",m.objectives);sec("التوصيات",m.recommendations);sec("الحضور",m.attendees);

        /* خانة مُعدّ التقرير */
        if(minuteCreatorName){
          chk(16);y+=4;
          pdf.setDrawColor(...rgb(PC.main+"88"));pdf.setLineWidth(0.3);pdf.line(M,y,M+CW,y);y+=2;
          pdf.setFillColor(...rgb(PC.light));pdf.rect(M,y,CW,10,"F");
          const labelW=38;
          pdf.addImage(arTxt("مُعدّ التقرير:",labelW,10,PC.light,PC.dark,8,true),"PNG",M+CW-labelW,y,labelW,10,"","FAST");
          pdf.addImage(arTxt(minuteCreatorName,CW-labelW-4,10,PC.light,PC.main,9,false),"PNG",M,y,CW-labelW-4,10,"","FAST");
          y+=12;
        }

        chk(9);y+=2;pdf.setFillColor(...rgb(PC.dark));pdf.rect(M,y,CW,9,"F");
        const halfFtr=CW*0.6;
        pdf.addImage(arTxt(company?.fullName||"",halfFtr,9,PC.dark,"#fff",8,true),"PNG",M+CW-halfFtr,y,halfFtr,9,"","FAST");
        pdf.addImage(arTxt(m.serialNumber||"",CW*0.35,9,PC.dark,"rgba(255,255,255,.82)",8,false),"PNG",M,y,CW*0.35,9,"","FAST");

        const pdfBlob=pdf.output("blob");
        const safeName="محضر-"+(m.serialNumber||m.id).replace(/\//g,"-")+".pdf";
        pdfFolder.file(safeName,pdfBlob);
      }catch(e){console.warn("PDF error for minute",m.id,e);}

      /* المرفقات */
      if(m.evidenceFiles?.length){
        const minFolder=attachFolder.folder("محضر-"+(m.serialNumber||m.id).replace(/\//g,"-"));
        m.evidenceFiles.forEach(f=>{
          try{
            if(f.url&&f.url.startsWith("data:")){
              const blob=dataURLtoBlob(f.url);
              minFolder.file(f.name||"ملف",blob);
            }
          }catch(e){console.warn("Attach error",f.name,e);}
        });
      }
    }

    /* ملف فهرس نصي */
    let index=`أرشيف ${company?.fullName||companyName}\n${"=".repeat(40)}\nتاريخ التصدير: ${new Date().toLocaleDateString("ar-SA")}\nإجمالي المحاضر: ${companyMins.length}\n\n`;
    companyMins.forEach((m,i)=>{
      const dept=(db?.departments||[]).find(d=>d.id===m.deptId)||dep(m.deptId);
      const mCreator=m.createdBy?db.users?.find(u=>u.id===m.createdBy):null;
      index+=`${i+1}. ${m.serialNumber||""} — ${m.title||""}\n   الإدارة: ${dept?.name||""} | التاريخ: ${m.hijriDate||""}\n   مُعدّ التقرير: ${mCreator?.name||"—"} | المرفقات: ${m.evidenceFiles?.length||0}\n\n`;
    });
    zip.file("فهرس-الأرشيف.txt",index);

    const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="أرشيف-"+companyName+"-"+new Date().toISOString().slice(0,10)+".zip";
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  }catch(e){
    alert("خطأ في التصدير: "+e.message);
    console.error(e);
  }finally{
    setExporting(false);
  }
}

/* مكوّن الأرشيف */
function Archive({db,user}){
  const myCos=isSA(user)?COMPANIES:COMPANIES.filter(c=>getUserCompanyIds(user).includes(c.id));
  const[activeCo,setActiveCo]=useState(myCos[0]?.id||"");
  const[search,setSearch]=useState("");
  const[fDept,setFDept]=useState("");
  const[fSort,setFSort]=useState("date_desc"); /* date_desc | date_asc | dept */
  const[exporting,setExporting]=useState(false);

  const company=co(activeCo);
  const PC=getPdfColors(activeCo);
  const hdrGrad=company?.headerGrad||"linear-gradient(135deg,#2E1F5E,#4A3382)";

  /* الإدارات المتاحة للفلترة */
  const depts=getDbDepts(db,activeCo).filter(d=>userCanSeeDept(user,d));

  /* المحاضر حسب الفلاتر */
  const allMins=db.minutes.filter(m=>{
    if(m.companyId!==activeCo) return false;
    if(!canSee(user,m)) return false;
    if(fDept&&m.deptId!==fDept) return false;
    if(search.trim()){
      const q=search.trim().toLowerCase();
      const dept=(db.departments||[]).find(d=>d.id===m.deptId);
      const hay=[m.title,m.serialNumber,m.hijriDate,dept?.name,...(m.attendees||[]),...(m.objectives||[])].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted=[...allMins].sort((a,b)=>{
    if(fSort==="date_asc") return (a.hijriDate||"").localeCompare(b.hijriDate||"");
    if(fSort==="date_desc") return (b.hijriDate||"").localeCompare(a.hijriDate||"");
    if(fSort==="dept"){
      const da=(db.departments||[]).find(d=>d.id===a.deptId)?.name||"";
      const db2=(db.departments||[]).find(d=>d.id===b.deptId)?.name||"";
      return da.localeCompare(db2,"ar");
    }
    return 0;
  });

  /* إحصائيات */
  const totalFiles=allMins.reduce((s,m)=>s+(m.evidenceFiles?.length||0),0);
  const uniqueDepts=new Set(allMins.map(m=>m.deptId)).size;

  return(
    <div className="fi">
      {/* هيدر الأرشيف */}
      <div style={{background:hdrGrad,borderRadius:14,padding:"18px 20px",marginBottom:16,direction:"rtl"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {/* شعار الشركة */}
            <div style={{width:52,height:52,borderRadius:12,background:"rgba(255,255,255,.15)",
              display:"flex",alignItems:"center",justifyContent:"center",
              border:"1.5px solid rgba(255,255,255,.3)",overflow:"hidden",flexShrink:0}}>
              {db.logos?.[activeCo]
                ?<img src={db.logos[activeCo]} alt="" style={{width:"88%",height:"88%",objectFit:"contain"}}/>
                :<span style={{fontSize:24,fontWeight:800,color:"#fff"}}>{company?.name?.[0]||"؟"}</span>}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{company?.fullName}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginTop:3}}>
                {allMins.length} محضر &nbsp;·&nbsp; {totalFiles} مرفق &nbsp;·&nbsp; {uniqueDepts} إدارة
              </div>
            </div>
          </div>
          {/* أزرار التبديل بين الشركات */}
          {myCos.length>1&&(
            <div style={{display:"flex",gap:6}}>
              {myCos.map(c=>(
                <button key={c.id} onClick={()=>{setActiveCo(c.id);setFDept("");setSearch("");}}
                  style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid rgba(255,255,255,.4)",
                    background:activeCo===c.id?"rgba(255,255,255,.25)":"transparent",
                    color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* إحصائيات سريعة */}
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          {[
            {l:"إجمالي المحاضر",v:db.minutes.filter(m=>m.companyId===activeCo&&canSee(user,m)).length},
            {l:"المرفقات",v:db.minutes.filter(m=>m.companyId===activeCo&&canSee(user,m)).reduce((s,m)=>s+(m.evidenceFiles?.length||0),0)},
            {l:"الإدارات",v:new Set(db.minutes.filter(m=>m.companyId===activeCo&&canSee(user,m)).map(m=>m.deptId)).size},
            {l:"نتائج البحث",v:sorted.length},
          ].map((s,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:90}}>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{s.v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.75)",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* شريط الفلترة والبحث */}
      <div className="cd" style={{padding:12,marginBottom:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {/* بحث */}
          <div style={{flex:1,minWidth:180,position:"relative"}}>
            <div style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"var(--ts)",pointerEvents:"none"}}>
              {I.search}
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="بحث في المحاضر (عنوان، رقم، إدارة، حضور...)"
              style={{paddingRight:32,fontSize:12}}/>
          </div>

          {/* فلتر الإدارة */}
          <select value={fDept} onChange={e=>setFDept(e.target.value)} style={{width:"auto",minWidth:160,fontSize:12}}>
            <option value="">كل الإدارات</option>
            {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* ترتيب */}
          <select value={fSort} onChange={e=>setFSort(e.target.value)} style={{width:"auto",minWidth:140,fontSize:12}}>
            <option value="date_desc">الأحدث أولاً</option>
            <option value="date_asc">الأقدم أولاً</option>
            <option value="dept">حسب الإدارة</option>
          </select>

          {/* زر التصدير */}
          <button
            onClick={()=>exportArchiveZip(activeCo,db.minutes.filter(m=>canSee(user,m)),db,setExporting)}
            disabled={exporting||!allMins.length}
            style={{padding:"8px 16px",borderRadius:9,border:"none",cursor:exporting||!allMins.length?"not-allowed":"pointer",
              background:PC.main,color:"#fff",fontSize:12,fontWeight:700,
              display:"flex",alignItems:"center",gap:6,opacity:exporting||!allMins.length?0.6:1,
              boxShadow:`0 2px 10px ${PC.main}44`,flexShrink:0}}>
            {exporting
              ?<><span style={{display:"inline-block",animation:"spin 1s linear infinite"}}>⟳</span> جاري التصدير...</>
              :<>{I.download} تصدير ZIP</>}
          </button>
        </div>

        {search&&<div style={{marginTop:8,fontSize:11,color:"var(--ts)"}}>
          نتائج البحث: <strong style={{color:"var(--c)"}}>{sorted.length}</strong> من {allMins.length}
        </div>}
      </div>

      {/* قائمة المحاضر */}
      {sorted.length===0?(
        <div className="cd es" style={{padding:50}}>
          <div style={{fontSize:32,marginBottom:12}}>📂</div>
          <p style={{fontSize:14,fontWeight:600,marginBottom:6}}>
            {search||fDept?"لا توجد نتائج مطابقة":"لا توجد محاضر في الأرشيف"}
          </p>
          <p style={{fontSize:11,color:"var(--ts)"}}>
            {search||fDept?"جرّب تغيير معايير البحث أو الفلتر":"ابدأ بإضافة محاضر من قسم المحاضر"}
          </p>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {sorted.map(m=>{
            const dept=(db.departments||[]).find(d=>d.id===m.deptId)||dep(m.deptId);
            const attachCount=m.evidenceFiles?.length||0;
            const attendCount=m.attendees?.filter(Boolean).length||0;
            return(
              <div key={m.id} className="cd" style={{padding:0,overflow:"hidden",transition:"box-shadow .15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 16px ${PC.main}22`}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                {/* شريط هوية الشركة */}
                <div style={{height:4,background:hdrGrad}}/>
                <div style={{padding:"12px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
                  {/* الرقم */}
                  <div style={{background:PC.main,color:"#fff",borderRadius:9,padding:"6px 10px",
                    fontSize:10,fontWeight:800,flexShrink:0,textAlign:"center",minWidth:60,direction:"ltr"}}>
                    {m.serialNumber||"—"}
                  </div>
                  {/* التفاصيل */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {m.title||"بدون عنوان"}
                    </div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:10,color:"var(--ts)",display:"flex",alignItems:"center",gap:3}}>
                        📅 {m.hijriDate||"—"}
                      </span>
                      {m.day&&<span style={{fontSize:10,color:"var(--ts)"}}>{m.day}</span>}
                      {dept&&<span className="rtag">{dept.name}</span>}
                      {m.location&&<span style={{fontSize:10,color:"var(--ts)",display:"flex",alignItems:"center",gap:3}}>
                        📍 {m.location}
                      </span>}
                    </div>
                  </div>
                  {/* إحصائيات */}
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    {attendCount>0&&(
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#F0FDF4",borderRadius:8}}>
                        <div style={{fontSize:14,fontWeight:800,color:"#16A34A"}}>{attendCount}</div>
                        <div style={{fontSize:8,color:"#16A34A"}}>حضور</div>
                      </div>
                    )}
                    {attachCount>0&&(
                      <div style={{textAlign:"center",padding:"4px 10px",background:"#EFF6FF",borderRadius:8}}>
                        <div style={{fontSize:14,fontWeight:800,color:"#2563EB"}}>{attachCount}</div>
                        <div style={{fontSize:8,color:"#2563EB"}}>مرفق</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* المرفقات */}
                {attachCount>0&&(
                  <div style={{padding:"8px 16px 12px",borderTop:"1px solid var(--bd)",background:"var(--bg)"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--ts)",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
                      {I.attach} المرفقات ({attachCount})
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {m.evidenceFiles.map((f,i)=>{
                        const ext=(f.name||"").split(".").pop()?.toLowerCase();
                        const isPdf=ext==="pdf";
                        const isImg=["jpg","jpeg","png","gif","webp"].includes(ext);
                        return(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:5,
                            padding:"4px 10px",background:"#fff",borderRadius:7,
                            border:"1px solid var(--bd)",fontSize:10,maxWidth:200}}>
                            <span style={{fontSize:14}}>{isPdf?"📄":isImg?"🖼️":"📎"}</span>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{f.name}</span>
                            {f.url&&(
                              <a href={f.url} target="_blank" rel="noopener noreferrer"
                                style={{color:PC.main,fontSize:10,fontWeight:700,textDecoration:"none",flexShrink:0}}>
                                ↗
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CSS للتحريك */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}


function Settings({db,setDb}){
  const[activeTab,setActiveTab]=useState("logos");
  const[newDept,setNewDept]=useState({name:"",companyId:COMPANIES[0]?.id||""});
  const[editingDept,setEditingDept]=useState(null);

  /* Logo handlers */
  const h=(id,e)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const d=JSON.parse(JSON.stringify(db));if(!d.logos)d.logos={};d.logos[id]=ev.target.result;setDb(d);};r.readAsDataURL(f);};
  const rm=id=>{const d=JSON.parse(JSON.stringify(db));if(d.logos)delete d.logos[id];setDb(d);};
  const hLogin=(e)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{const d=JSON.parse(JSON.stringify(db));d.loginLogo=ev.target.result;setDb(d);};r.readAsDataURL(f);};
  const rmLogin=()=>{const d=JSON.parse(JSON.stringify(db));d.loginLogo=null;setDb(d);};

  /* Dept helpers */
  const depts=db.departments||[];
  const addDept=()=>{
    if(!newDept.name.trim())return alert("يرجى إدخال اسم الإدارة");
    const d=JSON.parse(JSON.stringify(db));
    if(!d.departments)d.departments=[];
    d.departments.push({id:"dept-"+Date.now(),name:newDept.name.trim(),companyId:newDept.companyId});
    setDb(d);setNewDept({name:"",companyId:COMPANIES[0]?.id||""});
  };
  const saveDept=()=>{
    if(!editingDept?.name?.trim())return alert("يرجى إدخال اسم الإدارة");
    const d=JSON.parse(JSON.stringify(db));
    d.departments=d.departments.map(x=>x.id===editingDept.id?{...x,name:editingDept.name,companyId:editingDept.companyId}:x);
    setDb(d);setEditingDept(null);
  };
  const delDept=id=>{
    const usedInMin=db.minutes?.some(m=>m.deptId===id);
    if(usedInMin){if(!confirm("هذه الإدارة مرتبطة بمحاضر موجودة. هل تريد الحذف مع الاحتفاظ بالبيانات؟"))return;}
    else if(!confirm("حذف الإدارة؟"))return;
    const d=JSON.parse(JSON.stringify(db));d.departments=d.departments.filter(x=>x.id!==id);setDb(d);
  };

  return(
    <div className="fi">
      <h2 style={{fontSize:19,fontWeight:800,marginBottom:14}}>الإعدادات</h2>
      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"2px solid var(--bd)"}}>
        {[{id:"logos",label:"🖼️ الشعارات"},{id:"depts",label:"🏢 إدارة الإدارات"}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"8px 18px",borderRadius:"8px 8px 0 0",border:"none",fontSize:12,fontWeight:activeTab===t.id?700:500,background:activeTab===t.id?"var(--c)":"transparent",color:activeTab===t.id?"#fff":"var(--ts)",cursor:"pointer",transition:"all .15s"}}>{t.label}</button>
        ))}
      </div>

      {activeTab==="logos"&&(
        <div>
          {/* شعار صفحة تسجيل الدخول */}
          <div className="cd" style={{padding:18,marginBottom:14,borderTop:"4px solid #1A1A2E"}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12,display:"flex",alignItems:"center",gap:7}}>🔐 شعار صفحة تسجيل الدخول <span style={{fontSize:10,fontWeight:400,color:"var(--ts)"}}>(شعار موحد يظهر في صفحة الدخول فقط)</span></div>
            {db.loginLogo
              ?<div style={{textAlign:"center"}}><img src={db.loginLogo} alt="" style={{width:100,height:100,objectFit:"contain",borderRadius:9,border:"1px solid var(--bd)",padding:5,marginBottom:9,background:"#f8fafc"}}/>
                <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                  <label style={{cursor:"pointer"}}><button className="bs" style={{pointerEvents:"none",padding:"4px 9px",fontSize:10}}>تغيير</button><input type="file" accept="image/*" style={{display:"none"}} onChange={hLogin}/></label>
                  <button className="bdr" style={{padding:"4px 9px",fontSize:10}} onClick={rmLogin}>حذف</button>
                </div></div>
              :<label style={{cursor:"pointer",display:"block",maxWidth:280}}><div style={{border:"2px dashed var(--bd)",borderRadius:8,padding:14,textAlign:"center",background:"#fafafa"}}><div style={{fontSize:22,marginBottom:5}}>🔐</div><div style={{fontSize:11,fontWeight:600}}>رفع شعار صفحة تسجيل الدخول</div></div><input type="file" accept="image/*" style={{display:"none"}} onChange={hLogin}/></label>}
          </div>
          {/* شعارات الشركات */}
          <div style={{fontSize:12,fontWeight:700,marginBottom:10,color:"var(--ts)"}}>شعارات الشركات (تظهر داخل لوحة التحكم)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {COMPANIES.map(c=>(<div key={c.id} className="cd" style={{padding:18,borderTop:"4px solid "+c.color}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><CoLogo coId={c.id} size={36}/><div style={{fontWeight:700,fontSize:12}}>{c.fullName}</div></div>
              {db.logos?.[c.id]
                ?<div style={{textAlign:"center"}}><img src={db.logos[c.id]} alt="" style={{width:88,height:88,objectFit:"contain",borderRadius:9,border:"1px solid var(--bd)",padding:5,marginBottom:9}}/>
                  <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                    <label style={{cursor:"pointer"}}><button className="bs" style={{pointerEvents:"none",padding:"4px 9px",fontSize:10}}>تغيير</button><input type="file" accept="image/*" style={{display:"none"}} onChange={e=>h(c.id,e)}/></label>
                    <button className="bdr" style={{padding:"4px 9px",fontSize:10}} onClick={()=>rm(c.id)}>حذف</button>
                  </div></div>
                :<label style={{cursor:"pointer",display:"block"}}><div style={{border:"2px dashed var(--bd)",borderRadius:8,padding:14,textAlign:"center",background:"#fafafa"}}><div style={{fontSize:22,marginBottom:5}}>🖼️</div><div style={{fontSize:11,fontWeight:600}}>رفع شعار {c.name}</div></div><input type="file" accept="image/*" style={{display:"none"}} onChange={e=>h(c.id,e)}/></label>}
            </div>))}
          </div>
        </div>
      )}

      {activeTab==="depts"&&(
        <div>
          {/* Add new dept */}
          <div className="cd" style={{padding:16,marginBottom:14}}>
            <h3 style={{fontSize:13,fontWeight:700,marginBottom:12}}>إضافة إدارة جديدة</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"end"}}>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>اسم الإدارة</label>
                <input value={newDept.name} onChange={e=>setNewDept(p=>({...p,name:e.target.value}))} placeholder="أدخل اسم الإدارة الجديدة..." onKeyDown={e=>e.key==="Enter"&&addDept()}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>الشركة</label>
                <select value={newDept.companyId} onChange={e=>setNewDept(p=>({...p,companyId:e.target.value}))} style={{width:"auto"}}>
                  {COMPANIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button className="bp" onClick={addDept} style={{padding:"8px 18px",whiteSpace:"nowrap"}}>{I.plus} إضافة</button>
            </div>
          </div>

          {/* Dept list per company */}
          {COMPANIES.map(c=>{
            const cDepts=depts.filter(d=>d.companyId===c.id);
            return(
              <div key={c.id} className="cd" style={{marginBottom:12,borderTop:"3px solid "+c.color}}>
                <div style={{padding:"10px 16px",background:c.light,display:"flex",alignItems:"center",gap:8}}>
                  <CoLogo coId={c.id} size={24}/><span style={{fontWeight:700,fontSize:13,color:c.color}}>{c.fullName}</span>
                  <span className="badge" style={{background:c.color+"22",color:c.color,marginRight:"auto"}}>{cDepts.length} إدارة</span>
                </div>
                {cDepts.length===0
                  ?<div style={{padding:"20px",textAlign:"center",fontSize:11,color:"var(--ts)"}}>لا توجد إدارات لهذه الشركة</div>
                  :<table>
                    <thead><tr><th style={{background:c.light,color:c.color}}>#</th><th style={{background:c.light,color:c.color}}>اسم الإدارة</th><th style={{background:c.light,color:c.color}}>الارتباط</th><th style={{background:c.light,color:c.color}}>إجراءات</th></tr></thead>
                    <tbody>{cDepts.map((d,idx)=>(
                      <tr key={d.id}>
                        <td style={{fontSize:10,color:"var(--ts)",width:30}}>{idx+1}</td>
                        <td>{editingDept?.id===d.id
                          ?<input value={editingDept.name} onChange={e=>setEditingDept(p=>({...p,name:e.target.value}))} style={{fontSize:12,padding:"4px 8px"}} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveDept();if(e.key==="Escape")setEditingDept(null);}}/>
                          :<span style={{fontWeight:600,fontSize:11}}>{d.name}</span>}
                        </td>
                        <td>{(()=>{const mCount=db.minutes?.filter(m=>m.deptId===d.id).length||0;return mCount?<span style={{fontSize:10,color:"#0284C7"}}>{mCount} محضر</span>:<span style={{fontSize:10,color:"#94A3B8"}}>لا يوجد</span>})()}</td>
                        <td><div style={{display:"flex",gap:3}}>
                          {editingDept?.id===d.id
                            ?<><button className="bp" style={{padding:"3px 10px",fontSize:10}} onClick={saveDept}>حفظ</button><button className="bg" style={{padding:"3px 8px",fontSize:10}} onClick={()=>setEditingDept(null)}>إلغاء</button></>
                            :<><button className="bi" onClick={()=>setEditingDept({...d})}>{I.edit}</button><button className="bi" style={{color:"#DC2626"}} onClick={()=>delDept(d.id)}>{I.trash}</button></>
                          }
                        </div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   API Layer — Netlify Functions Integration
   يعمل مع الـ API إذا كان متاحاً، وإلا يعود للـ local state
══════════════════════════════════════════ */
const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "/api"
  : "/.netlify/functions";

const API = {
  _token: null,
  setToken(t){ this._token=t; try{localStorage.setItem("mn_token",t);}catch(e){} },
  getToken(){ return this._token || (()=>{try{return localStorage.getItem("mn_token");}catch{return null;}})(); },
  clearToken(){ this._token=null; try{localStorage.removeItem("mn_token");localStorage.removeItem("mn_user");}catch(e){} },

  async _fetch(path, opts={}){
    const token = this.getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers:{
        "Content-Type":"application/json",
        ...(token?{Authorization:`Bearer ${token}`}:{}),
        ...opts.headers,
      },
    });
    let data;
    try{ data=await res.json(); }catch{ data={error:"Invalid response"}; }
    if(!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
    return data;
  },

  /* تسجيل الدخول */
  async login(username, password){
    const data = await this._fetch("/auth",{method:"POST",body:JSON.stringify({username,password})});
    this.setToken(data.token);
    try{localStorage.setItem("mn_user",JSON.stringify(data.user));}catch(e){}
    return data.user;
  },

  /* جلب المحاضر */
  async getMinutes(params={}){
    const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null)));
    return this._fetch(`/getMeetings?${q}`);
  },

  /* إنشاء / تعديل محضر */
  async saveMinute(minute, isEdit=false){
    return this._fetch("/createMeeting",{
      method:isEdit?"PUT":"POST",
      body:JSON.stringify(minute),
    });
  },

  /* حذف محضر */
  async deleteMinute(id){
    return this._fetch(`/deleteMeeting?id=${encodeURIComponent(id)}`,{method:"DELETE"});
  },

  /* رفع ملف */
  async uploadFile(file, meta={}){
    const b64 = await new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=e=>res(e.target.result.split(",")[1]);
      r.onerror=rej;
      r.readAsDataURL(file);
    });
    return this._fetch("/uploadFile",{
      method:"POST",
      body:JSON.stringify({fileName:file.name,fileData:b64,mimeType:file.type,...meta}),
    });
  },

  /* جلب المستخدمين */
  async getUsers(){ return this._fetch("/getUsers"); },

  /* حفظ مستخدم */
  async saveUser(user, isEdit=false){
    return this._fetch("/getUsers",{method:isEdit?"PUT":"POST",body:JSON.stringify(user)});
  },

  /* حذف مستخدم */
  async deleteUser(id){
    return this._fetch(`/getUsers?id=${encodeURIComponent(id)}`,{method:"DELETE"});
  },

  /* جلب الإدارات */
  async getDepts(companyId){
    return this._fetch(`/getDepartments${companyId?`?companyId=${companyId}`:""}`);
  },

  /* جلب الإعدادات */
  async getSettings(){ return this._fetch("/settings"); },
};

/* هل الـ API متاح؟ — يُكتشف عند أول استخدام */
let API_AVAILABLE = null;
async function checkAPI(){
  if(API_AVAILABLE!==null) return API_AVAILABLE;
  try{
    const r=await fetch(`${API_BASE}/getMeetings`,{method:"GET",headers:{Authorization:"Bearer test"},signal:AbortSignal.timeout(2000)});
    API_AVAILABLE = r.status!==404 && r.status!==0;
  }catch{ API_AVAILABLE=false; }
  return API_AVAILABLE;
}

/* hook لتحميل البيانات من API وتزامنها مع db */
function useApiSync(db, setDb, user){
  const[apiReady,setApiReady]=useState(false);
  const[syncing,setSyncing]=useState(false);

  useEffect(()=>{
    if(!user) return;
    (async()=>{
      const ready=await checkAPI();
      setApiReady(ready);
      if(!ready) return;

      setSyncing(true);
      try{
        /* جلب البيانات من API */
        const [minsRes, usersRes, deptsRes, settingsRes] = await Promise.allSettled([
          API.getMinutes(),
          API.getUsers(),
          API.getDepts(),
          API.getSettings(),
        ]);

        setDb(prev=>{
          const next={...prev};
          if(minsRes.status==="fulfilled") next.minutes=minsRes.value.minutes||prev.minutes;
          if(usersRes.status==="fulfilled") next.users=usersRes.value.users||prev.users;
          if(deptsRes.status==="fulfilled") next.departments=deptsRes.value.departments||prev.departments;
          if(settingsRes.status==="fulfilled"){
            const s=settingsRes.value.settings||{};
            next.logos=s.logos||prev.logos;
            next.loginLogo=s.loginLogo||prev.loginLogo;
          }
          return next;
        });
      }catch(e){ console.warn("API sync error:",e.message); }
      finally{ setSyncing(false); }
    })();
  },[user]);

  return{apiReady,syncing};
}
function Login({ db, onLogin }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [ld, setLd] = useState(false);
  const loginLogo = db.loginLogo || null;
  const BROWN = "#6B4C2A", BROWN_DARK = "#4A3118", BROWN_LIGHT = "#F5EFE6";

  const go = async () => {
    if(!u.trim()||!p.trim()){setErr("يرجى إدخال اسم المستخدم وكلمة المرور");return;}
    setLd(true); setErr("");
    try {
      /* محاولة تسجيل الدخول عبر API */
      const apiAvail = await checkAPI();
      if(apiAvail){
        const apiUser = await API.login(u, p);
        onLogin(apiUser);
        return;
      }
    } catch(e) {
      /* API فشل — ننتقل للـ local fallback */
    }
    /* Local fallback */
    setTimeout(() => {
      const f = db.users.find(x => x.username === u && x.password === p);
      f ? onLogin(f) : setErr("بيانات غير صحيحة");
      setLd(false);
    }, 300);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(160deg,${BROWN_DARK} 0%,${BROWN} 50%,#8B6340 100%)`, padding:20, position:"relative", overflow:"hidden" }}>
      {/* زخرفة خلفية */}
      <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>

      {/* شريط الهوية العلوي — شعار + اسم الشركة + اسم الجهة */}
      <div className="fi" style={{display:"flex",alignItems:"center",gap:16,marginBottom:28,
        background:"rgba(255,255,255,.10)",backdropFilter:"blur(8px)",
        borderRadius:18,padding:"14px 24px",border:"1px solid rgba(255,255,255,.18)",
        maxWidth:440,width:"100%",direction:"rtl"}}>
        {/* الشعار */}
        <div style={{width:64,height:64,borderRadius:14,background:loginLogo?"#fff":"rgba(255,255,255,.15)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          border:"2px solid rgba(255,255,255,.3)",overflow:"hidden",boxShadow:"0 4px 14px rgba(0,0,0,.25)"}}>
          {loginLogo
            ? <img src={loginLogo} alt="شعار" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
            : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
          }
        </div>
        {/* النصوص */}
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:3,letterSpacing:".3px"}}>
            نظام المحاضر
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.9)",
              background:"rgba(255,255,255,.15)",borderRadius:20,padding:"2px 10px",border:"1px solid rgba(255,255,255,.2)"}}>
              شركة قريش وأذان
            </span>
            <span style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>|</span>
            <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.75)"}}>
              إدارة المشاعر المقدسة
            </span>
          </div>
        </div>
      </div>

      {/* بطاقة تسجيل الدخول */}
      <div className="fi" style={{ background:"rgba(255,255,255,.97)", borderRadius:20, padding:"32px 28px",
        width:"100%", maxWidth:400, boxShadow:"0 24px 60px rgba(0,0,0,.35)", direction:"rtl" }}>

        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:15,fontWeight:800,color:BROWN_DARK,marginBottom:4}}>تسجيل الدخول</div>
          <div style={{fontSize:10,color:"#94A3B8"}}>أدخل بيانات حسابك للمتابعة</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>اسم المستخدم</label>
            <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
              placeholder="أدخل اسم المستخدم"
              style={{borderColor:"#D1C4B0"}}/>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:"#475569",display:"block",marginBottom:4}}>كلمة المرور</label>
            <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
              placeholder="أدخل كلمة المرور"
              style={{borderColor:"#D1C4B0"}}/>
          </div>
          {err && <div style={{background:"#FEE2E2",color:"#DC2626",padding:"8px 11px",borderRadius:8,fontSize:11,textAlign:"center"}}>{err}</div>}
          <button onClick={go} disabled={ld}
            style={{width:"100%",padding:"12px",fontSize:13,marginTop:4,borderRadius:10,fontWeight:700,
              background:`linear-gradient(135deg,${BROWN},${BROWN_DARK})`,color:"#fff",border:"none",cursor:"pointer",
              boxShadow:`0 4px 14px ${BROWN}55`,opacity:ld?0.7:1,transition:"all .2s"}}>
            {ld ? "جاري التحقق..." : "دخول →"}
          </button>
        </div>

        <div style={{marginTop:16,padding:"10px 12px",background:BROWN_LIGHT,borderRadius:8,fontSize:9,color:"#8B6340",textAlign:"center",lineHeight:1.9}}>
          superadmin / 123456 &nbsp;|&nbsp; admin_q / 123456 &nbsp;|&nbsp; admin_a / 123456
        </div>
      </div>
    </div>
  );
}

export default function App() {
  /* 1. تعريف الـ Hooks الأساسية في البداية (ترتيب ثابت) */
  const [db, setDb] = useState(JSON.parse(JSON.stringify(defaultDB)));
  const [page, setPage] = useState("dash");
  const [preview, setPreview] = useState(null);

  /* 2. الـ Hook الخاص بالمستخدم واستعادة الجلسة */
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("mn_user");
      const token = localStorage.getItem("mn_token");
      if (saved && token) {
        API._token = token;
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });

  /* 3. مزامنة البيانات مع API (يجب أن يبقى هنا ليتم استدعاؤه دائماً) */
  const { apiReady, syncing } = useApiSync(db, setDb, user);

  /* 4. الـ Hooks الخاصة بالـ Sidebar والتنسيقات */
  const [sideOpen, setSideOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("mn_sidebar");
      if (saved !== null) return saved === "1";
    } catch (e) {}
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const r = document.documentElement;
    const ids = user ? getUserCompanyIds(user) : [];
    const c = ids.length === 1 ? co(ids[0]) : null;
    if (c) {
      r.style.setProperty("--c", c.color);
      r.style.setProperty("--cl", c.light);
      r.style.setProperty("--ca", c.accent);
      r.style.setProperty("--cb", c.beige);
      r.style.setProperty("--bg", c.bg);
      r.style.setProperty("--tx", c.id === "quraish" ? "#1A1230" : "#0D2B26");
      r.style.setProperty("--ts", c.id === "quraish" ? "#5A4E7A" : "#2D6B60");
      r.style.setProperty("--bd", c.id === "quraish" ? "#DDD6F0" : "#C8DDD9");
    } else {
      r.style.setProperty("--c", "#4A3382");
      r.style.setProperty("--cl", "#EDE8F8");
      r.style.setProperty("--ca", "#6B5CA6");
      r.style.setProperty("--cb", "#CFB88F");
      r.style.setProperty("--bg", "#F2EEF9");
      r.style.setProperty("--tx", "#1A1230");
      r.style.setProperty("--ts", "#5A4E7A");
      r.style.setProperty("--bd", "#DDD6F0");
    }
  }, [user]);

  /* ------------------------------------------------------------------ */
  /* 5. الآن نضع شرط تسجيل الدخول (بعد التأكد من استدعاء كل الـ Hooks) */
  /* ------------------------------------------------------------------ */
  if (!user) {
    return (
      <>
        <style>{CSS}</style>
        <Login db={db} onLogin={setUser} />
      </>
    );
  }

  /* 6. منطق التطبيق للمستخدم المسجل */
  const userCos = getUserCompanyIds(user);
  const openPv = (item, type) => setPreview({ item, type });
  const logout = () => {
    API.clearToken();
    setUser(null);
    setPage("dash");
    setPreview(null);
  };

  const toggleSide = () =>
    setSideOpen((p) => {
      const next = !p;
      try {
        localStorage.setItem("mn_sidebar", next ? "1" : "0");
      } catch (e) {}
      return next;
    });

  const closeSideOnMobile = () => {
    if (window.innerWidth < 768) setSideOpen(false);
  };

  const SW = 238; /* عرض الـ Sidebar */

  const navItems = [
    { id: "dash", label: "لوحة التحكم", icon: I.home },
    ...(isAdm(user) || isDM(user)
      ? [{ id: "users", label: "المستخدمون", icon: I.users }]
      : []),
    ...(isSA(user) ? [{ id: "set", label: "الإعدادات", icon: I.set }] : []),
  ];

  const renderMain = () => {
    if (page === "dash") return <Dash db={db} user={user} />;
    if (page === "users")
      return isAdm(user) || isDM(user) ? (
        <Users db={db} setDb={setDb} user={user} api={API} apiReady={apiReady} />
      ) : null;
    if (page === "set")
      return isSA(user) ? (
        <Settings db={db} setDb={setDb} api={API} apiReady={apiReady} />
      ) : null;
    if (page === "minutes")
      return (
        <MinutesList
          db={db}
          setDb={setDb}
          user={user}
          onPreview={openPv}
          api={API}
          apiReady={apiReady}
        />
      );
    if (page === "archive") return <Archive db={db} user={user} />;
    return <Dash db={db} user={user} />;
  };

  /* اسم الإدارات المرتبطة بالمستخدم */
  const userDeptNames = () => {
    if (isSA(user) || isAdm(user)) return null;
    const ids = user.deptIds || [];
    if (!ids.length) return null;
    return ids
      .map((id) => {
        const d = (db.departments || []).find(
          (x) => x.id === id || x.baseDeptId === id
        );
        return d?.name || DEPT_LIST.find((x) => x.id === id)?.name || id;
      })
      .filter(Boolean);
  };
  const deptNames = userDeptNames();

  /* هيدر الـ Sidebar: لون الشركة النشطة */
  const sidebarCoId = isSA(user) ? null : userCos[0] || null;
  const sidebarCo = sidebarCoId ? co(sidebarCoId) : null;
  const sidebarGrad =
    sidebarCo?.headerGrad || "linear-gradient(135deg,#2E1F5E,#4A3382)";

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
        {/* Overlay للجوال عند فتح الـ Sidebar */}
        {sideOpen && (
          <div
            onClick={closeSideOnMobile}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.45)",
              zIndex: 99,
              display: "none",
            }}
            className="sb-overlay"
          />
        )}

        {/* ── زر Toggle ── */}
        <button
          onClick={toggleSide}
          className="sb-toggle"
          aria-label={sideOpen ? "إخفاء القائمة" : "إظهار القائمة"}
          style={{
            position: "fixed",
            top: 12,
            right: sideOpen ? SW + 10 : 12,
            zIndex: 200,
            width: 36,
            height: 36,
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            background: sideOpen ? sidebarGrad : "var(--c)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,.2)",
            transition: "right .25s ease",
          }}
        >
          {sideOpen ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* ── Sidebar ── */}
        <div
          className="sidebar-wrap"
          style={{
            width: SW,
            minHeight: "100vh",
            background: "var(--sf)",
            borderLeft: "1px solid var(--bd)",
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 100,
            transform: sideOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform .25s ease",
            overflowY: "auto",
          }}
        >
          {/* رأس الشريط — هوية الشركة */}
          <div
            style={{
              background: sidebarGrad,
              padding: "14px 14px 12px",
              borderBottom: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "rgba(255,255,255,.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1.5px solid rgba(255,255,255,.3)",
                  overflow: "hidden",
                }}
              >
                {isSA(user) ? (
                  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                    <path
                      d="M8 10h16M8 16h12M8 22h14"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : sidebarCoId && db.logos?.[sidebarCoId] ? (
                  <img
                    src={db.logos[sidebarCoId]}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: 4,
                      background: "rgba(255,255,255,.9)",
                    }}
                  />
                ) : (
                  <span
                    style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}
                  >
                    {co(sidebarCoId)?.name?.[0] || "؟"}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {isSA(user)
                    ? "النظام المركزي"
                    : userCos.length === 1
                    ? co(userCos[0])?.fullName
                    : userCos
                        .map((cid) => co(cid)?.name)
                        .filter(Boolean)
                        .join(" & ")}
                </div>
                {deptNames && deptNames.length > 0 ? (
                  <div
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,.75)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {deptNames.length === 1
                      ? deptNames[0]
                      : deptNames.length + " إدارات"}
                  </div>
                ) : (
                  <div style={{ marginTop: 3 }}>
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* القائمة */}
          <div style={{ padding: "10px 10px 0", flex: 1 }}>
            {navItems.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setPage(it.id);
                  closeSideOnMobile();
                }}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 7,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 2,
                  fontSize: 11,
                  fontWeight: page === it.id ? 600 : 400,
                  background: page === it.id ? "var(--cl)" : "transparent",
                  color: page === it.id ? "var(--c)" : "var(--ts)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
            <div style={{ height: 1, background: "var(--bd)", margin: "8px 0" }} />
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--ts)",
                padding: "0 4px",
                marginBottom: 4,
                letterSpacing: ".5px",
              }}
            >
              نظام المحاضر
            </div>
            <button
              onClick={() => {
                setPage("minutes");
                closeSideOnMobile();
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 2,
                fontSize: 11,
                fontWeight: page === "minutes" ? 700 : 400,
                background:
                  page === "minutes"
                    ? "linear-gradient(135deg,var(--c),var(--ca))"
                    : "transparent",
                color: page === "minutes" ? "#fff" : "var(--ts)",
                border: "none",
                cursor: "pointer",
                transition: "all .18s",
                boxShadow:
                  page === "minutes"
                    ? "0 2px 8px rgba(107,76,42,.3)"
                    : "none",
              }}
            >
              {I.min} المحاضر
            </button>
            <button
              onClick={() => {
                setPage("archive");
                closeSideOnMobile();
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 2,
                fontSize: 11,
                fontWeight: page === "archive" ? 700 : 400,
                background:
                  page === "archive"
                    ? "linear-gradient(135deg,var(--c),var(--ca))"
                    : "transparent",
                color: page === "archive" ? "#fff" : "var(--ts)",
                border: "none",
                cursor: "pointer",
                transition: "all .18s",
                boxShadow:
                  page === "archive"
                    ? "0 2px 8px rgba(107,76,42,.3)"
                    : "none",
              }}
            >
              {I.archive} أرشيف الشركة
            </button>
          </div>

          {/* Footer: API status + اسم المستخدم */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--bd)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 7,
                padding: "4px 8px",
                background: apiReady ? "#F0FDF4" : "#F8FAFC",
                borderRadius: 7,
                fontSize: 9,
                color: apiReady ? "#16A34A" : "var(--ts)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: apiReady ? "#16A34A" : "#94A3B8",
                  animation: syncing ? "pulse 1s infinite" : "none",
                }}
              />
              {syncing ? "جاري المزامنة..." : apiReady ? "متصل بالسيرفر" : "وضع محلي"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 10, color: "var(--ts)" }}>
                  {user.username}
                </div>
              </div>
              <button className="bi" onClick={logout}>
                {I.logout}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <main
          style={{
            flex: 1,
            marginRight: sideOpen ? SW : 0,
            padding: "20px 24px",
            minHeight: "100vh",
            transition: "margin-right .25s ease",
            paddingTop: 56, /* مساحة لزر Toggle */
          }}
          className="main-content"
        >
          {renderMain()}
        </main>
      </div>
      {preview?.type === "minute" && (
        <MinutePreview
          item={preview.item}
          db={db}
          onClose={() => setPreview(null)}
          currentUser={user}
        />
      )}
    </>
  );
}