import {describe,expect,it} from "vitest";
import {faqItems,filterFaq,faqJsonLd} from "./faq";

describe("faq",()=>{
 it("returns everything for an empty query",()=>{expect(filterFaq(faqItems,"  ")).toHaveLength(faqItems.length);});
 it("requires every search term to match",()=>{
  const result=filterFaq(faqItems,"profile private");
  expect(result.length).toBeGreaterThan(0);
  expect(result.every(item=>(item.question+item.answer+item.category).toLowerCase().includes("private"))).toBe(true);
 });
 it("returns nothing when no entry matches",()=>{expect(filterFaq(faqItems,"zzzzqqq")).toHaveLength(0);});
 it("builds valid FAQPage JSON-LD that cannot close a script tag",()=>{
  const json=faqJsonLd([{category:"x",question:"Is <b>this</b> safe?",answer:"</script><script>alert(1)</script>"}]);
  expect(json.includes("</script>")).toBe(false);
  const parsed=JSON.parse(json);
  expect(parsed["@type"]).toBe("FAQPage");
  expect(parsed.mainEntity[0].acceptedAnswer.text).toBe("</script><script>alert(1)</script>");
 });
});
