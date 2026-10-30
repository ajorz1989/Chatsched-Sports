import HeroAside from "../components/HeroAside";
import {ArrowRight,ArrowUpRight,CheckCircle2} from "lucide-react";
import {Link,useLocation,useParams} from "react-router-dom";
import "../styles-workspace.css";

type GuideSection={eyebrow:string;title:string;body:string;bullets:string[]};
type Guide={kicker:string;title:string;accent:string;intro:string;cta:string;secondary:string;sections:GuideSection[];principles:string[]};
const guides:Record<string,Guide>={
 about:{
  kicker:"OUR PURPOSE",title:"Sporting talent should not have to navigate opportunity alone.",accent:"",intro:"ChatSched Sport is building a connected, verification-led network that makes sporting pathways easier to discover, understand and pursue.",cta:"Explore opportunities",secondary:"Build your profile",
  sections:[
   {eyebrow:"01 / THE PROBLEM",title:"Too many pathways are disconnected.",body:"Information about trials, academies, scholarships, scouting and partnerships often sits in different places. Athletes need clearer requirements, and organisations need better ways to present a legitimate opportunity.",bullets:["Structured listings instead of vague announcements","Sports profiles that tell a fuller story","Clear next steps, dates and eligibility information"]},
   {eyebrow:"02 / THE NETWORK",title:"One journey, many relationships.",body:"The network is designed to bring athletes, clubs, academies, scouts, coaches, brands, sponsors, agents and events into one opportunity-led experience.",bullets:["Discover relevant pathways","Understand why a listing may fit","Build a professional portfolio and connect responsibly"]},
   {eyebrow:"03 / TRUST",title:"Opportunity needs accountability.",body:"Verification is a platform workflow, not a promise of sporting success. Listings remain restricted until the organisation and opportunity meet the platform's review requirements.",bullets:["Private athlete profiles by default","Explicit public profile controls","No promises of selection, contracts, scholarships or representation"]}
  ],
  principles:["Athlete-first product decisions","Transparent and explainable matching","Privacy and safeguarding before growth","A separate product from ChatSched advertising"]
 },
 how:{
  kicker:"HOW IT WORKS",title:"From potential to a pathway.",accent:"",intro:"A step-by-step experience that helps athletes build context, compare opportunities and track the work that follows.",cta:"Browse opportunities",secondary:"Create a profile",
  sections:[
   {eyebrow:"01 / BUILD",title:"Start with your sports story.",body:"Create a profile with your sport, position or discipline, level, availability, goals and experience. Add achievements and portfolio links to provide useful context.",bullets:["Choose whether your athlete profile is public or private","Add achievements and secure HTTPS media links","Keep your private account email out of the public directory"]},
   {eyebrow:"02 / DISCOVER",title:"Explore structured opportunities.",body:"Search trials, academies, scholarships, scouting, development, coaching, events and sponsorships. Listings are designed to state location, level, closing dates and requirements.",bullets:["Search by sport, location and opportunity type","Review each listing's details before applying","Treat sample listings as demonstrations, not real openings"]},
   {eyebrow:"03 / MATCH & CONNECT",title:"Understand possible fit.",body:"The current match explorer uses deterministic criteria and shows the reasons behind its score. It is a prioritisation aid, not a prediction of talent or likelihood of selection.",bullets:["Compare sport, position, location, level and goals","Save listings for later","Apply to verified live listings and follow status updates"]}
  ],
  principles:["Discover","Match","Develop","Connect","Represent","Grow"]
 },
 athletes:{
  kicker:"FOR ATHLETES",title:"Make your sporting story easier to understand.",accent:"",intro:"Bring your profile, experience, goals and opportunity applications into one space—while keeping control of what you share.",cta:"Create your sports profile",secondary:"Explore opportunities",
  sections:[
   {eyebrow:"YOUR DIGITAL SPORTS CV",title:"Show more than a name and a position.",body:"Build a profile with your primary sport, discipline, position, competition level, location, goals, achievements and links to your portfolio.",bullets:["Profiles start private until you choose otherwise","Add awards, qualifications and experience","Choose which portfolio links are shown publicly"]},
   {eyebrow:"YOUR OPPORTUNITY FEED",title:"Search with purpose.",body:"Compare available verified listings, keep a shortlist and submit an application when you meet the stated requirements.",bullets:["Search and filter by sport and opportunity type","Use explainable match reasons as a guide","Track application status in your workspace"]},
   {eyebrow:"YOUR SAFETY",title:"Stay in control.",body:"A listing or a message is not proof of a contract, scholarship or selection. Check the organisation independently before sharing sensitive details or paying any fee.",bullets:["Never pay an unverified person for guaranteed selection","Use private profile visibility until comfortable sharing","Contact members respectfully and professionally"]}
  ],
  principles:["Your profile, your visibility","Your experience, your story","Your application status in one place","No guaranteed sporting outcomes"]
 },
 organisations:{
  kicker:"FOR CLUBS & ORGANISATIONS",title:"Present better opportunities. Meet relevant applicants.",accent:"",intro:"Give athletes clear requirements and give your team a structured way to publish listings, review applications and communicate professionally.",cta:"Create an organisation account",secondary:"See the opportunity catalogue",
  sections:[
   {eyebrow:"01 / ORGANISATION PROFILE",title:"Build a credible presence.",body:"Create a profile for a club, academy, scout, coach, brand, sponsor, agent or event. New organisation profiles start unverified and must pass review before public promotion.",bullets:["Add your identity, location, website and description","Keep details current and consistent","Verification is controlled by platform administrators"]},
   {eyebrow:"02 / PUBLISH",title:"Describe the opportunity clearly.",body:"Draft trials, academy intakes, scholarships, scouting, development programmes, coaching, events and partnerships. Include the eligibility, level, timing and expected next steps.",bullets:["Draft listings remain private until approved","Both the listing and organisation must be verified for public visibility","Publish only genuine, current opportunities you are authorised to represent"]},
   {eyebrow:"03 / REVIEW",title:"Manage applications in one workspace.",body:"Review applicant profile details relevant to your opportunity and update application status. Applicant private contact details are not exposed by the public directory view.",bullets:["Track submitted, reviewing, shortlisted, declined and accepted statuses","Message discoverable applicants respectfully","Moderation actions and status changes should be accountable"]}
  ],
  principles:["Legitimate listings only","Clear eligibility and deadlines","No pay-for-selection claims","Respect applicant privacy"]
 },
 partners:{
  kicker:"FOR BRANDS & PARTNERS",title:"Build partnerships around sporting fit.",accent:"",intro:"A future-facing pathway for brands and sponsors to discover athlete stories, programmes, events and partnerships with clearer context.",cta:"Join the network",secondary:"Explore how it works",
  sections:[
   {eyebrow:"01 / CONTEXT",title:"Partnerships need more than reach.",body:"Sporting relationships can be shaped by discipline, audience, values, geography, events and goals. ChatSched Sport is designed to organise that context so opportunities are easier to evaluate.",bullets:["Structured sponsorship and collaboration briefs","Athlete profiles with explicit visibility choices","Clear deliverables and eligibility on future partnership listings"]},
   {eyebrow:"02 / RESPONSIBLE DISCOVERY",title:"Treat athletes as people, not inventory.",body:"Profiles and listings should be used for relevant, respectful professional purposes. Public visibility is not blanket consent to scrape, redistribute or misuse information.",bullets:["Contact only for genuine sporting or commercial purposes","Do not promise funding or contracts without authority","Keep expectations and selection criteria transparent"]},
   {eyebrow:"03 / BUILDING THE MARKETPLACE",title:"A phased, trust-led rollout.",body:"The current foundation focuses on profiles, verified organisations and opportunities. Commercial campaign management, payments and marketplace features require further product, legal and operational design.",bullets:["Validate partner needs before fixing commercial pricing","Verify counterparties and campaign terms","No claim of a completed commercial marketplace yet"]}
  ],
  principles:["Relevance over noise","Clear terms and deliverables","Privacy-respecting discovery","Trust before transactions"]
 },
 safeguarding:{
  kicker:"TRUST & SAFEGUARDING",title:"A sporting opportunity should never require blind trust.",accent:"",intro:"ChatSched Sport is being designed around privacy, verification, clear expectations and safer communication. These protections must be complete before broad public launch.",cta:"Explore opportunities",secondary:"Read the privacy overview",
  sections:[
   {eyebrow:"PRIVACY FIRST",title:"You control public profile visibility.",body:"New athlete profiles default to private. Athletes can explicitly choose to make their profile public. Public directory views omit account email and private login details.",bullets:["Share only the information needed for a sporting purpose","Use HTTPS links for portfolio media","Keep private profiles private until you choose otherwise"]},
   {eyebrow:"VERIFY BEFORE YOU TRUST",title:"Verification is a gate, not a guarantee.",body:"Only published opportunities that pass platform verification should appear in the public catalogue. A verification badge does not guarantee selection, safe conduct outside the platform or future performance.",bullets:["Confirm details with the official organisation","Ask for clear requirements, dates and costs","Do not pay anyone who promises a guaranteed contract or selection"]},
   {eyebrow:"YOUNG ATHLETES",title:"Safeguarding must come before onboarding minors.",body:"The initial registration flow is designed for adults and currently relies on an age self-confirmation in the interface. This is not independent age verification. A properly safeguarded, guardian-assisted pathway and server-side eligibility controls must be designed and reviewed before minors are onboarded.",bullets:["No unsupervised minor onboarding through the initial release","Guardian involvement and appropriate safeguarding review are prerequisites","Product and legal review are required before any youth pathway launches"]},
   {eyebrow:"REPORTING & ACCOUNTABILITY",title:"Use the network professionally.",body:"Do not impersonate an organisation, harass athletes, misuse profile information or publish listings without authority. Members can submit a private report from a listing or public athlete profile when the Sport database is configured. Before launch, the team must assign and monitor a clear response process for submitted reports.",bullets:["Keep conversations relevant and respectful","Do not post another person's sensitive details","Treat suspicious requests seriously and avoid sending money"]}
  ],
  principles:["Privacy by default","Verification before public listings","Adult-first initial registration","Safeguarding review before youth onboarding"]
 },
 privacy:{
  kicker:"PRIVACY OVERVIEW",title:"Your sporting profile is not your private inbox.",accent:"",intro:"This page describes the current product's privacy design in plain language. A complete, jurisdiction-reviewed privacy notice and operational contact process must be finalised before public launch.",cta:"Manage your profile",secondary:"Trust & safeguarding",
  sections:[
   {eyebrow:"WHAT THE PRODUCT USES",title:"Information needed to run the network.",body:"Depending on your use of the configured service, this may include login email, display name, self-declared account type, sports profile fields, achievements, media links, applications, saved opportunities, conversations and notifications.",bullets:["Authentication is handled by the configured Supabase project","Applications and messages are restricted by database policies","The public directory uses allow-listed profile fields rather than account email"]},
   {eyebrow:"PUBLIC VISIBILITY",title:"Athletes decide whether to be discoverable.",body:"Athlete profiles default to private. A public profile can appear in the athlete directory with selected sporting fields. This does not make login email or private messages public.",bullets:["Review your profile visibility before publishing","Only add media links you have permission to share","Remove portfolio links that are no longer appropriate"]},
   {eyebrow:"DATA CONTROL",title:"Access is restricted by account and role.",body:"The current implementation uses row-level security, ownership policies and explicit database grants. These are an initial technical foundation and still require review and testing in the actual Sport project before production.",bullets:["Members can update permitted fields on their own profile","Applications are accessible to the applicant and the relevant organisation owner","Messages are visible only to conversation participants"]}
  ],
  principles:["Private by default","No public account email in directory views","Access control enforced in database policies","Full privacy notice and launch review still required"]
 },
 terms:{
  kicker:"PLATFORM PRINCIPLES",title:"A professional network depends on honest participation.",accent:"",intro:"These are the core intended rules for using ChatSched Sport. Full terms, liability provisions and local legal review must be completed before the platform is publicly launched.",cta:"Join the network",secondary:"Trust & safeguarding",
  sections:[
   {eyebrow:"AUTHENTIC INFORMATION",title:"Represent yourself and your organisation accurately.",body:"Do not impersonate an athlete, club, academy, scout, sponsor or agent. Publish opportunities only where you have authority, and keep information accurate and current.",bullets:["No fabricated trials, scholarships, sponsorships or job openings","No misleading performance or qualification claims","Respect trademarks, photos and media rights"]},
   {eyebrow:"NO GUARANTEED OUTCOMES",title:"Matching is a guide, not a promise.",body:"Match scores reflect visible, deterministic overlap between stated criteria. They are not an evaluation of human worth or a probability of selection. The platform does not guarantee trials, contracts, scholarships, sponsorships or representation.",bullets:["Read the listing's actual eligibility requirements","Confirm material terms with the organisation","A submitted application is not an acceptance"]},
   {eyebrow:"FAIR PARTICIPATION",title:"Keep communications relevant and respectful.",body:"Do not harass, exploit, scrape, spam or misuse profile information. Do not solicit money in exchange for guaranteed selection, or present unverified listings as official.",bullets:["Respect profile visibility and consent","Do not share another person's private details","Follow platform moderation requirements as they are finalised"]}
  ],
  principles:["Accuracy","Respect","Privacy","No fraudulent or guaranteed-selection offers"]
 }
};
const fallback:Guide={kicker:"THE SPORTS OPPORTUNITY NETWORK",title:"Find your next sporting pathway.",accent:"",intro:"Discover, match, develop, connect and grow within a network built around sporting opportunity.",cta:"Explore opportunities",secondary:"Learn how it works",sections:[],principles:[]};
export default function AudiencePage(){
 const {slug:routeSlug}=useParams();const location=useLocation();const slug=routeSlug??location.pathname.split("/").filter(Boolean).at(-1)??"";const aliases:Record<string,string>={"how-it-works":"how","for-athletes":"athletes","for-organisations":"organisations","for-partners":"partners"};const guide=guides[aliases[slug]??slug]??fallback;
 const primary=guide.cta==="Explore opportunities"?"/opportunities":guide.cta==="Manage your profile"?"/workspace":(slug==="for-organisations"||slug==="organisations")?"/join?role=club":(slug==="for-partners"||slug==="partners")?"/join?role=brand":"/join";
 const secondary=guide.secondary==="Trust & safeguarding"?"/safeguarding":guide.secondary==="Read the privacy overview"?"/privacy":guide.secondary==="Learn how it works"?"/how-it-works":"/workspace";
 const orgPage=slug==="for-organisations"||slug==="organisations";const partnerPage=slug==="for-partners"||slug==="partners";const joinTo=orgPage?"/join?role=club":partnerPage?"/join?role=brand":"/join";const joinLabel=orgPage?"Set up your organisation":partnerPage?"Join as a brand or sponsor":"Create your profile";
 return <section className="audience-page">
  <div className="catalogue-hero"><div className="catalogue-hero-copy"><div className="eyebrow"><span className="status-dot"/> {guide.kicker}</div><h1>{guide.title}{guide.accent&&<><br/><span>{guide.accent}</span></>}</h1><p>{guide.intro}</p><div className="catalogue-hero-ctas"><Link className="button button-accent" to={primary}>{guide.cta} <ArrowRight size={16}/></Link><Link className="button button-light-outline" to={secondary}>{guide.secondary} <ArrowUpRight size={16}/></Link></div></div><HeroAside kind="journey"/></div>
  <div className="audience-content section-pad">
   {guide.sections.map((section,i)=><article className="audience-section" key={section.eyebrow}><div className="audience-section-marker"><span>{String(i+1).padStart(2,"0")}</span><span className="audience-marker-line"/></div><div className="audience-section-copy"><div className="section-kicker">{section.eyebrow}</div><h2>{section.title}</h2><p>{section.body}</p><div className="audience-bullets">{section.bullets.map(bullet=><span key={bullet}><CheckCircle2 size={16}/>{bullet}</span>)}</div></div></article>)}
   <div className="audience-principles"><div className="section-kicker">THE PRINCIPLES</div><div className="audience-principle-grid">{guide.principles.map((principle,i)=><div key={principle}><span>{String(i+1).padStart(2,"0")}</span><strong>{principle}</strong></div>)}</div></div>
   <div className="audience-bottom-cta"><div><div className="section-kicker">READY FOR YOUR NEXT STEP?</div><h2>Make opportunity easier to navigate.</h2><p>Start with a clear profile, explore the network and review each opportunity carefully.</p></div><div className="audience-bottom-actions"><Link className="button button-accent" to={joinTo}>{joinLabel} <ArrowRight size={16}/></Link><Link className="button button-light-outline-dark" to="/opportunities">Explore opportunities <ArrowUpRight size={16}/></Link></div></div>
  </div>
 </section>;
}
