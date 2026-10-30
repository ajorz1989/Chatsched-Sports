// Cookie / storage consent. Essential storage (sign-in session) needs no consent.
// Optional analytics must only start when analyticsAllowed() is true.
// Reads and writes are wrapped because storage can be blocked (private windows, strict settings).
import {useEffect,useState} from "react";

export const CONSENT_VERSION="2026-10";
const KEY="chatsched-sport-consent";
const EVENT="chatsched-sport-consent-change";

export type ConsentRecord={version:string;decidedAt:string;analytics:boolean};

export function getConsent():ConsentRecord|null{
 try{
  const raw=window.localStorage.getItem(KEY);
  if(!raw)return null;
  const value=JSON.parse(raw) as Partial<ConsentRecord>;
  // A newer consent version means the choice must be asked again.
  if(value.version!==CONSENT_VERSION||typeof value.analytics!=="boolean"||typeof value.decidedAt!=="string")return null;
  return {version:value.version,decidedAt:value.decidedAt,analytics:value.analytics};
 }catch{return null;}
}

export function setConsent(analytics:boolean):ConsentRecord{
 const record:ConsentRecord={version:CONSENT_VERSION,decidedAt:new Date().toISOString(),analytics};
 try{window.localStorage.setItem(KEY,JSON.stringify(record));}catch{/* the choice still applies for this page view */}
 memory=record;
 window.dispatchEvent(new Event(EVENT));
 return record;
}

export function resetConsent():void{
 try{window.localStorage.removeItem(KEY);}catch{/* ignore */}
 memory=null;
 window.dispatchEvent(new Event(EVENT));
}

let memory:ConsentRecord|null=null;
export function analyticsAllowed():boolean{return (memory??getConsent())?.analytics===true;}

export function useConsent():ConsentRecord|null{
 const [value,setValue]=useState<ConsentRecord|null>(()=>memory??getConsent());
 useEffect(()=>{
  const update=()=>setValue(memory??getConsent());
  window.addEventListener(EVENT,update);
  window.addEventListener("storage",update);
  return()=>{window.removeEventListener(EVENT,update);window.removeEventListener("storage",update);};
 },[]);
 return value;
}
