export type AccountType="athlete"|"club"|"scout"|"academy"|"coach"|"brand"|"sponsor"|"agent"|"event";
export type OpportunityType="trial"|"academy"|"scholarship"|"scouting"|"sponsorship"|"coaching"|"event"|"development";
export interface Opportunity{id:string;title:string;type:OpportunityType;sport:string;discipline?:string|null;positions?:string[];organisation:string;organisationId?:string;location:string;country:string;level:string;summary:string;closingDate?:string|null;compensationType?:string|null;verificationStatus:"pending"|"verified"|"rejected";demo:boolean;}
export interface AthleteMatchProfile{sport:string;position?:string;location?:string;level?:string;goals?:string[]}
export interface MatchScore{score:number;reasons:string[]}
