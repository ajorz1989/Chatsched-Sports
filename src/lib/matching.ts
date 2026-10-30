import type {AthleteMatchProfile,MatchCheck,MatchScore,MatchStrength,Opportunity} from "./types";
const norm=(value?:string|null)=>(value??"").trim().toLowerCase();
/** Listings use "To be confirmed" when a field was not supplied; that is missing data, not a value to compare. */
const known=(value?:string|null)=>{const v=norm(value);return v!==""&&v!=="to be confirmed"&&v!=="tbc"&&v!=="n/a";};
/** Explainable deterministic v1 prioritisation, not a prediction of ability or guarantee of selection. */
export function scoreOpportunityMatch(athlete:AthleteMatchProfile,opportunity:Opportunity):MatchScore{
 let score=0;const reasons:string[]=[];const checks:MatchCheck[]=[];
 const hasSport=Boolean(norm(athlete.sport));
 if(!hasSport)checks.push({key:"sport",label:"Sport",status:"missing",detail:"Choose your sport to compare."});
 else if(norm(athlete.sport)===norm(opportunity.sport)){score+=40;reasons.push("Sport matches your profile");checks.push({key:"sport",label:"Sport",status:"met",detail:opportunity.sport});}
 else checks.push({key:"sport",label:"Sport",status:"unmet",detail:"Listing is for "+opportunity.sport});
 const positions=opportunity.positions??[];
 if(!norm(athlete.position))checks.push({key:"position",label:"Position",status:"missing",detail:"Add your position to compare."});
 else if(!positions.length)checks.push({key:"position",label:"Position",status:"missing",detail:"The listing does not state positions."});
 else if(positions.some(p=>norm(p)===norm(athlete.position))){score+=20;reasons.push("Position matches the listing");checks.push({key:"position",label:"Position",status:"met",detail:positions.join(", ")});}
 else checks.push({key:"position",label:"Position",status:"unmet",detail:"Listing seeks "+positions.join(", ")});
 if(!norm(athlete.location))checks.push({key:"location",label:"Location",status:"missing",detail:"Add a preferred location to compare."});
 else if(!known(opportunity.location))checks.push({key:"location",label:"Location",status:"missing",detail:"The listing does not state a location."});
 else if(norm(opportunity.location).includes(norm(athlete.location))){score+=15;reasons.push("Location may suit you");checks.push({key:"location",label:"Location",status:"met",detail:opportunity.location});}
 else checks.push({key:"location",label:"Location",status:"unmet",detail:"Listing is in "+opportunity.location});
 if(!norm(athlete.level))checks.push({key:"level",label:"Competition level",status:"missing",detail:"Add your level to compare."});
 else if(!known(opportunity.level))checks.push({key:"level",label:"Competition level",status:"missing",detail:"The listing does not state a competition level."});
 else if(norm(opportunity.level).includes(norm(athlete.level))){score+=15;reasons.push("Competition level looks relevant");checks.push({key:"level",label:"Competition level",status:"met",detail:opportunity.level});}
 else checks.push({key:"level",label:"Competition level",status:"unmet",detail:"Listing level: "+opportunity.level});
 const goals=athlete.goals??[];
 if(!goals.length)checks.push({key:"goals",label:"Opportunity goal",status:"missing",detail:"Add a goal such as trial or scholarship."});
 else if(goals.some(goal=>norm(opportunity.type).includes(norm(goal)))){score+=10;reasons.push("Opportunity type aligns with a stated goal");checks.push({key:"goals",label:"Opportunity goal",status:"met",detail:"Listing type: "+opportunity.type});}
 else checks.push({key:"goals",label:"Opportunity goal",status:"unmet",detail:"Listing type: "+opportunity.type});
 const provided=checks.filter(c=>c.status!=="missing").length;
 const final=Math.min(score,100);
 const strength:MatchStrength=!hasSport||provided<3?"incomplete":final>=75?"strong":final>=50?"good":"partial";
 return {score:final,reasons,checks,strength};
}
export const strengthLabels:Record<MatchStrength,string>={strong:"Strong match",good:"Good match",partial:"Partial match",incomplete:"Incomplete data"};
