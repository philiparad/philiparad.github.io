"use strict";
(() => {
  const root = document.querySelector("#resources");
  if (!root) return;
  const subjectNames = {math:"מתמטיקה",cs:"מדעי המחשב",tools:"כלים"};
  const types = {lesson:"שיעור",exercise:"תרגול",exam:"מבחן ובגרות",lab:"מעבדה וסימולציה",guide:"מדריך",tool:"כלי אינטראקטיבי"};
  const icons = {math:"sigma",cs:"code",tools:"flask"};
  const limit = 18;
  const $ = id => document.getElementById(id);
  const search = $("search"), type = $("type"), topic = $("topic"), sort = $("sort");
  const params = new URLSearchParams(location.search);
  const allowedSubjects = ["all","math","cs","tools"];
  const allowedTypes = ["all",...Object.keys(types)];
  const state = {
    subject: allowedSubjects.includes(params.get("subject")) ? params.get("subject") : "all",
    type: allowedTypes.includes(params.get("type")) ? params.get("type") : "all",
    q: params.get("q") || "", topic: params.get("topic") || "all",
    sort: ["recommended","alphabetical","topic"].includes(params.get("sort")) ? params.get("sort") : "recommended",
    visible:limit
  };
  let resources = [];
  const icon = name => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.classList.add("icon");
    svg.setAttribute("aria-hidden","true");
    const use = document.createElementNS("http://www.w3.org/2000/svg","use");
    use.setAttribute("href","#i-"+name); svg.append(use);return svg;
  };
  const normalize = s => String(s || "").normalize("NFKD").replace(/[\u0591-\u05C7]/g,"").toLocaleLowerCase().replace(/[\u05DA\u05DD\u05DF\u05E3\u05E5]/g,c=>({ "ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ" }[c])).replace(/[\u200E\u200F]/g,"").trim();
  const valueFor = item => normalize([item.title,item.topic,item.type,types[item.type],subjectNames[item.subject],decodeURIComponent(item.url)].join(" "));
  const el = (tag,cls,text) => {const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  function makeCard(item){
    const article=el("article","resource-card");
    const link=el("a");link.href=item.url;link.setAttribute("aria-label",item.title+" — "+(types[item.type]||"תוכן"));
    const top=el("div","resource-card-top");
    const badge=el("span","resource-card-icon "+item.subject);badge.append(icon(icons[item.subject]||"book"));
    top.append(badge,el("span","resource-type",types[item.type]||"תוכן"));
    const title=el("h3","",item.title);
    title.dir="auto";
    const bottom=el("div","resource-bottom");
    bottom.append(el("span","resource-topic",item.topic),icon("arrow"));
    link.append(top,title,bottom);article.append(link);return article;
  }
  function makeTopicOptions(){
    const topics=[...new Set(resources.filter(r=>state.subject==="all"||r.subject===state.subject).map(r=>r.topic))].sort((a,b)=>a.localeCompare(b,"he"));
    topic.replaceChildren(new Option("כל הנושאים","all"),...topics.map(t=>new Option(t,t)));
    if(!topics.includes(state.topic))state.topic="all";
    topic.value=state.topic;
  }
  function syncControls(){
    search.value=state.q;type.value=state.type;sort.value=state.sort;makeTopicOptions();
    document.querySelectorAll("[data-subject]").forEach(b=>{
      const active=b.dataset.subject===state.subject;
      b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));
    });
    $("clear-search").hidden=!state.q;
    $("reset-filters").hidden=state.subject==="all"&&state.type==="all"&&state.topic==="all"&&!state.q&&state.sort==="recommended";
  }
  function syncUrl(){
    const next=new URLSearchParams();
    if(state.q.trim())next.set("q",state.q.trim());
    if(state.subject!=="all")next.set("subject",state.subject);
    if(state.type!=="all")next.set("type",state.type);
    if(state.topic!=="all")next.set("topic",state.topic);
    if(state.sort!=="recommended")next.set("sort",state.sort);
    history.replaceState(null,"",location.pathname+(next.size?"?"+next:"")+location.hash);
  }
  function render(){
    syncControls();
    const words=normalize(state.q).split(/\s+/).filter(Boolean);
    let matched=resources.filter(r=>
      (state.subject==="all"||r.subject===state.subject)&&
      (state.type==="all"||r.type===state.type)&&
      (state.topic==="all"||r.topic===state.topic)&&
      words.every(w=>valueFor(r).includes(w))
    );
    if(state.sort==="alphabetical")matched.sort((a,b)=>a.title.localeCompare(b.title,"he"));
    if(state.sort==="topic")matched.sort((a,b)=>a.topic.localeCompare(b.topic,"he")||a.title.localeCompare(b.title,"he"));
    root.replaceChildren(...matched.slice(0,state.visible).map(makeCard));
    root.setAttribute("aria-busy","false");
    $("result-count").textContent=matched.length.toLocaleString("he-IL")+" תכנים נמצאו";
    $("empty-state").hidden=matched.length!==0;
    const more=$("load-more");more.hidden=matched.length<=state.visible;
    if(!more.hidden)more.textContent="הצגת עוד "+Math.min(limit,matched.length-state.visible)+" תכנים ↓";
    syncUrl();
  }
  function change(next){
    Object.assign(state,next);state.visible=limit;render();
  }
  function reset(){change({subject:"all",type:"all",topic:"all",q:"",sort:"recommended"});}
  search.addEventListener("input",()=>change({q:search.value}));
  $("clear-search").addEventListener("click",()=>{change({q:""});search.focus();});
  type.addEventListener("change",()=>change({type:type.value}));
  topic.addEventListener("change",()=>change({topic:topic.value}));
  sort.addEventListener("change",()=>change({sort:sort.value}));
  document.querySelectorAll("[data-subject]").forEach(b=>b.addEventListener("click",()=>change({subject:b.dataset.subject,topic:"all"})));
  document.querySelectorAll("[data-go-subject]").forEach(a=>a.addEventListener("click",()=>change({subject:a.dataset.goSubject,topic:"all",type:"all"})));
  document.querySelectorAll("[data-go-type]").forEach(a=>a.addEventListener("click",()=>change({type:a.dataset.goType,subject:"all",topic:"all"})));
  $("reset-filters").addEventListener("click",reset);
  $("empty-reset").addEventListener("click",reset);
  $("load-more").addEventListener("click",()=>{state.visible+=limit;render();});
  const menu=document.querySelector(".menu-toggle"),nav=$("main-nav");
  if(menu&&nav){
    menu.addEventListener("click",()=>{const opened=nav.classList.toggle("is-open");menu.setAttribute("aria-expanded",String(opened));menu.setAttribute("aria-label",opened?"סגירת תפריט":"פתיחת תפריט");});
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("is-open");menu.setAttribute("aria-expanded","false");menu.setAttribute("aria-label","פתיחת תפריט");}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("is-open")){nav.classList.remove("is-open");menu.setAttribute("aria-expanded","false");menu.focus();}});
  }
  async function init(){
    try{
      const response=await fetch("assets/resources.json",{cache:"no-cache"});
      if(!response.ok)throw Error("Catalog HTTP "+response.status);
      const data=await response.json();
      if(!Array.isArray(data.items))throw Error("Invalid resource catalog");
      resources=data.items.filter(r=>r&&r.title&&r.url&&allowedSubjects.includes(r.subject)&&allowedTypes.includes(r.type));
      $("hero-count").textContent=resources.length.toLocaleString("he-IL");
      for(const subject of ["math","cs","tools"])$(subject+"-count").textContent=resources.filter(r=>r.subject===subject).length.toLocaleString("he-IL");
      render();
    }catch(error){
      root.setAttribute("aria-busy","false");
      $("result-count").textContent="לא ניתן לטעון כרגע את ספריית התכנים.";
      root.replaceChildren(el("p","no-script","בדקו את החיבור ונסו לטעון את הדף מחדש. ניתן להשתמש בקישורי המסלולים ובקישורים המהירים."));
      console.error("Could not load resource catalog:",error);
    }
  }
  init();
})();
