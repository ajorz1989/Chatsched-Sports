// Evergreen guides. General information only, not legal, financial or medical advice.
export type GuideBlock={heading:string;paragraphs?:string[];list?:string[]};
export type Guide={slug:string;title:string;description:string;category:string;readMinutes:number;published:string;updated:string;intro:string;blocks:GuideBlock[];related:{label:string;to:string}[]};

export const guides:Guide[]=[
 {slug:"how-sports-trials-work",title:"How sports trials work",description:"What happens before, during and after a sports trial, and how to judge whether a trial is genuine.",category:"Trials",readMinutes:5,published:"2026-10-30",updated:"2026-10-30",
  intro:"A trial is a chance for an organisation to see you play or compete before offering a place. Formats differ by sport and by club, but most follow the same pattern.",
  blocks:[
   {heading:"Before the trial",paragraphs:["Read the listing carefully and check that you meet the age range, level and position or event requirements. Confirm the organisation is real and, where possible, verified on the platform."],list:["Note the date, venue, start time and what to bring","Check any fee and what it covers, in writing","Ask who will be assessing and how results are shared","Tell someone you trust where you are going"]},
   {heading:"On the day",paragraphs:["Arrive early, warm up properly and bring your own water, kit and any documents the organisation asked for. Evaluators usually look at technical ability, decision-making, fitness and attitude, not only goals or times."],list:["Follow coaching instructions closely","Communicate and support teammates","Stay composed after mistakes"]},
   {heading:"After the trial",paragraphs:["Ask when you can expect an answer. If you are not selected, request feedback politely. Many athletes attend several trials before being offered a place, so treat each one as experience."]},
   {heading:"Signs of a genuine trial",list:["A named organisation with a way to contact it","Clear dates, venue and requirements","Fees, if any, that are explained and reasonable","No promise of guaranteed selection"]}
  ],
  related:[{label:"How to spot a fake sports opportunity",to:"/guides/how-to-spot-a-fake-sports-opportunity"},{label:"Browse trials",to:"/opportunity-types/trials"},{label:"How to prepare for a trial day",to:"/guides/how-to-prepare-for-a-trial-day"}]},

 {slug:"how-to-prepare-for-a-trial-day",title:"How to prepare for a trial day",description:"A practical checklist for preparing your body, kit, paperwork and mindset before a sports trial.",category:"Trials",readMinutes:4,published:"2026-10-30",updated:"2026-10-30",
  intro:"Good preparation lets you focus on performing. Use this checklist in the week before your trial.",
  blocks:[
   {heading:"The week before",list:["Keep training consistent and avoid heavy new workloads","Prioritise sleep, food and hydration","Confirm travel, timing and a backup plan","Pack your bag the night before"]},
   {heading:"What to bring",list:["Playing kit, spare kit and the right footwear","Water and a light snack","Identification and any forms the organisation asked for","Your profile or CV summary on your phone or printed","A charged phone for emergencies"]},
   {heading:"Look after your health",paragraphs:["If you have an injury, illness or medical condition that could affect your safety, tell the organisers and speak to a medical professional first. Do not play through an injury to impress."]},
   {heading:"Mindset",paragraphs:["Nerves are normal. Focus on what you can control: effort, communication and learning. Decide in advance how you will respond to a mistake so it does not affect the next action."]}
  ],
  related:[{label:"How sports trials work",to:"/guides/how-sports-trials-work"},{label:"How to build a sports CV",to:"/guides/how-to-build-a-sports-cv"},{label:"Browse opportunities",to:"/opportunities"}]},

 {slug:"how-to-build-a-sports-cv",title:"How to build a sports CV",description:"What to include in an athlete profile so clubs, academies and scouts can understand your level quickly.",category:"Profiles",readMinutes:5,published:"2026-10-30",updated:"2026-10-30",
  intro:"A sports CV tells recruiters who you are, what you do and what you have achieved. The goal is clarity: someone should understand your level in under a minute.",
  blocks:[
   {heading:"Start with the essentials",list:["Sport, position or event, and preferred alternatives","Location and availability","Current and previous clubs or teams","Level of competition"]},
   {heading:"Show evidence, not adjectives",paragraphs:["Replace general claims with facts: league, season, appearances, personal bests, rankings and awards. Add dates so readers can see recent form. Where you can, ask a coach or club to confirm key achievements."]},
   {heading:"Add media carefully",paragraphs:["Short highlight clips that show your key skills help. Only share media you have permission to use, and avoid including other people's private details."]},
   {heading:"State your goals",paragraphs:["Say what you are looking for, such as a trial, a scholarship or a development programme, and where you are willing to travel. This helps matching and saves everyone time."]},
   {heading:"Keep it current and private where needed",paragraphs:["Update your profile after each season. Choose your visibility settings deliberately. You decide whether your profile is public, and your contact details should not be shared more widely than you intend."]}
  ],
  related:[{label:"How verification works",to:"/verification"},{label:"For athletes",to:"/for-athletes"},{label:"Match explorer",to:"/matching"}]},

 {slug:"how-to-spot-a-fake-sports-opportunity",title:"How to spot a fake sports opportunity",description:"Red flags that suggest a trial, scholarship or sponsorship may be a scam, and what to do about it.",category:"Safety",readMinutes:5,published:"2026-10-30",updated:"2026-10-30",
  intro:"Most organisations are genuine, but a few take advantage of athletes who are hoping for a break. Knowing the warning signs protects you and your family.",
  blocks:[
   {heading:"Common red flags",list:["A guaranteed contract, trial or scholarship in return for payment","Pressure to pay quickly or to pay a person rather than an organisation","No named organisation, address or verifiable contact","Requests for passport, ID or banking details before any application","Offers that appear without you applying","Grammar, branding or details that do not match the organisation's real channels"]},
   {heading:"Checks you can make",list:["Search for the organisation and compare contact details from more than one source","Contact the organisation through an independently found phone number or email","Ask for fees and terms in writing","Look for the verified badge, and remember it is a review step and not a guarantee","Speak to a parent, coach or someone you trust before paying or travelling"]},
   {heading:"Travel and safety",paragraphs:["Do not travel alone to meet someone you have only spoken to online. Tell someone where you are going. For younger athletes, a parent or guardian should be involved at every step."]},
   {heading:"If something feels wrong",paragraphs:["Stop communicating and do not send money. Keep screenshots and messages. Report it to us, and if you have lost money or feel unsafe, contact the police."]}
  ],
  related:[{label:"Report a concern",to:"/report"},{label:"How verification works",to:"/verification"},{label:"Trust and safeguarding",to:"/safeguarding"}]},

 {slug:"how-athlete-sponsorship-works",title:"How athlete sponsorship works",description:"A plain-language introduction to sponsorship: what sponsors look for, what an agreement covers and what to check first.",category:"Sponsorship",readMinutes:5,published:"2026-10-30",updated:"2026-10-30",
  intro:"Sponsorship is a commercial relationship. A brand provides money, products or services, and the athlete provides exposure, content or association. Both sides should understand exactly what they are agreeing to.",
  blocks:[
   {heading:"What sponsors look for",list:["Relevance to their audience and values","A professional, reliable profile","Engaged followers or community, not only large numbers","Results, potential and a clear story"]},
   {heading:"What an agreement usually covers",list:["What the sponsor provides: cash, kit, travel or services","What you deliver: posts, appearances, wearing branded kit","Length of the deal and how it can end","Image rights and who owns content","Exclusivity, for example not working with competing brands","Payment amounts and dates"]},
   {heading:"Before you sign",paragraphs:["Read everything. Ask for plain-language explanations of anything unclear. For significant agreements, get independent professional advice. This guide is general information and not legal advice."]},
   {heading:"Getting ready",paragraphs:["Build a clear profile with your sport, level, achievements and audience. Be honest about numbers and results. Start small and local, as many first sponsorships are with nearby businesses."]}
  ],
  related:[{label:"Browse sponsorships",to:"/opportunity-types/sponsorships"},{label:"For brands and partners",to:"/for-partners"},{label:"How to build a sports CV",to:"/guides/how-to-build-a-sports-cv"}]},

 {slug:"how-to-choose-a-sports-academy",title:"How to choose a sports academy",description:"Questions to ask about coaching, costs, education and welfare before joining a sports academy.",category:"Academies",readMinutes:5,published:"2026-10-30",updated:"2026-10-30",
  intro:"An academy can be a strong step in your development, but it is a big commitment. Compare options on the things that affect your growth and wellbeing.",
  blocks:[
   {heading:"Coaching and development",list:["Who are the coaches and what are their qualifications?","How many hours of training and competition are there?","How do they measure and share your progress?","What happens to athletes who leave or are not retained?"]},
   {heading:"Costs and funding",list:["What are the full fees and what is included?","Are scholarships or bursaries available?","What is the refund policy?","Are there extra costs for kit, travel or competition?"]},
   {heading:"Education and welfare",paragraphs:["Check how schooling or studies are supported, what supervision and accommodation look like and how safeguarding is handled. A good academy welcomes these questions."]},
   {heading:"Visit and compare",paragraphs:["Visit if you can, speak to current athletes and parents and compare at least two options. Be cautious of pressure to decide immediately."]}
  ],
  related:[{label:"Browse academy places",to:"/opportunity-types/academies"},{label:"Trust and safeguarding",to:"/safeguarding"},{label:"How to spot a fake sports opportunity",to:"/guides/how-to-spot-a-fake-sports-opportunity"}]}
];

export const findGuide=(slug:string|undefined)=>guides.find(item=>item.slug===slug);
