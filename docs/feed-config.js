// Listing feed configuration.
// The search page reads one of two sources and normalises both to the same shape:
//   snapshot   Caleb's own listings, captured from calebjackson.org as a dated file (data/listings.json)
//   simplyrets A SimplyRETS RESO feed. Preview uses SimplyRETS' public demo credentials and demo data,
//              which are sample homes in Houston, Texas, not Louisiana. A live ROAM MLS feed replaces
//              these values once the IDX agreement and SimplyRETS account exist. Never put a production
//              key here: a static site exposes it. Route production calls through a small proxy instead.
window.CJ_FEED = {
  defaultSource: 'snapshot',
  simplyrets: {
    base: 'https://api.simplyrets.com',
    key: 'simplyrets',
    secret: 'simplyrets',
    demo: true,
    label: 'SimplyRETS demo feed · sample data (Houston, TX)'
  }
};
