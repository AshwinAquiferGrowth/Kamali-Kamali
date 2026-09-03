// Kamali & Kamali — shared behaviour (nav, ambient fields, reveals, floor plan, dunes).
// Loaded by every page via build.js.
(function () {
  function curtain(done) {
    const c = document.getElementById('kk-curtain');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try { seen = !!sessionStorage.getItem('kk-curtain'); } catch (e) {}
    if (!c || reduced || seen) { if (c) c.remove(); done(); return; }
    try { sessionStorage.setItem('kk-curtain', '1'); } catch (e) {}
    const html = document.documentElement;
    html.style.overflow = 'hidden';
    let lifted = false;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      html.style.overflow = '';
      c.classList.add('lift');
      done();
      setTimeout(() => c.remove(), 1000);
    };
    const chars = 'KAMALI0123456789·—&';
    const scramble = (node, ms) => {
      const orig = node.nodeValue; const steps = 10; let k = 0;
      const iv = setInterval(() => {
        k++; const reveal = Math.floor(orig.length * k / steps); let out = '';
        for (let i = 0; i < orig.length; i++) out += i < reveal ? orig[i] : chars[Math.floor(Math.random() * chars.length)];
        node.nodeValue = out;
        if (k >= steps) { node.nodeValue = orig; clearInterval(iv); }
      }, ms / steps);
    };
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((res) => setTimeout(res, 500))]).then(() => {
      c.classList.add('show');
      const mark = c.querySelector('.kk-curtain-mark');
      Array.from(mark.childNodes).forEach((n) => { if (n.nodeType === 3 && n.nodeValue.trim()) scramble(n, 480); });
      setTimeout(lift, 950);
    });
    setTimeout(lift, 3000); // never hold a visitor longer than this, whatever happens
  }

  function init() {
    if (document.body.__kkMounted) return;
    document.body.__kkMounted = true;
    curtain(mount);
  }

  function mount() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fields = [];

    const burgerNav = document.getElementById('kk-nav');
    const burger = document.getElementById('kk-burger');
    if (burger && burgerNav) {
      const closeMenu = () => { burgerNav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
      burger.addEventListener('click', () => {
        const open = burgerNav.classList.toggle('menu-open');
        burger.setAttribute('aria-expanded', String(open));
      });
      burgerNav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', closeMenu));
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }
    const sectorsMenu = document.getElementById('kk-sectors-menu');
    if (sectorsMenu) {
      const trigger = sectorsMenu.querySelector('button');
      const setOpen = (open) => { sectorsMenu.classList.toggle('open', open); trigger.setAttribute('aria-expanded', String(open)); };
      trigger.addEventListener('click', () => setOpen(!sectorsMenu.classList.contains('open')));
      document.addEventListener('click', (e) => { if (!sectorsMenu.contains(e.target)) setOpen(false); });
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    }

    function mountField(canvas, cfg) {
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
      if (!gl) return;
      const vsrc = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
      const fsrc = [
        'precision highp float;',
        'uniform vec2 u_res; uniform float u_t; uniform float u_bronze;',
        'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
        'float snoise(vec2 v){',
        '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
        '  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);',
        '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
        '  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);',
        '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
        '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
        '  m = m*m; m = m*m;',
        '  vec3 x = 2.0*fract(p*C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;',
        '  m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);',
        '  vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;',
        '  return 130.0*dot(m, g);',
        '}',
        'float fbm(vec2 p){ float f = 0.0; float a = 0.6; for(int i = 0; i < 2; i++){ f += a*snoise(p); p *= 2.02; a *= 0.5; } return f*0.55 + 0.5; }',
        'void main(){',
        '  vec2 uv = gl_FragCoord.xy / u_res;',
        '  vec2 p = uv*vec2(u_res.x/u_res.y, 1.0)*0.55;',
        '  float t = u_t*0.025;',
        '  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t*0.8));',
        '  float n = fbm(p + 0.7*q);',
        '  vec3 ink = vec3(0.055, 0.059, 0.063);',
        '  vec3 deep = vec3(0.105, 0.133, 0.118);',
        '  vec3 sage = vec3(0.353, 0.420, 0.384);',
        '  vec3 bronze = vec3(0.541, 0.435, 0.247);',
        '  vec3 pale = vec3(0.804, 0.851, 0.827);',
        '  vec3 col = ink;',
        '  col = mix(col, deep, smoothstep(0.18, 0.62, n));',
        '  col = mix(col, sage, smoothstep(0.42, 0.85, n)*0.42);',
        '  float w = fbm(p*0.8 + 0.6*q + vec2(3.1, 7.4));',
        '  col = mix(col, bronze, smoothstep(0.42, 0.8, w)*u_bronze);',
        '  col = mix(col, pale, smoothstep(0.85, 1.1, n)*0.10);',
        '  float d = distance(uv, vec2(0.5, 0.42));',
        '  col *= 1.0 - 0.32*smoothstep(0.35, 1.0, d);',
        '  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453);',
        '  col += (g - 0.5)*0.018;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n');
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
        return s;
      };
      const prog = gl.createProgram();
      const v = mk(gl.VERTEX_SHADER, vsrc), f = mk(gl.FRAGMENT_SHADER, fsrc);
      if (!v || !f) return;
      gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog); gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uRes = gl.getUniformLocation(prog, 'u_res');
      const uT = gl.getUniformLocation(prog, 'u_t');
      const uB = gl.getUniformLocation(prog, 'u_bronze');
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      };
      const inst = { raf: 0, visible: true, io: null };
      const start = performance.now();
      const frame = () => {
        inst.raf = 0;
        resize();
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uT, (performance.now() - start) / 1000 * cfg.speed);
        gl.uniform1f(uB, cfg.bronze);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!reduced && inst.visible) inst.raf = requestAnimationFrame(frame);
      };
      inst.io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          inst.visible = e.isIntersecting;
          if (inst.visible && !inst.raf && !reduced) inst.raf = requestAnimationFrame(frame);
        });
      }, { rootMargin: '120px' });
      inst.io.observe(canvas);
      frame();
      fields.push(inst);
    }

    [{ id: 'kk-field-hero', speed: 1, bronze: 0.75 }, { id: 'kk-field-vm', speed: 0.65, bronze: 0.5 }].forEach((cfg) => {
      const canvas = document.getElementById(cfg.id);
      if (canvas) mountField(canvas, cfg);
    });

    const dunesSvg = document.getElementById('kk-dunes');
    let duneLines = [];
    let dunesDrawn = reduced;
    let dunesRT = 0;
    const buildDunes = () => {
      const band = dunesSvg.parentElement;
      const W = Math.max(band.clientWidth, 320);
      const H = Math.max(band.clientHeight, 160);
      dunesSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (dunesSvg.firstChild) dunesSvg.removeChild(dunesSvg.firstChild);
      duneLines = [];
      const duneF = (x, c, wl, wr, A) => { const w = x < c ? wl : wr; const dd = (x - c) / w; return A * Math.exp(-dd * dd); };
      const N = Math.max(4, Math.floor((H - 28) / 32));
      for (let i = 0; i < N; i++) {
        const baseY = H - 24 - (N - 1 - i) * 32;
        const c1 = W * 0.18 + i * W * 0.043, c2 = W * 0.72 - i * W * 0.033, c3 = W * 0.46 + i * W * 0.014;
        const A1 = 26 + 12 * Math.sin(i * 1.1), A2 = 20 + 10 * Math.sin(i * 0.9 + 2.1), A3 = (i > 4) ? 12 + 6 * Math.sin(i * 1.4) : 0;
        let d = '';
        for (let x = 0; x <= W; x += 16) {
          const h = duneF(x, c1, W * 0.16, W * 0.066, A1) + duneF(x, c2, W * 0.18, W * 0.076, A2) + duneF(x, c3, W * 0.125, W * 0.056, A3);
          const y = (baseY - h).toFixed(1);
          d += (x === 0 ? 'M0 ' + y : ' L' + x + ' ' + y);
        }
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', d);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', '#8A6F3F');
        p.setAttribute('stroke-opacity', (0.05 + (i / Math.max(N - 1, 1)) * 0.11).toFixed(3));
        p.setAttribute('stroke-width', '1');
        p.setAttribute('pathLength', '1');
        if (!dunesDrawn) { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; }
        dunesSvg.appendChild(p);
        duneLines.push(p);
      }
    };
    if (dunesSvg) {
      dunesSvg.setAttribute('preserveAspectRatio', 'none');
      buildDunes();
      window.addEventListener('resize', () => {
        clearTimeout(dunesRT);
        dunesRT = setTimeout(buildDunes, 180);
      }, { passive: true });
    }
    // Schematic dining-room plan, drawn in hairlines like the footer dunes
    const planRecs = [];
    Array.from(document.querySelectorAll('svg[data-plan]')).forEach((svg) => {
      const stroke = svg.getAttribute('data-plan') || '#8A6F3F';
      const NS = 'http://www.w3.org/2000/svg';
      svg.setAttribute('viewBox', '0 0 640 420');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      const shapes = [];
      const add = (tag, attrs) => {
        const e = document.createElementNS(NS, tag);
        Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
        e.setAttribute('fill', 'none'); e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', '1');
        // Real perimeter lengths: pathLength on basic shapes is unsupported on Safari < 16.4
        const L = tag === 'circle' ? 2 * Math.PI * attrs.r : tag === 'rect' ? 2 * (attrs.width + attrs.height) : Math.hypot(attrs.x2 - attrs.x1, attrs.y2 - attrs.y1);
        if (!reduced) { e.style.strokeDasharray = String(L); e.style.strokeDashoffset = String(L); }
        svg.appendChild(e); shapes.push(e);
      };
      add('rect', { x: 20, y: 20, width: 600, height: 380 });
      add('rect', { x: 40, y: 40, width: 300, height: 48 });
      for (let x = 62; x < 340; x += 28) add('line', { x1: x, y1: 40, x2: x - 16, y2: 88 });
      add('line', { x1: 40, y1: 108, x2: 340, y2: 108 });
      add('rect', { x: 480, y: 40, width: 120, height: 230 });
      for (let y = 64; y <= 250; y += 36) add('circle', { cx: 458, cy: y, r: 6 });
      const round = (cx, cy, r, seats) => {
        add('circle', { cx, cy, r });
        for (let i = 0; i < seats; i++) { const a = (i / seats) * Math.PI * 2; add('circle', { cx: (cx + Math.cos(a) * (r + 12)).toFixed(1), cy: (cy + Math.sin(a) * (r + 12)).toFixed(1), r: 5 }); }
      };
      const square = (cx, cy, s) => {
        add('rect', { x: cx - s / 2, y: cy - s / 2, width: s, height: s });
        add('line', { x1: cx - 8, y1: cy - s / 2 - 9, x2: cx + 8, y2: cy - s / 2 - 9 });
        add('line', { x1: cx - 8, y1: cy + s / 2 + 9, x2: cx + 8, y2: cy + s / 2 + 9 });
        add('line', { x1: cx - s / 2 - 9, y1: cy - 8, x2: cx - s / 2 - 9, y2: cy + 8 });
        add('line', { x1: cx + s / 2 + 9, y1: cy - 8, x2: cx + s / 2 + 9, y2: cy + 8 });
      };
      [[90, 170], [300, 170], [90, 330], [300, 330]].forEach((p) => round(p[0], p[1], 22, 6));
      [[195, 170], [195, 330], [400, 170], [400, 330]].forEach((p) => square(p[0], p[1], 30));
      [[520, 330], [580, 330]].forEach((p) => square(p[0], p[1], 22));
      planRecs.push({ svg, shapes });
    });
    if (reduced) return;
    if (planRecs.length) {
      const planIO = new IntersectionObserver((ens) => {
        ens.forEach((en) => {
          if (!en.isIntersecting) return;
          planIO.unobserve(en.target);
          const rec = planRecs.find((r) => r.svg === en.target);
          if (!rec) return;
          rec.shapes.forEach((s, i) => { s.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1) ' + (i * 22) + 'ms'; s.style.strokeDashoffset = '0'; });
        });
      }, { threshold: 0.05 });
      planRecs.forEach((r) => planIO.observe(r.svg));
    }
    if (dunesSvg) {
      const dunesIO = new IntersectionObserver((ens) => {
        ens.forEach((en) => {
          if (!en.isIntersecting || dunesDrawn) return;
          dunesDrawn = true;
          dunesIO.disconnect();
          duneLines.forEach((p, i) => {
            p.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(0.22, 1, 0.36, 1) ' + (i * 90) + 'ms';
            p.style.strokeDashoffset = '0';
          });
        });
      }, { threshold: 0.2 });
      dunesIO.observe(dunesSvg);
    }
    const grains = document.querySelectorAll('[data-grain]');
    if (grains.length) setInterval(() => {
      grains.forEach((g) => { g.style.backgroundPosition = Math.floor(Math.random() * 240) + 'px ' + Math.floor(Math.random() * 240) + 'px'; });
    }, 120);
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
    reveals.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(26px)'; });
    const io = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        let d = parseInt(el.getAttribute('data-reveal'), 10) || 0;
        const p = el.parentElement;
        if (p && p.hasAttribute('data-stagger')) d += Array.prototype.indexOf.call(p.children, el) * (parseInt(p.getAttribute('data-stagger'), 10) || 100);
        el.style.transition = 'opacity 1.05s ' + ease + ' ' + d + 'ms, transform 1.05s ' + ease + ' ' + d + 'ms';
        el.style.opacity = '1'; el.style.transform = 'translateY(0px)';
        el.addEventListener('transitionend', function h(ev) {
          if (ev.propertyName !== 'transform') return;
          el.style.transition = ''; el.style.transform = ''; el.style.opacity = '';
          el.removeEventListener('transitionend', h);
        });
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach((el) => io.observe(el));
    const heroCanvas = document.getElementById('kk-field-hero');
    if (heroCanvas) {
      heroCanvas.style.opacity = '0';
      void heroCanvas.offsetWidth;
      heroCanvas.style.transition = 'opacity 1.6s cubic-bezier(0.25,0.1,0.25,1)';
      heroCanvas.style.opacity = '1';
    }
    const navEl = document.getElementById('kk-nav');
    if (navEl) {
      Array.from(navEl.querySelectorAll('.nav-inner > a, .nav-links > a, .nav-menu > button')).forEach((a, i) => {
        a.style.opacity = '0'; a.style.transform = 'translateY(-8px)';
        void a.offsetWidth;
        a.style.transition = 'opacity 0.6s ' + ease + ' ' + (1000 + i * 80) + 'ms, transform 0.6s ' + ease + ' ' + (1000 + i * 80) + 'ms, color 300ms cubic-bezier(0.25,0.1,0.25,1)';
        a.style.opacity = '1'; a.style.transform = 'translateY(0px)';
        setTimeout(() => { a.style.transition = ''; a.style.opacity = ''; a.style.transform = ''; }, 1900 + i * 80);
      });
    }
    const lineEls = Array.from(document.querySelectorAll('[data-lines]'));
    lineEls.forEach((el) => { el.style.opacity = '0'; });
    const initLines = () => lineEls.forEach((el) => {
      if (el.__lineInners) return;
      const units = [];
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) units.push(document.createTextNode(' '));
            else { const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = tok; units.push(s); }
          });
        } else if (node.nodeType === 1) { node.style.display = 'inline-block'; units.push(node); }
      });
      el.textContent = '';
      units.forEach((u) => el.appendChild(u));
      const rows = [];
      let lastTop = null;
      units.forEach((u) => {
        if (u.nodeType !== 1) return;
        const top = u.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 4) { rows.push([]); lastTop = top; }
        rows[rows.length - 1].push(u);
      });
      el.textContent = '';
      el.__lineInners = rows.map((row) => {
        const outer = document.createElement('span');
        outer.style.cssText = 'display:block;overflow:hidden;margin-bottom:-0.12em;';
        const inner = document.createElement('span');
        inner.style.cssText = 'display:block;padding-bottom:0.12em;transform:translateY(115%);';
        row.forEach((u, i) => { inner.appendChild(u); if (i < row.length - 1) inner.appendChild(document.createTextNode(' ')); });
        outer.appendChild(inner);
        el.appendChild(outer);
        return inner;
      });
      el.style.opacity = '1';
    });
    const lineIO = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        const base = parseInt(en.target.getAttribute('data-lines'), 10) || 0;
        (en.target.__lineInners || []).forEach((inner, i) => {
          inner.style.transition = 'transform 1.05s ' + ease + ' ' + (base + i * 95) + 'ms';
          inner.style.transform = 'translateY(0%)';
        });
        lineIO.unobserve(en.target);
      });
    }, { threshold: 0.2 });
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((res) => setTimeout(res, 900))]).then(() => setTimeout(() => {
      initLines();
      lineEls.forEach((el) => lineIO.observe(el));
    }, 0));
    // clip-path'd elements report zero visible area to IO — reveal from the scroll loop instead
    let clips = Array.from(document.querySelectorAll('[data-clip]'));
    clips.forEach((el) => { el.style.clipPath = 'inset(0 0 100% 0)'; });
    const tickChars = 'KAMALI0123456789·—&';
    const tickIO = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        tickIO.unobserve(el);
        let tn = null;
        for (const n of el.childNodes) { if (n.nodeType === 3 && n.nodeValue.trim()) { tn = n; break; } }
        if (!tn) return;
        const orig = tn.nodeValue;
        let k = 0;
        const iv = setInterval(() => {
          k++;
          const reveal = Math.floor(orig.length * k / 10);
          let out = '';
          for (let i = 0; i < orig.length; i++) {
            const c = orig[i];
            out += (i < reveal || c === ' ') ? c : tickChars[Math.floor(Math.random() * tickChars.length)];
          }
          tn.nodeValue = out;
          if (k >= 10) { tn.nodeValue = orig; clearInterval(iv); }
        }, 32);
      });
    }, { threshold: 0.5 });
    Array.from(document.querySelectorAll('[data-tick]')).forEach((el) => tickIO.observe(el));
    const bgOf = (el) => {
      let n = el;
      while (n && n.nodeType === 1) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
        n = n.parentElement;
      }
      return '#CDD9D3';
    };
    const rules = Array.from(document.querySelectorAll('[data-rule]'));
    rules.forEach((el) => {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      const w = document.createElement('div');
      w.style.cssText = 'position:absolute;top:-1px;left:0;width:100%;height:2px;background:' + bgOf(el) + ';transform-origin:100% 50%;pointer-events:none;';
      el.appendChild(w);
      el.__wipe = w;
    });
    const io2 = new IntersectionObserver((ens) => {
      ens.forEach((en) => {
        if (!en.isIntersecting) return;
        const w = en.target.__wipe;
        if (w) { w.style.transition = 'transform 1.5s ' + ease + ' 120ms'; w.style.transform = 'scaleX(0)'; }
        io2.unobserve(en.target);
      });
    }, { threshold: 0.3 });
    rules.forEach((el) => io2.observe(el));
    const pxEls = Array.from(document.querySelectorAll('[data-parallax]'));
    const nav = document.getElementById('kk-nav');
    const darks = Array.from(document.querySelectorAll('[data-nav-dark]'));
    let navDark = true;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const vh = window.innerHeight;
        pxEls.forEach((el) => {
          const t = el.firstElementChild;
          if (!t) return;
          const r = el.getBoundingClientRect();
          if (r.bottom < -80 || r.top > vh + 80) return;
          const depth = parseFloat(el.getAttribute('data-parallax')) || 0.06;
          const prog = (r.top + r.height / 2 - vh / 2) / vh;
          t.style.transform = 'translateY(' + (prog * depth * r.height).toFixed(1) + 'px) scale(1.12)';
        });
        if (clips.length) {
          clips = clips.filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.top < vh - 60 && r.bottom > 0) {
              el.style.transition = 'clip-path 1.25s ' + ease;
              el.style.clipPath = 'inset(0 0 0% 0)';
              return false;
            }
            return true;
          });
        }
        if (nav) {
          const nh = nav.offsetHeight;
          const isDark = darks.some((el) => { const r = el.getBoundingClientRect(); return r.top < nh + 1 && r.bottom > nh * 0.5; });
          if (isDark !== navDark) {
            navDark = isDark;
            nav.style.setProperty('--nav-bg', isDark ? '#0E0F10' : '#CDD9D3');
            nav.style.setProperty('--nav-line', isDark ? 'rgba(244,241,234,0.14)' : 'rgba(14,15,16,0.13)');
            nav.style.setProperty('--nav-fg', isDark ? '#F4F1EA' : '#0E0F10');
            nav.style.setProperty('--nav-fg2', isDark ? 'rgba(244,241,234,0.85)' : '#0E0F10');
            nav.style.setProperty('--nav-accent', isDark ? '#B08D57' : '#8A6F3F');
          }
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
