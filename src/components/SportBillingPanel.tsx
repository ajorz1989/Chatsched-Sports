import {useEffect,useState} from "react";
import {CheckCircle2,CreditCard,ShieldCheck,Sparkles} from "lucide-react";
import {supabase} from "../lib/supabase";

type Props={userId:string;isOrganisationMember:boolean};
type Org={id:string;name:string;organisation_type:string;verification_status:string};
type Billing={plan_code:string;billing_status:string;current_period_end:string|null};

const plans=[
 {code:"club_pro",name:"Club Pro",price:"R499",desc:"For clubs recruiting consistently.",features:["Recruitment Hub","Reverse athlete matching","Applicant pipeline","Organisation insights","Trial-day publishing"]},
 {code:"academy_pro",name:"Academy Pro",price:"R899",desc:"For academies running a larger talent programme.",features:["Everything in Club Pro","Expanded opportunity operations","Advanced recruitment workflow","Priority operational review"]},
 {code:"agency_pro",name:"Agency Pro",price:"R1,499",desc:"For approved sports agencies and talent operations.",features:["Multi-client recruitment workflow","Advanced talent operations","Agency CRM access","Priority operational review"]},
];

export default function SportBillingPanel({userId,isOrganisationMember}:Props){
 const [orgs,setOrgs]=useState<Org[]>([]);const [selected,setSelected]=useState("");const [billing,setBilling]=useState<Billing|null>(null);const [orders,setOrders]=useState<{id:string;service_code:string;amount_cents:number;status:string;created_at:string}[]>([]);const [notice,setNotice]=useState("");const [busy,setBusy]=useState("");
 async function load(){
  if(!supabase||!isOrganisationMember)return;
  const {data}=await supabase.from("organisations").select("id,name,organisation_type,verification_status").eq("owner_id",userId).order("name");
  const rows=(data??[]) as Org[];setOrgs(rows);if(!selected&&rows[0])setSelected(rows[0].id);
 }
 useEffect(()=>{void load();},[userId,isOrganisationMember]);
 useEffect(()=>{if(!supabase||!selected)return;void(async()=>{
  const [b,o]=await Promise.all([
   supabase.from("sport_billing_accounts").select("plan_code,billing_status,current_period_end").eq("organisation_id",selected).maybeSingle(),
   supabase.from("sport_service_orders").select("id,service_code,amount_cents,status,created_at").eq("organisation_id",selected).order("created_at",{ascending:false}).limit(8)
  ]);
  setBilling((b.data??null) as Billing|null);setOrders((o.data??[]) as typeof orders);
 })();},[selected]);
 async function request(code:string){
  if(!supabase||!selected)return;setBusy(code);setNotice("");
  const {data,error}=await supabase.rpc("request_sport_service",{target_organisation:selected,target_service:code});
  setBusy("");
  if(error){setNotice(error.message);return;}
  setNotice("Activation request created. Connect the approved payment provider to complete payment; the plan will remain pending until a verified payment webhook confirms it.");
  if(data){const {data:rows}=await supabase.from("sport_service_orders").select("id,service_code,amount_cents,status,created_at").eq("organisation_id",selected).order("created_at",{ascending:false}).limit(8);setOrders((rows??[]) as typeof orders);}
 }
 if(!isOrganisationMember)return null;
 return <section className="workspace-form-card phase4-billing">
  <div className="workspace-section-title"><div><p className="workspace-kicker">SPORT SERVICES</p><h2>Professional tools for organisations.</h2><p className="workspace-subtitle">Recruitment remains the core product. Paid plans add operational capacity around verified organisations; they do not sell athlete selection, guaranteed placement or outcomes.</p></div><CreditCard size={22}/></div>
  {!orgs.length?<div className="workspace-notice notice-info"><ShieldCheck size={15}/> Create an organisation first. Billing activation is only available to the organisation owner.</div>:<>
   <label className="phase4-org-select">Organisation<select value={selected} onChange={e=>setSelected(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
   <div className="phase4-plan-grid">{plans.map(plan=><article key={plan.code} className={billing?.plan_code===plan.code&&billing?.billing_status==="active"?"phase4-plan active":"phase4-plan"}><div><span className="workspace-kicker">{plan.code==="club_pro"?"CORE":"SCALE"}</span><h3>{plan.name}</h3><p>{plan.desc}</p><strong>{plan.price}<small>/ month</small></strong></div><ul>{plan.features.map(x=><li key={x}><CheckCircle2 size={14}/>{x}</li>)}</ul>{billing?.plan_code===plan.code&&billing?.billing_status==="active"?<span className="phase4-active"><CheckCircle2 size={14}/> Active</span>:<button className="button button-dark" disabled={busy===plan.code} onClick={()=>void request(plan.code)}>{busy===plan.code?"Creating…":"Request activation"}</button>}</article>)}</div>
   {billing&&<div className="workspace-notice notice-info"><Sparkles size={15}/><span>Current billing status: <strong>{billing.billing_status.replaceAll("_"," ")}</strong> · plan: <strong>{billing.plan_code.replaceAll("_"," ")}</strong>{billing.current_period_end?" · renews "+new Date(billing.current_period_end).toLocaleDateString("en-ZA"):""}</span></div>}\n   {billing?.billing_status==="active"&&<div className="phase5-entitlement-strip"><div><strong>Included access</strong><span>Recruitment Hub · reverse matching · applicant pipeline · insights · talent shortlisting · trial publishing</span></div><ShieldCheck size={17}/></div>}
   {notice&&<div className="workspace-notice notice-info">{notice}</div>}
   <div className="phase4-orders"><div className="workspace-section-title"><div><p className="workspace-kicker">BILLING HISTORY</p><h3>Service orders</h3></div></div>{orders.map(o=><div className="workspace-list-row" key={o.id}><div><strong>{o.service_code.replaceAll("_"," ")}</strong><small>R{(o.amount_cents/100).toFixed(2)} · {new Date(o.created_at).toLocaleDateString("en-ZA")}</small></div><span className="status-tag">{o.status.replaceAll("_"," ")}</span></div>)}{!orders.length&&<p className="workspace-muted">No service orders yet.</p>}</div>
  </>}
 </section>;
}
