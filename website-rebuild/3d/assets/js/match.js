// The camera that lines the model up with the twilight photo (media/listing-basil-ln/basil-front-night.webp, 1672 by 941).
// It comes from a least-squares fit of 50 points picked on the photo against the same points on the model:
// about 5 pixels of error on average, 20 at worst, in photo pixels. focal, cx and cy are in photo pixels too.
// If the house in house.js changes shape, fit this again rather than nudging the numbers by hand.
export const CAM = { az: 14.510, el: -0.905, dist: 42.142, focal: 2746.3, cx: 796.5, cy: 515.0, target: [0, 3.6, 2.7] };
