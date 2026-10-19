import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const cards=[
 {out:'just-sold-4615-41st.png',photo:'photo-41st.jpg',addr:'4615 41st Street',city:'Zachary, Louisiana',line:'My listing. Three bedrooms, a carport and that live oak out front. Closed in September for a happy seller.'},
 {out:'just-sold-11313-triche.png',photo:'photo-triche.jpg',addr:'11313 Triche Road',city:'Gonzales, Louisiana',line:'Represented the buyers. Renovated kitchen, covered patio, hot tub out back. Listed by The Musso Group.'}
];
for(const c of cards){const p=await b.newPage({viewport:{width:1080,height:1350}});const u='file://'+process.cwd()+'/card.html?'+new URLSearchParams(c).toString();await p.goto(u);await p.waitForTimeout(1500);await p.screenshot({path:c.out});await p.close();console.log('wrote',c.out)}
await b.close();
