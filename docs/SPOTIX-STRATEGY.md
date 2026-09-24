# Spotix — strategy and source of truth

Last reviewed: 2026-09-24. This file records what the site says about the business, where each fact comes from, and what still needs the owner to confirm. **If a fact here changes, update this file, the site, and `tools/site_audit.py` together.**

## What Spotix is

Spotix sells **advertising spots on a shared direct-mail postcard** for local businesses in Toronto. A business books a spot size, sends its logo, offer and any photos, and Spotix designs the spot, prints the card and sends it out through Canada Post. The card goes to 10,000 homes per mailing, on a monthly cycle.

Positioning in one line: *physical neighbourhood reach for businesses whose customers live nearby.*

Spotix is **not** a general marketing agency, a printing company, an ad network, a software product or a data broker. Keep the site's scale honest: it's a focused local product, not a large direct-mail company.

Relationship: "A Gabriel Macovei company" (footer), with quiet links to gmacovei.com and rielart.com. Spotix keeps its own visual identity.

## Commercial facts (approved; do not change without the owner)

| Package | Ad space | Targeting | Design & tracking | Delivery | Price |
|---|---|---|---|---|---|
| Solo Spot | 1/8 page | 1 neighbourhood | Professional design included | 10,000 homes | $247 CAD / month |
| Duo Spot | 1/4 page | 2 neighbourhoods | Design + QR code | 10,000 homes | $397 CAD / month |
| Full Spot | 1/2 page | Full coverage | Design + QR code + phone tracking | 10,000 homes | $597 CAD / month |
| Custom | Full page | Custom targeting | Multi-month campaigns, subscription options | — | Contact for pricing |

- Monthly subscriptions: **15% discount** (as previously stated on the site).
- Source: `index.html` at commit `6bd1db6` (prices last changed in `e1e3d41`, 2026-05-02: $299/$499/$799 → $247/$397/$597).
- No "Most popular" label: there's no evidence of which package sells most.

## Process (as previously published)

1. Book by the **15th** for next month's postcard.
2. Design proof approved by the **20th**.
3. Printed and mailed by the **1st** of the following month, through Canada Post.
4. Afterwards, responses are tracked through the QR code or phone number.

Presented as **targets**. Terms §9 says delivery dates are estimates and not guaranteed.

## Terms-derived facts used in the FAQ (paraphrased, with links to the Terms)

- Full payment before production begins; credit cards and electronic transfers; CAD (Terms §4).
- Cancellation at least 14 days before the scheduled mailing date for a full refund; no refunds after production begins (Terms §5).
- Content must follow the content guidelines (Terms §6).
- Delivery dates are estimates; delays can happen (Terms §9).

## Contact and integrations

- hello@myspotix.com · 646-444-3314 · Toronto, Ontario (no street address; don't add one).
- Inquiry form: Formspree `https://formspree.io/f/mzdorlpr` (fields: `name`, `email`, `business`, `spot_size`, `message`, plus the `_gotcha` honeypot).
- Calls: Calendly `https://calendly.com/hello-myspotix/10min`.
- LinkedIn: `https://www.linkedin.com/in/gabrielmacovei` (a personal profile, so it's labelled "Gabriel Macovei on LinkedIn", not "Follow us").
- Analytics: **none**. The previous `G-XXXXXXXXXX` placeholder was removed. Add a real ID only on the owner's instruction (and update the Privacy Policy).

## Claims removed as unverified

| Former claim | Why it was removed |
|---|---|
| "Guaranteed delivery" (hero, meta, comparison, blog CTA) | Contradicts Terms §9 ("Delivery dates are estimates and not guaranteed"). |
| "95% Delivery Rate (Canada Post)" | No source anywhere in the repository. |
| "10,000+ Homes Reached Monthly" | Implies an operating history the repository can't show. Replaced with "10,000 homes per mailing" (package scope). |
| "Only 8 spots per card" / "Only 8 advertisers per card" | Presented as scarcity; unverified. |
| "Limited spots available each month", red "flame" urgency badge | Unverified urgency. |
| "MOST POPULAR" on Full Spot and in the form | No sales evidence. |
| "Real Results", "Real case studies" | No documented campaigns. |
| "Last Month's Card: This is exactly what 10,000 Toronto homes received" next to "Example layout only", dated "April 2026 Edition" | Self-contradictory. Replaced with a labelled representative schematic. |
| "Many businesses see compounding results after 3+ months" | No evidence. |
| "See why local businesses are switching from feeds to mailboxes" and the red-X digital comparison ("scrolled past in 2 seconds", "kept on the fridge") | Unsupported universal claims. Replaced with a neutral comparison table. |
| "Our professional design team" (earlier version) | Team size unverified; the site now just says design is included. |
| "Turnaround in 48 hours" / "you approve in 48 hours" | Unclear who the 48 hours applies to; not repeated. **Owner to confirm** if it should come back. |

## Case studies: assessment

The two "case studies" and the cost article were published on 2026-04-28, eleven days after the repository was created (2026-04-17), in the same commit as a full redesign. They were treated as **not credible as real customer records**:

- *Restaurant*: "Maria's Trattoria" whose owner is "Marco"; claims a completed month-two renewal and a 3-month subscription within days of launch.
- *Salon*: "Glow Hair Studio", owner "Sarah Chen"; claims "28 became repeat clients within 90 days", which is impossible 11 days after launch. Its "$4.82 per new client" equals **$299 ÷ 62**, the *old* Solo price, while the text now says $247.
- *Home services*: "we calculated the funnel for a real client"; "$7.99 acquisition cost" equals **$799 ÷ 100**, the *old* Full Spot price. At today's $597 the same arithmetic gives $59.70.
- Commit `e1e3d41` edited the prices *inside the stories* when list prices changed. Real historical campaigns wouldn't change what a customer paid.
- The earliest version of the site also had named testimonials (Mike Richardson, Jennifer Liu, David Patel), later removed.

All three articles were rewritten at the **same URLs** as educational guides with no customer identities, quotes or performance figures. The only numbers are Spotix's list prices and clearly labelled arithmetic. The originals are in git history if the owner can document that any were real.

## Owner review required

1. **Pricing unit.** The site shows "/month" and describes monthly mailings. The redesign states "prices are per month, for your spot on that month's postcard". Confirm that this is one mailing per month and not, for example, a monthly subscription price.
2. **15% subscription discount.** The minimum commitment, whether it applies to Custom only or to all packages, and how it's billed aren't defined anywhere (the Terms don't mention subscriptions).
3. **Targeting vs. 10,000 homes.** Solo "1 neighbourhood", Duo "2", Full "full coverage", yet every package lists "10,000 home delivery". How can a Solo ad target one neighbourhood and still reach 10,000 homes on a shared card? The site says targeting is "confirmed with you before you book". Please define it.
4. **Coverage list.** Are all 15 areas actually available? (Thornhill is in York Region, outside Toronto.) Is targeting by postal code / Canada Post route?
5. **Tracking.** Who provides the QR analytics and the tracking number, and what reporting does the advertiser receive? The site only says scans and calls "can be counted".
6. **Operating history.** Has a mailing actually gone out? If so, a real photo of a printed card (with advertisers' permission) would be the strongest proof the site could have.
7. **Reply time.** The old copy said both "within 24 hours" and "within 1 business day"; the site now says "within one business day".
8. **Case studies.** If any of the original stories were real, provide documentation and customer permission before republishing anything.
9. **Legal pages** (unchanged text; please review with counsel):
   - Terms §3 "Account Registration" refers to accounts; the site has no accounts.
   - Privacy §1 mentions a newsletter; none exists.
   - Privacy §6 mentions cookies; the site now sets none (the GA placeholder is gone). Formspree and Calendly are not named as service providers.
   - Terms §2 lists "Consultation on advertising strategies" and "Campaign management and reporting", which the site doesn't describe.
   - Terms don't cover subscriptions, the 15% discount, or the monthly booking deadlines.
   - No mention of Canadian privacy law (PIPEDA) or CASL for marketing emails.
10. **Deployment / canonical host.** See `SPOTIX-IMPLEMENTATION-LOG.md` → Deployment.
11. **Article authorship.** Guides keep Gabriel Macovei as author (as before) with an "Updated September 24, 2026" date. The content was rewritten in this pass, so please review it before publishing.
