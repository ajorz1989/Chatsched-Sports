import type {ReactNode} from "react";
import {Activity,Bike,Dumbbell,Flag,Footprints,Medal,Timer,Trophy,PersonStanding} from "lucide-react";

/**
 * Custom sport glyphs. Drawn on a 24x24 grid, 1.75 stroke, round caps/joins,
 * currentColor — they match the lucide set used elsewhere and inherit text colour.
 */
const glyphs:Record<string,ReactNode>={
 football:<><circle cx="12" cy="12" r="9"/><path d="M12 8.2l3.5 2.5-1.3 4.1H9.8l-1.3-4.1z"/><path d="M12 8.2V3M15.5 10.7l4.6-1.5M14.2 14.8l2.9 4.1M9.8 14.8l-2.9 4.1M8.5 10.7L3.9 9.2"/></>,
 rugby:<><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-35 12 12)"/><path d="M7.1 15.4l9.8-6.8"/><path d="M9.5 11.8l1.8 2.6M11.1 10.6l1.8 2.6M12.7 9.4l1.8 2.6" strokeWidth="1.4"/></>,
 cricket:<><g transform="rotate(38 12 12)"><rect x="9.2" y="7.5" width="5.6" height="14" rx="1.6"/><path d="M12 7.5V2.2M9.2 11.5h5.6"/></g><circle cx="18.8" cy="18.4" r="2.7"/><path d="M17.3 17l3 2.8" strokeWidth="1.4"/></>,
 netball:<><ellipse cx="12" cy="5" rx="4.5" ry="1.8"/><path d="M7.7 5.6l1.8 5.2h5l1.8-5.2M10.2 10.8l.6-4.6M13.8 10.8l-.6-4.6"/><path d="M12 10.8V21M8 21h8"/></>,
 athletics:<><circle cx="15.6" cy="4.6" r="1.9"/><path d="M14.2 8.4l-2.6 4.9M11.6 13.3l-4 2.3-2.4-1.2M11.6 13.3l3.2 2.6-1.2 4.5M14.2 8.5l3.8 2.1 1.6-1.4M13.6 9.2L9.8 9.2 8.4 11.6"/></>,
 swimming:<><circle cx="16.2" cy="6.4" r="1.8"/><path d="M4.5 12.8l5.7-4 3.6 2.6 4.7.1"/><path d="M3 16.4c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2M3 20c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/></>,
 basketball:<><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.4 5.6C9 8.8 9 15.2 5.4 18.4M18.6 5.6C15 8.8 15 15.2 18.6 18.4"/></>,
 boxing:<><path d="M8 9c0-2.4 1.9-4 4.2-4h2.6c2.5 0 4.2 1.9 4.2 4.4V13c0 2.8-2 5-4.8 5H10.5C8.8 18 8 16.9 8 15.4z"/><path d="M8 11.4c-1.9 0-3 1-3 2.4s1.1 2.3 3 2.3"/><path d="M12.4 5v4.2h6.6M9.6 18v3h8.6v-3"/></>,
 esports:<><path d="M7 8h10a4 4 0 0 1 3.9 3.1l1 4.6a2.6 2.6 0 0 1-4.4 2.3L15.8 16H8.2L6.5 18a2.6 2.6 0 0 1-4.4-2.3l1-4.6A4 4 0 0 1 7 8z"/><path d="M8 10.4v3.2M6.4 12h3.2"/><circle cx="15.6" cy="11" r=".7" fill="currentColor"/><circle cx="17.6" cy="13" r=".7" fill="currentColor"/></>
};
glyphs.soccer=glyphs.football;
glyphs.mma=glyphs.boxing;

const fallback:Record<string,typeof Activity>={volleyball:Activity,running:Footprints,"track and field":Timer,cycling:Bike,golf:Flag,hockey:Trophy,tennis:Medal,gym:Dumbbell,fitness:Dumbbell,"multi-sport":PersonStanding};

export default function SportIcon({sport,size=16}:{sport?:string|null;size?:number}){
 const key=(sport??"").trim().toLowerCase();
 const glyph=glyphs[key];
 if(glyph)return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{glyph}</svg>;
 const Icon=fallback[key]??Activity;
 return <Icon size={size} aria-hidden="true"/>;
}
