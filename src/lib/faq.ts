export type FaqItem={category:string;question:string;answer:string};

export const faqItems:FaqItem[]=[
 {category:"Getting started",question:"What is ChatSched Sport?",answer:"ChatSched Sport is a sports opportunity network. Athletes build a sports profile and discover opportunities such as trials, academy places, scholarships and development programmes. Organisations publish structured listings and review applications."},
 {category:"Getting started",question:"Is it free to join?",answer:"Creating an account, building an athlete profile and browsing opportunities are free. Some organisation tools and optional career-support services are paid or will become paid. Any price is shown before you commit. Never pay anyone for a guaranteed trial, contract or selection."},
 {category:"Getting started",question:"Who can create an account?",answer:"The initial release is designed for adults (18 and over). Youth athletes are not onboarded until a proper guardian-consent and safeguarding process has been designed and reviewed."},
 {category:"Profiles and privacy",question:"Who can see my athlete profile?",answer:"Athlete profiles are private by default. You choose whether to make your profile public. Public views show selected sporting fields only. Your login email and private messages are never part of the public directory."},
 {category:"Profiles and privacy",question:"Can I make my profile private again?",answer:"Yes. Change your visibility in your workspace at any time. It stops appearing in the public directory after you save the change."},
 {category:"Profiles and privacy",question:"How do I download or delete my data?",answer:"Use the data request page. Signed-in members can download a copy of their data and request account deletion there. Other requests, such as correcting information, can be sent through the same page."},
 {category:"Opportunities and applications",question:"How do I apply for an opportunity?",answer:"Open a verified, live listing, check the eligibility and closing date, then apply from the listing page. You can follow the status of each application in your workspace."},
 {category:"Opportunities and applications",question:"What does the match score mean?",answer:"The match score compares what you have told us (sport, position, location, level, availability, goals) with what the listing asks for. It is a transparent checklist, not a prediction of selection. If information is missing, the score says so rather than guessing."},
 {category:"Opportunities and applications",question:"Can I withdraw an application?",answer:"Yes, while it is still open (submitted, reviewing or shortlisted), you can withdraw it from your workspace."},
 {category:"Opportunities and applications",question:"Does applying guarantee a trial or place?",answer:"No. An application is a request. The organisation decides who to invite. ChatSched Sport does not guarantee trials, contracts, scholarships, sponsorships or representation."},
 {category:"Verification and safety",question:"What does verified mean?",answer:"A verified badge means the organisation or listing passed ChatSched Sport's review. It does not guarantee selection or conduct outside the platform. See the verification page for each level."},
 {category:"Verification and safety",question:"I think a listing or message is a scam. What should I do?",answer:"Do not send money or sensitive documents. Report it using the report page, or the report button on the listing or profile. If someone is in immediate danger, contact the police first."},
 {category:"Verification and safety",question:"Will a club ask me to pay to be selected?",answer:"Be very careful. Legitimate trials may have a published, reasonable fee, but anyone promising guaranteed selection in return for payment should be reported."},
 {category:"For organisations",question:"How does my organisation get verified?",answer:"Create an organisation profile, then submit your verification request with evidence from your workspace. Listings only appear publicly when both the organisation and the listing are verified."},
 {category:"For organisations",question:"Can I see applicants' private contact details?",answer:"You see the profile information relevant to your opportunity. The public directory never includes login email addresses, and messaging is limited to participants in a conversation."},
 {category:"Account and technical",question:"I did not receive my sign-in or reset email.",answer:"Check your spam folder and confirm you used the right address. Wait a few minutes, then try again. If it still does not arrive, send us a message from the contact page."},
 {category:"Account and technical",question:"Which cookies do you use?",answer:"Essential storage keeps you signed in. Optional analytics only run if you allow them. You can change your choice at any time in cookie settings."}
];

export function filterFaq(items:FaqItem[],query:string):FaqItem[]{
 const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
 if(terms.length===0)return items;
 return items.filter(item=>{
  const haystack=(item.category+" "+item.question+" "+item.answer).toLowerCase();
  return terms.every(term=>haystack.includes(term));
 });
}

export function faqJsonLd(items:FaqItem[]):string{
 return JSON.stringify({
  "@context":"https://schema.org",
  "@type":"FAQPage",
  mainEntity:items.map(item=>({"@type":"Question",name:item.question,acceptedAnswer:{"@type":"Answer",text:item.answer}}))
 }).replace(/</g,"\\u003c");
}
