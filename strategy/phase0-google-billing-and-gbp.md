# Phase 0 action sheet: Google billing and the Business Profile anchor

Written October 7, 2026 from the notices in Caleb's Gmail (observed) and Caleb's decisions of October 6 and 7. Nothing here was paid, changed or submitted by Claude. Every step below is Caleb's to click.

## Part 1: the Google billing failures

**Root cause, observed.** On September 15 Google Payments flagged the Visa ending 8257 as possibly used in an unauthorized transaction and locked it until it is verified. Every Google charge on that card has failed since. Two payments profiles were notified: 6378-8343-1298 (the Workspace profile for calebjackson.org, named "AIRE") and 0084-4050-0630.

**What is failing and when it breaks**

| Service | Notices | Deadline in the notice | Status on October 7 |
|---|---|---|---|
| Google Workspace Business Plus for calebjackson.org | Failed September 15 and October 1 | Suspension of all services for all users on **October 16, 2026** | Still running. Nine days left. This is the mailbox, Drive, Calendar and the Google identity that owns the Business Profile and the Metricool connection. |
| AI Expanded Access add-on for calebjackson.org | Failed October 2 | Suspension on October 5, 2026 | Deadline passed. May already be suspended. Check in the Admin console. |
| Google Cloud billing account 01C6F4-B2E76D-BBB715, project "My First Project" | Past due September 15 and October 1 | "May result in suspension" with no date | Unknown whether anything in that project is live. If AIRE or any automation uses an API key from it, it stops when the project suspends. |
| Workspace invoice 5699590831 | Issued October 2 | Due October 30, 2026 | The next bill. It will fail too until the card is fixed. |

**Fix, in order. About 15 minutes.**

1. Verify or replace the card. Sign in as aire@calebjackson.org and open [Google Payments methods](https://pay.google.com/gp/w/u/0/home/paymentmethods). On the Visa ending 8257 click Verify and complete the bank check. If the card was actually compromised, add a different card instead and make it primary.
2. Retry Workspace. Open [admin.google.com](https://admin.google.com), go to Billing, then Subscriptions, open Google Workspace Business Plus and pay the outstanding balance with the verified card. Google's own instructions are at [support.google.com/a/answer/2523116](https://support.google.com/a/answer/2523116).
3. Check AI Expanded Access on the same Billing page. If it shows suspended, reactivate it only if you still use it. It is a separate charge.
4. Fix Google Cloud. Open [the billing account settings](https://console.cloud.google.com/billing/01C6F4-B2E76D-BBB715/settings), set the verified card as the payment method and pay the past-due amount. Then open the project "My First Project" and note what APIs are enabled so we know what depended on it.
5. Confirm by October 9. Look for a Google receipt email for each of the three. If any failure email arrives again after that, the card is still locked and the bank has to clear it.

**Why this is item zero.** If Workspace suspends on October 16, the aire@calebjackson.org mailbox stops, Drive and Calendar lock, the Business Profile owner account goes dark, and every connector in this plan that signs in as that account stops with it.

## Part 2: the Business Profile anchor

**Caleb's decisions.** October 6: clients are not met at the brokerage office, so the profile becomes a service-area business with the address hidden. October 7: the profile should be optimized for clients in Zachary or St. Francisville.

**The constraint, source-reported from Google's guidelines.** Service areas are shown to customers but do not move the map pin or the distance signal. The pin sits at the hidden verification address, and that address must be a real place the business operates from, which for an agent is normally home. No PO box, virtual office or borrowed address. Zachary and St. Francisville are about 30 road miles apart, so one pin cannot serve both equally.

**Recommendation, inferred: anchor in Zachary.** Zachary sits inside East Baton Rouge Parish, so a Zachary pin still reads as close to Central, Baker, Greenwell Springs and north Baton Rouge, and St. Francisville stays a listed service area 25 minutes up Highway 61. A St. Francisville pin would put the whole Baton Rouge side at a distance disadvantage. Caleb's observed listing history (Zachary, Greenwell Springs, Jackson) also sits closer to Zachary.

**The one thing still needed from Caleb.** The real address he operates from in that area, which stays hidden from the public. If his home is in Zachary, that settles it. If it is in St. Francisville, the pin goes there and Zachary becomes a service area, and the plan still works.

**Step 1, do now, no re-verification expected.** In the Business Profile: turn off "Show business address to customers," add the service areas (Zachary, St. Francisville, Baton Rouge, Central, Greenwell Springs, Pride, Baker, Jackson, Clinton, Slaughter, Ethel, New Roads, Ventress, Jarreau, Prairieville), add phone (225) 747-0303, hours, the website link with the UTM tag, the description from the profile copy kit, and the services list from the research packet (seller representation, buyer representation, home valuation, seller net sheet estimate, relocation guidance, land and acreage, waterfront, first-time buyer guidance). Add the sponsoring broker's name and phone to the description for LREC.

**Step 2, after Step 1 is live and the anchor address is confirmed.** In one edit session, change the verification address to the hidden base address and rename the profile to "Caleb Jackson, REALTOR." Expect one re-verification, possibly by video. The profile can drop from Maps until it completes, so pick a quiet day and keep 30 minutes free.

**Do not** create a second profile in either town, and do not use any address Caleb does not actually operate from.
