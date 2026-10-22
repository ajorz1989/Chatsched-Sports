# ChatSched Sport

**The Sports Opportunity Network.** Your Game. Your Opportunity. Your Future.

ChatSched Sport is a separate product and GitHub repository from the existing ChatSched advertising marketplace. Do not change or deploy over the advertising product while developing Sport.

## Product vision

**DISCOVER → MATCH → DEVELOP → CONNECT → REPRESENT → GROW**

Build trusted infrastructure for sporting opportunity—not just a brochure or unmoderated directory. The network brings athletes, clubs, scouts, academies, coaches, brands, sponsors, agents and events into a structured journey with professional sports profiles, public talent discovery, verified organisations, explainable matching and opportunity applications.

## What is in the repository now

- Premium responsive marketing site with editorial home, journey and audience sections.
- Opportunity catalogue with search and filters, individual detail pages and authenticated save/apply actions.
- Fictional opportunity examples explicitly labelled as demonstrations; they are not live openings or verified organisations.
- Supabase signup/sign-in UI, password-reset email flow, reset completion and safe return routing.
- Member workspace with sports profile editor, achievements, private-by-default visibility, highlight reel, HTTPS portfolio-link management, saved opportunities, application tracker and organisation listing tools.
- Athlete talent directory and public profile/media-link pages that exclude email and private login data.
- Private conversations, inbox, message read states, notifications for messages, applications and application-status updates.
- Organisation application-review tools that show limited applicant details, update application statuses and link to the conversation flow.
- Restricted admin moderation for organisations, opportunity listings, applications, safety reports and career-support requests, plus evidence-based organisation verification and an administrator audit viewer.
- Private safety reports from opportunity, organisation and athlete pages, reviewed in a restricted moderator queue.
- Athlete career-support/representation requests with explicit contact consent, status tracking, admin notes and notifications; requests do not promise representation.
- Transparent, deterministic opportunity-match explorer that explains which criteria contribute to each score.
- Public About, How it Works, audience, privacy overview, platform principles and safeguarding information pages.
- Automated unit tests for explainable match scoring and a CI workflow that runs tests, type-checks and builds.
- Five Supabase/PostgreSQL migrations for data, RLS, column-level grants, moderation, safety reports, career-support requests, directory views, messaging, notifications, Realtime and evidence-led organisation verification.
- Cloudflare Pages SPA fallback and a GitHub Actions production build workflow.

Some account and database-backed flows require the dedicated Sport Supabase project. The UI intentionally stays in preview mode without it. A source-code push is not proof that the database has been provisioned or the site deployed.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Lucide · Supabase Auth/PostgreSQL · Cloudflare Pages.

## Local development

1. Install a Node.js version supported by the Vite toolchain.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Create a **new, separate** Supabase project for ChatSched Sport.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
6. Apply these migrations in order in the new Sport project's SQL editor: `supabase/migrations/202610220001_initial_sports_network.sql`, `supabase/migrations/202610220002_workspace_messaging_admin.sql`, then `supabase/migrations/202610220003_enable_sport_realtime.sql`, `supabase/migrations/202610220004_organisation_verification_evidence.sql`, and `supabase/migrations/202610220005_athlete_directory_and_bookmarks_hardening.sql`.
7. Run `npm run dev` for development, `npm run test` for unit tests, and `npm run build` for type-checking plus the production build.

**Never use the existing ChatSched advertising database for Sport.** Only a browser-safe Supabase publishable/anon key belongs in Vite client environment variables; never put a service-role or secret key in the browser or commit real environment files.

## Admin bootstrap

Administrator status is deliberately **not** inferred from the member's self-declared account type. After creating your own Sport account, copy your authenticated Supabase user UUID from the Supabase Auth users page. As the database owner in the Sport SQL editor, add it to the private allow-list:

```sql
insert into private.sport_admins (user_id)
values ('YOUR-AUTH-USER-UUID');
```

Only do this for a trusted administrator. The private admin table is not exposed to ordinary API users. Moderation decisions should be recorded in `public.admin_audit_log`.

## Cloudflare Pages

Connect `ajorz1989/Chatsched-Sports` as a **separate** Cloudflare Pages project:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`

The repo includes a `_redirects` SPA fallback for client routes such as `/workspace`, `/talent`, `/messages`, `/notifications`, `/matching`, `/privacy`, `/safeguarding` and `/opportunities/:id`. Add the deployed recovery URL ending in `/reset-password` to the Sport project's Supabase Auth redirect allow-list. Do not configure this project through Vercel.

## Security, privacy and safeguarding

- All public application tables are intended to have RLS enabled. Database policies—not only client UI checks—control access to applications, saved listings, profile edits and messages.
- Athlete profiles default to **private**. A member must explicitly choose public visibility before they appear in the public talent directory.
- Directory views expose selected public fields only, never profile email or private contact details.
- Only organisations and opportunities that pass their respective verification gates can appear in the public catalogue. Ordinary users cannot self-verify via the app's column grants and database trigger guard.
- Application inserts are limited to accounts declared as athletes and require a published, verified opportunity that has not passed its closing date.
- Messaging is restricted to participants; conversations started through the app require the other member to be discoverable.
- Account type is self-declared and is not administrator permission.
- Signup asks the user to self-confirm they are 18+. This is a **client-side safeguard, not independent age verification or server-enforced age assurance**. Do not onboard minors until an appropriately safeguarded, guardian-assisted pathway and server-side eligibility controls have been designed and reviewed.
- Never guarantee selection, contracts, scholarships, sponsorships or representation, and do not present sample data as actual opportunities.

Before a public launch, apply and test both migrations in a non-production Sport Supabase project, verify every RLS/grant/trigger/view, configure Auth redirect URLs and email settings, add rate-limiting and abuse-reporting, review data retention and POPIA obligations, and complete security/safeguarding review. No live Sport database or Cloudflare deployment is provisioned by a GitHub commit alone.

## Product roadmap after this foundation

1. Complete live verification workflow with evidence capture, admin history and rejection reasons.
2. Finish production profile management, media upload/storage policy, organisation verification and publishing.
3. Add club/scout talent search with robust query, consent and privacy filters.
4. Add application review dashboards and richer notification controls.
5. Add sports-specific profile fields, verified achievements, performance statistics and portfolio/kit generation.
6. Improve matching with user feedback and audited, explainable factors before considering predictive AI.
7. Build service/agency workflows, commercial partnership tools, analytics and payments only after validating demand.

## Engineering discipline

**INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → COMMIT → PUSH**

A successful GitHub push is not a successful build. A successful build is not a deployed website. Verify each state separately and report it honestly.
