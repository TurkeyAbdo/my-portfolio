/* ============================================
   DEV.STORY — Immersive Scroll-Driven Engine
   Parallax, 3D, Sound, Scene Transitions
   ============================================ */

(function() {
  'use strict';

  // --- Audio Engine ---
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.muted = true;
      this.initialized = false;
      this.lastScene = -1;
    }

    init() {
      if (this.initialized) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    }

    playTone(freq, duration = 0.15, type = 'sine', vol = 0.08) {
      if (this.muted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    }

    playChord(freqs, duration = 0.3, vol = 0.04) {
      freqs.forEach((f, i) => {
        setTimeout(() => this.playTone(f, duration, 'sine', vol), i * 50);
      });
    }

    playSceneTransition(sceneIndex) {
      if (sceneIndex === this.lastScene) return;
      this.lastScene = sceneIndex;
      const chords = [
        [261.63, 329.63, 392.00],  // C major
        [293.66, 369.99, 440.00],  // D major
        [329.63, 415.30, 493.88],  // E major
        [349.23, 440.00, 523.25],  // F major
        [392.00, 493.88, 587.33],  // G major
        [440.00, 554.37, 659.25],  // A major
      ];
      if (chords[sceneIndex]) {
        this.playChord(chords[sceneIndex], 0.5, 0.03);
      }
    }

    playClick() {
      this.playTone(800, 0.05, 'square', 0.03);
      setTimeout(() => this.playTone(1200, 0.03, 'square', 0.02), 30);
    }

    playWhoosh() {
      if (this.muted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    }

    playAmbient() {
      if (this.muted || !this.ctx) return;
      const playNote = () => {
        if (this.muted) return;
        const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 587.33];
        const note = notes[Math.floor(Math.random() * notes.length)];
        this.playTone(note, 2 + Math.random() * 3, 'sine', 0.008);
        setTimeout(playNote, 3000 + Math.random() * 5000);
      };
      setTimeout(playNote, 2000);
    }

    toggle() {
      this.muted = !this.muted;
      if (!this.muted) {
        this.init();
        this.playAmbient();
      }
      return !this.muted;
    }
  }

  // --- 3D Particle Background ---
  class ParticleField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: 0, y: 0 };
      this.resize();
      this.createParticles();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    createParticles() {
      this.particles = [];
      const count = Math.min(80, Math.floor(window.innerWidth / 15));
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          z: Math.random() * 2 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    update(scrollProgress) {
      const { ctx, canvas, particles, mouse } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Parallax from scroll
        const scrollOffset = scrollProgress * 200 * p.z;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.5;
          p.x += dx / dist * force;
          p.y += dy / dist * force;
        }

        // Wrap
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        const alpha = (0.3 + 0.2 * Math.sin(p.pulse)) * (p.z / 2.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y + scrollOffset % canvas.height, p.size * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.05 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }
  }

  // --- Main App ---
  const audio = new AudioEngine();
  const canvas = document.getElementById('bgCanvas');
  const particles = new ParticleField(canvas);

  // --- Intro ---
  const introOverlay = document.getElementById('introOverlay');
  const startBtn = document.getElementById('startBtn');
  let started = false;

  // Lock scroll until Enter Experience is clicked
  document.body.classList.add('locked');
  window.scrollTo(0, 0);

  startBtn.addEventListener('click', () => {
    audio.init();
    audio.toggle(); // unmute
    audio.playChord([261.63, 329.63, 392.00, 523.25], 1, 0.05);
    introOverlay.classList.add('hidden');
    document.body.classList.remove('locked');
    started = true;
    document.getElementById('soundToggle').classList.remove('muted');
    startTyping();
  });

  // --- Sound toggle ---
  const soundToggle = document.getElementById('soundToggle');
  soundToggle.classList.add('muted');
  soundToggle.addEventListener('click', () => {
    const on = audio.toggle();
    soundToggle.classList.toggle('muted', !on);
    if (on) audio.playClick();
  });

  // --- Typing animation ---
  function startTyping() {
    const el = document.getElementById('typingLine');
    const text = 'console.log("Welcome to my world");';
    let i = 0;
    function type() {
      if (i < text.length) {
        el.textContent = text.substring(0, i + 1);
        i++;
        setTimeout(type, 60 + Math.random() * 40);
      }
    }
    type();
  }

  // --- Scroll Engine ---
  let scrollY = 0;
  let targetScrollY = 0;
  let currentScene = 0;

  function getScrollProgress() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? scrollY / docHeight : 0;
  }

  function getSceneProgress(sceneEl) {
    const rect = sceneEl.getBoundingClientRect();
    const sceneHeight = sceneEl.offsetHeight - window.innerHeight;
    if (sceneHeight <= 0) return 0;
    const progress = -rect.top / sceneHeight;
    return Math.max(0, Math.min(1, progress));
  }

  // --- Parallax hero ---
  function updateHeroParallax() {
    const scene0 = document.getElementById('scene0');
    const progress = getSceneProgress(scene0);
    const layers = scene0.querySelectorAll('.parallax-layer[data-speed]');

    layers.forEach(layer => {
      const speed = parseFloat(layer.dataset.speed);
      const rotate = parseFloat(layer.dataset.rotate || 0);
      const y = progress * window.innerHeight * speed * 2;
      const r = progress * 360 * rotate;
      layer.style.transform = `translate3d(0, ${y}px, 0) rotate(${r}deg)`;
    });

    // Hero words parallax from mouse
    const words = scene0.querySelectorAll('.hero-word[data-parallax-x]');
    words.forEach(word => {
      const px = parseFloat(word.dataset.parallaxX);
      const mouseOffset = ((particles.mouse.x / window.innerWidth) - 0.5) * 2;
      word.style.transform = `translateX(${mouseOffset * px * 100}px)`;
    });

    // Scroll cue fade
    const cue = scene0.querySelector('.scroll-cue');
    if (cue) {
      cue.classList.toggle('hidden', progress > 0.05);
    }

    // Scale & opacity hero on scroll
    const heroContent = scene0.querySelector('.hero-content');
    if (heroContent) {
      const scale = 1 - progress * 0.3;
      const opacity = 1 - progress * 2;
      heroContent.style.transform = `scale(${Math.max(scale, 0.7)})`;
      heroContent.style.opacity = Math.max(opacity, 0);
    }
  }

  // --- Horizontal scroll (About) ---
  function updateHorizontalScroll() {
    const scene1 = document.getElementById('scene1');
    const track = document.getElementById('aboutTrack');
    if (!track) return;

    const progress = getSceneProgress(scene1);
    const panels = track.querySelectorAll('.h-panel');
    const totalWidth = panels.length * window.innerWidth;
    const translateX = -progress * (totalWidth - window.innerWidth);
    track.style.transform = `translate3d(${translateX}px, 0, 0)`;

    // 3D tilt on photo
    const photoFrame = document.getElementById('photoFrame');
    if (photoFrame) {
      const p2 = Math.max(0, Math.min(1, (progress - 0.2) / 0.3));
      const rotateY = (1 - p2) * 20;
      const rotateX = (1 - p2) * -10;
      photoFrame.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    }

    // Timeline items reveal - adjusted for 5 panels
    const timelineItems = scene1.querySelectorAll('.timeline-item');
    timelineItems.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - 0.35 - i * 0.04) / 0.08));
      item.style.transform = `translateY(${(1 - itemProgress) * 50}px)`;
      item.style.opacity = itemProgress;
    });

    // Philosophy pillars
    const pillars = scene1.querySelectorAll('.pillar');
    pillars.forEach((p, i) => {
      const pp = Math.max(0, Math.min(1, (progress - 0.55 - i * 0.04) / 0.08));
      p.style.transform = `translateY(${(1 - pp) * 40}px)`;
      p.style.opacity = pp;
    });

    // Value cards
    const valueCards = scene1.querySelectorAll('.value-card');
    valueCards.forEach((card, i) => {
      const cardProgress = Math.max(0, Math.min(1, (progress - 0.78 - i * 0.04) / 0.08));
      card.style.transform = `translateY(${(1 - cardProgress) * 60}px) rotateX(${(1 - cardProgress) * -15}deg)`;
      card.style.opacity = cardProgress;
    });
  }

  // --- Skills orbit ---
  // Store initial angles
  const ring1Items = document.querySelectorAll('.ring-1 .orbit-item');
  const ring2Items = document.querySelectorAll('.ring-2 .orbit-item');

  ring1Items.forEach(item => {
    item._baseAngle = parseFloat(getComputedStyle(item).getPropertyValue('--angle')) || 0;
  });
  ring2Items.forEach(item => {
    item._baseAngle = parseFloat(getComputedStyle(item).getPropertyValue('--angle')) || 0;
  });

  function updateSkillsOrbit() {
    const scene2 = document.getElementById('scene2');
    const progress = getSceneProgress(scene2);

    const orbit = document.getElementById('skillsOrbit');
    if (!orbit) return;

    // Scale in
    const scaleProgress = Math.min(1, progress * 3);
    const scale = 0.3 + scaleProgress * 0.7;
    orbit.style.transform = `scale(${scale})`;
    orbit.style.opacity = scaleProgress;

    // Rotate each item individually so click targets follow visual position
    const scrollRot1 = progress * 180;
    const scrollRot2 = -progress * 120;

    ring1Items.forEach(item => {
      const totalAngle = item._baseAngle + scrollRot1;
      const radius = 150;
      // Position via top/left instead of transform to keep click targets accurate
      const rad = (totalAngle * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      item.style.transform = `translate(${x}px, ${y}px)`;
      // Keep node text upright
      const node = item.querySelector('.orbit-node');
      if (node) node.style.transform = `translate(-50%, -50%)`;
    });

    ring2Items.forEach(item => {
      const totalAngle = item._baseAngle + scrollRot2;
      const radius = 220;
      const rad = (totalAngle * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      item.style.transform = `translate(${x}px, ${y}px)`;
      const node = item.querySelector('.orbit-node');
      if (node) node.style.transform = `translate(-50%, -50%)`;
    });
  }

  // --- Project Carousel ---
  let currentProject = 0;
  const projectSlides = document.querySelectorAll('.project-slide');
  const projectDots = document.querySelectorAll('.proj-dot');
  const projectCounter = document.getElementById('projectCurrent');

  function showProject(index) {
    audio.playWhoosh();
    projectSlides.forEach(s => s.classList.remove('active'));
    projectDots.forEach(d => d.classList.remove('active'));
    projectSlides[index].classList.add('active');
    projectDots[index].classList.add('active');
    projectCounter.textContent = String(index + 1).padStart(2, '0');
    currentProject = index;
  }

  document.getElementById('projNext').addEventListener('click', () => {
    showProject((currentProject + 1) % projectSlides.length);
  });

  document.getElementById('projPrev').addEventListener('click', () => {
    showProject((currentProject - 1 + projectSlides.length) % projectSlides.length);
  });

  projectDots.forEach((dot, i) => {
    dot.addEventListener('click', () => showProject(i));
  });

  // Swipe support for mobile project navigation
  let touchStartX = 0;
  let touchEndX = 0;
  const projectCarousel = document.querySelector('.project-carousel');
  if (projectCarousel) {
    projectCarousel.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    projectCarousel.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          showProject((currentProject + 1) % projectSlides.length);
        } else {
          showProject((currentProject - 1 + projectSlides.length) % projectSlides.length);
        }
      }
    }, { passive: true });
  }

  // --- Testimonials float ---
  function updateTestimonials() {
    const scene4 = document.getElementById('scene4');
    const progress = getSceneProgress(scene4);
    const cards = scene4.querySelectorAll('.test-card');

    cards.forEach((card, i) => {
      const speed = parseFloat(card.dataset.floatSpeed || 1);
      const offset = parseFloat(card.dataset.floatOffset || 0);
      const cardProgress = Math.max(0, Math.min(1, (progress - 0.1 - i * 0.1) / 0.3));

      const floatY = Math.sin((progress * 4 + offset) * Math.PI) * 15 * speed;
      const rotateZ = Math.sin((progress * 3 + offset) * Math.PI) * 2;
      const translateY = (1 - cardProgress) * 100;

      card.style.transform = `translate3d(0, ${translateY + floatY}px, 0) rotateZ(${rotateZ}deg)`;
      card.style.opacity = cardProgress;
    });
  }

  // --- Contact ---
  function updateContact() {
    const scene5 = document.getElementById('scene5');
    const progress = getSceneProgress(scene5);

    const links = scene5.querySelectorAll('.contact-link-big');
    links.forEach((link, i) => {
      const lp = Math.max(0, Math.min(1, (progress - 0.1 - i * 0.08) / 0.2));
      link.style.transform = `translateX(${(1 - lp) * 80}px)`;
      link.style.opacity = lp;
    });
  }

  // --- Progress dots ---
  function updateProgress() {
    const totalProgress = getScrollProgress();
    const fill = document.getElementById('progressFill');
    const dots = document.querySelectorAll('.progress-dot');
    const totalHeight = dots.length * 24 + (dots.length - 1) * 0; // gap handled by CSS

    if (fill) {
      fill.style.height = (totalProgress * 100) + '%';
    }

    // Determine current scene
    const scenes = document.querySelectorAll('.scene');
    let activeScene = 0;
    scenes.forEach((scene, i) => {
      const rect = scene.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.5) {
        activeScene = i;
      }
    });

    if (activeScene !== currentScene) {
      currentScene = activeScene;
      audio.playSceneTransition(activeScene);
    }

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i <= activeScene);
    });
  }

  // --- Progress dot click navigation ---
  document.querySelectorAll('.progress-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const sceneIndex = parseInt(dot.dataset.scene);
      const scene = document.getElementById('scene' + sceneIndex);
      if (scene) {
        audio.playClick();
        scene.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- Value card tilt ---
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // --- Skill Detail Data ---
  const skillData = {
    'React': { level: 95, desc: 'Building complex SPAs, custom hooks, state management with Redux/Zustand, server components, and performance optimization.', projects: ['Analytics Dashboard', 'E-Commerce', 'SaaS Platform'] },
    'Node.js': { level: 90, desc: 'REST & GraphQL APIs, real-time apps with Socket.io, microservices, and serverless functions.', projects: ['API Gateway', 'Chat App', 'Analytics'] },
    'TypeScript': { level: 92, desc: 'End-to-end type safety, generic utilities, advanced mapped types, and declaration files.', projects: ['All Projects', 'Open Source Libs'] },
    'Python': { level: 88, desc: 'FastAPI, Django, data processing pipelines, ML model serving, and automation scripts.', projects: ['AI Generator', 'Data Pipeline', 'ML APIs'] },
    'Next.js': { level: 93, desc: 'SSR/SSG/ISR, App Router, middleware, edge functions, and full-stack applications.', projects: ['E-Commerce', 'SaaS Dashboard', 'Blog'] },
    'Go': { level: 75, desc: 'High-performance microservices, concurrent systems, CLI tools, and gRPC services.', projects: ['API Gateway', 'CLI Tools'] },
    'PostgreSQL': { level: 85, desc: 'Complex queries, indexing strategies, migrations with Prisma/Drizzle, and performance tuning.', projects: ['E-Commerce', 'Analytics', 'SaaS'] },
    'Docker': { level: 82, desc: 'Multi-stage builds, docker-compose, CI/CD integration, and production deployments.', projects: ['All Production Apps'] },
    'AWS': { level: 80, desc: 'Lambda, S3, EC2, RDS, CloudFront, and infrastructure-as-code with CDK/Terraform.', projects: ['SaaS Platform', 'Data Pipeline'] },
    'GraphQL': { level: 85, desc: 'Schema design, resolvers, subscriptions, Apollo Server/Client, and code generation.', projects: ['Analytics Dashboard', 'SaaS'] },
    'Redis': { level: 78, desc: 'Caching strategies, pub/sub, rate limiting, session storage, and real-time leaderboards.', projects: ['Chat App', 'E-Commerce'] },
    'Tailwind': { level: 95, desc: 'Custom design systems, responsive layouts, dark mode, animations, and component libraries.', projects: ['All Frontend Projects'] },
  };

  const skillDetail = document.getElementById('skillDetail');
  const skillDetailClose = document.getElementById('skillDetailClose');

  // Orbit node click -> show detail (both rings)
  function openSkillDetail(name) {
    const data = skillData[name];
    if (!data) return;

    audio.playChord([400, 500, 600], 0.2, 0.04);

    document.getElementById('skillDetailName').textContent = name;
    document.getElementById('skillDetailDesc').textContent = data.desc;
    document.getElementById('skillDetailFill').style.width = '0%';

    const projectsEl = document.getElementById('skillDetailProjects');
    projectsEl.innerHTML = data.projects.map(p => `<span>${p}</span>`).join('');

    skillDetail.classList.add('visible');

    setTimeout(() => {
      document.getElementById('skillDetailFill').style.width = data.level + '%';
    }, 100);
  }

  // Attach click to ALL orbit items (both ring-1 and ring-2)
  document.querySelectorAll('.orbit-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      openSkillDetail(item.dataset.skill);
    });
  });

  // Also attach click directly to orbit nodes for better hit area
  document.querySelectorAll('.orbit-node').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = node.closest('.orbit-item');
      if (item) openSkillDetail(item.dataset.skill);
    });
  });

  skillDetailClose.addEventListener('click', () => {
    audio.playClick();
    skillDetail.classList.remove('visible');
  });

  // Orbit node hover sound
  document.querySelectorAll('.orbit-node').forEach(node => {
    node.addEventListener('mouseenter', () => {
      audio.playTone(600 + Math.random() * 400, 0.1, 'sine', 0.04);
    });
  });

  // --- Value Card Sounds ---
  document.querySelectorAll('.value-card[data-sound]').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.sound;
      if (type === 'fast') {
        // Rapid ascending notes — speed/electricity
        audio.playTone(400, 0.08, 'sawtooth', 0.05);
        setTimeout(() => audio.playTone(600, 0.08, 'sawtooth', 0.05), 50);
        setTimeout(() => audio.playTone(900, 0.08, 'sawtooth', 0.05), 100);
        setTimeout(() => audio.playTone(1200, 0.12, 'sine', 0.04), 150);
      } else if (type === 'secure') {
        // Deep lock/shield sound
        audio.playTone(150, 0.3, 'sine', 0.06);
        setTimeout(() => audio.playTone(200, 0.2, 'triangle', 0.04), 100);
        setTimeout(() => audio.playChord([300, 450, 600], 0.4, 0.03), 200);
      } else if (type === 'human') {
        // Warm friendly chord — major 7th
        audio.playChord([262, 330, 392, 494], 0.6, 0.04);
        setTimeout(() => audio.playTone(523, 0.4, 'sine', 0.03), 300);
      }
      // Visual feedback — pulse
      card.style.transition = 'transform 0.15s, box-shadow 0.15s';
      card.style.transform = 'scale(1.08)';
      card.style.boxShadow = '0 0 50px ' + (type === 'fast' ? 'rgba(250,200,50,0.3)' : type === 'secure' ? 'rgba(34,197,94,0.4)' : 'rgba(139,92,246,0.3)');
      setTimeout(() => {
        card.style.transform = '';
        card.style.boxShadow = '';
      }, 300);
    });
  });

  // --- Code Modal ---
  const codeModal = document.getElementById('codeModal');
  const codeModalClose = document.getElementById('codeModalClose');
  const codeModalBackdrop = document.getElementById('codeModalBackdrop');

  const projectCodeSnippets = [
    {
      filename: 'Dashboard.tsx',
      explanation: 'The analytics dashboard uses D3.js for real-time chart rendering with React hooks managing WebSocket data streams. Each chart component subscribes to filtered data channels for optimal performance.',
      lines: [
        { text: '<span class="syn-keyword">import</span> { useEffect, useRef } <span class="syn-keyword">from</span> <span class="syn-string">\'react\'</span>;' },
        { text: '<span class="syn-keyword">import</span> * <span class="syn-keyword">as</span> d3 <span class="syn-keyword">from</span> <span class="syn-string">\'d3\'</span>;' },
        { text: '' },
        { text: '<span class="syn-comment">// Real-time chart with WebSocket updates</span>' },
        { text: '<span class="syn-keyword">export function</span> <span class="syn-function">AnalyticsChart</span>({ <span class="syn-prop">streamId</span> }: <span class="syn-type">Props</span>) {' },
        { text: '  <span class="syn-keyword">const</span> svgRef = <span class="syn-function">useRef</span>&lt;<span class="syn-type">SVGSVGElement</span>&gt;(<span class="syn-keyword">null</span>);' },
        { text: '  <span class="syn-keyword">const</span> [data, setData] = <span class="syn-function">useState</span>&lt;<span class="syn-type">DataPoint[]</span>&gt;([]);' },
        { text: '' },
        { text: '  <span class="syn-function">useEffect</span>(() => {' },
        { text: '    <span class="syn-keyword">const</span> ws = <span class="syn-keyword">new</span> <span class="syn-function">WebSocket</span>(<span class="syn-string">`wss://api/stream/${streamId}`</span>);' },
        { text: '    ws.<span class="syn-function">onmessage</span> = (e) => {' },
        { text: '      <span class="syn-keyword">const</span> point = <span class="syn-type">JSON</span>.<span class="syn-function">parse</span>(e.data);' },
        { text: '      <span class="syn-function">setData</span>(prev => [...prev.<span class="syn-function">slice</span>(-<span class="syn-number">100</span>), point]);' },
        { text: '    };' },
        { text: '    <span class="syn-keyword">return</span> () => ws.<span class="syn-function">close</span>();' },
        { text: '  }, [streamId]);' },
        { text: '}' },
      ]
    },
    {
      filename: 'checkout.ts',
      explanation: 'The checkout flow uses Stripe\'s Payment Intents API with server-side validation. Cart items are verified against real-time inventory before creating the payment session, preventing overselling.',
      lines: [
        { text: '<span class="syn-keyword">import</span> Stripe <span class="syn-keyword">from</span> <span class="syn-string">\'stripe\'</span>;' },
        { text: '<span class="syn-keyword">import</span> { db } <span class="syn-keyword">from</span> <span class="syn-string">\'@/lib/database\'</span>;' },
        { text: '' },
        { text: '<span class="syn-comment">// Server action — create payment intent</span>' },
        { text: '<span class="syn-keyword">export async function</span> <span class="syn-function">createCheckout</span>(<span class="syn-prop">cart</span>: <span class="syn-type">CartItem[]</span>) {' },
        { text: '  <span class="syn-comment">// Verify inventory in real-time</span>' },
        { text: '  <span class="syn-keyword">const</span> verified = <span class="syn-keyword">await</span> db.<span class="syn-function">verifyStock</span>(cart);' },
        { text: '  <span class="syn-keyword">if</span> (!verified.<span class="syn-prop">ok</span>) <span class="syn-keyword">throw new</span> <span class="syn-function">Error</span>(verified.<span class="syn-prop">reason</span>);' },
        { text: '' },
        { text: '  <span class="syn-keyword">const</span> stripe = <span class="syn-keyword">new</span> <span class="syn-function">Stripe</span>(process.env.<span class="syn-prop">STRIPE_KEY</span>!);' },
        { text: '  <span class="syn-keyword">const</span> session = <span class="syn-keyword">await</span> stripe.checkout.sessions.<span class="syn-function">create</span>({' },
        { text: '    <span class="syn-prop">line_items</span>: cart.<span class="syn-function">map</span>(item => ({' },
        { text: '      <span class="syn-prop">price</span>: item.<span class="syn-prop">stripePriceId</span>,' },
        { text: '      <span class="syn-prop">quantity</span>: item.<span class="syn-prop">qty</span>,' },
        { text: '    })),' },
        { text: '    <span class="syn-prop">mode</span>: <span class="syn-string">\'payment\'</span>,' },
        { text: '  });' },
        { text: '  <span class="syn-keyword">return</span> { <span class="syn-prop">url</span>: session.<span class="syn-prop">url</span> };' },
        { text: '}' },
      ]
    },
    {
      filename: 'generate.py',
      explanation: 'The AI content engine uses OpenAI\'s API with custom system prompts that encode brand voice parameters. Content is generated in chunks via streaming for real-time UI feedback, with a moderation layer before output.',
      lines: [
        { text: '<span class="syn-keyword">from</span> openai <span class="syn-keyword">import</span> <span class="syn-type">AsyncOpenAI</span>' },
        { text: '<span class="syn-keyword">from</span> fastapi.responses <span class="syn-keyword">import</span> <span class="syn-type">StreamingResponse</span>' },
        { text: '' },
        { text: '<span class="syn-comment"># Stream AI-generated content with brand voice</span>' },
        { text: '<span class="syn-keyword">async def</span> <span class="syn-function">generate_content</span>(<span class="syn-prop">prompt</span>: <span class="syn-type">str</span>, <span class="syn-prop">brand</span>: <span class="syn-type">BrandVoice</span>):' },
        { text: '    client = <span class="syn-function">AsyncOpenAI</span>()' },
        { text: '    system = <span class="syn-function">build_system_prompt</span>(brand)' },
        { text: '' },
        { text: '    stream = <span class="syn-keyword">await</span> client.chat.completions.<span class="syn-function">create</span>(' },
        { text: '        <span class="syn-prop">model</span>=<span class="syn-string">"gpt-4o"</span>,' },
        { text: '        <span class="syn-prop">messages</span>=[' },
        { text: '            {<span class="syn-string">"role"</span>: <span class="syn-string">"system"</span>, <span class="syn-string">"content"</span>: system},' },
        { text: '            {<span class="syn-string">"role"</span>: <span class="syn-string">"user"</span>, <span class="syn-string">"content"</span>: prompt},' },
        { text: '        ],' },
        { text: '        <span class="syn-prop">stream</span>=<span class="syn-keyword">True</span>,' },
        { text: '    )' },
        { text: '    <span class="syn-keyword">async for</span> chunk <span class="syn-keyword">in</span> stream:' },
        { text: '        <span class="syn-keyword">yield</span> chunk.choices[<span class="syn-number">0</span>].delta.content' },
      ]
    },
  ];

  function openCodeModal(projectIndex) {
    const snippet = projectCodeSnippets[projectIndex];
    if (!snippet) return;

    audio.playChord([300, 400, 500], 0.2, 0.03);

    document.getElementById('codeModalFilename').textContent = snippet.filename;
    document.getElementById('codeExplanation').textContent = snippet.explanation;

    const linesEl = document.getElementById('codeLines');
    linesEl.innerHTML = '';

    // Animate lines appearing one by one
    snippet.lines.forEach((line, i) => {
      setTimeout(() => {
        const lineEl = document.createElement('div');
        lineEl.className = 'code-line';
        lineEl.style.animationDelay = '0s';
        lineEl.innerHTML = `<span class="code-line-num">${i + 1}</span><span class="code-line-text">${line.text}</span>`;
        linesEl.appendChild(lineEl);
        // Type sound for each line
        audio.playTone(800 + i * 30, 0.03, 'square', 0.015);
      }, i * 60);
    });

    codeModal.classList.add('visible');
  }

  function closeCodeModal() {
    audio.playClick();
    codeModal.classList.remove('visible');
  }

  codeModalClose.addEventListener('click', closeCodeModal);
  codeModalBackdrop.addEventListener('click', closeCodeModal);

  // Attach to Source Code buttons - use parent slide index
  document.querySelectorAll('.btn-project-ghost').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const slide = btn.closest('.project-slide');
      const index = slide ? parseInt(slide.dataset.index) : 0;
      openCodeModal(index);
    });
  });

  // --- Contact link hover sound ---
  document.querySelectorAll('.contact-link-big').forEach(link => {
    link.addEventListener('mouseenter', () => {
      audio.playTone(500, 0.08, 'sine', 0.03);
    });
  });

  // --- Main render loop ---
  function render() {
    scrollY = window.scrollY;

    const totalProgress = getScrollProgress();
    particles.update(totalProgress);

    if (started) {
      updateHeroParallax();
      updateHorizontalScroll();
      updateSkillsOrbit();
      updateTestimonials();
      updateContact();
      updateProgress();
    }

    requestAnimationFrame(render);
  }

  render();

})();
