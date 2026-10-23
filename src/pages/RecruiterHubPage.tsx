import {useEffect,useMemo,useState} from "react";
import {ArrowUpRight,Bookmark,CheckCircle2,LoaderCircle,MapPin,Search,ShieldCheck,SlidersHorizontal,Star,Target,Users} from "lucide-react";
import {Link} from "react-router-dom";
import {supabase,supabaseConfigured} from "../lib/supabase";
import "../styles-workspace.css";

type Org={id:string;name:string;verification_status:string;organisation_type:string};
type Sport={id:string;name:string};
type Opportunity={id:string;title:string;sport:string;organisation_id:string;position?:string|null;positions?:string[]|null;competition_level?:string|null;location?:string|null;status:string;verification_status:string};
type Match={athlete_id:string;display_name:string;avatar_url:string|null;sport:string|null;discipline:string|null;position:string|null;playing_level:string|null;location:string|null;score:number;reasons:string[];age:number|null;availability:string|null};
type Pipeline={id:string;opportunity_id:string;athlete_id:string;status:string;message:string|null;created_at:string;opportunity_title:string;applicant_name:string;applicant_sport:string|null;applicant_position:string|null;applicant_level:string|null;applicant_location:string|null};
type SavedSearch={id:string;name:string;query:string|null;sport_id:string|null;position:string|null;level:string|null;location:string|null;alert_enabled:boolean};

const stages=["submitted","reviewing","shortlisted","accepted","declined"];

export default function RecruiterHubPage(){
 const [userId,setUserId]=useState("");const [orgs,setOrgs]=useState<Org[]>([]);const [orgId,setOrgId]=useState("");const [sports,setSports]=useState<Sport[]>([]);
 const [opps,setOpps]=useState<Opportunity[]>([]);const [selectedOpp,setSelectedOpp]=useState("");const [matches,setMatches]=useState<Match[]>([]);
 const [pipeline,setPipeline]=useState<Pipeline[]>([]);const [saved,setSaved]=useState<SavedSearch[]>([]);
 const [query,setQuery]=useState("");const [sportFilter,setSportFilter]=useState("all");const [levelFilter,setLevelFilter]=useState("all");const [minScore,setMinScore]=useState(0);
 const [searchName,setSearchName]=useState("");const [searchQuery,setSearchQuery]=useState("");const [searchSport,setSearchSport]=useState("");const [searchPosition,setSearchPosition]=useState("");const [searchLevel,setSearchLevel]=useState("");const [searchLocation,setSearchLocation]=useState("");
 const [tab,setTab]=useState<"match"|"pipeline"|"alerts">("match");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [hasRecruitmentEntitlement,setHasRecruitmentEntitlement]=useState<boolean|null>(null);

 useEffect(()=>{let alive=true;(async()=>{if(!supabaseConfigured||!supabase){setLoading(false);return;}try{
   const {data:{user}}=await supabase.auth.getUser();if(!alive)return;if(!user){setLoading(false);return;}setUserId(user.id);
   const [orgRes,sportRes]=await Promise.all([
    supabase.from("organisations").select("id,name,verification_status,organisation_type").eq("owner_id",user.id).eq("verification_status","verified").order("name"),
    supabase.from("sports").select("id,name").eq("is_active",true).order("name")
   ]);
   if(orgRes.error)throw orgRes.error;if(sportRes.error)throw sportRes.error;
   setOrgs((orgRes.data??[]) as Org[]);setSports((sportRes.data??[]) as Sport[]);
   if((orgRes.data??[])[0])setOrgId((orgRes.data??[])[0].id);
 }catch(e){if(alive)setNotice(e instanceof Error?e.message:"Recruiter workspace could not be loaded.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);

 useEffect(()=>{if(!orgId||!supabase)return;let alive=true;(async()=>{const {data,error}=await supabase.rpc("sport_has_entitlement",{target_organisation:orgId,target_entitlement:"recruitment_hub"});if(!alive)return;if(error){setHasRecruitmentEntitlement(false);setNotice(error.message);return;}setHasRecruitmentEntitlement(Boolean(data));})();return()=>{alive=false;};},[orgId]);\n\n useEffect(()=>{if(!orgId||!supabase)return;let alive=true;(async()=>{setNotice("");
   const [o,s]=await Promise.all([
    supabase.from("opportunities").select("id,title,organisation_id,positions,competition_level,location,status,verification_status,sports(name)").eq("organisation_id",orgId).order("created_at",{ascending:false}),
    supabase.from("recruiter_saved_searches").select("id,name,query,sport_id,position,level,location,alert_enabled").eq("organisation_id",orgId).order("created_at",{ascending:false})
   ]);
   if(!alive)return;
   if(o.error){setNotice(o.error.message);return;}
   const mapped=(o.data??[]).map((x:any)=>({...x,sport:x.sports?.name??"Multi-sport"})) as Opportunity[];setOpps(mapped);if(mapped[0])setSelectedOpp(current=>mapped.some(x=>x.id===current)?current:mapped[0].id);
   if(s.data)setSaved(s.data as SavedSearch[]);
 })();return()=>{alive=false;};},[orgId]);

 useEffect(()=>{if(!selectedOpp||!supabase)return;let alive=true;(async()=>{const {data,error}=await supabase.rpc("match_opportunity_athletes",{target_opportunity:selectedOpp});if(!alive)return;if(error){setNotice(error.message);setMatches([]);return;}setMatches((data??[]) as Match[]);})();return()=>{alive=false;};},[selectedOpp]);

 useEffect(()=>{if(!orgId||!supabase)return;let alive=true;(async()=>{
   const owned=opps.map(x=>x.id);if(!owned.length){setPipeline([]);return;}
   const {data,error}=await supabase.from("opportunity_applications").select("id,opportunity_id,athlete_id,status,message,created_at").in("opportunity_id",owned).order("created_at",{ascending:false});
   if(error){if(alive)setNotice(error.message);return;}
   const rows=(data??[]) as Omit<Pipeline,"opportunity_title"|"applicant_name"|"applicant_sport"|"applicant_position"|"applicant_level"|"applicant_location">[];
   const athleteIds=Array.from(new Set(rows.map(x=>x.athlete_id)));const oppMap=new Map(opps.map(x=>[x.id,x]));
   let profileMap=new Map<string,any>();
   if(athleteIds.length){const {data:profiles}=await supabase.from("profiles").select("id,display_name,location").in("id",athleteIds);const {data:athletes}=await supabase.from("athlete_profiles").select("user_id,position,playing_level,primary_sport_id,location").in("user_id",athleteIds);const sportMap=new Map(sports.map(x=>[x.id,x.name]));for(const p of profiles??[])profileMap.set(p.id,{name:p.display_name,location:p.location});for(const a of athletes??[]){profileMap.set(a.user_id,{...(profileMap.get(a.user_id)??{}),sport:sportMap.get(a.primary_sport_id),position:a.position,level:a.playing_level,location:a.location??profileMap.get(a.user_id)?.location});}}
   if(alive)setPipeline(rows.map(row=>{const a=profileMap.get(row.athlete_id)??{};return {...row,opportunity_title:oppMap.get(row.opportunity_id)?.title??"Opportunity",applicant_name:a.name??"Athlete",applicant_sport:a.sport??null,applicant_position:a.position??null,applicant_level:a.level??null,applicant_location:a.location??null};}));
 })();return()=>{alive=false;};},[orgId,opps,sports]);

 const filteredMatches=useMemo(()=>{const q=query.trim().toLowerCase();return matches.filter(x=>x.score>=minScore&&(sportFilter==="all"||x.sport===sportFilter)&&(levelFilter==="all"||x.playing_level===levelFilter)&&(!q||[x.display_name,x.sport??"",x.discipline??"",x.position??"",x.location??""].some(v=>v.toLowerCase().includes(q))));},[matches,query,sportFilter,levelFilter,minScore]);
 const matchSports=useMemo(()=>Array.from(new Set(matches.map(x=>x.sport).filter(Boolean))) as string[],[matches]);
 const matchLevels=useMemo(()=>Array.from(new Set(matches.map(x=>x.playing_level).filter(Boolean))) as string[],[matches]);
 const currentOpp=opps.find(x=>x.id===selectedOpp);

 async function saveSearch(){
  if(!supabase||!orgId||!userId||!searchName.trim()){setNotice("Give the saved search a name.");return;}setBusy(true);try{
   const {data,error}=await supabase.from("recruiter_saved_searches").insert({organisation_id:orgId,created_by:userId,name:searchName.trim(),query:searchQuery.trim()||null,sport_id:searchSport||null,position:searchPosition.trim()||null,level:searchLevel.trim()||null,location:searchLocation.trim()||null,alert_enabled:true}).select("id,name,query,sport_id,position,level,location,alert_enabled").single();if(error)throw error;setSaved(x=>[data as SavedSearch,...x]);setSearchName("");setNotice("Recruiter alert saved. Verified opportunities matching these criteria can trigger an in-app alert.");}catch(e){setNotice(e instanceof Error?e.message:"Saved search could not be created.");}finally{setBusy(false);}
 }
 async function updateStage(row:Pipeline,status:string){
  if(!supabase)return;setBusy(true);try{const {error}=await supabase.from("opportunity_applications").update({status}).eq("id",row.id);if(error)throw error;setPipeline(items=>items.map(x=>x.id===row.id?{...x,status}:x));setNotice("Recruitment pipeline updated.");}catch(e){setNotice(e instanceof Error?e.message:"Application status could not be updated.");}finally{setBusy(false);}
 }

 if(loading)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={22} className="spin"/>Loading recruitment hub…</div></section>;
 if(!userId||!orgs.length)return <section className="workspace-wrap"><div className="workspace-empty"><ShieldCheck size={28}/><p className="workspace-kicker">RECRUITMENT HUB</p><h1>Recruit smarter.<br/><span>With permission.</span></h1><p>Recruitment tools are available to verified club, academy, scouting and approved sports organisations. Create and verify an organisation first.</p><Link className="button button-dark" to="/organisations">Open organisations</Link></div></section>;

 return <section className="workspace-wrap recruiter-hub">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> PHASE 1 / RECRUITMENT ENGINE</div><h1>Find talent.<br/><span>Move prospects forward.</span></h1><p>One workspace for reverse opportunity matching, applicant pipeline and recruiter alerts. Rankings are explainable and never guarantee selection.</p></div><Link className="button button-dark" to="/workspace">Workspace <ArrowUpRight size={15}/></Link></div>
  {notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
  <div className="workspace-form-card recruiter-toolbar"><label>Organisation<select value={orgId} onChange={e=>setOrgId(e.target.value)}>{orgs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>{tab==="match"&&<label>Opportunity<select value={selectedOpp} onChange={e=>setSelectedOpp(e.target.value)}>{opps.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>}</div>
  <div className="recruiter-tabs"><button className={tab==="match"?"active":""} onClick={()=>setTab("match")}><Target size={15}/>Talent match</button><button className={tab==="pipeline"?"active":""} onClick={()=>setTab("pipeline")}><Users size={15}/>Applicant pipeline <span>{pipeline.length}</span></button><button className={tab==="alerts"?"active":""} onClick={()=>setTab("alerts")}><Bookmark size={15}/>Saved searches <span>{saved.length}</span></button></div>

  {tab==="match"&&<div className="recruiter-match-layout">
   <aside className="workspace-form-card recruiter-filter-panel"><div className="workspace-section-title"><div><p className="workspace-kicker">MATCH FILTERS</p><h2>Refine prospects.</h2></div><SlidersHorizontal size={17}/></div>
    <label className="search-field"><Search size={15}/><span className="sr-only">Search prospects</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, position…"/></label>
    <label>Sport<select value={sportFilter} onChange={e=>setSportFilter(e.target.value)}><option value="all">All matched sports</option>{matchSports.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label>Level<select value={levelFilter} onChange={e=>setLevelFilter(e.target.value)}><option value="all">All levels</option>{matchLevels.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label>Minimum match score<input type="range" min="0" max="100" step="5" value={minScore} onChange={e=>setMinScore(Number(e.target.value))}/><strong>{minScore}/100</strong></label>
    <div className="match-note"><ShieldCheck size={15}/><span>Public profiles only. Age eligibility is treated as a requirement signal, not a ranking of ability.</span></div>
   </aside>
   <div><div className="recruiter-results-head"><div><p className="workspace-kicker">REVERSE OPPORTUNITY MATCH</p><h2>{currentOpp?.title??"Select an opportunity"}</h2><p>{filteredMatches.length} matching public profiles · {currentOpp?.sport??"Multi-sport"} · {currentOpp?.location??"Location not specified"}</p></div><span className="status-tag"><ShieldCheck size={13}/> Explainable</span></div>
    <div className="recruiter-match-grid">{filteredMatches.map(m=><article className="recruiter-match-card" key={m.athlete_id}><div className="recruiter-match-head"><div className="talent-avatar">{m.avatar_url?<img src={m.avatar_url} alt=""/>:(m.display_name?.[0]??"A").toUpperCase()}</div><div><h3>{m.display_name}</h3><p>{[m.sport,m.discipline,m.position].filter(Boolean).join(" · ")}</p></div><strong className="recruiter-score">{m.score}<small>/100</small></strong></div><div className="match-score-track"><i style={{width:m.score+"%"}}/></div><div className="match-reasons">{(m.reasons??[]).slice(0,5).map(r=><span key={r}><CheckCircle2 size={12}/>{r}</span>)}</div><div className="recruiter-match-meta"><span>{m.playing_level??"Level not supplied"}</span><span>{m.age?m.age+" yrs":"Age not supplied"}</span><span><MapPin size={12}/>{m.location??"Location not supplied"}</span></div><div className="recruiter-match-actions"><Link className="button button-dark" to={"/talent/"+m.athlete_id}>View profile <ArrowUpRight size={14}/></Link><button className="talent-shortlist-btn" onClick={async()=>{if(!supabase||!orgId)return;const {error}=await supabase.from("talent_shortlists").upsert({organisation_id:orgId,athlete_id:m.athlete_id,created_by:userId},{onConflict:"organisation_id,athlete_id"});setNotice(error?error.message:"Athlete added to your private shortlist.");}}><Star size={14}/> Shortlist</button></div></article>)}</div>
    {!filteredMatches.length&&<div className="workspace-blank"><Target size={24}/><h3>No prospects match these filters.</h3><p>Try a lower match threshold or broaden the opportunity requirements.</p></div>}
   </div>
  </div>}

  {tab==="pipeline"&&<div className="recruiter-pipeline"><div className="recruiter-results-head"><div><p className="workspace-kicker">RECRUITMENT PIPELINE</p><h2>Applications in motion.</h2><p>Move applicants through review without exposing private applicant contact details unnecessarily.</p></div></div><div className="recruiter-kanban">{stages.map(stage=><section key={stage}><div className="recruiter-column-head"><strong>{stage.replace("_"," ")}</strong><span>{pipeline.filter(x=>x.status===stage).length}</span></div>{pipeline.filter(x=>x.status===stage).map(row=><article className="recruiter-pipeline-card" key={row.id}><strong>{row.applicant_name}</strong><small>{row.opportunity_title}</small><span>{[row.applicant_sport,row.applicant_position,row.applicant_level].filter(Boolean).join(" · ")||"Sporting details not supplied"}</span><span>{row.applicant_location??"Location not supplied"}</span><select value={row.status} disabled={busy} onChange={e=>void updateStage(row,e.target.value)}>{stages.map(x=><option key={x} value={x}>{x.replace("_"," ")}</option>)}</select><Link to={"/talent/"+row.athlete_id}>Review profile <ArrowUpRight size={12}/></Link></article>)}</section>)}</div>{!pipeline.length&&<div className="workspace-blank"><Users size={24}/><h3>No applications yet.</h3><p>When athletes apply to your verified opportunities, they will enter this recruitment pipeline.</p></div>}</div>}

  {tab==="alerts"&&<div className="recruiter-alerts"><div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">SAVED SEARCHES</p><h2>Never miss a relevant opportunity.</h2><p className="workspace-subtitle">Save the type of opportunity you recruit for. When a verified listing matches, the recruiter receives an in-app alert.</p></div></div><div className="workspace-form-grid"><label>Search name<input value={searchName} onChange={e=>setSearchName(e.target.value)} placeholder="e.g. U19 midfielders"/></label><label>Keywords<input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="trial, academy, goalkeeper"/></label><label>Sport<select value={searchSport} onChange={e=>setSearchSport(e.target.value)}><option value="">Any sport</option>{sports.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Position / discipline<input value={searchPosition} onChange={e=>setSearchPosition(e.target.value)} placeholder="e.g. midfielder"/></label><label>Level<input value={searchLevel} onChange={e=>setSearchLevel(e.target.value)} placeholder="e.g. U19, senior"/></label><label>Location<input value={searchLocation} onChange={e=>setSearchLocation(e.target.value)} placeholder="e.g. Cape Town"/></label><div className="workspace-span-2 workspace-form-footer"><span>Alerts only use information published in the listing.</span><button className="button button-dark" disabled={busy} onClick={()=>void saveSearch()}><Bookmark size={15}/>{busy?"Saving…":"Save recruiter search"}</button></div></div></div><div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">YOUR ALERTS</p><h2>Saved recruitment searches.</h2></div></div>{saved.map(x=><article className="recruiter-saved-row" key={x.id}><div><strong>{x.name}</strong><small>{[x.query,x.position,x.level,x.location].filter(Boolean).join(" · ")||"Broad search"}{x.sport_id?" · Sport filtered":""}</small></div><span className="status-tag"><CheckCircle2 size={12}/>{x.alert_enabled?"Active":"Paused"}</span></article>)}{!saved.length&&<p className="workspace-muted">No saved searches yet.</p>}</div></div>}
  <div className="workspace-footer-note"><ShieldCheck size={15}/><span>ChatSched Sport matching is a decision-support tool. Recruiters remain responsible for reviewing the actual opportunity requirements and athlete information.</span></div>
 </section>;
}
