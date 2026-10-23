import {useEffect,useState,type FormEvent} from "react";
import {ArrowLeft,ArrowUpRight,CalendarDays,CheckCircle2,Heart,MapPin,ShieldCheck,Trophy} from "lucide-react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {loadOpportunityById} from "../lib/opportunities";
import ReportForm from "../components/ReportForm";
import {supabase,supabaseConfigured} from "../lib/supabase";
import type {Opportunity} from "../lib/types";import ReportForm from "../components/ReportForm";

function formatDate(value?:string|null){
  if(!value)return "To be confirmed";
  const date=new Date(value+"T00:00:00");
  return Number.isNaN(date.getTime())?"To be confirmed":new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"long",year:"numeric"}).format(date);
}

export default function OpportunityDetailPage(){
  const {opportunityId=""}=useParams();
  const navigate=useNavigate();
  const [item,setItem]=useState<Opportunity|null>(null);
  const [loading,setLoading]=useState(true);
  const [userId,setUserId]=useState("");
  const [authChecked,setAuthChecked]=useState(false);
  const [isSaved,setIsSaved]=useState(false);
  const [applyMessage,setApplyMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);

  useEffect(()=>{
    let alive=true;
    loadOpportunityById(opportunityId).then(result=>{if(!alive)return;setItem(result);setLoading(false);})
      .catch(()=>{if(alive){setItem(null);setLoading(false);}});
    return()=>{alive=false;};
  },[opportunityId]);

  useEffect(()=>{
    if(!supabaseConfigured||!supabase){setAuthChecked(true);return;}
    let alive=true;
    supabase.auth.getSession().then(({data})=>{if(alive){setUserId(data.session?.user.id??"");setAuthChecked(true);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(alive)setUserId(session?.user.id??"");});
    return()=>{alive=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!userId||!item||item.demo||!supabase)return;
    const client=supabase;
    void client.from("opportunity_member_views").insert({opportunity_id:item.id,viewer_id:userId});
  },[userId,item]);

  useEffect(()=>{
    if(!userId||!item||item.demo||!supabase)return;
    let alive=true;
    supabase.from("saved_opportunities").select("opportunity_id").eq("athlete_id",userId).eq("opportunity_id",item.id).maybeSingle()
      .then(({data})=>{if(alive)setIsSaved(Boolean(data));});
    return()=>{alive=false;};
  },[userId,item]);

  useEffect(()=>{
    if(!item)return;
    const title=item.title+(item.demo?" (Example listing)":"")+" | ChatSched Sport";
    const description=(item.demo?"Illustrative example only. ":"")+item.summary;
    document.title=title;
    document.querySelector('meta[name="description"]')?.setAttribute("content",description.slice(0,160));
    document.querySelector('meta[property="og:title"]')?.setAttribute("content",title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content",description.slice(0,160));
    document.querySelector('meta[name="robots"]')?.setAttribute("content",item.demo?"noindex,nofollow":"index,follow");
  },[item]);

  async function toggleSaved(){
    if(!item||item.demo||!supabaseConfigured||!supabase)return;
    if(!userId){navigate("/join?mode=login&next="+encodeURIComponent("/opportunities/"+item.id));return;}
    setBusy(true);setFeedback(null);
    try{
      if(isSaved){
        const {error}=await supabase.from("saved_opportunities").delete().eq("athlete_id",userId).eq("opportunity_id",item.id);
        if(error)throw error;setIsSaved(false);setFeedback({kind:"success",text:"Removed from your saved opportunities."});
      }else{
        const {error}=await supabase.from("saved_opportunities").insert({athlete_id:userId,opportunity_id:item.id});
        if(error)throw error;setIsSaved(true);setFeedback({kind:"success",text:"Saved to your workspace."});
      }
    }catch(error){setFeedback({kind:"error",text:error instanceof Error?error.message:"The saved list could not be updated."});}
    finally{setBusy(false);}
  }

  async function apply(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!item||item.demo||!supabaseConfigured||!supabase)return;
    if(!userId){navigate("/join?mode=login&next="+encodeURIComponent("/opportunities/"+item.id));return;}
    setBusy(true);setFeedback(null);
    try{
      const {error}=await supabase.from("opportunity_applications").insert({opportunity_id:item.id,athlete_id:userId,message:applyMessage.trim()||null});
      if(error)throw error;
      setFeedback({kind:"success",text:"Your application was submitted. You can track its status in your workspace."});
      setApplyMessage("");
    }catch(error){
      const message=error instanceof Error?error.message:"Your application could not be submitted.";
      setFeedback({kind:"error",text:message.toLowerCase().includes("duplicate")||message.toLowerCase().includes("unique")?"It looks like you have already applied to this opportunity. Check your workspace for its status.":message});
    }finally{setBusy(false);}
  }

  if(loading||!authChecked)return <section className="detail-page"><p className="loading-text">Loading opportunity…</p></section>;
  if(!item)return <section className="detail-page"><div className="empty-state"><h1>Opportunity not found</h1><p>This listing may have closed or is no longer available.</p><Link className="button button-dark" to="/opportunities"><ArrowLeft size={16}/> Back to opportunities</Link></div></section>;

  return <section className="detail-page">
    <div className="detail-topbar"><Link to="/opportunities" className="back-link"><ArrowLeft size={16}/> All opportunities</Link><span>OPPORTUNITY DETAIL / {item.sport.toUpperCase()}</span></div>
    {item.demo&&<div className="demo-note detail-demo-note"><span className="note-symbol">i</span><p>This is an illustrative example, not a current opening. Do not submit personal information or treat it as verified.</p></div>}
    {feedback&&<div className={"workspace-notice notice-"+feedback.kind} role="status"><span>{feedback.text}</span></div>}
    <div className="detail-layout">
      <div className="detail-main">
        <div className="eyebrow"><span className="status-dot"/> {item.type.replace("-"," ").toUpperCase()}</div>
        <h1>{item.title}</h1><p className="detail-org">{item.organisation}</p>
        <div className="detail-meta-row"><span><MapPin size={16}/> {item.location}, {item.country}</span><span><Trophy size={16}/> {item.level}</span></div>
        <div className="detail-rule"/>
        <div className="detail-copy-block"><div className="section-kicker">Overview</div><p>{item.summary}</p></div>{item.description&&<div className="detail-copy-block"><div className="section-kicker">Full description</div><p className="opportunity-detail-longcopy">{item.description}</p></div>}{item.eligibility&&<div className="detail-copy-block"><div className="section-kicker">Eligibility & requirements</div><p className="opportunity-detail-longcopy">{item.eligibility}</p></div>}{!item.description&&!item.eligibility&&<div className="demo-note"><span className="note-symbol">i</span><p>Full eligibility details are not included in this listing yet. Ask the organisation for selection stages, dates and any costs before sharing sensitive information.</p></div>}
        <div className="detail-copy-block"><div className="section-kicker">Before you apply</div><div className="detail-check"><CheckCircle2 size={17}/><span>Review eligibility and requirements with the official organisation.</span></div><div className="detail-check"><CheckCircle2 size={17}/><span>Confirm dates, location, costs and who will contact you.</span></div><div className="detail-check"><CheckCircle2 size={17}/><span>Never pay an unverified person who promises selection or a contract.</span></div></div>
      </div>
      <aside className="detail-sidebar">
        <div className="detail-side-head"><span className="side-head-icon"><ShieldCheck size={18}/></span><span>{item.demo?"Example listing":"Platform verification passed"}</span></div>
        <div className="detail-side-row"><span>Sport</span><strong>{item.sport}</strong></div>
        <div className="detail-side-row"><span>Location</span><strong>{item.location}</strong></div>
        <div className="detail-side-row"><span>Opportunity type</span><strong>{item.type.charAt(0).toUpperCase()+item.type.slice(1)}</strong></div>
        <div className="detail-side-row"><span>Closing date</span><strong><CalendarDays size={14}/>{formatDate(item.closingDate)}</strong></div>
        {item.compensationType&&<div className="detail-side-row"><span>Compensation / costs</span><strong>{item.compensationType.replaceAll("_"," ")}</strong></div>}
        {item.demo?<button className="button button-dark button-full" type="button" disabled>Example only — applications closed</button>:<>
          <button className="button button-full save-opportunity-button" type="button" onClick={()=>void toggleSaved()} disabled={busy||!supabaseConfigured}><Heart size={15} fill={isSaved?"currentColor":"none"}/>{isSaved?"Saved to workspace":"Save opportunity"}</button>
          {userId&&<form className="detail-apply-form" onSubmit={apply}><label>Application note <textarea value={applyMessage} onChange={e=>setApplyMessage(e.target.value)} maxLength={2000} rows={3} placeholder="Briefly explain your interest (optional)."/></label><button className="button button-lime button-full" type="submit" disabled={busy||!supabaseConfigured}>{busy?"Please wait…":"Submit application"} <ArrowUpRight size={15}/></button></form>}
          {!userId&&<Link className="button button-lime button-full" to={"/join?mode=login&next="+encodeURIComponent("/opportunities/"+item.id)}>Sign in to apply <ArrowUpRight size={16}/></Link>}
        </>}
        <p className="detail-safety">ChatSched Sport does not guarantee selection, contracts, sponsorship or representation. Applying is not a promise of acceptance.</p><div className="detail-report-wrap"><ReportForm targetType="opportunity" targetId={item.id}/></div>{!item.demo&&<><ReportForm targetType="opportunity" targetId={item.id}/>{item.organisationId&&<ReportForm targetType="organisation" targetId={item.organisationId}/>}</>}
        {userId&&<Link className="detail-workspace-link" to="/workspace">View your workspace <ArrowUpRight size={14}/></Link>}
      </aside>
    </div>
  </section>;
}
