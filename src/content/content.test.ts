import {describe,expect,it} from "vitest";
import {guides} from "./guides";
import {locations,opportunityTypes,sports} from "./taxonomy";

const seededSports=["Football","Rugby","Cricket","Basketball","Athletics","Swimming","Netball","Hockey","Tennis","Boxing","Cycling","Golf","Esports","Other"];
const dbTypes=["trial","academy","scholarship","scouting","sponsorship","coaching","event","development"];
const unique=(values:string[])=>new Set(values).size===values.length;

describe("browse content",()=>{
 it("uses unique, url-safe slugs",()=>{
  for(const list of [sports.map(i=>i.slug),opportunityTypes.map(i=>i.slug),locations.map(i=>i.slug),guides.map(i=>i.slug)]){
   expect(unique(list)).toBe(true);
   expect(list.every(slug=>/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))).toBe(true);
  }
 });
 it("only references sport names that exist in the database seed",()=>{expect(sports.every(item=>seededSports.includes(item.name))).toBe(true);});
 it("covers every opportunity type in the database check constraint",()=>{expect(opportunityTypes.map(i=>i.value).sort()).toEqual([...dbTypes].sort());});
 it("gives every guide a dated, internally linked body",()=>{
  const slugs=guides.map(i=>i.slug);
  for(const guide of guides){
   expect(/^\d{4}-\d{2}-\d{2}$/.test(guide.published)&&/^\d{4}-\d{2}-\d{2}$/.test(guide.updated)).toBe(true);
   expect(guide.blocks.length>=3).toBe(true);
   for(const link of guide.related.filter(item=>item.to.startsWith("/guides/")))expect(slugs.includes(link.to.replace("/guides/",""))).toBe(true);
  }
 });
 it("points related links at real browse pages",()=>{
  const typeSlugs=opportunityTypes.map(i=>i.slug);
  for(const guide of guides)for(const link of guide.related.filter(item=>item.to.startsWith("/opportunity-types/")))expect(typeSlugs.includes(link.to.replace("/opportunity-types/",""))).toBe(true);
 });
});
