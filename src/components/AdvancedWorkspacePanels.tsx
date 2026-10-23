import {useEffect,useState} from "react";
import {Bell,CalendarClock,CheckCircle2,FileUp,Mail,Search,ShieldCheck,Star,Upload,Users, X} from "lucide-react";
import {supabase,supabaseConfigured} from "../lib/supabase";
import {loadOpportunityFeed} from "../lib/opportunities";
import type {AccountType,Opportunity} from "../lib/types";

type Props={userId:string;accountType:AccountType};
type SearchRow={id:string;name:string;query:string|null;sport_id:string|null;opportunity_type:string|null;location:string|null;minimum_age:number|null;maximum_age:number|null;alert_enabled:boolean};
type Prefs={application_updates:boolean;opportunity_recommendations:boolean;saved_search_alerts:boolean;weekly_digest:boolean;marketing:boolean};

function ageFromDob(value:string|null|undefined){if(!value)return null;const d=new Date(value+"T00:00:00");if(Number.isNaN(d.getTime()))return null;const now=new Date();let age=now.getFullYear()-d.getFullYear();if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))age--;return age;}

export default function AdvancedWorkspacePanels({userId,accountType}:Props){
 const [profile,setProfile]=useState<any>(null);
 const [recommended,setRecommended]=useState<Opportunity[]>([]);
 const [searches,setSearches]=useState<SearchRow[]>([]);
 const [prefs,setPrefs]=useState<Prefs>({application_updates:true,opportunity_recommendations:true,saved_search_alerts:true,weekly_digest:true,marketing:false});
 const [savedName,setSavedName]=useState("My opportunity alerts");
 const [savedQuery,setSavedQuery]=useState("");
 const [savedSport,setSavedSport]=useState("");
 const [savedType,setSavedType]=useState("");
 const [notice,setNotice]=useState("");
 const [uploads,setUploads]=useState<{cv?:string;mediaKit?:string;avatar?:string}>({});
 const [dob,setDob]=useState("");
 const [matchesFor,setMatchesFor]=useState("");
 const [matches,setMatches]=useState<any[]>([]);
 const [owned,setOwned]=useState<{id:string;title:string}[]>([]);
 const [withdrawn,setWithdrawn]=useState(false);

 const athlete=accountType==="athlete";

 useEffect(()=>{if(!userId||!supabase)return;void (async()=>{
   const [p,s,pref,o]=await Promise.all([
     supabase.from("athlete_profiles").select("date_of_birth,primary_sport_id,discipline,position,playing_level,location,career_goals,cv_url,media_kit_url").eq("user_id",userId).maybeSingle(),
     supabase.from("saved_opportunity_searches").select("id,name,query,sport_id,opportunity_type,location,minimum_age,maximum_age,alert_enabled").eq("athlete_id",userId).order("created_at",{ascending:false}),
     supabase.from("email_preferences").select("application_updates,opportunity_recommendations,saved_search_alerts,weekly_digest,marketing").eq("user_id",userId).maybeSingle(),
     supabase.from("opportunities").select("id,title").eq("created_by",userId).order("created_at",{ascending:false}).limit(50)
   ]);
   if(p.data){setProfile(p.data);setDob(p.data.date_of_birth??"");}
   if(s.data)setSearches(s.data as SearchRow[]);
   if(pref.data)setPrefs(pref.data as Prefs);
   if(o.data)setOwned(o.data as {id:string;title:string}[]);
   if(p.data&&athlete){const pd=p.data;
     const feed=await loadOpportunityFeed();
     const age=ageFromDob(pd.date_of_birth);
     const scored=feed.opportunities.map(item=>{
       let score=0;
       const reasons:string[]=[];
       if(pd.primary_sport_id&&item.sport){score+=20;}
       if(pd.discipline&&item.discipline&&item.discipline.toLowerCase().includes(pd.discipline.toLowerCase())){score+=25;reasons.push("Discipline match");}
       if(pd.position&&item.positions?.includes(pd.position)){score+=20;reasons.push("Position match");}
       if(pd.playing_level&&item.level&&item.level.toLowerCase().includes(pd.playing_level.toLowerCase())){score+=15;reasons.push("Level match");}
       if(age!==null&&item.minimumAge!==null&&item.minimumAge!==undefined&&age>=item.minimumAge){score+=10;reasons.push("Age eligible");}
       if(age!==null&&item.maximumAge!==null&&item.maximumAge!==undefined&&age<=item.maximumAge){score+=10;reasons.push("Age eligible");}
       if(age===null&&(item.minimumAge!==null||item.maximumAge!==null))reasons.push("Age eligibility unknown");
       if(!reasons.length)reasons.push("Profile criteria available");
       return {item,score,reasons};
     }).sort((a,b)=>b.score-a.score).slice(0,6);
     setRecommended(scored.map(x=>x.item));
   }
 })();},[userId,athlete]);

 async function saveSearch(){
   if(!supabase||!userId||!savedName.trim())return;
   const {data,error}=await supabase.from("saved_opportunity_searches").insert({athlete_id:userId,name:savedName.trim(),query:savedQuery.trim()||null,sport_id:savedSport||null,opportunity_type:savedType||null});
   if(error){setNotice(error.message);return;}
   if(data)setSearches(rows=>[data as SearchRow,...rows]);setNotice("Saved search created. Alerts are enabled by default.");
 }
 async function removeSearch(id:string){if(!supabase)return;const {error}=await supabase.from("saved_opportunity_searches").delete().eq("id",id);if(error)setNotice(error.message);else setSearches(rows=>rows.filter(x=>x.id!==id));}
 async function updatePrefs(next:Prefs){if(!supabase||!userId)return;setPrefs(next);const {error}=await supabase.from("email_preferences").upsert({user_id:userId,...next,updated_at:new Date().toISOString()});if(error)setNotice(error.message);else setNotice("Email preferences saved.");}
 async function upload(kind:"cv"|"mediaKit"|"avatar",file:File){
   if(!supabase||!userId)return;
   const allowed=kind==="avatar"?["image/jpeg","image/png","image/webp"]:kind==="cv"||kind==="mediaKit"?["application/pdf"]:["application/pdf"];
   if(!allowed.includes(file.type)){setNotice(kind==="avatar"?"Use a JPG, PNG or WebP image.":"Use a PDF file.");return;}
   const path=userId+"/"+kind+"-"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
   const {error}=await supabase.storage.from("sport-media").upload(path,file,{upsert:false,contentType:file.type});
   if(error){setNotice(error.message);return;}
   const {data}=supabase.storage.from("sport-media").getPublicUrl(path);
   setUploads(v=>({...v,[kind]:data.publicUrl}));
   if(kind==="avatar")await supabase.from("profiles").update({avatar_url:data.publicUrl,updated_at:new Date().toISOString()}).eq("id",userId);
   else await supabase.from("athlete_profiles").update({[kind==="cv"?"cv_url":"media_kit_url"]:data.publicUrl,updated_at:new Date().toISOString()}).eq("user_id",userId);
   setNotice(kind==="cv"?"CV uploaded. You can choose to share it when applying.":"Profile media updated.");
 }
 async function withdrawLatest(){
   if(!supabase||!userId)return;
   const {data}=await supabase.from("opportunity_applications").select("id").eq("athlete_id",userId).not("status","eq","withdrawn").order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(!data){setNotice("No active application found.");return;}
   const {error}=await supabase.from("opportunity_applications").update({status:"withdrawn",updated_at:new Date().toISOString()}).eq("id",data.id).eq("athlete_id",userId);
   if(error)setNotice(error.message);else{setWithdrawn(true);setNotice("Application withdrawn.");}
 }
 async function loadMatches(id:string){if(!supabase||!id)return;const {data,error}=await supabase.rpc("match_opportunity_athletes",{target_opportunity:id});if(error)setNotice(error.message);else setMatches((data??[]) as any[]);setMatchesFor(id);}
 if(!userId||!supabaseConfigured||!supabase)return null;

 return <div className="workspace-advanced-grid">
  {athlete&&<section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">RECOMMENDED FOR YOU</p><h2>Opportunities worth a closer look.</h2><p className="workspace-subtitle">Ranked from the profile information you have supplied. Unknown criteria are shown instead of guessed.</p></div><Star size={22}/></div>
   <div className="workspace-recommend-grid">{recommended.map(item=><article className="workspace-recommend-card" key={item.id}><div><span>{item.sport}</span><strong>{item.title}</strong><small>{item.location} · {item.level}</small>{(item.minimumAge!==null&&item.minimumAge!==undefined)||(item.maximumAge!==null&&item.maximumAge!==undefined)?<small>{item.minimumAge??"Any"}–{item.maximumAge??"Any"} age eligibility</small>:<small>Age eligibility not specified</small>}</div><a href={"/opportunities/"+item.id}>View <ArrowUpRightIcon/></a></article>)}{!recommended.length&&<p className="workspace-muted">Complete your sporting profile to unlock stronger recommendations.</p>}</div>
  </section>}

  {athlete&&<section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">SAVED SEARCHES & ALERTS</p><h2>Keep an eye on the right openings.</h2></div><Search size={22}/></div>
   <div className="workspace-advanced-form"><input value={savedName} onChange={e=>setSavedName(e.target.value)} placeholder="Search name"/><input value={savedQuery} onChange={e=>setSavedQuery(e.target.value)} placeholder="Keywords e.g. football Cape Town"/><input value={savedSport} onChange={e=>setSavedSport(e.target.value)} placeholder="Sport ID (optional)"/><select value={savedType} onChange={e=>setSavedType(e.target.value)}><option value="">Any opportunity type</option>{["trial","academy","scholarship","scouting","sponsorship","coaching","event","development"].map(x=><option key={x}>{x}</option>)}</select><button className="button button-dark" onClick={()=>void saveSearch()}><Bell size={15}/>Save alert</button></div>
   <div className="workspace-advanced-list">{searches.map(row=><div className="workspace-list-row" key={row.id}><Bell size={16}/><div><strong>{row.name}</strong><small>{row.query||"All new opportunities"}{row.opportunity_type?" · "+row.opportunity_type:""}</small></div><button className="listing-state-button" onClick={()=>void removeSearch(row.id)}><X size={14}/></button></div>)}</div>
  </section>}

  {athlete&&<section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">CV & PROFILE MEDIA</p><h2>Be ready for recruiter review.</h2><p className="workspace-subtitle">Your CV is never shared with an organisation just because you uploaded it. Sharing requires explicit consent on each application.</p></div><FileUp size={22}/></div>
   <div className="workspace-upload-grid">{[["cv","CV / résumé"],["mediaKit","Media-kit PDF"],["avatar","Profile photo"]].map(([kind,label])=><label className="workspace-upload-box" key={kind}><Upload size={18}/><strong>{label}</strong><small>Choose file</small><input type="file" accept={kind==="avatar"?"image/jpeg,image/png,image/webp":"application/pdf"} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(kind as "cv"|"mediaKit"|"avatar",file);}}/>{uploads[kind as keyof typeof uploads]&&<CheckCircle2 size={15}/>}</label>)}</div>
   <div className="workspace-upload-status">{profile?.cv_url&&<span>CV on file</span>}{profile?.media_kit_url&&<span>Media kit on file</span>}</div><div className="workspace-profile-field"><label>Date of birth <input type="date" value={dob} onChange={e=>setDob(e.target.value)}/></label><button className="button button-light-workspace" type="button" onClick={async()=>{if(!supabase||!userId)return;const {error}=await supabase.from("athlete_profiles").update({date_of_birth:dob||null,updated_at:new Date().toISOString()}).eq("user_id",userId);setNotice(error?error.message:"Age eligibility information saved.");}}>Save age eligibility</button><small>Your date of birth is used for matching but is not shown on public athlete profiles.</small></div>
  </section>}

  {athlete&&<section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">APPLICATION CONTROL</p><h2>Keep control after you apply.</h2><p className="workspace-subtitle">Withdraw an active application at any time. Recruiter review keeps a snapshot of what you shared when you applied.</p></div><ShieldCheck size={22}/></div>
   <button className="button button-light-workspace" disabled={withdrawn} onClick={()=>void withdrawLatest()}>{withdrawn?"Application withdrawn":"Withdraw latest active application"}</button>
  </section>}

  <section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">EMAIL NOTIFICATIONS</p><h2>Choose how ChatSched Sport follows up.</h2></div><Mail size={22}/></div>
   <div className="workspace-pref-grid">{(Object.keys(prefs) as (keyof Prefs)[]).map(key=><label key={key}><input type="checkbox" checked={prefs[key]} onChange={e=>void updatePrefs({...prefs,[key]:e.target.checked})}/><span>{key.replaceAll("_"," ")}</span></label>)}</div>
   <p className="workspace-muted"><CalendarClock size={14}/> Weekly digest preferences are stored with your account; delivery is handled by the Resend edge function when configured.</p>
  </section>

  {!athlete&&owned.length>0&&<section className="workspace-form-card workspace-advanced-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">OPPORTUNITY → ATHLETE MATCHING</p><h2>Who fits each listing?</h2><p className="workspace-subtitle">Ranked applicants use public athlete profile criteria. Age, discipline and level show as unknown when the athlete has not supplied them.</p></div><Users size={22}/></div>
   <div className="workspace-match-list">{owned.map(item=><div className="workspace-list-row" key={item.id}><div><strong>{item.title}</strong><small>Rank public athlete profiles against this opportunity</small></div><button className="button button-light-workspace" onClick={()=>void loadMatches(item.id)}>Find matches</button></div>)}</div>
   {matchesFor&&<div className="workspace-match-results">{matches.slice(0,20).map(row=><article key={row.athlete_id}><div className="workspace-avatar">{(row.display_name||"A").charAt(0)}</div><div><strong>{row.display_name}</strong><small>{[row.sport,row.discipline,row.position,row.playing_level].filter(Boolean).join(" · ")||"Profile criteria unknown"}</small><small>{row.reasons?.filter(Boolean).join(" · ")||"No additional reasons"}</small></div><b>{row.score}%</b></article>)}</div>}
  </section>}

  {notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
 </div>;
}
function ArrowUpRightIcon(){return <span aria-hidden="true">↗</span>}
