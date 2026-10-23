import {useEffect,useState} from "react";
import {Clock3,ShieldCheck} from "lucide-react";
import {supabase} from "../lib/supabase";

type Props={applicationId:string};
type EventRow={id:string;from_status:string|null;to_status:string;note:string|null;created_at:string};

const labels:Record<string,string>={
 submitted:"Submitted",reviewing:"Reviewing",shortlisted:"Shortlisted",accepted:"Accepted",
 declined:"Declined",rejected:"Rejected",withdrawn:"Withdrawn"
};

export default function ApplicationStatusTimeline({applicationId}:Props){
 const [events,setEvents]=useState<EventRow[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  if(!supabase||!applicationId)return;
  let alive=true;
  (async()=>{
   const {data}=await supabase.from("opportunity_application_events")
    .select("id,from_status,to_status,note,created_at")
    .eq("application_id",applicationId)
    .order("created_at",{ascending:true});
   if(alive)setEvents((data??[]) as EventRow[]);
   if(alive)setLoading(false);
  })();
  return()=>{alive=false;};
 },[applicationId]);

 if(loading)return <div className="workspace-muted">Loading application history…</div>;
 if(!events.length)return <div className="workspace-muted">No status history is available yet.</div>;

 return <div className="application-timeline" aria-label="Application status history">
  {events.map(event=><div className="application-timeline-item" key={event.id}>
   <span className="application-timeline-dot"><ShieldCheck size={13}/></span>
   <div>
    <strong>{labels[event.to_status]??event.to_status.replaceAll("_"," ")}</strong>
    {event.from_status&&<small>from {labels[event.from_status]??event.from_status.replaceAll("_"," ")}</small>}
    {event.note&&<p>{event.note}</p>}
    <small><Clock3 size={12}/> {new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(event.created_at))}</small>
   </div>
  </div>)}
 </div>;
}
