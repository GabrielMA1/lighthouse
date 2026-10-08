# Spotix — copy map

Where each piece of public copy lives and what it's based on. "Prior site" means `index.html` at `6bd1db6` unless noted. Anything not traceable to the prior site or the Terms is neutral explanation, with no facts added.

## Homepage (`index.html`) — narrative order

Restructured on 2026-10-08 (see `SPOTIX-IMPLEMENTATION-LOG.md`). No new facts were added; content was merged and reordered.

| # | Section (id) | Purpose | Claims made | Basis |
|---|---|---|---|---|
| 1 | Hero (`#the-card`) | What / where / who / price anchor | H1 in "your spot" on an illustrated shared card; neighbouring spots labelled Restaurants (1/4), Salons & spas (1/8), Clinics (1/8); "Illustration of a shared Spotix postcard, not an actual mailing"; from $247 CAD/month, design included | Prior hero + prior "Who it's for" list (now in the card and the lede). Neighbour spots name **categories**, never businesses |
| 2 | `#pricing` | Rate card: sizes drawn to proportion, prices, scope | Prices, ad space, targeting, tracking; 15% subscription discount; payment before production | Prior sizer + pricing ledger, merged. The identical "10,000 homes" column became one sentence |
| 3 | `#how-it-works` | Monthly cycle as a calendar | 15th / 20th / 1st; what you send; proof approval; Canada Post; tracking methods (`#tracking`); dates are targets | Prior "How it works", "You provide / Spotix handles" and "Measuring results" merged. JS shows the next real booking date from the visitor's clock |
| 4 | `#coverage` | Area list | 15 areas grouped West/Central/East/North; targeting by package; ask if your area is missing | Prior coverage |
| 5 | `#faq` (+ `#guides`) | Objections, with the three guides alongside | 9 Q&As | Prior FAQ + Terms §4, §5, §6, §9 |
| 6 | `#inquire` | Conversion | Phone (shown large), Calendly, email, Formspree form; reply within one business day | Prior contact section |

**Removed from the homepage:** the "postcard vs. online ads" comparison table (hedged, generic, and covered in depth by the salon and home-services guides) and the spec list under the hero (it repeated the lede).

## Wording rules

- Canadian spelling: *neighbourhood*, *labour*, *favourite*.
- Say "10,000 homes per mailing", never "10,000+" or "reached monthly".
- Never "guaranteed" about delivery. Dates are "targets".
- No urgency devices (counters, "spots left", timers, "limited"). The 15th booking deadline is a real process date and may be stated.
- Don't name competitors' products as failing. Online ads are described neutrally.
- Label every schematic as representative, not an actual mailing.
- Illustrated neighbour spots show business **categories** only: no invented business names, offers, phone numbers or addresses.

## Guides (`blog/`)

| URL (unchanged) | New title | Replaces | Notes |
|---|---|---|---|
| `blog/restaurant-postcard-case-study.html` | How to Plan a Weeknight Postcard Offer for Your Restaurant | "How a Toronto Restaurant Filled 40% More Tables…" (unverified case study) | Only numbers: Duo price and $397 ÷ 10/20/40 arithmetic, labelled as not a forecast |
| `blog/salon-instagram-to-direct-mail.html` | Instagram Ads or a Neighbourhood Postcard? A Guide for Toronto Salons | "Why a Midtown Salon Switched…" (unverified case study) | No statistics |
| `blog/home-services-cost-comparison.html` | Comparing the Cost of Online Ads and Direct Mail: A Worksheet for Toronto Home Services | "The Real Cost of Digital Ads vs. Direct Mail…" | Removed unsourced CPC/CPM ranges and the "real client" funnel; break-even table is arithmetic on list prices |

The URLs were kept to avoid breaking inbound links. `restaurant-postcard-case-study` still contains "case-study" in the slug; renaming would need a redirect strategy (GitHub Pages has no server redirects).

## Legal pages

`privacy-policy.html` and `terms-of-service.html` were re-typeset only. The text is word-for-word identical to `6bd1db6` (verified by a normalized-text comparison). "Last updated: April 28, 2026" is unchanged because the legal text didn't change.
