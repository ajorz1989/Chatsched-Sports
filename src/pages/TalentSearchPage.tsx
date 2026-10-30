import {useCallback,useEffect,useMemo,useState} from "react";
import {ArrowUpRight,Bookmark,LoaderCircle,MapPin,Search,ShieldCheck,Star,Trophy,Users} from "lucide-react";
import {Link} from "react-router-dom";
import {supabase,supabaseConfigured} from "../lib/supabase";import {loadSportNames,sanitiseSearchTerm} from "../lib/opportunities";
import "../styles-workspace.css";

type Org={id:string;name:string;verification_status:string;organisation_type:string;location:string|null;country:string};
type Athlete={id:string;display_name:string;avatar_url:string|null;location:string|null;country:string|null;sport:string|null;discipline:string|null;position:string|null;playing_level:string|null;availability:string|null;career_goals:string|null};
type Shortlist={id:string;organisation_id:string;athlete_id:string;note:string|null};

const allowedRoles=["club","academy","scout","coach","brand","sponsor","agent","event"];

export default function TalentSearchPage(){
 const [userId,setUserId]=useState("");const [checked,setChecked]=useState(false);const [loading,setLoading]=useState(true);const [orgs,setOrgs]=useState<Org[]>([]);const [selectedOrg,setSelectedOrg]=useState("");const [items,setItems]=useState<Athlete[]>([]);const [shortlists,setShortlists]=useState<Shortlist[]>([]);
 const [query,setQuery]=useState("");const [sport,setSport]=useState("all");const [level,setLevel]=useState("all");const [notice,setNotice]=useState("");const [busyId,setBusyId]=useState("");
 const PAGE_SIZE=30;const [debounced,setDebounced]=useState("");const [page,setPage]=useState(0);const [total,setTotal]=useState(0);const [loadingMore,setLoadingMore]=useState(false);const [sportNames,setSportNames]=useState<string[]>([]);const [levelNames,setLevelNames]=useState<string[]>([]);

 useEffect(()=>{let alive=true;(async()=>{
  if(!supabaseConfigured||!supabase){setChecked(true);setLoading(false);return;}
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!alive)return;if(!user){setChecked(true);setLoading(false);return;}setUserId(user.id);
   const {data:owned,error}=await supabase.from("organisations").select("id,name,verification_status,organisation_type,location,country").eq("owner_id",user.id).eq("verification_status","verified").order("name");
   if(error)throw error;
   const verified=(owned??[]).filter(row=>allowedRoles.includes(row.organisation_type)) as Org[];
   setOrgs(verified);if(verified.length)setSelectedOrg(verified[0].id);
   setChecked(true);
  }catch(error){if(alive)setNotice(error instanceof Error?error.message:"Verified organisation access could not be confirmed.");setChecked(true);}finally{if(alive)setLoading(false);}
 })();return()=>{alive=false;};},[]);

 const fetchPage=useCallback(async(pageNumber:number)=>{
  if(!supabase)throw new Error("Not connected");
  let request=supabase.from("athlete_directory").select("id,display_name,avatar_url,location,country,sport,discipline,position,playing_level,availability,career_goals",{count:"exact"});
  if(sport!=="all")request=request.eq("sport",sport);
  if(level!=="all")request=request.eq("playing_level",level);
  const term=sanitiseSearchTerm(debounced);
  if(term){const pattern="*"+term.replace(/ /g,"*")+"*";request=request.or(["display_name","sport","discipline","position","location","country","playing_level","career_goals"].map(column=>column+".ilike."+pattern).join(","));}
  const from=pageNumber*PAGE_SIZE;
  const {data,error,count}=await request.order("display_name",{ascending:true}).order("id",{ascending:true}).range(from,from+PAGE_SIZE-1);
  if(error)throw error;
  return{rows:(data??[]) as unknown as Athlete[],count:count??0};
 },[debounced,sport,level]);
 useEffect(()=>{const timer=window.setTimeout(()=>setDebounced(query),300);return()=>window.clearTimeout(timer);},[query]);
 useEffect(()=>{let alive=true;void loadSportNames().then(names=>{if(alive)setSportNames(names);});return()=>{alive=false;};},[]);
 useEffect(()=>{let alive=true;if(!selectedOrg||!supabase)return;const client=supabase;
 (async()=>{try{const [result,s]=await Promise.all([fetchPage(0),client.from("talent_shortlists").select("id,organisation_id,athlete_id,note").eq("organisation_id",selectedOrg)]);if(!alive)return;if(s.error){setNotice(s.error.message);return;}setItems(result.rows);setTotal(result.count);setPage(0);setShortlists((s.data??[]) as Shortlist[]);setLevelNames(current=>Array.from(new Set([...current,...result.rows.map(row=>row.playing_level).filter((row):row is string=>Boolean(row))])).sort());}catch(error){if(alive)setNotice(error&&typeof error==="object"&&"message" in error?String((error as {message:unknown}).message):"Talent could not be loaded.");}})();return()=>{alive=false;};},[selectedOrg,fetchPage]);
 async function loadMore(){if(loadingMore)return;setLoadingMore(true);try{const next=page+1;const result=await fetchPage(next);setItems(current=>{const seen=new Set(current.map(item=>item.id));return[...current,...result.rows.filter(item=>!seen.has(item.id))];});setPage(next);setTotal(result.count);setLevelNames(current=>Array.from(new Set([...current,...result.rows.map(row=>row.playing_level).filter((row):row is string=>Boolean(row))])).sort());}catch(error){setNotice(error&&typeof error==="object"&&"message" in error?String((error as {message:unknown}).message):"More talent could not be loaded.");}finally{setLoadingMore(false);}}
 const sports=useMemo(()=>{const names=new Set<string>(sportNames);if(sport!=="all")names.add(sport);return Array.from(names).sort();},[sportNames,sport]);
 const levels=useMemo(()=>{const names=new Set<string>(levelNames);if(level!=="all")names.add(level);return Array.from(names).sort();},[levelNames,level]);
 const filtered=items;const hasMore=items.length<total;
 const currentOrg=orgs.find(x=>x.id===selectedOrg);const shortlistIds=new Set(shortlists.map(x=>x.athlete_id));

 async function toggleShortlist(athlete:Athlete){
  if(!supabase||!selectedOrg)return;setBusyId(athlete.id);setNotice("");
  try{
   const existing=shortlists.find(x=>x.athlete_id===athlete.id);
   if(existing){
    const {error}=await supabase.from("talent_shortlists").delete().eq("id",existing.id).eq("organisation_id",selectedOrg);if(error)throw error;
    setShortlists(rows=>rows.filter(x=>x.id!==existing.id));setNotice(athlete.display_name+" removed from your private shortlist.");
   }else{
    const {data,error}=await supabase.from("talent_shortlists").insert({organisation_id:selectedOrg,athlete_id:athlete.id,created_by:userId,note:null}).select("id,organisation_id,athlete_id,note").single();if(error)throw error;
    setShortlists(rows=>[...rows,data as Shortlist]);setNotice(athlete.display_name+" added to "+(currentOrg?.name??"your organisation")+" shortlist.");
   }
  }catch(error){setNotice(error instanceof Error?error.message:"Shortlist could not be updated.");}finally{setBusyId("");}
 }

 if(!checked||loading)return <section className="workspace-wrap"><div className="workspace-loading"><LoaderCircle size={20} className="spin"/>Checking verified organisation access…</div></section>;
 if(!supabaseConfigured||!supabase)return <section className="workspace-wrap"><div className="workspace-empty"><ShieldCheck size={24}/><h1>Talent discovery is ready.</h1><p>Connect the dedicated Sport Supabase project and apply the latest migrations to activate private reverse discovery.</p><Link className="button button-dark" to="/join">Join the network</Link></div></section>;
 if(!userId||!orgs.length)return <section className="workspace-wrap"><div className="workspace-empty"><span className="workspace-icon"><Users size={24}/></span><p className="workspace-kicker">VERIFIED TALENT SEARCH</p><h1>Find relevant talent<br/><span>with permission.</span></h1><p>Reverse talent discovery is reserved for authenticated owners of verified clubs, academies, scouting operations and approved sports partners. Public talent browsing remains available to everyone.</p><div className="workspace-cta-row"><Link className="button button-dark" to="/join?mode=login&next=%2Ftalent-discover">Sign in</Link><Link className="button button-accent" to="/organisations">View organisations</Link></div></div></section>;

 return <section className="workspace-wrap talent-search-wrap">
  <div className="workspace-hero"><div><div className="workspace-kicker"><span className="status-dot"/> VERIFIED TALENT DISCOVERY</div><h1>Find the right<br/><span>sporting context.</span></h1><p>Search public athlete profiles using relevant sporting fields. Your private shortlist stays with your organisation.</p></div><Link className="button button-dark" to="/workspace">Back to workspace <ArrowUpRight size={16}/></Link></div>
  {notice&&<div className="workspace-notice notice-info" role="status">{notice}</div>}
  <div className="talent-search-toolbar"><label>Organisation<select value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>{orgs.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label className="search-field"><Search size={16}/><span className="sr-only">Search talent</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search athlete, position, sport or location"/></label><label>Sport<select value={sport} onChange={e=>setSport(e.target.value)}><option value="all">All sports</option>{sports.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Level<select value={level} onChange={e=>setLevel(e.target.value)}><option value="all">All levels</option>{levels.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
  <div className="talent-search-summary"><span>{total} discoverable profile{total===1?"":"s"}{hasMore?" · showing "+filtered.length:""}</span><span><Bookmark size={16}/> {shortlists.length} shortlisted</span><span><ShieldCheck size={16}/> Public profiles only</span></div>
  <div className="talent-discovery-grid">{filtered.map(athlete=><article className="talent-discovery-card" key={athlete.id}><div className="talent-card-head"><span className="talent-avatar">{athlete.avatar_url?<img src={athlete.avatar_url} alt=""/>:(athlete.display_name.trim()[0]||"A").toUpperCase()}</span>{shortlistIds.has(athlete.id)&&<span className="shortlisted-badge"><Star size={16}/> Shortlisted</span>}</div><h3>{athlete.display_name}</h3><p className="talent-sport">{[athlete.sport,athlete.discipline].filter(Boolean).join(" · ")||"Sport not specified"}</p><div className="talent-details">{athlete.position&&<span><Trophy size={16}/>{athlete.position}</span>}{athlete.playing_level&&<span><Users size={16}/>{athlete.playing_level}</span>}{(athlete.location||athlete.country)&&<span><MapPin size={16}/>{[athlete.location,athlete.country].filter(Boolean).join(", ")}</span>}</div>{athlete.career_goals&&<p className="talent-goals">{athlete.career_goals}</p>}<div className="talent-card-actions"><Link className="button button-dark" to={"/talent/"+athlete.id}>View profile <ArrowUpRight size={16}/></Link><button className="talent-shortlist-btn" disabled={busyId===athlete.id} onClick={()=>void toggleShortlist(athlete)}><Bookmark size={16} fill={shortlistIds.has(athlete.id)?"currentColor":"none"}/>{shortlistIds.has(athlete.id)?"Shortlisted":"Shortlist"}</button></div></article>)}</div>
  {hasMore&&<div className="catalogue-load-more"><button className="button button-dark" type="button" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?"Loading…":"Load more profiles"}</button></div>}
  {!filtered.length&&<div className="workspace-blank"><Search size={24}/><h3>No matching public profiles.</h3><p>Broaden the filters or review the public talent directory. Athlete visibility is always controlled by the athlete.</p></div>}
  <div className="workspace-footer-note"><ShieldCheck size={16}/><span>Do not infer ability, availability or eligibility beyond what an athlete has chosen to publish. Shortlists are private to your verified organisation.</span></div>
 </section>;
}
