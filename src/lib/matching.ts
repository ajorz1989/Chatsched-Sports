import type {AthleteMatchProfile,MatchScore,Opportunity} from "./types";
/** Explainable deterministic v1 prioritisation, not a prediction of ability or guarantee of selection. */
export function scoreOpportunityMatch(athlete:AthleteMatchProfile,opportunity:Opportunity):MatchScore{
 let score=0;const reasons:string[]=[];
 if(athlete.sport.trim().toLowerCase()===opportunity.sport.trim().toLowerCase()){score+=40;reasons.push("Sport matches your profile");}
 if(athlete.position&&opportunity.positions?.some(p=>p.trim().toLowerCase()===athlete.position?.trim().toLowerCase())){score+=20;reasons.push("Position matches the listing");}
 if(athlete.location&&opportunity.location.toLowerCase().includes(athlete.location.trim().toLowerCase())){score+=15;reasons.push("Location may suit you");}
 if(athlete.level&&opportunity.level.toLowerCase().includes(athlete.level.trim().toLowerCase())){score+=15;reasons.push("Competition level looks relevant");}
 if((athlete.goals??[]).some(goal=>opportunity.type.toLowerCase().includes(goal.toLowerCase()))){score+=10;reasons.push("Opportunity type aligns with a stated goal");}
 return {score:Math.min(score,100),reasons};
}
