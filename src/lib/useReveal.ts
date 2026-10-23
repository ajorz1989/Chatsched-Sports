import {useEffect} from "react";
/** Adds .is-visible to .reveal elements as they enter the viewport. Disabled for reduced-motion users. */
export function useReveal(dep?:unknown){
 useEffect(()=>{
  const nodes=Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)"));
  if(!nodes.length)return;
  if(typeof IntersectionObserver==="undefined"||window.matchMedia("(prefers-reduced-motion: reduce)").matches){nodes.forEach(n=>n.classList.add("is-visible"));return;}
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-visible");io.unobserve(e.target);}});},{threshold:.12});
  nodes.forEach(n=>io.observe(n));const fallback=window.setTimeout(()=>nodes.forEach(n=>n.classList.add("is-visible")),2500);return()=>{io.disconnect();window.clearTimeout(fallback);};
 },[dep]);
}
