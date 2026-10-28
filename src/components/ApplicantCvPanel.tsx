import {FileText,LockKeyhole} from "lucide-react";
type Row=Record<string,unknown>;
export interface ApplicationSnapshot{cv_shared?:boolean;cv_url?:string|null;cv_profile?:{self_reported?:boolean;achievements?:Row[];statistics?:Row[];experience?:Row[]}|null}
const text=(value:unknown)=>typeof value==="string"||typeof value==="number"?String(value):"";
/**
 * Shows what an applicant explicitly chose to share when they applied. Nothing here is read from the
 * athlete's private profile: it is the consent-bound snapshot stored on the application itself.
 */
export default function ApplicantCvPanel({consent,snapshot}:{consent:boolean;snapshot:ApplicationSnapshot|null|undefined}){
 if(!consent||!snapshot?.cv_shared)return <p className="applicant-cv-note"><LockKeyhole size={13}/> The applicant has not shared a CV with this application.</p>;
 const cv=snapshot.cv_profile;const link=typeof snapshot.cv_url==="string"&&/^https:\/\//i.test(snapshot.cv_url)?snapshot.cv_url:null;
 const achievements=cv?.achievements??[];const statistics=cv?.statistics??[];const experience=cv?.experience??[];
 return <details className="applicant-cv-panel"><summary><FileText size={14}/> Shared CV and sports record <small>(shared with the applicant's consent)</small></summary>
  {link&&<p><a href={link} target="_blank" rel="noreferrer noopener">Open the applicant's CV document</a></p>}
  {achievements.length>0&&<div><strong>Achievements</strong><ul>{achievements.map((item,index)=><li key={index}>{[text(item.title),text(item.organisation_name),text(item.achievement_date).slice(0,4)].filter(Boolean).join(" · ")}</li>)}</ul></div>}
  {experience.length>0&&<div><strong>Playing history</strong><ul>{experience.map((item,index)=><li key={index}>{[text(item.role_title),text(item.organisation_name),text(item.competition_level)].filter(Boolean).join(" · ")}</li>)}</ul></div>}
  {statistics.length>0&&<div><strong>Statistics</strong><ul>{statistics.map((item,index)=><li key={index}>{text(item.metric_name)}: {text(item.metric_value)}{item.metric_unit?" "+text(item.metric_unit):""}{item.season?" ("+text(item.season)+")":""}</li>)}</ul></div>}
  <small className="applicant-cv-disclaimer">Self-reported by the athlete and not independently verified by ChatSched Sport. Use only for assessing this application.</small>
 </details>;
}
