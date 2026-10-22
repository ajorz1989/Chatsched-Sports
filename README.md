# ChatSched Sport

**The Sports Opportunity Network.** Your Game. Your Opportunity. Your Future.

ChatSched Sport is a distinct product and repository from the existing ChatSched advertising marketplace. That product and its live site must remain untouched while Sport is developed.

## Vision
**DISCOVER → MATCH → DEVELOP → CONNECT → REPRESENT → GROW**

Connect athletes, clubs, scouts, academies, coaches, brands, sponsors, agents and events through professional sports profiles, verified organisations, structured opportunities, transparent matching and clear next steps. The ambition is trusted infrastructure for sporting opportunity—not just a brochure or unmoderated directory.

## Current foundation
- Premium responsive public product experience.
- Searchable opportunity catalogue with sport/type filters and detail views.
- Fictional sample listings clearly labelled as examples, not current openings or verified organisations.
- Supabase Auth registration/login integration when configured.
- Explainable deterministic opportunity-match scoring helper.
- Initial PostgreSQL schema for profiles, sports, athlete profiles/achievements, organisations, opportunities, applications and saved opportunities.
- Row Level Security, verification gates and column-level grants in the initial migration.

## Stack
React 19, TypeScript, Vite, Tailwind CSS, Supabase Auth/PostgreSQL and Cloudflare Pages.

## Setup
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Create a separate Supabase project for ChatSched Sport. Never reuse the advertising database.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
5. Apply `supabase/migrations/202610220001_initial_sports_network.sql` in the new project's SQL editor.
6. Run `npm run dev` locally and `npm run build` to create `dist`.

Only a public Supabase publishable/anon key belongs in browser code. Never commit a service-role key, secret or actual environment file. Without Supabase configuration, the app explains that accounts are not connected and the catalogue uses clearly labelled sample listings.

## Cloudflare Pages
Connect GitHub repository `ajorz1989/Chatsched-Sports` as a separate Cloudflare Pages project. Use build command `npm run build`, output directory `dist`, and environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Configure SPA fallback for `/join`, `/opportunities` and opportunity detail routes to resolve to `index.html`. Do not deploy this project through Vercel.

## Trust and security
- RLS is enabled on all application tables in the initial migration.
- Public feed queries only published opportunities marked verified.
- Column-level grants prevent ordinary members editing verification fields and application ownership.
- Application creation checks published/verified status and closing date.
- Account type is self-declared and is not an admin permission.
- Initial registration is adult-only. Design and review a safeguarded guardian-assisted journey before onboarding minors.
- Never guarantee selection, contracts, representation, scholarships or sponsorships.
- Verify real organisations and listings before presenting them as genuine.

This is an initial foundation, not a full production security audit. Test every RLS policy and grant in a separate non-production project before launch. Admin verification, storage policies, complete profile flows, moderation, abuse prevention and safeguarding still need implementation and testing.

## Roadmap
1. Foundation, auth and account types.
2. Athlete profile builder and sports CV.
3. Organisation onboarding and verification.
4. Opportunity creation, moderation, search and detail.
5. Applications and saved opportunities.
6. Explainable matching and reverse talent discovery.
7. Admin console, reporting and safeguarding.
8. Messaging, notifications, agency support and commercial partnerships.

## Engineering discipline
**INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → COMMIT → PUSH**

A push is not a successful build. A successful build is not a deployment. Verify each state separately and report it accurately.
