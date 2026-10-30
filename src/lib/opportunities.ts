import {supabase,supabaseConfigured} from "./supabase";
import type {Opportunity,OpportunityType} from "./types";
export const sampleOpportunities:Opportunity[]=[
{id:"sample-football-trial",title:"Senior Football Trial — Wide & Central Positions",type:"trial",sport:"Football",positions:["Winger","Striker","Midfielder"],organisation:"Example Cape Football Club",location:"Cape Town",country:"South Africa",level:"Senior / semi-professional",summary:"Illustrative listing showing how a club can explain positions, eligibility and its trial process.",closingDate:"2027-02-15",verificationStatus:"pending",demo:true},
{id:"sample-rugby-academy",title:"Rugby Development Academy Intake",type:"academy",sport:"Rugby",positions:["Backline","Forward"],organisation:"Example Western Cape Academy",location:"Stellenbosch",country:"South Africa",level:"Development",summary:"Example academy intake with development objectives and a structured player pathway.",closingDate:"2027-01-20",verificationStatus:"pending",demo:true},
{id:"sample-athletics-scholarship",title:"Student-Athlete Scholarship Pathway",type:"scholarship",sport:"Athletics",organisation:"Example Student Sport Programme",location:"Johannesburg",country:"South Africa",level:"School leaver / university",summary:"Sample scholarship opportunity outlining academic, sporting and eligibility requirements.",closingDate:"2027-03-01",verificationStatus:"pending",demo:true},
{id:"sample-netball-scout",title:"Regional Netball Talent Identification",type:"scouting",sport:"Netball",positions:["Goal Shooter","Centre","Goal Keeper"],organisation:"Example Regional Talent Network",location:"Durban",country:"South Africa",level:"Regional",summary:"Example talent-identification opportunity with a transparent selection and follow-up process.",closingDate:"2027-01-31",verificationStatus:"pending",demo:true},
{id:"sample-swimming-development",title:"High-Performance Swimming Development",type:"development",sport:"Swimming",organisation:"Example Aquatics Development Hub",location:"Pretoria",country:"South Africa",level:"Competitive",summary:"Demonstration programme for swimmers seeking structured coaching and progression.",closingDate:"2027-02-28",verificationStatus:"pending",demo:true},
{id:"sample-sport-sponsor",title:"Emerging Athlete Brand Partnership",type:"sponsorship",sport:"Multi-sport",organisation:"Example Performance Brand",location:"South Africa — nationwide",country:"South Africa",level:"Emerging / community",summary:"Illustrative partnership brief showing how eligibility and deliverables can be presented.",closingDate:"2027-02-10",verificationStatus:"pending",demo:true}
];
type RelatedName={name?:string}|{name?:string}[]|null;
interface LiveRow{id:string;title:string;opportunity_type:string;discipline?:string|null;positions?:string[]|null;location?:string|null;country?:string|null;competition_level?:string|null;summary?:string|null;description?:string|null;eligibility?:string|null;closing_date?:string|null;compensation_type?:string|null;minimum_age?:number|null;maximum_age?:number|null;number_of_places?:number|null;start_date?:string|null;application_method?:string|null;application_url?:string|null;verification_status?:"pending"|"verified"|"rejected";cover_image_url?:string|null;organisation_id?:string;organisations?:RelatedName;sports?:RelatedName;}
function relatedName(value:RelatedName|undefined):string|undefined{return Array.isArray(value)?value[0]?.name:value?.name;}
function normaliseType(value:string):OpportunityType{const allowed:OpportunityType[]=["trial","academy","scholarship","scouting","sponsorship","coaching","event","development"];return allowed.includes(value as OpportunityType)?value as OpportunityType:"development";}
function mapRow(row:LiveRow):Opportunity{return{id:row.id,title:row.title,type:normaliseType(row.opportunity_type),sport:relatedName(row.sports)??"Multi-sport",discipline:row.discipline,positions:row.positions??[],organisation:relatedName(row.organisations)??"Verified organisation",organisationId:row.organisation_id,location:row.location??"To be confirmed",country:row.country??"South Africa",level:row.competition_level??"To be confirmed",summary:row.summary??"View details for requirements and application information.",description:row.description,eligibility:row.eligibility,closingDate:row.closing_date,compensationType:row.compensation_type,minimumAge:row.minimum_age,maximumAge:row.maximum_age,numberOfPlaces:row.number_of_places,startDate:row.start_date,applicationMethod:row.application_method,applicationUrl:row.application_url,imageUrl:row.cover_image_url??null,verificationStatus:row.verification_status??"pending",demo:false};}
const baseFields="id,title,opportunity_type,discipline,positions,location,country,competition_level,summary,description,eligibility,closing_date,compensation_type,minimum_age,maximum_age,number_of_places,start_date,application_method,application_url,verification_status,organisation_id,organisations(name),sports(name)";
const selectFields=baseFields+",cover_image_url";
/** Today's date (UTC, matching the database's current_date) as YYYY-MM-DD. */
export function todayIso():string{return new Date().toISOString().slice(0,10);}
/** True once a listing's closing date has passed. Listings without a closing date stay open. */
export function isClosed(opportunity:Pick<Opportunity,"closingDate">):boolean{return Boolean(opportunity.closingDate)&&String(opportunity.closingDate)<todayIso();}
/** Remove characters that have meaning in PostgREST filter syntax or LIKE patterns. */
export function sanitiseSearchTerm(value:string):string{return value.replace(/[^\p{L}\p{N}\s-]/gu," ").replace(/\s+/g," ").trim().slice(0,80);}
export interface FeedQuery{search?:string;type?:string;sport?:string;page?:number;pageSize?:number}
export interface FeedResult{opportunities:Opportunity[];demo:boolean;total:number;hasMore:boolean}
const DEFAULT_PAGE_SIZE=24;
function buildFeedQuery(client:NonNullable<typeof supabase>,fields:string,query:FeedQuery){
 const sportFilter=query.sport&&query.sport!=="all";
 const select=sportFilter?fields.replace("sports(name)","sports!inner(name)"):fields;
 let request=client.from("opportunities").select(select,{count:"exact"}).eq("status","published").eq("verification_status","verified").or("closing_date.is.null,closing_date.gte."+todayIso());
 if(query.type&&query.type!=="all")request=request.eq("opportunity_type",query.type);
 if(sportFilter)request=request.eq("sports.name",query.sport as string);
 const term=sanitiseSearchTerm(query.search??"");
 if(term){const pattern="*"+term.replace(/ /g,"*")+"*";request=request.or(["title","summary","location","discipline"].map(column=>column+".ilike."+pattern).join(","));}
 return request;
}
/** Server-side search, filtering and pagination for the public catalogue. Expired listings are never returned. */
export async function searchOpportunities(query:FeedQuery={}):Promise<FeedResult>{
 const pageSize=Math.min(Math.max(query.pageSize??DEFAULT_PAGE_SIZE,1),60);const page=Math.max(query.page??0,0);const from=page*pageSize;const to=from+pageSize-1;
 const filtered=Boolean(sanitiseSearchTerm(query.search??"")||(query.type&&query.type!=="all")||(query.sport&&query.sport!=="all"));
 if(!supabaseConfigured||!supabase)return{opportunities:sampleOpportunities,demo:true,total:sampleOpportunities.length,hasMore:false};
 try{
  const client=supabase;
  const run=(fields:string)=>buildFeedQuery(client,fields,query).order("created_at",{ascending:false}).order("id",{ascending:true}).range(from,to);
  const first=await run(selectFields);const result=first.error?await run(baseFields):first;
  if(result.error)return{opportunities:sampleOpportunities,demo:true,total:sampleOpportunities.length,hasMore:false};
  const rows=(result.data??[]) as unknown as LiveRow[];const total=result.count??rows.length;
  if(total===0&&!filtered)return{opportunities:sampleOpportunities,demo:true,total:sampleOpportunities.length,hasMore:false};
  return{opportunities:rows.map(mapRow),demo:false,total,hasMore:from+rows.length<total};
 }catch{return{opportunities:sampleOpportunities,demo:true,total:sampleOpportunities.length,hasMore:false};}
}
/** Active sports for the catalogue filter, independent of which listings are loaded. */
export async function loadSportNames():Promise<string[]>{
 if(!supabaseConfigured||!supabase)return[];
 try{const {data,error}=await supabase.from("sports").select("name").eq("is_active",true).order("name");if(error||!data)return[];return(data as {name:string}[]).map(row=>row.name);}catch{return[];}
}
/** Convenience for matching and recommendations: the newest open, verified listings. */
export async function loadOpportunityFeed():Promise<{opportunities:Opportunity[];demo:boolean}>{
 const result=await searchOpportunities({pageSize:60});return{opportunities:result.opportunities,demo:result.demo};
}
export async function loadOpportunityById(id:string):Promise<Opportunity|null>{
 const sample=sampleOpportunities.find(item=>item.id===id);if(sample)return sample;if(!supabaseConfigured||!supabase)return null;
 try{const first=await supabase.from("opportunities").select(selectFields).eq("id",id).eq("status","published").eq("verification_status","verified").maybeSingle();const {data,error}=first.error?await supabase.from("opportunities").select(baseFields).eq("id",id).eq("status","published").eq("verification_status","verified").maybeSingle():first;if(error||!data)return null;return mapRow(data as unknown as LiveRow);}catch{return null;}
}
