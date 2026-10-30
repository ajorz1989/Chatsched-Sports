import {useEffect,useState,type FormEvent} from "react";
import {ArrowLeft,ArrowUpRight,CalendarDays,CheckCircle2,Heart,MapPin,Share2,ShieldCheck,Sparkles,Trophy} from "lucide-react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {isClosed,loadOpportunityById,loadOpportunityFeed} from "../lib/opportunities";
import OpportunityCard from "../components/OpportunityCard";
import ReportForm from "../components/ReportForm";
import SupportRequestButton from "../components/SupportRequestButton";
import VerificationBadge,{levelFromStatus} from "../components/VerificationBadge";
import CoverImage from "../components/CoverImage";
import {supabase,supabaseConfigured} from "../lib/supabase";
import type {Opportunity} from "../lib/types";

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
  const [cvConsent,setCvConsent]=useState(false);
  const [cvUrl,setCvUrl]=useState<string|null>(null);
  const [isMinor,setIsMinor]=useState(false);
  const [athleteSnapshot,setAthleteSnapshot]=useState<Record<string,unknown>>({});
  const [busy,setBusy]=useState(false);
  const [related,setRelated]=useState<Opportunity[]>([]);
  const [shared,setShared]=useState("");
  const [feedback,setFeedback]=useState<{kind:"success"|"error"|"info";text:string}|null>(null);

  useEffect(()=>{
    if(!item)return;let alive=true;
    void loadOpportunityFeed().then(feed=>{if(!alive)return;setRelated(feed.opportunities.filter(x=>x.id!==item.id&&x.sport===item.sport&&x.demo===item.demo).slice(0,3));}).catch(()=>{});
    return()=>{alive=false;};
  },[item]);
  async function share(){
    if(!item)return;const url=window.location.href;
    try{
      if(navigator.share){await navigator.share({title:item.title,url});return;}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShared("Link copied");window.setTimeout(()=>setShared(""),2200);return;}
    }catch{/* user cancelled or clipboard blocked */}
    window.prompt("Copy this link",url);
  }
  useEffect(()=>{
    let alive=true;
    loadOpportunityById(opportunityId).then(result=>{if(!alive)return;setItem(result);setLoading(false);})
      .catch(()=>{if(alive){setItem(null);setLoading(false);}});
    return()=>{alive=false;};
  },[opportunityId]);

  useEffect(()=>{
    if(!supabaseConfigured||!supabase){setAuthChecked(true);return;}
    let alive=true;
    const client=supabase;
    client.auth.getSession().then(({data})=>{if(alive){setUserId(data.session?.user.id??"");setAuthChecked(true);}
    if(data.session?.user.id){
      const uid=data.session.user.id;
      Promise.all([
        client.from("athlete_profiles").select("cv_url,date_of_birth,discipline,position,playing_level,availability,location,career_goals").eq("user_id",uid).maybeSingle(),
        client.from("profiles").select("display_name,location,country").eq("id",uid).maybeSingle()
      ]).then(([athleteRes,profileRes])=>{
        if(!alive)return;
        setCvUrl((athleteRes.data as {cv_url?:string|null}|null)?.cv_url??null);
        const dob=(athleteRes.data as {date_of_birth?:string|null}|null)?.date_of_birth;
        if(dob){const birth=new Date(dob+"T00:00:00");const now=new Date();let age=now.getFullYear()-birth.getFullYear();if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;setIsMinor(age<18);}
        setAthleteSnapshot({...((profileRes.data as Record<string,unknown>|null)??{}),...((athleteRes.data as Record<string,unknown>|null)??{})});
      });
    }
    });
    const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(alive)setUserId(session?.user.id??"");});
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
    if(!item||item.demo||isClosed(item)||!supabaseConfigured||!supabase)return;
    if(!userId){navigate("/join?mode=login&next="+encodeURIComponent("/opportunities/"+item.id));return;}
    setBusy(true);setFeedback(null);
    try{
      // Only sporting fields are shared by default. Date of birth and the CV link are never included
      // unless the athlete explicitly consents, and then only the CV link and self-reported CV sections are added.
      const {date_of_birth:_dob,cv_url:_cv,...baseAthlete}=athleteSnapshot as Record<string,unknown>;
      void _dob;void _cv;
      let cvSections:Record<string,unknown>|null=null;
      if(cvConsent&&cvUrl){
        const [achievements,statistics,experience]=await Promise.all([
          supabase.from("athlete_achievements").select("title,organisation_name,achievement_date,description").eq("athlete_id",userId).order("achievement_date",{ascending:false}).limit(25),
          supabase.from("athlete_statistics").select("metric_name,metric_value,metric_unit,season,competition_name,evidence_url").eq("athlete_id",userId).order("created_at",{ascending:false}).limit(40),
          supabase.from("athlete_experience").select("organisation_name,role_title,competition_level,start_date,end_date,is_current,description").eq("athlete_id",userId).order("start_date",{ascending:false}).limit(25)
        ]);
        cvSections={self_reported:true,achievements:achievements.data??[],statistics:statistics.data??[],experience:experience.data??[]};
      }
      const {error}=await supabase.from("opportunity_applications").insert({opportunity_id:item.id,athlete_id:userId,message:applyMessage.trim()||null,cv_consent:cvConsent,cv_consent_at:cvConsent&&cvUrl?new Date().toISOString():null,application_snapshot:{captured_at:new Date().toISOString(),opportunity:{id:item.id,title:item.title,sport:item.sport,discipline:item.discipline,level:item.level,location:item.location,country:item.country,startDate:item.startDate,closingDate:item.closingDate},athlete:baseAthlete,cv_profile:cvSections,cv_shared:cvConsent&&Boolean(cvUrl),cv_url:cvConsent&&cvUrl?cvUrl:null}});
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

  const closed=!item.demo&&isClosed(item);
  const daysLeft=(()=>{if(!item.closingDate)return null;const end=new Date(item.closingDate+"T23:59:59");if(Number.isNaN(end.getTime()))return null;return Math.floor((end.getTime()-Date.now())/86400000);})();
  return <section className="detail-page">
    <div className="detail-topbar"><Link to="/opportunities" className="back-link"><ArrowLeft size={16}/> All opportunities</Link><span>OPPORTUNITY DETAIL / {item.sport.toUpperCase()}</span></div>
    {item.demo&&<div className="demo-note detail-demo-note"><span className="note-symbol">i</span><p>This is an illustrative example, not a current opening. Do not submit personal information or treat it as verified.</p></div>}
    {feedback&&<div className={"workspace-notice notice-"+feedback.kind} role="status"><span>{feedback.text}</span></div>}
    <div className="detail-layout">
      <div className="detail-main">
        <div className="eyebrow"><span className="status-dot"/> {item.type.replace("-"," ").toUpperCase()}</div>
        <h1>{item.title}</h1><p className="detail-org">{item.organisation}</p>
        <div className="detail-meta-row"><span><MapPin size={16}/> {item.location}, {item.country}</span><span><Trophy size={16}/> {item.level}</span></div>
        <CoverImage src={item.imageUrl} sport={item.sport} variant="hero" label={item.title+" cover photo"}/>
        <div className="detail-rule"/>
        <div className="detail-copy-block"><div className="section-kicker">Overview</div><p>{item.summary}</p></div>{item.description&&<div className="detail-copy-block"><div className="section-kicker">Full description</div><p className="opportunity-detail-longcopy">{item.description}</p></div>}{item.eligibility&&<div className="detail-copy-block"><div className="section-kicker">Eligibility & requirements</div><p className="opportunity-detail-longcopy">{item.eligibility}</p></div>}{!item.description&&!item.eligibility&&<div className="demo-note"><span className="note-symbol">i</span><p>Full eligibility details are not included in this listing yet. Ask the organisation for selection stages, dates and any costs before sharing sensitive information.</p></div>}
        <div className="detail-copy-block"><div className="section-kicker">Before you apply</div><div className="detail-check"><CheckCircle2 size={16}/><span>Review eligibility and requirements with the official organisation.</span></div><div className="detail-check"><CheckCircle2 size={16}/><span>Confirm dates, location, costs and who will contact you.</span></div><div className="detail-check"><CheckCircle2 size={16}/><span>Never pay an unverified person who promises selection or a contract.</span></div></div>
      </div>
      <aside className="detail-sidebar" id="detail-apply">
        <div className="detail-side-head"><span className="side-head-icon"><ShieldCheck size={20}/></span><VerificationBadge level={levelFromStatus(item.verificationStatus,item.demo)}/></div>
        <div className="detail-side-row"><span>Sport</span><strong>{item.sport}</strong></div>
        <div className="detail-side-row"><span>Location</span><strong>{item.location}</strong></div>
        <div className="detail-side-row"><span>Opportunity type</span><strong>{item.type.charAt(0).toUpperCase()+item.type.slice(1)}</strong></div>
        {daysLeft!==null&&daysLeft>=0&&!closed&&<div className="detail-countdown"><CalendarDays size={16}/>{daysLeft===0?"Closes today":daysLeft===1?"Closes tomorrow":"Closes in "+daysLeft+" days"}</div>}<div className="detail-side-row"><span>Closing date</span><strong><CalendarDays size={16}/>{formatDate(item.closingDate)}</strong></div>{item.startDate&&<div className="detail-side-row"><span>Start date</span><strong><CalendarDays size={16}/>{formatDate(item.startDate)}</strong></div>}{(item.minimumAge!==null&&item.minimumAge!==undefined)||(item.maximumAge!==null&&item.maximumAge!==undefined)&&<div className="detail-side-row"><span>Age eligibility</span><strong>{item.minimumAge??"Any"}–{item.maximumAge??"Any"}</strong></div>}{item.numberOfPlaces&&<div className="detail-side-row"><span>Places</span><strong>{item.numberOfPlaces}</strong></div>}{item.applicationMethod&&<div className="detail-side-row"><span>Application method</span><strong>{item.applicationMethod}</strong></div>}
        {item.compensationType&&<div className="detail-side-row"><span>Compensation / costs</span><strong>{item.compensationType.replaceAll("_"," ")}</strong></div>}
        {item.demo?<button className="button button-dark button-full" type="button" disabled>Example only — applications closed</button>:<>
          {item.applicationUrl&&<a className="button button-accent button-full" href={item.applicationUrl} target="_blank" rel="noreferrer">Apply externally <ArrowUpRight size={16}/></a>}
          {item.applicationMethod!=="external"&&<><button className="button button-full save-opportunity-button" type="button" onClick={()=>void toggleSaved()} disabled={busy||!supabaseConfigured}><Heart size={16} fill={isSaved?"currentColor":"none"}/>{isSaved?"Saved to workspace":"Save opportunity"}</button>
          {closed&&<div className="demo-note"><span className="note-symbol">i</span><p><strong>Applications closed.</strong> This listing's closing date has passed, so new applications are no longer accepted.</p></div>}{userId&&!closed&&<form className="detail-apply-form" onSubmit={apply}><label>Application note <textarea value={applyMessage} onChange={e=>setApplyMessage(e.target.value)} maxLength={2000} rows={3} placeholder="Briefly explain your interest (optional)."/></label>{cvUrl&&<label className="detail-cv-consent"><input type="checkbox" checked={cvConsent} onChange={e=>setCvConsent(e.target.checked)}/><span><strong>Share my CV with this organisation.</strong> I consent to sharing the CV currently stored on my profile. A snapshot of this application is retained for recruiter review.</span></label>}{!cvUrl&&<p className="detail-cv-note">No CV is stored on your profile. You can apply without one, or upload it from your workspace first.</p>}<button className="button button-accent button-full" type="submit" disabled={busy||!supabaseConfigured}>{busy?"Please wait…":"Submit application"} <ArrowUpRight size={16}/></button></form>}
          {!userId&&!closed&&<Link className="button button-accent button-full" to={"/join?mode=login&next="+encodeURIComponent("/opportunities/"+item.id)}>Sign in to apply <ArrowUpRight size={16}/></Link>}</>}
        </>}
        {userId&&<SupportRequestButton opportunityId={item.id} opportunityTitle={item.title} userId={userId} isMinor={isMinor}/>}
        <div className="detail-extra-actions"><button type="button" className="button button-light-outline-dark" onClick={()=>void share()}><Share2 size={16}/> {shared||"Share listing"}</button><Link className="button button-light-outline-dark" to="/matching"><Sparkles size={16}/> See how you match</Link></div>
        <p className="detail-safety">ChatSched Sport does not guarantee selection, contracts, sponsorship or representation. Applying is not a promise of acceptance.</p>{!item.demo&&<div className="detail-report-wrap"><ReportForm targetType="opportunity" targetId={item.id}/>{item.organisationId&&<ReportForm targetType="organisation" targetId={item.organisationId}/>}</div>}
        {userId&&<Link className="detail-workspace-link" to="/workspace">View your workspace <ArrowUpRight size={16}/></Link>}
      </aside>
    </div>
    {related.length>0&&<section className="detail-related"><div className="section-kicker">More {item.sport} opportunities</div><div className="opportunity-grid">{related.map(x=><OpportunityCard key={x.id} opportunity={x}/>)}</div></section>}
    {!item.demo&&<div className="apply-bar"><div><small>Closes</small><strong>{formatDate(item.closingDate)}</strong></div><a className="button button-accent" href="#detail-apply">{userId?"Apply or save":"Sign in to apply"} <ArrowUpRight size={16}/></a></div>}
  </section>;
}
