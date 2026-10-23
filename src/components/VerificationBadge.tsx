import {BadgeCheck,Clock3,FlaskConical,ShieldCheck,ShieldQuestion} from "lucide-react";
export type VerificationLevel="example"|"unverified"|"pending"|"verified"|"professional"|"official";
const config:Record<VerificationLevel,{label:string;hint:string;Icon:typeof ShieldCheck}>={
 example:{label:"Example",hint:"Illustrative sample, not a real listing",Icon:FlaskConical},
 unverified:{label:"Unverified",hint:"Not yet reviewed by ChatSched Sport",Icon:ShieldQuestion},
 pending:{label:"Pending review",hint:"Verification evidence is being reviewed",Icon:Clock3},
 verified:{label:"Verified",hint:"Passed ChatSched Sport verification",Icon:ShieldCheck},
 professional:{label:"Professional",hint:"Verified professional or registered body",Icon:BadgeCheck},
 official:{label:"Official",hint:"Confirmed official affiliation",Icon:BadgeCheck}
};
/** Maps stored listing status to a badge level. Never upgrades a status. */
export function levelFromStatus(status:string|undefined|null,demo?:boolean):VerificationLevel{
 if(demo)return "example";
 if(status==="verified"||status==="professional"||status==="official"||status==="pending")return status;
 return "unverified";
}
export default function VerificationBadge({level,compact=false}:{level:VerificationLevel;compact?:boolean}){
 const {label,hint,Icon}=config[level];
 return <span className={"vbadge vbadge-"+level+(compact?" vbadge-compact":"")} title={hint}><Icon size={compact?12:13} aria-hidden="true"/><span>{label}</span><span className="sr-only"> — {hint}</span></span>;
}
