import {useCallback,useEffect,useState} from "react";
import {Activity,CheckCircle2,CircleHelp,RefreshCw,XCircle} from "lucide-react";
import {supabase,supabaseConfigured} from "../lib/supabase";
import "../styles-support.css";

type State="checking"|"ok"|"down"|"unknown";
type Check={key:string;label:string;state:State;ms?:number};

export default function StatusPage(){
 const [checks,setChecks]=useState<Check[]>([
  {key:"site",label:"Website",state:"ok"},
  {key:"api",label:"Opportunities and profiles",state:"checking"},
  {key:"auth",label:"Sign-in",state:"checking"}
 ]);
 const [checkedAt,setCheckedAt]=useState<Date|null>(null);

 const run=useCallback(async()=>{
  setChecks(current=>current.map(item=>item.key==="site"?item:{...item,state:"checking"}));
  const update=(key:string,state:State,ms?:number)=>setChecks(current=>current.map(item=>item.key===key?{...item,state,ms}:item));
  if(!supabaseConfigured||!supabase){update("api","unknown");update("auth","unknown");setCheckedAt(new Date());return;}
  const client=supabase;
  const timed=async(key:string,work:()=>Promise<boolean>)=>{
   const start=performance.now();
   try{
    const ok=await Promise.race([work(),new Promise<boolean>(resolve=>window.setTimeout(()=>resolve(false),8000))]);
    update(key,ok?"ok":"down",Math.round(performance.now()-start));
   }catch{update(key,"down");}
  };
  await Promise.all([
   timed("api",async()=>{const {error}=await client.from("opportunities").select("id",{head:true,count:"exact"}).limit(1);return !error;}),
   timed("auth",async()=>{const {error}=await client.auth.getSession();return !error;})
  ]);
  setCheckedAt(new Date());
 },[]);

 useEffect(()=>{void run();},[run]);

 const settled=checks.filter(item=>item.state!=="checking");
 const anyDown=checks.some(item=>item.state==="down");
 const anyUnknown=checks.some(item=>item.state==="unknown");
 const headline=settled.length<checks.length?"Checking…":anyDown?"Some services are not responding":anyUnknown?"Status unavailable":"All systems working";

 return <section className="sx-page">
  <header className="sx-hero">
   <span className="sx-icon"><Activity size={26} aria-hidden="true"/></span>
   <p className="section-kicker">SERVICE STATUS</p>
   <h1>{headline}</h1>
   <p className="sx-lead">These checks run from your browser right now. They show whether this device can reach our services. They are not a history of past incidents.</p>
  </header>
  <div className="sx-body">
   <ul className="sx-status-list" aria-live="polite">
    {checks.map(item=><li key={item.key} className={"sx-status sx-status-"+item.state}>
     {item.state==="ok"?<CheckCircle2 size={20} aria-hidden="true"/>:item.state==="down"?<XCircle size={20} aria-hidden="true"/>:item.state==="unknown"?<CircleHelp size={20} aria-hidden="true"/>:<RefreshCw size={20} className="spin" aria-hidden="true"/>}
     <span>{item.label}</span>
     <strong>{item.state==="ok"?"Working":item.state==="down"?"Not responding":item.state==="unknown"?"Not configured":"Checking"}{item.ms!==undefined&&item.state==="ok"?" · "+item.ms+" ms":""}</strong>
    </li>)}
   </ul>
   <div className="sx-actions"><button type="button" className="button button-dark" onClick={()=>void run()}><RefreshCw size={15}/> Check again</button>{checkedAt&&<span className="sx-small">Last checked {checkedAt.toLocaleTimeString("en-ZA")}</span>}</div>
   {anyDown&&<p className="sx-note">If a service stays down, try again in a few minutes, then <a href="/contact">contact us</a>.</p>}
  </div>
 </section>;
}
