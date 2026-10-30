import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";

const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendKey=Deno.env.get("RESEND_API_KEY")!;
const fromEmail=Deno.env.get("SPORT_EMAIL_FROM")??"ChatSched Sport <notifications@chatsched.com>";
const siteUrl=Deno.env.get("SPORT_SITE_URL")??"https://chatsched.com";
const admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false}});

function escapeHtml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
function htmlFor(title:string,body:string,targetPath?:string){
 const link=targetPath?siteUrl+targetPath:siteUrl+"/workspace";
 return "<!doctype html><html><body style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111\"><div style=\"max-width:640px;margin:0 auto;padding:32px\"><p style=\"font-size:12px;letter-spacing:.12em;text-transform:uppercase\">ChatSched Sport</p><h1 style=\"font-size:28px\">"+escapeHtml(title)+"</h1><p>"+escapeHtml(body).replaceAll("\n","<br>")+"</p><p><a href=\""+link+"\" style=\"display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none\">Open your workspace</a></p></div></body></html>";
}
async function sendOne(row:any){
 const payload=row.payload??{};
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromEmail,to:[payload.email],subject:row.subject,html:htmlFor(payload.title??row.subject,payload.body??"",payload.target_path)})});
 if(!response.ok)throw new Error(await response.text());
}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function main(req:Request){
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 // Only the scheduler (holding the service key) may drive the queue. The gateway alone is not enough:
 // the public anon key is also a valid JWT, so without this check anyone could trigger digests and sends.
 const bearer=(req.headers.get("Authorization")??"").replace(/^Bearer\s+/i,"");
 if(!bearer||!safeEqual(bearer,serviceKey))return new Response("Unauthorized",{status:401});
 if(!resendKey)return Response.json({error:"RESEND_API_KEY is not configured"},{status:503});
 const body=await req.json().catch(()=>({}));
 const mode=body.mode??"queue";
 if(mode==="digest"){
   const {data:users,error}=await admin.from("email_preferences").select("user_id").eq("weekly_digest",true);
   if(error)throw error;
   let queued=0;
   const today=new Date().toISOString().slice(0,10);
   const {data:opportunities}=await admin.from("opportunities").select("id,title,summary,closing_date").eq("status","published").eq("verification_status","verified").or("closing_date.is.null,closing_date.gte."+today).order("created_at",{ascending:false}).limit(5);
   const lines=(opportunities??[]).map((x:any)=>"- "+x.title+(x.closing_date?" — closes "+x.closing_date:"")).join("\n");
   const sixDaysAgo=new Date(Date.now()-6*24*3600*1000).toISOString();
   for(const pref of users??[]){
     const {data:profile}=await admin.from("profiles").select("email,display_name").eq("id",pref.user_id).maybeSingle();
     if(!profile?.email)continue;
     const {data:recent}=await admin.from("email_queue").select("id").eq("user_id",pref.user_id).eq("template_key","weekly_digest").gte("created_at",sixDaysAgo).limit(1);
     if(recent?.length)continue;
     await admin.from("email_queue").insert({user_id:pref.user_id,template_key:"weekly_digest",subject:"Your ChatSched Sport weekly digest",payload:{email:profile.email,title:"Your weekly sports opportunities",body:lines||"No new verified opportunities were found this week.",target_path:"/opportunities"}});
     queued++;
   }
   return Response.json({queued});
 }
 const {data:rows,error}=await admin.from("email_queue").select("id,user_id,subject,payload,attempts").eq("status","queued").lte("scheduled_for",new Date().toISOString()).order("created_at",{ascending:true}).limit(50);
 if(error)throw error;
 let sent=0,failed=0;
 for(const row of rows??[]){
   try{
     await sendOne(row);
     await admin.from("email_queue").update({status:"sent",sent_at:new Date().toISOString(),attempts:(row.attempts??0)+1}).eq("id",row.id);
     sent++;
   }catch(error){
     failed++;
     await admin.from("email_queue").update({status:(row.attempts??0)>=2?"failed":"queued",attempts:(row.attempts??0)+1,last_error:error instanceof Error?error.message:String(error)}).eq("id",row.id);
   }
 }
 return Response.json({sent,failed,processed:rows?.length??0});
}
Deno.serve(req=>main(req).catch(error=>Response.json({error:error instanceof Error?error.message:String(error)},{status:500})));