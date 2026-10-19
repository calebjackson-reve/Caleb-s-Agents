# Hot-Warm-Cold merge dry run, 2026-10-19

Read only. Nothing was written to the AIRE CRM. Caleb reviews this, then says yes or no.

## Blueprint

1. Each of the 458 Hot-Warm-Cold rows is matched to the CRM by email, then phone (10 digits), then exact display name. Couples like "Paul & Cynthia Brown" are tried as two people when the full string misses.
2. A single clean match becomes an update plan: band filled only when blank and only for HOT or WARM, Last_Touch filled only when blank, Next_Action filled only when blank, plus one Notes row carrying "Why this tier" and Notes.
3. A row with no match becomes a new contact (minted person_id, Do_Not_Contact NO, Source "Hot-Warm-Cold Contacts").
4. Anything ambiguous is a conflict and is never applied: more than one CRM match, the CRM says Do_Not_Contact, the CRM band disagrees with the HWC tier, or same name with a different phone.
5. COLD and CONTACT tiers do not map to a band. Those matches get Last_Touch, Next_Action and the note, no band. Caleb decides whether COLD is NURTURE and CONTACT is DORMANT.

## Proof

| HWC rows | Matched | New people | Conflicts |
|---|---|---|---|
| 458 | 391 | 25 | 42 |

Matched by: email 79, phone 312, name 0. Matches that would change a Contacts cell: 391.

### Conflicts (never applied)

| HWC name | Tier | CRM person_id | CRM display | Why |
|---|---|---|---|---|
| Paige Smith & Josh Darnielle | HOT | 6435 | Paige Gf | band NURTURE in CRM vs tier HOT in HWC |
| Hunter (+ wife) | HOT | 57 | Hunter Wife | band NURTURE in CRM vs tier HOT in HWC |
| Chad & Cecil Graves | HOT | 286 | Chad Graves | band WARM in CRM vs tier HOT in HWC |
| Mason Jones | HOT | 220 | Mason Jones | band NURTURE in CRM vs tier HOT in HWC |
| Mikey Rider | WARM | 28 | Mikey Rider | band HOT in CRM vs tier WARM in HWC |
| Stanley (Chris Stroud's dad) | WARM | 7064 | ?Stanley household | band NURTURE in CRM vs tier WARM in HWC |
| Kale Bordelon | WARM | 3528 | Kale Bordelon | band HOT in CRM vs tier WARM in HWC |
| Austin Gayle | WARM | 80 | Austin Gayle | band HOT in CRM vs tier WARM in HWC |
| Kevin Shipp | WARM | 280 | Kevin Shipp | band NURTURE in CRM vs tier WARM in HWC |
| Christian Purpera | WARM | 311 | Christian Purpera | band HOT in CRM vs tier WARM in HWC |
| Logan Knox | WARM | 105 | Logan Knox | band NURTURE in CRM vs tier WARM in HWC |
| Bo Myers | WARM | 112 | Bo Myers | band HOT in CRM vs tier WARM in HWC |
| Brendan Legget | WARM | 138 | Brendan Legget | band HOT in CRM vs tier WARM in HWC |
| Jack Jackson | WARM | 32 | Jack Jackson | band NURTURE in CRM vs tier WARM in HWC |
| Buddy Simpson | WARM | 3565 | Buddy Simpson | band HOT in CRM vs tier WARM in HWC |
| Josh Coarsey | WARM | 68 | Josh Coarsey | band HOT in CRM vs tier WARM in HWC |
| Major Senior | WARM | 3598 | Major Senior | band HOT in CRM vs tier WARM in HWC |
| Corey Falgout | WARM | 259 | Corey Falgout | band HOT in CRM vs tier WARM in HWC |
| Hannah Threaton | WARM | 66 | Hannah Threaton | band HOT in CRM vs tier WARM in HWC |
| Josh Holdman | WARM | 59 | Josh Holdman | band HOT in CRM vs tier WARM in HWC |
| Nikki Summerfield | WARM | 3 | Nikki Summerfield | band HOT in CRM vs tier WARM in HWC |
| Steve Babin | WARM | 54 | Steve Babin | band HOT in CRM vs tier WARM in HWC |
| Gina Henry | WARM | 194 | Gina Henry | band HOT in CRM vs tier WARM in HWC |
| Kyle Summers | WARM | 342 | Kyle Summers | band HOT in CRM vs tier WARM in HWC |
| Jackson Howell | WARM | 664 | Jackson Howell | band NURTURE in CRM vs tier WARM in HWC |
| Leslie Landry | WARM | 241 | Leslie Landry | band HOT in CRM vs tier WARM in HWC |
| Dylan Savoie | WARM | 160 | Dylan Savoie | band HOT in CRM vs tier WARM in HWC |
| Wyatt Graves | WARM | 453 | Wyatt Graves | band NURTURE in CRM vs tier WARM in HWC |
| Brandon Dufour | WARM | 823 | Brandon Dufour | band NURTURE in CRM vs tier WARM in HWC |
| Jesse Summers | WARM | 514 | Jesse Summers | band NURTURE in CRM vs tier WARM in HWC |
| John Luke | WARM | 504 | John Luke | band NURTURE in CRM vs tier WARM in HWC |
| Ryleigh Town | WARM | 551 | Ryleigh Town | band NURTURE in CRM vs tier WARM in HWC |
| Christopher Stroud | COLD | 3584 | Christopher Stroud | CRM says Do_Not_Contact |
| Kevin Vince | COLD | 615 Kevin Vince (email); 3211 Kyle Vince (email) |  | more than one CRM row matches |
| Ty Overland | COLD | 354 | Ty Overland | same name, different phone |
| Julian (Brock) Berthelot | CONTACT | 4040  (phone); 4181 Brock Berthelot (email) |  | more than one CRM row matches |
| Cody Truax | CONTACT | 38 Cody Truax (phone); 3767 Cody Truax (name) |  | more than one CRM row matches |
| Michael Stinson | CONTACT | 270 | Michael Stinson | same name, different phone |
| Jacob Loveland | CONTACT | 3643 Jacob Loveland (name); 3649 Jacob Loveland (phone) |  | more than one CRM row matches |
| Jordan Simpson | CONTACT | 291 Jordan Simpson (phone); 2685 Jordan Simpson (name) |  | more than one CRM row matches |
| Daniel Mcclure | CONTACT | 1120 | Daniel Mcclure | same name, different phone |
| Evan Gardner | CONTACT | 147 | Evan Gardner | same name, different phone |

### Matches with a planned write

| HWC name | Tier | person_id | CRM display | Match | Would set |
|---|---|---|---|---|---|
| Erick Bass | HOT | 3454 | ?Hatcher household | phone | Last_Touch=2026-10-15, Next_Action=Get repair sign-off; reply-all Kar Gary; release appraisal hold w/ Haylie |
| Paul & Cynthia Brown | HOT | 247 | Paul Brown | phone | Last_Touch=2026-10-18, Next_Action=Confirm counter reached Bridgette Hardy (Novak); 2:30 showing 10/19; sign BBA + upload to Command for the Cruden Bay check |
| Catherine David (+ Joseph) | HOT | 3523 | Catherine David | phone | Last_Touch=2026-10-15, Next_Action=Call: Bennett proof of funds, 2nd buyer interest, get counter signed or decided |
| Blake Wesley | HOT | 1920 | Blake Wesley | phone | Last_Touch=2026-10-14, Next_Action=Call: backup offer (Jeanne Green / Gaye Landry), kick-out/extension plan |
| Holden Landry | HOT | 43 | Holden Landry | phone | Last_Touch=2026-10-15, Next_Action=Call before Monday: what deadline, can you help? |
| Brock Giddens | HOT | 85 | Brock Giddens | email | Last_Touch=2026-10-05, Next_Action=Call: short-sale / lender plan before 11/18; confirm listing status |
| Devin Kleinpeter | HOT | 3659 | Devin Kleinpeter | phone | Last_Touch=2026-10-09, Next_Action=Call today: apologize, get the address, book the listing appointment |
| Caleb Wilson | WARM | 128 | Caleb Wilson | phone | Last_Touch=2026-09-21, Next_Action=Check in; offer a CMA refresh |
| Dani Stockstill | WARM | 161 | Dani Stockstill | phone | Last_Touch=2026-09-25, Next_Action=Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Stephen Summers | WARM | 144 | Stephen Summers | phone | Last_Touch=2026-09-16, Next_Action=Reply first: they texted last (2026-09-16). Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| austin aleman | WARM | 136 | austin aleman | phone | Last_Touch=2026-09-09, Next_Action=Send 1-2 deals that fit and ask their buy box (price, area, rental vs flip). |
| Jacob Knox | WARM | 233 | Jacob Knox | phone | Last_Touch=2026-07-29, Next_Action=Send 1-2 deals that fit and ask their buy box (price, area, rental vs flip). |
| Scott Reitzel | WARM | 299 | Scott Reitzel | phone | Last_Touch=2026-09-04, Next_Action=Send 1-2 deals that fit and ask their buy box (price, area, rental vs flip). |
| Christian Fuller | WARM | 255 | Christian Fuller | phone | Last_Touch=2026-09-23, Next_Action=Lease-end check: offer a quick rent-vs-buy run. |
| Tj Silliman | WARM | 399 | Tj Silliman | phone | Last_Touch=2026-06-19, Next_Action=Ask how the move is going. Offer help on either end (local or referral out). |
| Lisa Coarsey | WARM | 518 | Lisa Coarsey | email | Last_Touch=2026-02-23, Next_Action=Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Dr Daniel | COLD | 272 | Dr Daniel | phone | Last_Touch=2026-10-09, Next_Action=Year-end check-in |
| Kade Leblanc | COLD | 61 | Kade Leblanc | phone | Last_Touch=2026-09-26, Next_Action=Reply first: they texted last (2026-09-26). Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Todd Cotanno | COLD | 81 | Todd Cotanno | email | Last_Touch=2026-07-25, Next_Action=Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Khari Henry | COLD | 3448 | Khari Henry | phone | Last_Touch=2026-08-13, Next_Action=Reply first: they texted last (2026-08-13). Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Cherri Harrison | COLD | 532 | Cherri Harrison | phone | Last_Touch=2026-06-12, Next_Action=Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Hailey Francis | COLD | 448 | Hailey Francis | phone | Last_Touch=2026-03-05, Next_Action=Ninja call on what they said (see top_signal): 'Still thinking about it? Want me to pull a few options or run what yours would sell for?' |
| Ben Lejune | COLD | 356 | Ben Lejune | phone | Last_Touch=2026-02-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jesse Debenetto | COLD | 371 | Jesse Debenetto | phone | Last_Touch=2026-03-20, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Scott McCubbins | COLD | 419 | Scott McCubbins | phone | Last_Touch=2026-03-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jared Legget | COLD | 93 | Jared Legget | phone | Last_Touch=2026-04-30, Next_Action=Ask how the move is going. Offer help on either end (local or referral out). |
| Logan Macrae | COLD | 457 | Logan Macrae | phone | Last_Touch=2026-03-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jack Havard | COLD | 378 | Jack Havard | phone | Last_Touch=2026-03-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kelly foster | COLD | 460 | Kelly foster | phone | Last_Touch=2026-03-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trevor Bening | COLD | 554 | Trevor Bening | phone | Last_Touch=2026-02-16, Next_Action=Congrats + ask how planning's going. Save home talk for after the wedding unless they bring it up. |
| Lauren Summers | COLD | 192 | Lauren Summers | phone | Last_Touch=2026-03-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mexicsn Hunge | COLD | 668 | Mexicsn Hunge | phone | Last_Touch=2026-01-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cassidy Chapman | COLD | 401 | Cassidy Chapman | phone | Last_Touch=2026-03-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Dustin Harris | COLD | 461 | Dustin Harris | phone | Last_Touch=2026-03-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kaylee Francis | COLD | 437 | Kaylee Francis | phone | Last_Touch=2026-03-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cynthia Smith | COLD | 414 | Cynthia Smith | email | Last_Touch=2026-03-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Galen Vaccaro | COLD | 520 | Galen Vaccaro | phone | Last_Touch=2026-02-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jace Trainer | COLD | 557 | Jace Trainer | phone | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Patrick Vince | COLD | 630 | Patrick Vince | phone | Last_Touch=2026-01-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Yancey Ball | COLD | 435 | Yancey Ball | phone | Last_Touch=2026-03-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jesse Walters | COLD | 558 | Jesse Walters | phone | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Max Benderson | COLD | 415 | Max Benderson | phone | Last_Touch=2026-03-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Morgan Thomas | COLD | 402 | Morgan Thomas | phone | Last_Touch=2026-03-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Benjamin Record | COLD | 350 | Benjamin Record | email | Last_Touch=2026-03-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Denver Pierce | COLD | 639 | Denver Pierce | phone | Last_Touch=2026-01-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| LISA CARLINE | COLD | 584 | LISA CARLINE | email | Last_Touch=2026-02-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Sam Guidroz | COLD | 651 | Sam Guidroz | phone | Last_Touch=2026-01-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Anthony Alcantara | COLD | 482 | Anthony Alcantara | phone | Last_Touch=2026-02-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Austin Earhart | COLD | 441 | Austin Earhart | phone | Last_Touch=2026-03-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Chandler Leiva | COLD | 329 | Chandler Leiva | phone | Last_Touch=2026-03-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Joe Roberts | COLD | 695 | Joe Roberts | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kade Delee | COLD | 367 | Kade Delee | phone | Last_Touch=2026-03-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jordan jumorville | COLD | 398 | Jordan jumorville | phone | Last_Touch=2026-03-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kenny Wells | COLD | 501 | Kenny Wells | phone | Last_Touch=2026-02-25, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Melo Myers | COLD | 281 | Melo Myers | phone | Last_Touch=2026-04-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Srvani Singu | COLD | 654 | Srvani Singu | phone | Last_Touch=2026-01-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tisha Phelan | COLD | 570 | Tisha Phelan | phone | Last_Touch=2026-02-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trey Leiva | COLD | 360 | Trey Leiva | email | Last_Touch=2026-03-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Courtney Richardson | COLD | 563 | Courtney Richardson | phone | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| katie Fb | COLD | 638 | katie Fb | phone | Last_Touch=2026-01-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Alex Berry | COLD | 573 | Alex Berry | phone | Last_Touch=2026-02-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Carissa Austin | COLD | 659 | Carissa Austin | phone | Last_Touch=2026-01-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jacob Wck | COLD | 431 | Jacob Wck | phone | Last_Touch=2026-03-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kendall Bolton | COLD | 631 | Kendall Bolton | phone | Last_Touch=2026-01-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Rene Tassin | COLD | 625 | Rene Tassin | phone | Last_Touch=2026-01-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Rhino Electrical | COLD | 585 | Rhino Electrical | phone | Last_Touch=2026-02-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Will Chemell | COLD | 423 | Will Chemell | phone | Last_Touch=2026-03-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Irv Daniel | COLD | 691 | Irv Daniel | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Scott David | COLD | 484 | Scott David | phone | Last_Touch=2026-02-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Alvin Mccormick | COLD | 426 | Alvin Mccormick | phone | Last_Touch=2026-03-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Austin Zachary | COLD | 298 | Austin Zachary | email | Last_Touch=2026-04-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brad Schaeffer | COLD | 567 | Brad Schaeffer | email | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Christian Frey | COLD | 609 | Christian Frey | phone | Last_Touch=2026-02-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Haley Mason | COLD | 583 | Haley Mason | phone | Last_Touch=2026-02-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Hunter Gerald | COLD | 670 | Hunter Gerald | phone | Last_Touch=2026-01-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Hunter Mallet | COLD | 511 | Hunter Mallet | email | Last_Touch=2026-02-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jamie Martin | COLD | 381 | Jamie Martin | email | Last_Touch=2026-03-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Justin LeBlanc | COLD | 565 | Justin LeBlanc | email | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Maverick Jones | COLD | 674 | Maverick Jones | email | Last_Touch=2026-01-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Andrew Chit | COLD | 681 | Andrew Chit | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Big Country | COLD | 521 | Big Country | phone | Last_Touch=2026-02-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brandon Advisor | COLD | 535 | Brandon Advisor | phone | Last_Touch=2026-02-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Clay Reyonalds | COLD | 568 | Clay Reyonalds | phone | Last_Touch=2026-02-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Danny Myers | COLD | 405 | Danny Myers | phone | Last_Touch=2026-03-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| David Dart | COLD | 693 | David Dart | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Emery Barrilleaux | COLD | 404 | Emery Barrilleaux | phone | Last_Touch=2026-03-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Katie Moniduck | COLD | 683 | Katie Moniduck | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Pastor Kelvin | COLD | 696 | Pastor Kelvin | email | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| RILEY GREGORY | COLD | 611 | RILEY GREGORY | phone | Last_Touch=2026-02-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Andrew Control | COLD | 533 | Andrew Control | phone | Last_Touch=2026-02-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Britney Renee | COLD | 694 | Britney Renee | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Crystal Bonin | COLD | 689 | Crystal Bonin | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Forrest Town | COLD | 524 | Forrest Town | phone | Last_Touch=2026-02-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Heath Monte | COLD | 429 | Heath Monte | phone | Last_Touch=2026-03-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Martin Jr | COLD | 703 | Martin Jr | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Sign Call Lafayette | COLD | 424 | Sign Lafayette | phone | Last_Touch=2026-03-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tim Carr | COLD | 699 | Tim Carr | phone | Last_Touch=2026-01-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Greg & Sarah Junghans | CONTACT | 88 | Greg Junghas | phone | Last_Touch=2026-09-09, Next_Action=Answer him, then ask about the next home (equity roll). Ask for a review. |
| Jenny Wilcox | CONTACT | 7223 | Jenny Wilcox | phone | Next_Action="How yall liking the new place?!" then a handwritten note |
| Logan West | CONTACT | 1922 | logan west | phone | Last_Touch=2026-09-09, Next_Action=Reply first, then FORD |
| Myles Simmons | CONTACT | 910 | Myles Simmons | phone | Last_Touch=2026-09-09, Next_Action=Day-45 call |
| Katelyn Hays | CONTACT | 3512 | Katelyn Hays | phone | Last_Touch=2026-09-04, Next_Action=Reply first: they texted last (2026-09-04). Congrats on the new job. FORD: how's the commute, still happy with where yall live? |
| Natalie Verbois | CONTACT | 3624 | Natalie Verbois | phone | Last_Touch=2026-10-06, Next_Action=Congrats + ask how planning's going. Save home talk for after the wedding unless they bring it up. |
| Sydney Cowgill | CONTACT | 166 | Sydney Cowgill | phone | Last_Touch=2026-09-23, Next_Action=Reply first: they texted last (2026-09-23). Thank-you note for thinking of you. Ask how you can return the favor. |
| EDWARDS DREw | CONTACT | 18 | EDWARDS DREw | phone | Last_Touch=2026-08-18, Next_Action=Reply first: they texted last (2026-08-18). Handwritten sympathy note. No business ask. |
| Gavin Shaw | CONTACT | 116 | Gavin Shaw | phone | Last_Touch=2026-08-26, Next_Action=Handwritten sympathy note. No business ask. |
| Mac Meyer | CONTACT | 73 | Mac Meyer | phone | Last_Touch=2026-10-05, Next_Action=Reply first: they texted last (2026-10-05). Congrats note, then FORD: how's the little one doing, still got enough room? |
| Carrie Godbold | CONTACT | 580 | Carrie Godbold | email | Last_Touch=2026-10-05, Next_Action=Reply first: they texted last (2026-10-05). |
| Haylie Guillory | CONTACT | 82 | Haylie Guillory | phone | Last_Touch=2026-10-05, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Katelyn morris | CONTACT | 1434 | Katelyn morris | phone | Last_Touch=2026-09-04, Next_Action=Reply first: they texted last (2026-09-04). |
| Keonsha Alexander | CONTACT | 45 | Keonsha Alexander | email | Last_Touch=2026-09-17, Next_Action=Reply first: they texted last (2026-09-17). |
| Suzanne Lancaster | CONTACT | 1617 | Suzanne Lancaster | email | Last_Touch=2026-09-29, Next_Action=Reply first: they texted last (2026-09-29). |
| emily vince | CONTACT | 614 | emily vince | email | Last_Touch=2026-08-19, Next_Action=Reply first: they texted last (2026-08-19). |
| Lisa Sorrel | CONTACT | 78 | Lisa Sorrel | email | Last_Touch=2026-07-24, Next_Action=Ask how the grad is doing. Later: space/empty-nest check. |
| Nic Lemoine | CONTACT | 124 | Nic Lemoine | phone | Last_Touch=2026-09-23, Next_Action=Reply first: they texted last (2026-09-23). Congrats note, then FORD: how's the little one doing, still got enough room? |
| Sarah Denham | CONTACT | 142 | Sarah Denham | phone | Last_Touch=2026-09-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brittan Tate | CONTACT | 70 | Brittan Tate | email | Last_Touch=2026-09-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cole Jackson | CONTACT | 3848 |  | phone | Last_Touch=2026-09-22, Next_Action=Reply first: they texted last (2026-09-22). |
| Haley Courtney | CONTACT | 111 | Haley Courtney | email | Last_Touch=2026-07-12, Next_Action=Ask how the move is going. Offer help on either end (local or referral out). |
| Alyssa Horton | CONTACT | 31 | Alyssa Horton | phone | Last_Touch=2026-09-24, Next_Action=Reply first: they texted last (2026-09-24). Send 1-2 deals that fit and ask their buy box (price, area, rental vs flip). |
| Lizzie Benzer | CONTACT | 193 | Lizzie Benzer | email | Last_Touch=2026-09-24, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Sam Francis | CONTACT | 60 | Sam Francis | phone | Last_Touch=2026-09-15, Next_Action=Reply first: they texted last (2026-09-15). |
| Hayley Douglas | CONTACT | 27 | Hayley Douglas | phone | Last_Touch=2026-08-18, Next_Action=Reply first: they texted last (2026-08-18). |
| Sarah Watson | CONTACT | 14 | Sarah Watson | phone | Last_Touch=2026-10-04, Next_Action=Reply first: they texted last (2026-10-04). |
| ACCARDO Chandler | CONTACT | 355 | ACCARDO Chandler | phone | Last_Touch=2026-09-28, Next_Action=Reply first: they texted last (2026-09-28). |
| Angelise Freud | CONTACT | 10 | Angelise Freud | phone | Last_Touch=2026-08-14, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Ashley Parrot | CONTACT | 1544 | Ashley Parrot | email | Last_Touch=2026-10-06, Next_Action=Thank-you note for thinking of you. Ask how you can return the favor. |
| Brian Shipp | CONTACT | 154 | Brian Shipp | email | Last_Touch=2026-10-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Halee Amato | CONTACT | 1718 | Halee Amato | phone | Last_Touch=2026-09-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lisa West | CONTACT | 3601 | Lisa West | phone | Last_Touch=2026-09-09, Next_Action=Reply first: they texted last (2026-09-09). |
| Sam Mcahon | CONTACT | 251 | Sam Mcahon | phone | Last_Touch=2026-04-12, Next_Action=Post-close FORD call + handwritten note; offer an annual Real Estate Review. |
| Tanner Hillyard | CONTACT | 330 | Tanner Hillyard | email | Last_Touch=2026-10-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tyler Boyle | CONTACT | 22 | Tyler Boyle | phone | Last_Touch=2026-10-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Danielle Duby | CONTACT | 7 | Danielle Duby | email | Last_Touch=2026-09-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Janice Melacon | CONTACT | 3485 | Janice Melacon | phone | Last_Touch=2026-09-17, Next_Action=Reply first: they texted last (2026-09-17). |
| Jorden Mumphreys | CONTACT | 74 | Jorden Mumphreys | phone | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Jules Smith | CONTACT | 254 | Jules Smith | phone | Last_Touch=2026-09-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kyle Serrett | CONTACT | 75 | Kyle Serrett | phone | Last_Touch=2026-09-22, Next_Action=Reply first: they texted last (2026-09-22). |
| Lindsay Comeaux | CONTACT | 13 | Lindsay Comeaux | phone | Last_Touch=2026-09-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Priya Jacob | CONTACT | 176 | Priya Jacob | email | Last_Touch=2026-08-22, Next_Action=Reply first: they texted last (2026-08-22). |
| Roman Glancey | CONTACT | 248 | Roman Glancey | phone | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Sydnee Gautreau | CONTACT | 3633 | Sydnee Gautreau | phone | Last_Touch=2026-09-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Creed David | CONTACT | 480 | Creed David | phone | Last_Touch=2026-07-28, Next_Action=Congrats + ask how planning's going. Save home talk for after the wedding unless they bring it up. |
| Hayden Jackson | CONTACT | 334 | Hayden Jackson | phone | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Justin Black | CONTACT | 23 | Justin Black | email | Last_Touch=2026-09-30, Next_Action=Reply first: they texted last (2026-09-30). |
| Kimberly Nicolas | CONTACT | 3479 | Kimberly Nicolas | phone | Last_Touch=2026-09-29, Next_Action=Reply first: they texted last (2026-09-29). |
| Lane Falcon | CONTACT | 44 | Lane Falcon | phone | Last_Touch=2026-09-30, Next_Action=Reply first: they texted last (2026-09-30). |
| Rima Hodgeson | CONTACT | 77 | Rima Hodgeson | phone | Last_Touch=2026-06-18, Next_Action=Ask how the grad is doing. Later: space/empty-nest check. |
| Shideh Lynch | CONTACT | 174 | Shideh Lynch | phone | Last_Touch=2026-09-25, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Wilson Alvarez | CONTACT | 475 | Wilson Alvarez | phone | Last_Touch=2026-05-07, Next_Action=Congrats on the new job. FORD: how's the commute, still happy with where yall live? |
| Danielle Musso | CONTACT | 4716 | Danielle Musso | phone | Last_Touch=2026-09-22, Next_Action=Reply first: they texted last (2026-09-22). |
| Hollan Knight | CONTACT | 188 | Hollan Knight | phone | Last_Touch=2026-07-31, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Marlon Bourgeois | CONTACT | 99 | Marlon Bourgeois | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Andrew Myrick | CONTACT | 3586 | Andrew Myrick | phone | Last_Touch=2026-10-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brice Babin | CONTACT | 39 | Brice Babin | phone | Last_Touch=2026-08-27, Next_Action=Reply first: they texted last (2026-08-27). |
| Nick Holt | CONTACT | 307 | Nick Holt | phone | Last_Touch=2026-09-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Philip Cazayoux | CONTACT | 67 | Philip Cazayoux | phone | Last_Touch=2026-08-13, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Amanda Hunt | CONTACT | 487 | Amanda Hunt | phone | Last_Touch=2026-09-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brandon Brown | CONTACT | 462 | Brandon Brown | email | Last_Touch=2026-09-17, Next_Action=Reply first: they texted last (2026-09-17). |
| Brittany Curry | CONTACT | 282 | Brittany Curry | phone | Last_Touch=2026-09-30, Next_Action=Reply first: they texted last (2026-09-30). |
| Craig Pourciou | CONTACT | 3476 | Craig Pourciou | email | Last_Touch=2026-07-09, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Jenna Winslow | CONTACT | 380 | Jenna Winslow | email | Last_Touch=2026-07-17, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Myles Jones | CONTACT | 607 | Myles Jones | email | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Olivier Doin | CONTACT | 3579 | Olivier Doin | email | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Shelly Landry | CONTACT | 3535 | Shelly Landry | email | Last_Touch=2026-09-28, Next_Action=Reply first: they texted last (2026-09-28). |
| Tonya Gautreau | CONTACT | 3406 | Tonya Gautreau | phone | Last_Touch=2026-10-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Clint Stockstill | CONTACT | 199 | Clint Stockstill | phone | Last_Touch=2026-08-27, Next_Action=Congrats note, then FORD: how's the little one doing, still got enough room? |
| Darrell Lakvold | CONTACT | 276 | Darrell Lakvold | phone | Last_Touch=2026-08-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Michah Ginos | CONTACT | 168 | Michah Ginos | phone | Last_Touch=2026-10-01, Next_Action=Reply first: they texted last (2026-10-01). |
| Alicia Ruiz | CONTACT | 86 | Alicia Ruiz | email | Last_Touch=2026-05-29, Next_Action=Thank-you note for thinking of you. Ask how you can return the favor. |
| Carter Rogillio | CONTACT | 49 | Carter Rogillio | phone | Last_Touch=2026-09-24, Next_Action=Reply first: they texted last (2026-09-24). |
| Debbie Riley | CONTACT | 502 | Debbie Riley | email | Last_Touch=2026-06-17, Next_Action=Congrats. Ask about plans: stay, downsize, land? |
| Hunter White | CONTACT | 304 | Hunter White | phone | Last_Touch=2026-09-11, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Joe Ai | CONTACT | 3501 | Joe Ai | phone | Last_Touch=2026-09-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Johnathon Tiddlebon | CONTACT | 11 | Johnathon Tiddlebon | phone | Last_Touch=2026-08-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Josh Treme | CONTACT | 1 | Josh Treme | phone | Last_Touch=2026-07-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kaine Pace | CONTACT | 167 | Kaine Pace | phone | Last_Touch=2026-08-28, Next_Action=Reply first: they texted last (2026-08-28). |
| Katie Lachey | CONTACT | 1308 | Katie Lachey | phone | Last_Touch=2026-07-20, Next_Action=Thank-you note for thinking of you. Ask how you can return the favor. |
| Racheal Taylor | CONTACT | 467 | Racheal Taylor | phone | Last_Touch=2026-07-20, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Alicia Bethley | CONTACT | 289 | Alicia Bethley | phone | Last_Touch=2026-06-23, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Annabelle Gonzales | CONTACT | 216 | Annabelle Gonzales | phone | Last_Touch=2026-09-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Annie Graves | CONTACT | 208 | Annie Graves | phone | Last_Touch=2026-08-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Armetia Felix | CONTACT | 3551 | Armetia Felix | email | Last_Touch=2026-08-03, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Brother Cole | CONTACT | 486 | Brother Cole | phone | Last_Touch=2026-09-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Caroline Davis | CONTACT | 103 | Caroline Davis | phone | Last_Touch=2026-07-20, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Casey Sanders | CONTACT | 676 | Casey Sanders | email | Last_Touch=2026-08-14, Next_Action=Reply first: they texted last (2026-08-14). |
| Erin Hybart | CONTACT | 660 | Erin Hybart | phone | Last_Touch=2026-05-26, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Jose Martinez | CONTACT | 29 |  | phone | Last_Touch=2026-07-13, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Trace Mcmanus | CONTACT | 151 | Trace Mcmanus | phone | Last_Touch=2026-10-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kennedy Mount | CONTACT | 523 | Kennedy Mount | phone | Last_Touch=2026-06-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mckenzie Francis | CONTACT | 244 | Mckenzie Francis | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Robert Burke | CONTACT | 432 | Robert Burke | email | Last_Touch=2026-07-16, Next_Action=Congrats + ask how planning's going. Save home talk for after the wedding unless they bring it up. |
| Amber Taylor | CONTACT | 53 | Amber Taylor | email | Last_Touch=2026-07-20, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Ardis Cla | CONTACT | 3563 | Ardis Cla | phone | Last_Touch=2026-07-21, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Barret Hollingsworth | CONTACT | 55 | Barret Hollingsworth | phone | Last_Touch=2026-08-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Bella Dart | CONTACT | 50 | Bella Dart | phone | Last_Touch=2026-09-18, Next_Action=Reply first: they texted last (2026-09-18). |
| Clint LaCour | CONTACT | 106 | Clint LaCour | email | Last_Touch=2026-06-14, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Danny Brown | CONTACT | 471 | Danny Brown | phone | Last_Touch=2026-09-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Janet Schwartz | CONTACT | 16 | Janet Schwartz | phone | Last_Touch=2026-06-13, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Jude Bridwell | CONTACT | 101 | Jude Bridwell | phone | Last_Touch=2026-08-19, Next_Action=Reply first: they texted last (2026-08-19). |
| Katie Trichel | CONTACT | 333 | Katie Trichel | phone | Last_Touch=2026-08-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lathan David | CONTACT | 114 | Lathan David | email | Last_Touch=2026-07-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Stephanie Fontaine | CONTACT | 37 | Stephanie Fontaine | email | Last_Touch=2026-07-13, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Tyler Lejune | CONTACT | 534 | Tyler Lejune | phone | Last_Touch=2026-08-15, Next_Action=Reply first: they texted last (2026-08-15). |
| Dy Miller | CONTACT | 79 | Dy Miller | phone | Last_Touch=2026-07-22, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Juli Jenkins | CONTACT | 1538 | Juli Jenkins | email | Last_Touch=2026-09-09, Next_Action=Reply first: they texted last (2026-09-09). |
| Kristin Malarcher | CONTACT | 789 | Kristin Malarcher | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Leigh Anne | CONTACT | 907 | Leigh Anne | phone | Last_Touch=2026-07-29, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lori Mccolllum | CONTACT | 364 | Lori Mccolllum | email | Last_Touch=2026-08-30, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Matt Barnes | CONTACT | 421 | Matt Barnes | phone | Last_Touch=2026-10-02, Next_Action=Reply first: they texted last (2026-10-02). |
| Maxwell Jones | CONTACT | 177 | Maxwell Jones | phone | Last_Touch=2026-07-09, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Randi Deitric | CONTACT | 171 | Randi Deitric | phone | Last_Touch=2026-04-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Alicia Brian | CONTACT | 826 | Alicia Brian | email | Last_Touch=2026-07-10, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Allison Parker | CONTACT | 411 | Allison Parker | email | Last_Touch=2026-06-19, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Jessica Canning | CONTACT | 363 | Jessica Canning | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Katie Toups | CONTACT | 3422 | Katie Toups | phone | Last_Touch=2026-07-26, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Mac Moore | CONTACT | 24 | Mac Moore | email | Last_Touch=2026-08-20, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Macki Martin | CONTACT | 2 | Macki Martin | phone | Last_Touch=2026-08-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Shane Hernadez | CONTACT | 561 | Shane Hernadez | phone | Last_Touch=2026-08-02, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Skip Shows | CONTACT | 15 | Skip Shows | email | Last_Touch=2026-06-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tori Scheink | CONTACT | 42 | Tori Scheink | phone | Last_Touch=2026-06-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Alden Daniel | CONTACT | 207 | Alden Daniel | phone | Last_Touch=2026-05-29, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Andre Seghars | CONTACT | 543 | Andre Seghars | email | Last_Touch=2026-07-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Big Red | CONTACT | 3625 | Big Red | phone | Last_Touch=2026-08-08, Next_Action=Reply first: they texted last (2026-08-08). |
| Charley Gremillion | CONTACT | 159 | Charley Gremillion | phone | Last_Touch=2026-06-16, Next_Action=Handwritten sympathy note. No business ask. |
| Foundation Tabby | CONTACT | 89 | Foundation Tabby | phone | Last_Touch=2026-05-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Greg Martinez | CONTACT | 58 | Greg Martinez | phone | Last_Touch=2026-07-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| James Polk | CONTACT | 3345 | James Polk | phone | Last_Touch=2026-08-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jimmy Photos | CONTACT | 1924 | Jimmy Photos | phone | Last_Touch=2026-07-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mila Arocha | CONTACT | 3472 | ?Valdes household | phone | Last_Touch=2026-09-23, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Preston Samuelson | CONTACT | 30 | Preston Samuelson | phone | Last_Touch=2026-05-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Caitlin Daniels | CONTACT | 1760 | Caitlin Daniels | email | Last_Touch=2026-09-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Carlene Rentz | CONTACT | 3393 | Carlene Rentz | email | Last_Touch=2026-06-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Holly Bar | CONTACT | 3553 | Holly Bar | phone | Last_Touch=2026-07-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kandi Lou | CONTACT | 536 | Kandi Lou | phone | Last_Touch=2026-07-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kaylyn Ward | CONTACT | 409 | Kaylyn Ward | phone | Last_Touch=2026-03-13, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Layne Sebastian | CONTACT | 806 | Layne Sebastian | phone | Last_Touch=2026-07-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Logan Video | CONTACT | 3631 | Logan Video | phone | Last_Touch=2026-09-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Staci mcgugh | CONTACT | 686 | Staci mcgugh | phone | Last_Touch=2026-07-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Alia Horton | CONTACT | 3590 | Alia Horton | phone | Last_Touch=2026-08-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cade Mcklweee | CONTACT | 122 | Cade Mcklweee | phone | Last_Touch=2026-08-15, Next_Action=Reply first: they texted last (2026-08-15). |
| Gina Miller | CONTACT | 375 | Gina Miller | phone | Last_Touch=2026-07-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Josh Romaine | CONTACT | 182 | Josh Romaine | phone | Last_Touch=2026-06-18, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Lauren Foret | CONTACT | 275 | Lauren Foret | phone | Last_Touch=2026-06-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Patrick Mill | CONTACT | 3031 | Patrick Mill | phone | Last_Touch=2026-09-18, Next_Action=Reply first: they texted last (2026-09-18). |
| Renee Eades | CONTACT | 3386 | Renee Eades | phone | Last_Touch=2026-09-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Samuel Mistretta | CONTACT | 3542 | Samuel Mistretta | phone | Last_Touch=2026-08-18, Next_Action=Reply first: they texted last (2026-08-18). |
| Sara Gummow | CONTACT | 8 | Sara Gummow | phone | Last_Touch=2026-05-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Toree Braud | CONTACT | 600 | Toree Braud | phone | Last_Touch=2026-06-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tre Berthelot | CONTACT | 374 | Tre Berthelot | phone | Last_Touch=2026-08-14, Next_Action=Reply first: they texted last (2026-08-14). |
| Austin Croft | CONTACT | 653 | Austin Croft | phone | Last_Touch=2026-05-28, Next_Action=Congrats + ask how planning's going. Save home talk for after the wedding unless they bring it up. |
| Austin Henrickson | CONTACT | 249 | Austin Henrickson | email | Last_Touch=2026-07-03, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Karley Morris | CONTACT | 3639 | Karley Morris | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Michael Borne | CONTACT | 235 | Michael Borne | phone | Last_Touch=2026-09-05, Next_Action=Reply first: they texted last (2026-09-05). |
| NORWOOD Ronnie | CONTACT | 624 | NORWOOD Ronnie | phone | Last_Touch=2026-08-31, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Rachel Lindsey | CONTACT | 3548 | Rachel Lindsey | phone | Last_Touch=2026-07-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Raul Stucco | CONTACT | 3616 | Raul Stucco | phone | Last_Touch=2026-08-04, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Sam Cotanno | CONTACT | 642 | Sam Cotanno | phone | Last_Touch=2026-08-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Scott Gaspard | CONTACT | 1419 | Scott Gaspard | email | Last_Touch=2026-09-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Suzi Gautreaux | CONTACT | 636 | Suzi Gautreaux | email | Last_Touch=2026-08-14, Next_Action=Reply first: they texted last (2026-08-14). |
| Tommy Kaizen | CONTACT | 87 | Tommy Kaizen | phone | Last_Touch=2026-07-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Austin Leblanc | CONTACT | 252 | Austin Leblanc | phone | Last_Touch=2026-09-05, Next_Action=Reply first: they texted last (2026-09-05). |
| Colton Courrege | CONTACT | 621 | Colton Courrege | phone | Last_Touch=2026-08-19, Next_Action=Reply first: they texted last (2026-08-19). |
| Corey Sorrel | CONTACT | 3341 | Corey Sorrel | phone | Last_Touch=2026-07-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| David Purpera | CONTACT | 702 | David Purpera | email | Last_Touch=2026-07-29, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Destiny Bossier | CONTACT | 9 | Destiny Bossier | phone | Last_Touch=2026-06-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Hooters Haley | CONTACT | 3626 | Hooters Haley | phone | Last_Touch=2026-08-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kayla Wesley | CONTACT | 3388 | Kayla Wesley | phone | Last_Touch=2026-08-10, Next_Action=Reply first: they texted last (2026-08-10). |
| Liz Aucoin | CONTACT | 3434 | Liz Aucoin | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Rhaoul Jr | CONTACT | 388 | Rhaoul Jr | phone | Last_Touch=2026-08-30, Next_Action=Reply first: they texted last (2026-08-30). |
| Todd Leblanc | CONTACT | 386 | Todd Leblanc | email | Last_Touch=2026-08-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Will Douglas | CONTACT | 589 | Will Douglas | phone | Last_Touch=2026-06-29, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Blake Moss | CONTACT | 865 | Blake Moss | email | Last_Touch=2026-09-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Carson Owens | CONTACT | 3610 | Carson Owens | phone | Last_Touch=2026-08-09, Next_Action=Reply first: they texted last (2026-08-09). |
| Hanna Chustz | CONTACT | 134 | Hanna Chustz | email | Last_Touch=2026-04-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jena Raegan | CONTACT | 197 | Jena Raegan | phone | Last_Touch=2026-06-02, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Jennifer Boyd | CONTACT | 348 | Jennifer Boyd | email | Last_Touch=2026-06-17, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Mia Rivet | CONTACT | 91 | Mia Rivet | phone | Last_Touch=2026-05-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Amanda Boudreaux | CONTACT | 3585 | Amanda Boudreaux | phone | Last_Touch=2026-07-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Austin Clayton | CONTACT | 3408 | Austin Clayton | phone | Last_Touch=2026-07-03, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Baylie Casino | CONTACT | 750 | Baylie Casino | phone | Last_Touch=2026-10-03, Next_Action=Reply first: they texted last (2026-10-03). |
| Dwayne Dufor | CONTACT | 3511 | Dwayne Dufor | phone | Last_Touch=2026-07-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Julie Dixon | CONTACT | 425 | Julie Dixon | phone | Last_Touch=2026-03-10, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Sharon Harris | CONTACT | 671 | Sharon Harris | phone | Last_Touch=2026-07-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Susan Charlet | CONTACT | 3387 | Susan Charlet | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cera Blackburn | CONTACT | 2555 | Cera Blackburn | phone | Last_Touch=2026-07-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Dajah Homes | CONTACT | 3522 | Dajah Homes | phone | Last_Touch=2026-07-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Davis Havard | CONTACT | 62 | Davis Havard | phone | Last_Touch=2026-05-26, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Eric Evans | CONTACT | 52 | Eric Evans | phone | Last_Touch=2026-06-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Gavin hausey | CONTACT | 133 | Gavin hausey | phone | Last_Touch=2026-04-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Hunter Alario | CONTACT | 569 | Hunter Alario | phone | Last_Touch=2026-09-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jillian Burkhart | CONTACT | 3603 | Jillian Burkhart | email | Last_Touch=2026-08-01, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| John Stagg | CONTACT | 454 | John Stagg | phone | Last_Touch=2026-09-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Katelyn Coloenels Club | CONTACT | 3550 | Katelyn Club | phone | Last_Touch=2026-08-20, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Konnor James | CONTACT | 679 | Konnor James | phone | Last_Touch=2026-06-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Phyllis Butler | CONTACT | 1169 | Phyllis Butler | phone | Last_Touch=2026-07-06, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Sandy Head | CONTACT | 3599 | Sandy Head | phone | Last_Touch=2026-08-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Steven Therapist | CONTACT | 104 | Steven Therapist | phone | Last_Touch=2026-07-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Summer Jones | CONTACT | 446 | Summer Jones | email | Last_Touch=2026-08-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Christy Meyer | CONTACT | 120 | Christy Meyer | phone | Last_Touch=2026-04-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Clarke LeGrange | CONTACT | 626 | Clarke LeGrange | email | Last_Touch=2026-01-30, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Darren Day | CONTACT | 3469 | Darren Day | email | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Don Spillman | CONTACT | 494 | Don Spillman | phone | Last_Touch=2026-05-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Freddi Gayle | CONTACT | 3662 | Freddi Gayle | phone | Last_Touch=2026-08-26, Next_Action=Reply first: they texted last (2026-08-26). |
| Hanna Liljeberg | CONTACT | 1344 | Hanna Liljeberg | phone | Last_Touch=2026-08-23, Next_Action=Reply first: they texted last (2026-08-23). |
| Joel Frosh | CONTACT | 1699 | Joel Frosh | email | Last_Touch=2026-08-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mackie Cathey | CONTACT | 548 | Mackie Cathey | email | Last_Touch=2026-06-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mandy Naquin | CONTACT | 3442 | Mandy Naquin | phone | Last_Touch=2026-06-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Dillan Rider | CONTACT | 3493 | Dillan Rider | phone | Last_Touch=2026-07-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| James Francis | CONTACT | 7221 | James Francis | phone | Last_Touch=2026-08-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lacy Romaine | CONTACT | 2828 | Lacy Romaine | phone | Last_Touch=2026-07-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lauri Kitchen | CONTACT | 2473 | Lauri Kitchen | email | Last_Touch=2026-06-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Major Jones | CONTACT | 3593 | Major Jones | phone | Last_Touch=2026-07-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Meghan Knox | CONTACT | 150 | Meghan Knox | phone | Last_Touch=2026-09-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Melissa Reech | CONTACT | 555 | Melissa Reech | email | Last_Touch=2026-08-27, Next_Action=Reply first: they texted last (2026-08-27). |
| Natalie Mancuso | CONTACT | 3630 | Natalie Mancuso | email | Last_Touch=2026-08-11, Next_Action=Reply first: they texted last (2026-08-11). |
| Nick Shake | CONTACT | 510 | Nick Shake | phone | Last_Touch=2026-06-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Ryan Smith | CONTACT | 2054 | Ryan Smith | phone | Last_Touch=2026-09-22, Next_Action=Reply first: they texted last (2026-09-22). |
| Sonya David | CONTACT | 108 | Sonya David | phone | Last_Touch=2026-04-29, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Stephen Eisenbraun | CONTACT | 229 | Stephen Eisenbraun | email | Last_Touch=2026-05-05, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Steve Pracht | CONTACT | 302 | Steve Pracht | phone | Last_Touch=2026-06-03, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tim Houlk | CONTACT | 2177 | Tim Houlk | email | Last_Touch=2026-07-08, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Daniel Davis | CONTACT | 572 | Daniel Davis | phone | Last_Touch=2026-08-02, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Daryl May | CONTACT | 158 | Daryl May | email | Last_Touch=2026-04-24, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Dru Westbrook | CONTACT | 3348 | Dru Westbrook | phone | Last_Touch=2026-05-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Dustin Alexander | CONTACT | 682 | Dustin Alexander | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jonny Carlson | CONTACT | 3572 | Jonny Carlson | phone | Last_Touch=2026-08-31, Next_Action=Reply first: they texted last (2026-08-31). |
| Marsha Lindsey | CONTACT | 232 | Marsha Lindsey | phone | Last_Touch=2026-04-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mary Poche | CONTACT | 162 | Mary Poche | phone | Last_Touch=2026-05-08, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Michael Hesse | CONTACT | 237 | Michael Hesse | phone | Last_Touch=2026-04-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Olivia Ballard | CONTACT | 3597 | Olivia Ballard | phone | Last_Touch=2026-08-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Stephen Courville | CONTACT | 1571 | Stephen Courville | phone | Last_Touch=2026-08-06, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trace David | CONTACT | 183 | Trace David | phone | Last_Touch=2026-04-22, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trent Jackson | CONTACT | 358 | Trent Jackson | phone | Last_Touch=2026-06-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Crystal Jones | CONTACT | 782 | Crystal Jones | phone | Last_Touch=2026-06-17, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Derrick Daigreport | CONTACT | 3389 | Derrick Daigreport | phone | Last_Touch=2026-05-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Giner Dantoni | CONTACT | 3558 | Giner Dantoni | phone | Last_Touch=2026-07-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jacob Loupe | CONTACT | 100 | Jacob Loupe | phone | Last_Touch=2026-04-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Jorddyn Bartender | CONTACT | 3638 | Jorddyn Bartender | phone | Last_Touch=2026-08-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mike Hill | CONTACT | 3560 | Mike Hill | phone | Last_Touch=2026-07-21, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Nathan Tallo | CONTACT | 1201 | Nathan Tallo | email | Last_Touch=2026-08-14, Next_Action=Reply first: they texted last (2026-08-14). |
| Nelly Nguyen | CONTACT | 172 | Nelly Nguyen | phone | Last_Touch=2026-04-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Nik Mccarty | CONTACT | 1304 | Nik Mccarty | phone | Last_Touch=2026-09-03, Next_Action=Reply first: they texted last (2026-09-03). |
| Sara Cooper | CONTACT | 102 | Sara Cooper | email | Last_Touch=2026-05-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tyler Alexander | CONTACT | 185 | Tyler Alexander | phone | Last_Touch=2026-04-22, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Gary Patterson | CONTACT | 170 | Gary Patterson | phone | Last_Touch=2026-04-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Greg Carol | CONTACT | 3366 | Greg Carol | phone | Last_Touch=2026-05-21, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Landon Bass | CONTACT | 376 | Landon Bass | phone | Last_Touch=2026-04-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lauren Cotton | CONTACT | 123 | Lauren Cotton | phone | Last_Touch=2026-04-28, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lisa pizzalato | CONTACT | 608 | Lisa pizzalato | phone | Last_Touch=2026-06-11, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Sign Jackson | CONTACT | 243 | Sign Jackson | phone | Last_Touch=2026-04-13, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trey Blue | CONTACT | 1337 | Trey Blue | phone | Last_Touch=2026-06-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| William Paey | CONTACT | 904 | William Paey | phone | Last_Touch=2026-06-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Aleena Kami | CONTACT | 3466 | Aleena Kami | phone | Last_Touch=2026-06-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Ashley Frederic | CONTACT | 3575 | Ashley Frederic | email | Last_Touch=2026-07-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cade Creel | CONTACT | 3361 | Cade Creel | phone | Last_Touch=2026-05-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Cierra Ramos | CONTACT | 3418 | Cierra Ramos | phone | Last_Touch=2026-06-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Corey Decote | CONTACT | 343 | Corey Decote | phone | Last_Touch=2026-06-16, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Daniel Handyman | CONTACT | 3648 | Daniel Handyman | phone | Last_Touch=2026-08-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Diaz Construction | CONTACT | 3637 | Diaz Construction | phone | Last_Touch=2026-08-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Hailey Dierlam | CONTACT | 3346 | Hailey Dierlam | phone | Last_Touch=2026-05-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Lindsey Kaizen | CONTACT | 390 | Lindsey Kaizen | phone | Last_Touch=2026-05-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Logan Milton | CONTACT | 262 | Logan Milton | email | Last_Touch=2026-04-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mon Restuarant | CONTACT | 3538 | Mon Restuarant | phone | Last_Touch=2026-07-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Randall Gremillion | CONTACT | 1347 | Randall Gremillion | phone | Last_Touch=2026-07-20, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Renee Carughi | CONTACT | 666 | Renee Carughi | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Robin Gauthe | CONTACT | 1395 | Robin Gauthe | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tim Garrett | CONTACT | 2030 | Tim Garrett | phone | Last_Touch=2026-08-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tweedy Bird | CONTACT | 645 | Tweedy Bird | phone | Last_Touch=2026-06-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Bond Babin | CONTACT | 2700 | Bond Babin | phone | Last_Touch=2026-06-10, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Chris Lewis | CONTACT | 3451 | Chris Lewis | phone | Last_Touch=2026-06-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Mark Investor | CONTACT | 271 | Mark Investor | phone | Last_Touch=2026-04-09, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Adam Breaux | CONTACT | 3443 | Adam Breaux | phone | Last_Touch=2026-06-21, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Anna Babin | CONTACT | 936 | Anna Babin | phone | Last_Touch=2026-06-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Ashley Treme | CONTACT | 34 | Ashley Treme | phone | Last_Touch=2026-06-12, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Brad Davis | CONTACT | 690 | Brad Davis | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Britney Pino | CONTACT | 2100 | Britney Pino | email | Last_Touch=2026-05-27, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Caine Pace | CONTACT | 767 | Caine Pace | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Eric Collete | CONTACT | 652 | Eric Collete | phone | Last_Touch=2026-01-11, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |
| Matt Richardson | CONTACT | 3474 | Matt Richardson | phone | Last_Touch=2026-06-25, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Tatsi Mckissick | CONTACT | 3490 | Tatsi Mckissick | phone | Last_Touch=2026-06-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Amber Graves | CONTACT | 3191 | Amber Graves | phone | Last_Touch=2026-06-14, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Ashlyn Castillo | CONTACT | 173 | Ashlyn Castillo | phone | Last_Touch=2026-04-23, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| CAMPBELL RICHAR | CONTACT | 2305 | CAMPBELL RICHAR | phone | Last_Touch=2026-06-19, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Edgar Man | CONTACT | 449 | Edgar Man | phone | Last_Touch=2026-05-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kristen Lizanno | CONTACT | 785 | Kristen Lizanno | email | Last_Touch=2026-05-18, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Steven Miller | CONTACT | 978 | Steven Miller | phone | Last_Touch=2026-06-15, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Austin Cook | CONTACT | 1710 | Austin Cook | phone | Last_Touch=2026-05-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Kevin Vanasselberg | CONTACT | 3395 | Kevin Vanasselberg | phone | Last_Touch=2026-05-30, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Trey Terral | CONTACT | 1764 | Trey Terral | phone | Last_Touch=2026-05-07, Next_Action=FORD check-in: 'how yall been? anything I can help with?' |
| Stephen Elliott | CONTACT | 285 | Stephen Elliott | email | Last_Touch=2026-04-06, Next_Action=Partner touch: thank-you or coffee; ask what they need from you. |

### Matches with only a note to add

none

### New people (would be created)

| HWC name | Tier | Category | Phone | Email | Band | Type |
|---|---|---|---|---|---|---|
| Bennett Ford Jr. & Monica Blum | HOT | client | (225) 721-7741 | monicablum1984.ml@gmail.com | HOT | client |
| Celeste Stout | HOT | other | (225) 229-3228 |  | HOT | unknown |
| Frances LeBlanc | WARM | lead |  | leblancf449@gmail.com | WARM | client |
| Chris Ogle | WARM | lead |  | hemiengine500@icloud.com | WARM | client |
| Boubkeur Barakate | WARM | lead |  | boubkeur1@gmail.com | WARM | client |
| Amber | WARM | friend | (225) 573-4472 |  | WARM | client |
| Gracie Facebook | COLD | friend | (225) 270-9346 |  |  | client |
| Jason Jackson | CONTACT | friend | (225) 281-4604 |  |  | client |
| Matthew Pearce | CONTACT | agent | (225) 485-1898 |  |  | agent |
| trinity duncan | CONTACT | friend | (225) 892-4119 |  |  | client |
| Kobie Anderson (Client) | CONTACT | client | (337) 257-7400 |  |  | client |
| Jeanne Green | CONTACT | friend | (225) 572-0299 |  |  | client |
| Kasey Gary | CONTACT | friend | (225) 445-3885 |  |  | client |
| Brad Johnson | CONTACT | friend | (225) 328-0205 |  |  | client |
| Collin Howell | CONTACT | friend | (225) 721-3020 |  |  | client |
| Scout KW | CONTACT | friend | (956) 244-4312 |  |  | client |
| Madison Poole | CONTACT | friend | (318) 421-9116 |  |  | client |
| Randy Arabie | CONTACT | friend | (225) 975-0882 |  |  | client |
| Ali Galliano | CONTACT | friend | (225) 588-1042 |  |  | client |
| Josh Catherines Son | CONTACT | friend | (225) 718-1716 |  |  | client |
| Karen Moore | CONTACT | vendor | (225) 268-1555 | karenmoore@kw.com |  | vendor |
| Kayla Evans | CONTACT | friend | (225) 284-1721 |  |  | client |
| Taylor C (landscape Client) | CONTACT | client | (225) 394-9243 |  |  | client |
| Hailey Marino | CONTACT | friend | (504) 229-1374 |  |  | client |
| Bobby Moran | CONTACT | vendor | (225) 335-8676 | robertmoran@kw.com |  | vendor |

## Unknowns

- Whether COLD should become band NURTURE and CONTACT should become DORMANT. Not applied until Caleb says.
- Whether a HWC phone should overwrite a CRM phone on a name match. This plan never touches primary_phone or email.
- The HWC "Last touch" column is Caleb's shorthand ("10/15 text, unanswered"); the parsed date is the first m/d in it.

Status: APPLIED 2026-10-19 at 18:07 Central, on Caleb's yes, through the Google Sheets connector from the cloud session. Matched 391 (390 Last_Touch, 391 Next_Action, 0 band), new 25 (person_id 7229 to 7253), 416 Notes rows, 855 Connector Log rows. Conflicts untouched. Read-back of every Contacts row in columns T to W matched the plan with 0 mismatches. Audit copy: `2026-10-19-hwc-merge-applied.audit.jsonl`.
