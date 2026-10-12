// "Caleb" behind the Basil Lane roofline.
// When the house is about halfway into view, the letters blow in across the sky on a gust,
// like the opening headline, and settle behind the ridge. It plays once.
// The roof always stays in front of the name. With reduced motion the name simply sits in place.
(function () {
  var box = document.querySelector('.roofline'), name = box && box.querySelector('.name');
  if (!name || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function rand(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); }

  var word = name.textContent.trim(), inner = document.createElement('span'), chars = [];
  inner.className = 'ni'; name.textContent = '';
  for (var i = 0; i < word.length; i++) {
    var c = document.createElement('span'); c.className = 'ch'; c.textContent = word[i];
    inner.appendChild(c); chars.push({ el: c, r: [rand(i, 1), rand(i, 2), rand(i, 3)] });
  }
  name.appendChild(inner);

  // 0 when the photo's top edge reaches the bottom of the screen, 1 when it is near the top
  function progress() {
    var r = box.getBoundingClientRect(), vh = innerHeight;
    return clamp((vh - r.top) / (vh * 0.85));
  }

  var windStart = -1;
  function draw(t) {
    var H = box.clientHeight, W = box.clientWidth, p = progress();
      if (windStart < 0 && p > 0.45) windStart = t;
      var k = windStart < 0 ? 0 : t - windStart;
      chars.forEach(function (c, i) {
        var r = c.r, e = easeOut(clamp((k - i * 0.12) / 1.4));
        var x = -(W * 0.35 + 80 * r[0]) * (1 - e), y = (r[1] - 0.5) * H * 0.12 * (1 - e) - H * 0.06 * Math.sin(Math.PI * e);
        c.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (-(14 + 20 * r[2]) * (1 - e)).toFixed(2) + 'deg)';
        c.el.style.opacity = Math.min(1, e * 2.2).toFixed(3);
      c.el.style.filter = e < 1 ? 'blur(' + ((1 - e) * 10).toFixed(2) + 'px)' : 'none';
    });
}

var visible = false, running = false, t0 = performance.now();
function frame(now) {
  if (!visible) { running = false; return; }
  draw((now - t0) / 1000); requestAnimationFrame(frame);
}
  new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  }, { rootMargin: '25% 0px' }).observe(box);
  draw(0);
})();
