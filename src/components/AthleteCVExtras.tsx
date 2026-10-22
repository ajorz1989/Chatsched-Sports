import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, CalendarDays, CircleAlert, Plus, ShieldCheck, Trophy, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Props = { userId: string; isAthlete: boolean };
type Sport = { id: string; name: string };
type Statistic = { id: string; sport_id: string | null; metric_name: string; metric_value: string; metric_unit: string | null; season: string | null; competition_name: string | null; evidence_url: string | null; notes: string | null; created_at: string };
type Experience = { id: string; organisation_name: string; role_title: string; sport_id: string | null; competition_level: string | null; start_date: string | null; end_date: string | null; is_current: boolean; is_public: boolean; description: string | null; source_url: string | null };
export default function AthleteCVExtras({userId,isAthlete}:Props){
 const [sports,setSports]=useState<Sport[]>([]);
 const [statistics,setStatistics]=useState<Statistic[]>([]);
 const [experience,setExperience]=useState<Experience[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);
 const [metricName,setMetricName]=useState("");
 const [metricValue,setMetricValue]=useState("");
 const [metricUnit,setMetricUnit]=useState("");
 const [metricSport,setMetricSport]=useState("");
 const [metricSeason,setMetricSeason]=useState("");
 const [metricCompetition,setMetricCompetition]=useState("");
 const [metricEvidence,setMetricEvidence]=useState("");
 const [metricNotes,setMetricNotes]=useState("");
 const [experienceOrg,setExperienceOrg]=useState("");
 const [experienceRole,setExperienceRole]=useState("");
 const [experienceSport,setExperienceSport]=useState("");
 const [experienceLevel,setExperienceLevel]=useState("");
 const [experienceStart,setExperienceStart]=useState("");
 const [experienceEnd,setExperienceEnd]=useState("");
 const [experienceCurrent,setExperienceCurrent]=useState(false);
 const [experiencePublic,setExperiencePublic]=useState(true);
 const [experienceDescription,setExperienceDescription]=useState("");
 const [experienceSource,setExperienceSource]=useState("");

 async function load(){
  const client=supabase;
  if(!client||!isAthlete){setLoading(false);return;}
  setLoading(true);
  try{
   const [sportRes,statRes,expRes]=await Promise.all([
    client.from("sports").select("id,name").eq("is_active",true).order("name"),
    client.from("athlete_statistics").select("id,sport_id,metric_name,metric_value,metric_unit,season,competition_name,evidence_url,notes,created_at").eq("athlete_id",userId).order("created_at",{ascending:false}),
    client.from("athlete_experience").select("id,organisation_name,role_title,sport_id,competition_level,start_date,end_date,is_current,is_public,description,source_url").eq("athlete_id",userId).order("start_date",{ascending:false})
   ]);
   if(sportRes.error)throw sportRes.error;
   if(statRes.error)throw statRes.error;
   if(expRes.error)throw expRes.error;
   setSports((sportRes.data??[]) as Sport[]);
   setStatistics((statRes.data??[]) as Statistic[]);
   setExperience((expRes.data??[]) as Experience[]);
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Sports CV details could not be loaded. Apply the latest Sport database migration."});}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[userId,isAthlete]);

 async function addStatistic(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const client=supabase;if(!client||!isAthlete)return;
  let evidenceUrl:string|null=null;
  if(metricEvidence.trim()){
   try{const url=new URL(metricEvidence.trim());if(url.protocol!=="https:")throw new Error("Evidence links must use HTTPS.");evidenceUrl=url.toString();}
   catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Provide a valid HTTPS evidence link."});return;}
  }
  setBusy(true);setNotice(null);
  try{
   const {data,error}=await client.from("athlete_statistics").insert({athlete_id:userId,sport_id:metricSport||null,metric_name:metricName.trim(),metric_value:metricValue.trim(),metric_unit:metricUnit.trim()||null,season:metricSeason.trim()||null,competition_name:metricCompetition.trim()||null,evidence_url:evidenceUrl,notes:metricNotes.trim()||null}).select("id,sport_id,metric_name,metric_value,metric_unit,season,competition_name,evidence_url,notes,created_at").single();
   if(error)throw error;
   setStatistics(rows=>[data as Statistic,...rows]);setMetricName("");setMetricValue("");setMetricUnit("");setMetricSeason("");setMetricCompetition("");setMetricEvidence("");setMetricNotes("");
   setNotice({kind:"success",text:"Statistic added. It will be described as athlete-submitted, not independently verified."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Statistic could not be saved."});}
  finally{setBusy(false);}
 }
 async function deleteStatistic(item:Statistic){
  const client=supabase;if(!client)return;
  const {error}=await client.from("athlete_statistics").delete().eq("id",item.id).eq("athlete_id",userId);
  if(error){setNotice({kind:"error",text:error.message});return;}
  setStatistics(rows=>rows.filter(row=>row.id!==item.id));setNotice({kind:"success",text:"Statistic removed."});
 }
 async function addExperience(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const client=supabase;if(!client||!isAthlete)return;
  let sourceUrl:string|null=null;
  if(experienceSource.trim()){
   try{const url=new URL(experienceSource.trim());if(url.protocol!=="https:")throw new Error("Source links must use HTTPS.");sourceUrl=url.toString();}
   catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Provide a valid HTTPS source link."});return;}
  }
  if(experienceStart&&experienceEnd&&!experienceCurrent&&experienceEnd<experienceStart){setNotice({kind:"error",text:"The end date cannot be before the start date."});return;}
  setBusy(true);setNotice(null);
  try{
   const {data,error}=await client.from("athlete_experience").insert({athlete_id:userId,organisation_name:experienceOrg.trim(),role_title:experienceRole.trim(),sport_id:experienceSport||null,competition_level:experienceLevel.trim()||null,start_date:experienceStart||null,end_date:experienceCurrent?null:experienceEnd||null,is_current:experienceCurrent,is_public:experiencePublic,description:experienceDescription.trim()||null,source_url:sourceUrl}).select("id,organisation_name,role_title,sport_id,competition_level,start_date,end_date,is_current,is_public,description,source_url").single();
   if(error)throw error;
   setExperience(rows=>[data as Experience,...rows].sort((a,b)=>(b.start_date??"").localeCompare(a.start_date??"")));setExperienceOrg("");setExperienceRole("");setExperienceSport("");setExperienceLevel("");setExperienceStart("");setExperienceEnd("");setExperienceCurrent(false);setExperiencePublic(true);setExperienceDescription("");setExperienceSource("");
   setNotice({kind:"success",text:"Experience added to your sports CV."});
  }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Experience could not be saved."});}
  finally{setBusy(false);}
 }
 async function deleteExperience(item:Experience){
  const client=supabase;if(!client)return;
  const {error}=await client.from("athlete_experience").delete().eq("id",item.id).eq("athlete_id",userId);
  if(error){setNotice({kind:"error",text:error.message});return;}
  setExperience(rows=>rows.filter(row=>row.id!==item.id));setNotice({kind:"success",text:"Experience removed."});
 }
 const sportName=(id:string|null)=>sports.find(sport=>sport.id===id)?.name??"Sport not specified";
 if(!isAthlete)return <div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">ATHLETE CV DETAILS</p><h2>Stats & experience.</h2></div></div><p className="workspace-muted">Performance statistics and athlete career history are available to athlete accounts.</p></div>;
 return <div className="cv-extras">
  {notice&&<div className={"workspace-notice notice-"+notice.kind} role="status"><span>{notice.text}</span><button type="button" aria-label="Dismiss message" onClick={()=>setNotice(null)}><X size={15}/></button></div>}
  <div className="workspace-form-card cv-extra-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">PERFORMANCE RECORD</p><h2>Statistics & results.</h2><p className="workspace-subtitle">Enter a value, season and competition context. These entries are self-reported and are not official rankings or verified performance claims.</p></div></div>
   <form className="workspace-form-grid" onSubmit={addStatistic}>
    <label>Metric / result<input required minLength={2} maxLength={80} value={metricName} onChange={e=>setMetricName(e.target.value)} placeholder="e.g. 100m personal best"/></label>
    <label>Value<input required maxLength={100} value={metricValue} onChange={e=>setMetricValue(e.target.value)} placeholder="e.g. 11.42 or 8 goals"/></label>
    <label>Sport<select value={metricSport} onChange={e=>setMetricSport(e.target.value)}><option value="">Choose sport (optional)</option>{sports.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Unit / context<input maxLength={30} value={metricUnit} onChange={e=>setMetricUnit(e.target.value)} placeholder="e.g. seconds, kg, goals"/></label>
    <label>Season / date range<input maxLength={80} value={metricSeason} onChange={e=>setMetricSeason(e.target.value)} placeholder="e.g. 2025/26"/></label>
    <label>Competition / event<input maxLength={160} value={metricCompetition} onChange={e=>setMetricCompetition(e.target.value)} placeholder="Optional competition name"/></label>
    <label className="workspace-span-2">Evidence link (optional)<input type="url" value={metricEvidence} onChange={e=>setMetricEvidence(e.target.value)} placeholder="https://official-result.example"/></label>
    <label className="workspace-span-2">Notes (optional)<textarea rows={2} maxLength={1000} value={metricNotes} onChange={e=>setMetricNotes(e.target.value)} placeholder="Brief context for this result."/></label>
    <div className="workspace-span-2"><button className="button button-dark" type="submit" disabled={busy}><Plus size={16}/> Add statistic</button></div>
   </form>
   {loading?<p className="workspace-muted">Loading stats…</p>:statistics.length?<div className="cv-stat-grid">{statistics.map(item=><article className="cv-stat-card" key={item.id}><div className="cv-stat-card-top"><span className="cv-stat-icon"><BarChart3 size={16}/></span><span className="workspace-type-tag">Self-reported</span><button type="button" onClick={()=>void deleteStatistic(item)} aria-label={"Remove "+item.metric_name}><X size={15}/></button></div><strong>{item.metric_value}{item.metric_unit?" "+item.metric_unit:""}</strong><h3>{item.metric_name}</h3><p>{[sportName(item.sport_id),item.season,item.competition_name].filter(Boolean).join(" · ")}</p>{item.evidence_url&&<a href={item.evidence_url} target="_blank" rel="noreferrer">View evidence link ↗</a>}{item.notes&&<small>{item.notes}</small>}</article>)}</div>:<p className="workspace-muted">No performance records added. Start with a result you can explain and provide context for.</p>}
  </div>
  <div className="workspace-form-card cv-extra-card">
   <div className="workspace-section-title"><div><p className="workspace-kicker">PLAYING HISTORY</p><h2>Teams, clubs & academies.</h2><p className="workspace-subtitle">List playing experience and development pathways you want included in your sports CV. Choose whether each entry should appear publicly.</p></div></div>
   <form className="workspace-form-grid" onSubmit={addExperience}>
    <label>Club / school / academy<input required minLength={2} maxLength={160} value={experienceOrg} onChange={e=>setExperienceOrg(e.target.value)} placeholder="Organisation name"/></label>
    <label>Role / position<input required minLength={2} maxLength={120} value={experienceRole} onChange={e=>setExperienceRole(e.target.value)} placeholder="e.g. First-team winger"/></label>
    <label>Sport<select value={experienceSport} onChange={e=>setExperienceSport(e.target.value)}><option value="">Choose sport (optional)</option>{sports.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Competition level<input maxLength={100} value={experienceLevel} onChange={e=>setExperienceLevel(e.target.value)} placeholder="e.g. school, regional, senior"/></label>
    <label>Start date<input type="date" value={experienceStart} onChange={e=>setExperienceStart(e.target.value)}/></label>
    <label>End date<input type="date" value={experienceEnd} onChange={e=>setExperienceEnd(e.target.value)} disabled={experienceCurrent}/></label>
    <label className="cv-check"><input type="checkbox" checked={experienceCurrent} onChange={e=>setExperienceCurrent(e.target.checked)}/><span>Current team / ongoing experience</span></label>
    <label className="cv-check"><input type="checkbox" checked={experiencePublic} onChange={e=>setExperiencePublic(e.target.checked)}/><span>Show this item on my public profile (when my profile is public)</span></label>
    <label className="workspace-span-2">Description (optional)<textarea maxLength={2000} rows={3} value={experienceDescription} onChange={e=>setExperienceDescription(e.target.value)} placeholder="Role, duties, notable development or context."/></label>
    <label className="workspace-span-2">Official source link (optional)<input type="url" value={experienceSource} onChange={e=>setExperienceSource(e.target.value)} placeholder="https://club-or-league.example"/></label>
    <div className="workspace-span-2"><button className="button button-dark" type="submit" disabled={busy}><Plus size={16}/> Add experience</button></div>
   </form>
   {loading?<p className="workspace-muted">Loading experience…</p>:experience.length?<div className="cv-experience-list">{experience.map(item=><article className="cv-experience-row" key={item.id}><span className="cv-exp-icon"><Trophy size={17}/></span><div><div className="cv-exp-title-row"><strong>{item.role_title}</strong><span className={"status-tag "+(item.is_public?"status-verified":"status-draft")}>{item.is_public?"Public item":"Private item"}</span></div><p>{item.organisation_name} · {sportName(item.sport_id)}{item.competition_level?" · "+item.competition_level:""}</p><small>{item.start_date??"Start date not supplied"} — {item.is_current?"Present":item.end_date??"End date not supplied"}</small>{item.description&&<p>{item.description}</p>}{item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer">View source ↗</a>}</div><button type="button" onClick={()=>void deleteExperience(item)} aria-label={"Remove "+item.role_title+" at "+item.organisation_name}><X size={15}/></button></article>)}</div>:<p className="workspace-muted">No experience entries yet. Add clubs, teams, schools or academies that help tell your sports story.</p>}
  </div>
  <p className="cv-self-reported-note"><CircleAlert size={14}/><span>Keep entries accurate and appropriate to share. Statistics and experience are athlete-submitted; a source link is not the same as independent verification.</span></p>
 </div>;
}
