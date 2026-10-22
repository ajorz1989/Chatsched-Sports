import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, BriefcaseBusiness, ClipboardList, FileText, Heart, LoaderCircle, LogOut, Plus, Save, ShieldCheck, Trophy, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { loadOpportunityById } from "../lib/opportunities";
import type { AccountType, Opportunity, OpportunityType } from "../lib/types";
import "../styles-workspace.css";

type Member = { id: string; email: string; display_name: string; account_type: AccountType; location: string | null; country: string | null; bio: string | null };
type Sport = { id: string; name: string };
type Achievement = { id: string; title: string; organisation_name: string | null; achievement_date: string | null; description: string | null };
type SavedRow = { opportunity_id: string; created_at: string };
type ApplicationRow = { id: string; opportunity_id: string; status: string; message: string | null; created_at: string };
type Org = { id: string; name: string; organisation_type: string; verification_status: string; location: string | null; country: string; website: string | null; description: string | null };
type ManagedOpportunity = { id: string; title: string; status: string; verification_status: string; closing_date: string | null; created_at: string; opportunity_type: string };
const opportunityTypes: OpportunityType[] = ["trial","academy","scholarship","scouting","sponsorship","coaching","event","development"];

export default function WorkspacePage() {
  const [user, setUser] = useState<{id:string;email?:string} | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [member, setMember] = useState<Member | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportId, setSportId] = useState("");
  const [position, setPosition] = useState("");
  const [level, setLevel] = useState("");
  const [availability, setAvailability] = useState("");
  const [goals, setGoals] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementTitle, setAchievementTitle] = useState("");
  const [achievementOrg, setAchievementOrg] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [achievementDescription, setAchievementDescription] = useState("");
  const [saved, setSaved] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<{row:ApplicationRow;opportunity:Opportunity|null}[]>([]);
  const [organisations, setOrganisations] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [managed, setManaged] = useState<ManagedOpportunity[]>([]);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("club");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [opTitle, setOpTitle] = useState("");
  const [opType, setOpType] = useState<OpportunityType>("trial");
  const [opSport, setOpSport] = useState("");
  const [opPosition, setOpPosition] = useState("");
  const [opLocation, setOpLocation] = useState("");
  const [opLevel, setOpLevel] = useState("");
  const [opClosing, setOpClosing] = useState("");
  const [opSummary, setOpSummary] = useState("");
  const [showCreateOpportunity, setShowCreateOpportunity] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{kind:"success"|"error"|"info";text:string}|null>(null);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) { setAuthLoaded(true); setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({data}) => {
      if (!alive) return;
      setUser(data.session?.user ? {id:data.session.user.id,email:data.session.user.email} : null);
      setAuthLoaded(true);
    }).catch(() => { if (alive) setAuthLoaded(true); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ? {id:session.user.id,email:session.user.email} : null);
      setAuthLoaded(true);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    (async () => {
      const [profileRes, sportRes, athleteRes, achievementRes, savedRes, applicationRes, orgRes] = await Promise.all([
        supabase.from("profiles").select("id,email,display_name,account_type,location,country,bio").eq("id",user.id).maybeSingle(),
        supabase.from("sports").select("id,name").eq("is_active",true).order("name"),
        supabase.from("athlete_profiles").select("primary_sport_id,position,playing_level,availability,career_goals,visibility").eq("user_id",user.id).maybeSingle(),
        supabase.from("athlete_achievements").select("id,title,organisation_name,achievement_date,description").eq("athlete_id",user.id).order("achievement_date",{ascending:false}),
        supabase.from("saved_opportunities").select("opportunity_id,created_at").eq("athlete_id",user.id).order("created_at",{ascending:false}),
        supabase.from("opportunity_applications").select("id,opportunity_id,status,message,created_at").eq("athlete_id",user.id).order("created_at",{ascending:false}),
        supabase.from("organisations").select("id,name,organisation_type,verification_status,location,country,website,description").eq("owner_id",user.id).order("created_at",{ascending:false}),
      ]);
      if (!alive) return;
      if (profileRes.data) {
        const p = profileRes.data as unknown as Member;
        setMember(p); setOrgName(p.display_name + " Organisation");
      }
      if (sportRes.data) setSports(sportRes.data as Sport[]);
      if (athleteRes.data) {
        const a = athleteRes.data as unknown as {primary_sport_id:string|null;position:string|null;playing_level:string|null;availability:string|null;career_goals:string|null;visibility:string};
        setSportId(a.primary_sport_id ?? "");setPosition(a.position ?? "");setLevel(a.playing_level ?? "");setAvailability(a.availability ?? "");setGoals(a.career_goals ?? "");setVisibility(a.visibility ?? "public");
      }
      if (achievementRes.data) setAchievements(achievementRes.data as Achievement[]);
      if (orgRes.data) {
        const orgs=orgRes.data as Org[];setOrganisations(orgs);
        if(orgs.length){setSelectedOrg(orgs[0].id);setOrgName(orgs[0].name);setOrgType(orgs[0].organisation_type);setOrgLocation(orgs[0].location??"");setOrgWebsite(orgs[0].website??"");setOrgDescription(orgs[0].description??"");}
      }
      const savedRows=(savedRes.data??[]) as SavedRow[];
      const savedItems=await Promise.all(savedRows.map(row=>loadOpportunityById(row.opportunity_id)));
      if(alive) setSaved(savedItems.filter((item):item is Opportunity=>item!==null));
      const applicationRows=(applicationRes.data??[]) as ApplicationRow[];
      const applicationItems=await Promise.all(applicationRows.map(async row=>({row,opportunity:await loadOpportunityById(row.opportunity_id)})));
      if(alive) setApplications(applicationItems);
      setLoading(false);
      const errors=[profileRes.error,sportRes.error,athleteRes.error,achievementRes.error,savedRes.error,applicationRes.error,orgRes.error].filter(Boolean);
      if(errors.length) setNotice({kind:"info",text:"Some workspace data could not be loaded. Confirm the latest Sport Supabase migrations have been applied."});
    })().catch(() => { if(alive) {setLoading(false);setNotice({kind:"error",text:"Workspace data could not be loaded. Check the Sport database migrations and access policies."});} });
    return () => { alive = false; };
  }, [user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!user||!supabase)return;
    setBusy(true);setNotice(null);
    try {
      const profileUpdate=await supabase.from("profiles").update({display_name:member?.display_name??"",location:member?.location??"",country:member?.country??"South Africa",bio:member?.bio??""}).eq("id",user.id);
      if(profileUpdate.error)throw profileUpdate.error;
      const athleteUpdate=await supabase.from("athlete_profiles").upsert({user_id:user.id,primary_sport_id:sportId||null,position:position||null,playing_level:level||null,availability:availability||null,career_goals:goals||null,visibility,location:member?.location??""},{onConflict:"user_id"});
      if(athleteUpdate.error)throw athleteUpdate.error;
      setNotice({kind:"success",text:"Your profile changes have been saved."});
    } catch(error) {setNotice({kind:"error",text:error instanceof Error?error.message:"Profile could not be saved. Check the schema and your account permissions."});}
    finally{setBusy(false);}
  }

  async function addAchievement(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!user||!supabase)return;setBusy(true);setNotice(null);
    try{
      const {data,error}=await supabase.from("athlete_achievements").insert({athlete_id:user.id,title:achievementTitle.trim(),organisation_name:achievementOrg.trim()||null,achievement_date:achievementDate||null,description:achievementDescription.trim()||null}).select("id,title,organisation_name,achievement_date,description").single();
      if(error)throw error;setAchievements(current=>[data as Achievement,...current]);setAchievementTitle("");setAchievementOrg("");setAchievementDate("");setAchievementDescription("");setNotice({kind:"success",text:"Achievement added to your sports CV."});
    }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Achievement could not be added."});}finally{setBusy(false);}
  }

  async function deleteAchievement(id:string){
    if(!user||!supabase)return;const {error}=await supabase.from("athlete_achievements").delete().eq("id",id).eq("athlete_id",user.id);
    if(error){setNotice({kind:"error",text:error.message});return;}setAchievements(rows=>rows.filter(row=>row.id!==id));setNotice({kind:"success",text:"Achievement removed."});
  }

  async function saveOrganisation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!user||!supabase)return;setBusy(true);setNotice(null);
    try{
      if(selectedOrg){
        const {error}=await supabase.from("organisations").update({name:orgName.trim(),organisation_type:orgType,location:orgLocation.trim()||null,country:member?.country??"South Africa",website:orgWebsite.trim()||null,description:orgDescription.trim()||null}).eq("id",selectedOrg);
        if(error)throw error;
        setOrganisations(rows=>rows.map(row=>row.id===selectedOrg?{...row,name:orgName,organisation_type:orgType,location:orgLocation,website:orgWebsite,description:orgDescription}:row));
        setNotice({kind:"success",text:"Organisation details saved. Verification status cannot be changed by an organisation owner."});
      }else{
        const {data,error}=await supabase.from("organisations").insert({owner_id:user.id,name:orgName.trim(),organisation_type:orgType,location:orgLocation.trim()||null,country:member?.country??"South Africa",website:orgWebsite.trim()||null,description:orgDescription.trim()||null}).select("id,name,organisation_type,verification_status,location,country,website,description").single();
        if(error)throw error;const org=data as Org;setOrganisations(rows=>[org,...rows]);setSelectedOrg(org.id);setNotice({kind:"success",text:"Organisation created and placed in the verification queue."});
      }
    }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Organisation details could not be saved."});}finally{setBusy(false);}
  }

  async function createOpportunity(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!user||!supabase||!selectedOrg)return;setBusy(true);setNotice(null);
    try{
      const {data,error}=await supabase.from("opportunities").insert({organisation_id:selectedOrg,created_by:user.id,title:opTitle.trim(),opportunity_type:opType,sport_id:opSport||null,positions:opPosition.trim()?opPosition.split(",").map(x=>x.trim()).filter(Boolean):[],location:opLocation.trim()||orgLocation||null,country:member?.country??"South Africa",competition_level:opLevel.trim()||null,summary:opSummary.trim(),closing_date:opClosing||null,status:"draft"}).select("id,title,status,verification_status,closing_date,created_at,opportunity_type").single();
      if(error)throw error;setManaged(rows=>[data as ManagedOpportunity,...rows]);setOpTitle("");setOpPosition("");setOpLocation("");setOpLevel("");setOpClosing("");setOpSummary("");setShowCreateOpportunity(false);setNotice({kind:"success",text:"Opportunity saved as a draft. It remains private until it is published and the platform verifies both the opportunity and organisation."});
    }catch(error){setNotice({kind:"error",text:error instanceof Error?error.message:"Opportunity could not be created. Make sure your organisation exists."});}finally{setBusy(false);}
  }

  async function loadManaged(orgs:Org[]){
    if(!supabase||!orgs.length)return;
    const {data,error}=await supabase.from("opportunities").select("id,title,status,verification_status,closing_date,created_at,opportunity_type").in("organisation_id",orgs.map(org=>org.id)).order("created_at",{ascending:false});
    if(error){setNotice({kind:"info",text:"Opportunity management needs the current Sport migration and organisation owner permissions."});return;}
    setManaged((data??[]) as ManagedOpportunity[]);
  }
  useEffect(()=>{if(organisations.length)void loadManaged(organisations);},[organisations,selectedOrg]);

  async function removeSaved(id:string){
    if(!user||!supabase)return;const {error}=await supabase.from("saved_opportunities").delete().eq("athlete_id",user.id).eq("opportunity_id",id);
    if(error){setNotice({kind:"error",text:error.message});return;}setSaved(rows=>rows.filter(item=>item.id!==id));setNotice({kind:"success",text:"Opportunity removed from your saved list."});
  }

  async function signOut(){if(!supabase)return;await supabase.auth.signOut();setNotice({kind:"info",text:"You have signed out."});}

  const completion = useMemo(()=>{
    if(!member)return 0;
    const checks=[Boolean(member.display_name),Boolean(member.location),Boolean(member.bio),Boolean(sportId),Boolean(position),Boolean(level),achievements.length>0];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  },[member,sportId,position,level,achievements.length]);

  if(!authLoaded||loading)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle className="spin" size={22}/><span>Opening your workspace…</span></div></section>;
  if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><ShieldCheck size={26}/></span><p className="workspace-kicker">WORKSPACE SETUP</p><h1>Your sports HQ<br/><span>is ready for connection.</span></h1><p>Configure a dedicated Sport Supabase project and apply both migrations to activate accounts, profiles, applications and organisation tools.</p><Link className="button button-dark" to="/join">Open account setup <ArrowUpRight size={16}/></Link></div></section>;
  if(!user)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><UserRound size={26}/></span><p className="workspace-kicker">YOUR SPORTS HQ</p><h1>Your next move<br/><span>starts with you.</span></h1><p>Sign in or create a ChatSched Sport account to manage your sports profile, saved opportunities, applications and organisation tools.</p><div className="workspace-cta-row"><Link className="button button-dark" to="/join?mode=login">Sign in</Link><Link className="button button-lime" to="/join">Create account</Link></div></div></section>;

  const displayName=member?.display_name||user.email||"Sport member";
  const tabs=[{id:"overview",label:"Overview",icon:Trophy},{id:"profile",label:"Sports profile",icon:UserRound},{id:"saved",label:"Saved",icon:Heart},{id:"applications",label:"Applications",icon:ClipboardList},{id:"organisation",label:"Organisation",icon:BriefcaseBusiness}];
  return <section className="workspace-wrap">
    <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> MEMBER WORKSPACE</div><h1>Welcome back,<br/><span>{displayName.split(" ")[0]}.</span></h1><p>Your sporting journey, organised around your next opportunity.</p></div><div className="workspace-user-card"><div className="workspace-avatar">{displayName.trim().charAt(0).toUpperCase()}</div><div><strong>{displayName}</strong><small>{member?.account_type??"Member"} account</small><small>{user.email}</small></div><button title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={17}/></button></div></div>
    {notice&&<div className={"workspace-notice notice-"+notice.kind} role="status"><span>{notice.text}</span><button aria-label="Dismiss notice" onClick={()=>setNotice(null)}><X size={16}/></button></div>}
    <div className="workspace-layout"><aside className="workspace-sidebar"><div className="workspace-sidebar-label">YOUR SPACE</div>{tabs.map(item=>{const Icon=item.icon;return <button key={item.id} className={tab===item.id?"workspace-tab is-active":"workspace-tab"} onClick={()=>setTab(item.id)}><Icon size={17}/><span>{item.label}</span>{item.id==="saved"&&<em>{saved.length}</em>}{item.id==="applications"&&<em>{applications.length}</em>}</button>;})}<div className="workspace-sidebar-foot"><ShieldCheck size={17}/><span>Verified opportunities only appear in the public catalogue.</span></div></aside>
      <div className="workspace-content">
        {tab==="overview"&&<><div className="workspace-section-title"><div><p className="workspace-kicker">YOUR DASHBOARD</p><h2>Keep your momentum.</h2></div><Link to="/opportunities" className="workspace-text-link">Browse opportunities <ArrowUpRight size={16}/></Link></div>
          <div className="workspace-metrics"><article><span>Profile completion</span><strong>{completion}%</strong><div className="completion-track"><i style={{width:completion+"%"}}/></div><small>{completion===100?"Your profile is looking strong":"Add details to help others understand your sporting journey"}</small></article><article><span>Saved opportunities</span><strong>{saved.length.toString().padStart(2,"0")}</strong><small>Listings you want to revisit</small></article><article><span>Applications</span><strong>{applications.length.toString().padStart(2,"0")}</strong><small>Applications submitted through the network</small></article></div>
          <div className="workspace-section-title"><div><p className="workspace-kicker">NEXT BEST ACTIONS</p><h2>Build your profile. Find your path.</h2></div></div>
          <div className="workspace-action-grid"><button onClick={()=>setTab("profile")}><UserRound size={20}/><b>Complete your sports CV</b><span>Add your sport, position, level and achievements.</span><ArrowUpRight size={16}/></button><Link to="/opportunities"><Heart size={20}/><b>Explore opportunities</b><span>Search across trials, academies, scouting and sponsorships.</span><ArrowUpRight size={16}/></Link><button onClick={()=>setTab("organisation")}><BriefcaseBusiness size={20}/><b>Set up an organisation</b><span>Prepare to publish structured opportunities.</span><ArrowUpRight size={16}/></button></div>
          <div className="workspace-mini-list"><div className="workspace-section-title"><div><p className="workspace-kicker">RECENT SAVES</p><h2>Keep an eye on these.</h2></div><button className="workspace-text-link" onClick={()=>setTab("saved")}>View all <ArrowUpRight size={15}/></button></div>{saved.length?saved.slice(0,3).map(item=><div className="workspace-list-row" key={item.id}><span className="workspace-row-icon"><Heart size={17}/></span><div><strong>{item.title}</strong><small>{item.sport} · {item.organisation}</small></div><Link to={"/opportunities/"+item.id} aria-label={"Open "+item.title}><ArrowUpRight size={16}/></Link></div>):<p className="workspace-muted">Your saved list is empty. Visit the opportunity catalogue to save suitable listings.</p>}</div>
        </>}
        {tab==="profile"&&<><div className="workspace-section-title"><div><p className="workspace-kicker">DIGITAL SPORTS CV</p><h2>Your profile, your story.</h2><p className="workspace-subtitle">A clear profile makes it easier for legitimate organisations to understand your sporting background.</p></div></div>
          <form className="workspace-form-card" onSubmit={saveProfile}><div className="workspace-form-grid"><label>Display name<input required value={member?.display_name??""} onChange={e=>setMember(p=>p?{...p,display_name:e.target.value}:p)}/></label><label>Email address<input disabled value={member?.email??user.email??""}/></label><label>Location<input value={member?.location??""} onChange={e=>setMember(p=>p?{...p,location:e.target.value}:p)} placeholder="City or region"/></label><label>Country<input value={member?.country??"South Africa"} onChange={e=>setMember(p=>p?{...p,country:e.target.value}:p)}/></label><label>Primary sport<select value={sportId} onChange={e=>setSportId(e.target.value)}><option value="">Choose your sport</option>{sports.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Position / discipline<input value={position} onChange={e=>setPosition(e.target.value)} placeholder="e.g. winger, goalkeeper, 100m"/></label><label>Competition level<input value={level} onChange={e=>setLevel(e.target.value)} placeholder="e.g. junior, school, regional, senior"/></label><label>Availability<input value={availability} onChange={e=>setAvailability(e.target.value)} placeholder="e.g. weekends, next season"/></label><label>Profile visibility<select value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Public sports profile</option><option value="private">Private profile</option></select></label><label className="workspace-span-2">What are your sporting goals?<textarea value={goals} onChange={e=>setGoals(e.target.value)} rows={3} placeholder="What are you working towards?"/></label><label className="workspace-span-2">Short biography<textarea value={member?.bio??""} onChange={e=>setMember(p=>p?{...p,bio:e.target.value}:p)} rows={4} placeholder="Share your sporting story, experience and ambition."/></label></div><div className="workspace-form-footer"><span><ShieldCheck size={16}/> Edit your own profile; keep private contact details private.</span><button className="button button-dark" type="submit" disabled={busy}><Save size={16}/>{busy?"Saving…":"Save profile"}</button></div></form>
          <div className="workspace-form-card achievement-card"><div className="workspace-section-title"><div><p className="workspace-kicker">PROOF OF PROGRESS</p><h2>Achievements & experience.</h2></div></div><form className="workspace-form-grid" onSubmit={addAchievement}><label>Achievement / qualification<input value={achievementTitle} onChange={e=>setAchievementTitle(e.target.value)} required placeholder="e.g. Regional tournament selection"/></label><label>Club / school / organisation<input value={achievementOrg} onChange={e=>setAchievementOrg(e.target.value)} placeholder="Optional"/></label><label>Date<input type="date" value={achievementDate} onChange={e=>setAchievementDate(e.target.value)}/></label><label className="workspace-span-2">Details<textarea rows={2} value={achievementDescription} onChange={e=>setAchievementDescription(e.target.value)} placeholder="Add context or notable results."/></label><div className="workspace-span-2"><button className="button button-dark" type="submit" disabled={busy}><Plus size={16}/> Add achievement</button></div></form><div className="achievement-list">{achievements.map(item=><div key={item.id} className="achievement-row"><span className="achievement-icon"><Trophy size={17}/></span><div><strong>{item.title}</strong><small>{[item.organisation_name,item.achievement_date].filter(Boolean).join(" · ")}</small>{item.description&&<p>{item.description}</p>}</div><button onClick={()=>deleteAchievement(item.id)} aria-label={"Remove "+item.title}><X size={16}/></button></div>)}{!achievements.length&&<p className="workspace-muted">Your achievements will appear here as you add them.</p>}</div></div>
        </>}
        {tab==="saved"&&<><div className="workspace-section-title"><div><p className="workspace-kicker">BOOKMARKED FOR LATER</p><h2>Saved opportunities.</h2></div><Link className="workspace-text-link" to="/opportunities">Find more <ArrowUpRight size={16}/></Link></div>{saved.length?<div className="workspace-opportunity-list">{saved.map(item=><article className="workspace-opportunity" key={item.id}><div><span className="workspace-type-tag">{item.type}</span><h3>{item.title}</h3><p>{item.sport} · {item.organisation} · {item.location}</p><small>{item.demo?"Example listing only":"Verified listing"}</small></div><div className="workspace-opportunity-actions"><Link to={"/opportunities/"+item.id} className="button button-dark">View <ArrowUpRight size={15}/></Link><button onClick={()=>removeSaved(item.id)} aria-label={"Remove "+item.title}><X size={16}/></button></div></article>)}</div>:<div className="workspace-blank"><Heart size={25}/><h3>Your shortlist starts here.</h3><p>Save opportunities that align with your goals so you can revisit their requirements and status.</p><Link className="button button-dark" to="/opportunities">Explore opportunities</Link></div>}</>}
        {tab==="applications"&&<><div className="workspace-section-title"><div><p className="workspace-kicker">YOUR APPLICATION TRACKER</p><h2>Every next step, in view.</h2></div></div>{applications.length?<div className="workspace-opportunity-list">{applications.map(({row,opportunity})=><article className="workspace-opportunity" key={row.id}><div><span className={"status-tag status-"+row.status}>{row.status.replace("_"," ")}</span><h3>{opportunity?.title??"Opportunity listing"}</h3><p>{opportunity?.organisation??"Listing details unavailable"}{opportunity?" · "+opportunity.sport:""}</p><small>Submitted {new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric"}).format(new Date(row.created_at))}</small></div>{opportunity&&<Link to={"/opportunities/"+opportunity.id} className="workspace-text-link">View listing <ArrowUpRight size={15}/></Link>}</article>)}</div>:<div className="workspace-blank"><ClipboardList size={25}/><h3>No applications yet.</h3><p>When you apply to a real, verified opportunity, your application status will appear here.</p><Link className="button button-dark" to="/opportunities">Browse the catalogue</Link></div>}</>}
        {tab==="organisation"&&<><div className="workspace-section-title"><div><p className="workspace-kicker">CLUB, ACADEMY & PARTNER TOOLS</p><h2>Bring opportunities to the network.</h2><p className="workspace-subtitle">Create an organisation profile and prepare well-structured listings. New organisations and opportunities require platform verification.</p></div></div>
          {organisations.length>1&&<label className="workspace-org-select">Choose organisation<select value={selectedOrg} onChange={e=>{const id=e.target.value;setSelectedOrg(id);const org=organisations.find(x=>x.id===id);if(org){setOrgName(org.name);setOrgType(org.organisation_type);setOrgLocation(org.location??"");setOrgWebsite(org.website??"");setOrgDescription(org.description??"");}}}>{organisations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
          <form className="workspace-form-card" onSubmit={saveOrganisation}><div className="workspace-section-title"><div><p className="workspace-kicker">{selectedOrg?"ORGANISATION PROFILE":"GET STARTED"}</p><h2>{selectedOrg?"Organisation details":"Create an organisation"}</h2></div>{selectedOrg&&<span className={"status-tag status-"+(organisations.find(o=>o.id===selectedOrg)?.verification_status??"pending")}><ShieldCheck size={13}/>{organisations.find(o=>o.id===selectedOrg)?.verification_status??"pending"}</span>}</div><div className="workspace-form-grid"><label>Organisation name<input required minLength={2} value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Club, academy, brand or programme"/></label><label>Organisation type<select value={orgType} onChange={e=>setOrgType(e.target.value)}>{["club","academy","scout","coach","brand","sponsor","agent","event","school","other"].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label><label>Location<input value={orgLocation} onChange={e=>setOrgLocation(e.target.value)} placeholder="City, region"/></label><label>Website<input type="url" value={orgWebsite} onChange={e=>setOrgWebsite(e.target.value)} placeholder="https://"/></label><label className="workspace-span-2">About the organisation<textarea rows={3} value={orgDescription} onChange={e=>setOrgDescription(e.target.value)} placeholder="Describe your organisation and what you offer to athletes."/></label></div><div className="workspace-form-footer"><span><ShieldCheck size={16}/> Verification is handled by ChatSched Sport administrators.</span><button className="button button-dark" type="submit" disabled={busy}><Save size={16}/>{busy?"Saving…":selectedOrg?"Save organisation":"Create organisation"}</button></div></form>
          {selectedOrg&&<div className="workspace-form-card"><div className="workspace-section-title"><div><p className="workspace-kicker">OPPORTUNITY MANAGEMENT</p><h2>Your listings.</h2></div><button className="button button-dark" onClick={()=>setShowCreateOpportunity(v=>!v)}><Plus size={16}/>{showCreateOpportunity?"Close form":"New opportunity"}</button></div>
            {showCreateOpportunity&&<form className="workspace-form-grid workspace-create-opportunity" onSubmit={createOpportunity}><label className="workspace-span-2">Opportunity title<input required minLength={4} value={opTitle} onChange={e=>setOpTitle(e.target.value)} placeholder="e.g. U19 trials, scholarship intake, coaching programme"/></label><label>Opportunity type<select value={opType} onChange={e=>setOpType(e.target.value as OpportunityType)}>{opportunityTypes.map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label><label>Sport<select value={opSport} onChange={e=>setOpSport(e.target.value)}><option value="">Multi-sport / not specified</option>{sports.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Positions / disciplines<input value={opPosition} onChange={e=>setOpPosition(e.target.value)} placeholder="Comma-separated, optional"/></label><label>Level<input value={opLevel} onChange={e=>setOpLevel(e.target.value)} placeholder="e.g. U19, regional, senior"/></label><label>Location<input value={opLocation} onChange={e=>setOpLocation(e.target.value)} placeholder={orgLocation||"City / region"}/></label><label>Closing date<input type="date" value={opClosing} onChange={e=>setOpClosing(e.target.value)}/></label><label className="workspace-span-2">Summary<textarea required minLength={20} rows={4} value={opSummary} onChange={e=>setOpSummary(e.target.value)} placeholder="Explain the opportunity, who is eligible, what is included, and how selection works."/></label><div className="workspace-span-2 workspace-form-footer"><span>New listings are saved as drafts and are not publicly visible until reviewed.</span><button className="button button-lime" type="submit" disabled={busy}><Plus size={16}/>Save draft</button></div></form>}
            {managed.length?<div className="workspace-managed-list">{managed.map(item=><div className="workspace-list-row" key={item.id}><span className="workspace-row-icon"><FileText size={17}/></span><div><strong>{item.title}</strong><small>{item.opportunity_type} · {item.status} · verification {item.verification_status}</small></div><span className={"status-tag status-"+item.verification_status}>{item.verification_status}</span></div>)}</div>:<p className="workspace-muted">No listings yet. Create an opportunity draft to start the review process.</p>}
          </div>}
          {!selectedOrg&&<div className="workspace-blank"><BriefcaseBusiness size={25}/><h3>One network. More pathways.</h3><p>Organisation verification helps athletes distinguish legitimate opportunities from unverified listings.</p></div>}
        </>}
      </div>
    </div>
    <div className="workspace-footer-note"><ShieldCheck size={15}/><span>ChatSched Sport does not guarantee selection, contracts, scholarships, sponsorship or representation. Keep personal information private and report suspicious requests.</span></div>
  </section>;
}
