# Crawler user-agent test, calebjackson.org, October 12, 2026 (observed)

Method: curl from a cloud container, following redirects, one request per user agent per path. A 200 here means the edge did not block that user-agent string. It does not prove a verified bot passes any IP-based firewall rule.

| User agent | / | /about | /neighborhoods/st-francisville | /neighborhoods/zachary-golf |
|---|---|---|---|---|
| OAI-SearchBot/1.0 | 200 | 200 | 200 | 200 |
| GPTBot/1.2 | 200 | 200 | 200 | 200 |
| PerplexityBot/1.0 | 200 | 200 | 200 | 200 |
| ClaudeBot/1.0 | 200 | 200 | 200 | 200 |
| Googlebot/2.1 | 200 | 200 | 200 | 200 |
| bingbot/2.0 | 200 | 200 | 200 | 200 |
| Chrome 130 desktop | 200 | 200 | 200 | 200 |

Page sizes were identical across bots (about 690 KB home, 459 KB About, 804 KB St. Francisville, 838 KB Zachary Golf), so no bot-specific stripped version was served.

robots.txt (snapshot beside this file): wildcard rules disallow only /thankyou, /thank-you, /modules/, /internal/, /home-search/account, /home-search/auth/, /api/, /cdn-cgi/, /modals.html. No AI bot is blocked. Sitemap index lists four child sitemaps (static, blog, neighborhoods, properties). All four returned 200. The properties sitemap held 1 URL.

llms.txt (snapshot beside this file) is served and describes 39 pages. It still says "referral-driven service" and "client-referral-driven business approach", which conflicts with the approved "No paid leads, just service." wording. It leads with Greater Baton Rouge and names St. Francisville, Zachary, New Roads, Prairieville and the Felicianas.
