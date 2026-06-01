(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalStats = document.getElementById("modalStats");
  const modalPrimary = document.getElementById("modalPrimary");
  const modalSecondary = document.getElementById("modalSecondary");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const hintButton = document.getElementById("hintButton");
  const laneButtons = Array.from(document.querySelectorAll(".lane-button"));

  const scoreValue = document.getElementById("scoreValue");
  const comboValue = document.getElementById("comboValue");
  const timeValue = document.getElementById("timeValue");
  const limitValue = document.getElementById("limitValue");
  const currentFileName = document.getElementById("currentFileName");
  const currentFileType = document.getElementById("currentFileType");
  const currentFileSize = document.getElementById("currentFileSize");
  const limitBarFill = document.getElementById("limitBarFill");

  const lanes = [
    { id: "compress", label: "Compress", color: "#e66a5d", key: "1" },
    { id: "convert", label: "Convert", color: "#6f64c8", key: "2" },
    { id: "send", label: "Send", color: "#4f9f67", key: "3" },
    { id: "trash", label: "Trash", color: "#2f3a45", key: "4" },
  ];

  const fileTypes = [
    { ext: "PDF", base: 18, wrong: ["JPG", "PNG", "DOCX"] },
    { ext: "JPG", base: 8, wrong: ["PDF", "PNG", "WEBP"] },
    { ext: "PNG", base: 10, wrong: ["JPG", "WEBP", "PDF"] },
    { ext: "DOCX", base: 12, wrong: ["PDF", "TXT"] },
    { ext: "CSV", base: 6, wrong: ["PDF", "XLSX"] },
  ];

  const state = {
    running: false,
    paused: false,
    over: false,
    score: 0,
    combo: 1,
    streak: 0,
    mistakes: 0,
    sorted: 0,
    timeLeft: 60,
    uploadLimit: 20,
    queuePressure: 0,
    speed: 1,
    hintUntil: 0,
    current: null,
    particles: [],
    lastTick: 0,
  };

  const names = [
    "passport_photo",
    "visa_upload",
    "homework_packet",
    "invoice_final",
    "resume_draft",
    "tax_receipt",
    "school_form",
    "profile_image",
    "contract_copy",
    "product_label",
    "event_flyer",
    "shipping_slip",
  ];

  window.UploadLimitPlatform.init();

  function reset(practice = false) {
    state.running = true;
    state.paused = false;
    state.over = false;
    state.score = 0;
    state.combo = 1;
    state.streak = 0;
    state.mistakes = 0;
    state.sorted = 0;
    state.timeLeft = practice ? 45 : 60;
    state.uploadLimit = practice ? 16 : 20;
    state.queuePressure = 18;
    state.speed = practice ? 0.9 : 1;
    state.hintUntil = 0;
    state.current = makeFile();
    state.particles = [];
    state.lastTick = performance.now();
    modal.classList.add("hidden");
    startButton.textContent = "Restart Run";
    window.UploadLimitPlatform.gameplayStart();
    window.UploadLimitPlatform.track("run_start", { practice });
    updateHud();
  }

  function makeFile() {
    const type = pick(fileTypes);
    const name = `${pick(names)}_${Math.floor(10 + Math.random() * 89)}.${type.ext.toLowerCase()}`;
    const profile = pick(["ready", "large", "wrong_format", "duplicate", "large", "ready"]);
    let size = Math.max(1, Math.round((type.base * (0.6 + Math.random() * 1.4)) * 10) / 10);
    let ext = type.ext;
    let target = "send";

    if (profile === "large") {
      size = Math.round((state.uploadLimit * (1.08 + Math.random() * 1.8)) * 10) / 10;
      target = "compress";
    } else if (profile === "wrong_format") {
      ext = pick(type.wrong);
      size = Math.max(1, Math.round((state.uploadLimit * (0.35 + Math.random() * 0.58)) * 10) / 10);
      target = "convert";
    } else if (profile === "duplicate") {
      size = Math.max(1, Math.round((type.base * (0.4 + Math.random() * 0.9)) * 10) / 10);
      target = "trash";
    } else if (size > state.uploadLimit) {
      target = "compress";
    }

    return {
      name: name.replace(type.ext.toLowerCase(), ext.toLowerCase()),
      ext,
      size,
      target,
      x: canvas.width / 2,
      y: 96,
      createdAt: performance.now(),
      profile,
    };
  }

  function tick(now) {
    const delta = Math.min(0.05, (now - state.lastTick) / 1000 || 0);
    state.lastTick = now;

    if (state.running && !state.paused && !state.over) {
      state.timeLeft -= delta;
      state.queuePressure += delta * (8 + state.speed * 3);
      state.speed += delta * 0.025;
      if (state.queuePressure >= 100 || state.timeLeft <= 0) endRun();
      updateParticles(delta);
      updateHud();
    }

    draw(now);
    requestAnimationFrame(tick);
  }

  function chooseLane(laneId) {
    if (!state.running || state.paused || state.over || !state.current) return;
    const correct = state.current.target === laneId;
    window.UploadLimitPlatform.track("lane_choice", { lane: laneId, target: state.current.target });
    pulseLane(laneId);
    if (correct) {
      const gained = Math.round((110 + Math.max(0, 100 - state.queuePressure)) * state.combo);
      state.score += gained;
      state.sorted += 1;
      state.streak += 1;
      state.combo = Math.min(8, 1 + Math.floor(state.streak / 4));
      state.queuePressure = Math.max(0, state.queuePressure - 13 - state.combo);
      burst(state.current, lanes.find((lane) => lane.id === laneId)?.color || "#0f8b8d", `+${gained}`);
      window.UploadLimitPlatform.track("correct_sort", { lane: laneId, target: state.current.target });
    } else {
      state.mistakes += 1;
      state.streak = 0;
      state.combo = 1;
      state.queuePressure = Math.min(100, state.queuePressure + 18);
      burst(state.current, "#e66a5d", "Wrong");
      window.UploadLimitPlatform.track("wrong_sort", { lane: laneId, target: state.current.target });
    }
    state.current = makeFile();
    updateHud();
  }

  async function useHint() {
    if (!state.running || state.paused || state.over || !state.current) return;
    if (window.UploadLimitPlatform.adsAllowed() && state.score < 120 && state.sorted > 2) {
      state.paused = true;
      const watched = await window.UploadLimitPlatform.requestAd("rewarded", {
        onUnavailable: () => {},
        onError: () => {},
      });
      state.paused = false;
      if (!watched) {
        state.score = Math.max(0, state.score - 40);
      }
    } else {
      state.score = Math.max(0, state.score - 80);
    }
    state.hintUntil = performance.now() + 2400;
    window.UploadLimitPlatform.track("hint_used", { target: state.current.target });
    updateHud();
  }

  function endRun() {
    state.over = true;
    state.running = false;
    startButton.textContent = "Start Run";
    window.UploadLimitPlatform.gameplayStop();
    window.UploadLimitPlatform.track("run_end", {
      score: state.score,
      sorted: state.sorted,
      mistakes: state.mistakes,
    });
    showModal(
      "Upload queue closed",
      state.score >= 3500
        ? "Strong run. This is good enough for a platform review loop and short demo capture."
        : "The core loop is working. Replay to push combo higher and keep the queue under pressure.",
      "Play again",
      "Practice",
      [
        ["Score", state.score],
        ["Sorted", state.sorted],
        ["Mistakes", state.mistakes],
      ],
      () => reset(false),
      () => reset(true)
    );
  }

  function draw(now) {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, "#fff9ef");
    grd.addColorStop(1, "#f1eadb");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    drawUploadGate();
    drawLaneDeck();
    drawCurrentFile(now);
    drawPressure();
    drawParticles();
    drawOverlayCopy();
  }

  function drawUploadGate() {
    ctx.save();
    ctx.fillStyle = "#1c2630";
    roundRect(420, 40, 440, 78, 8);
    ctx.fill();
    ctx.fillStyle = "#f2b84b";
    ctx.font = "800 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`Upload limit: ${state.uploadLimit} MB`, canvas.width / 2, 75);
    ctx.fillStyle = "#fffdf7";
    ctx.font = "700 16px system-ui";
    ctx.fillText("Sort before the queue bursts", canvas.width / 2, 99);
    ctx.restore();
  }

  function drawLaneDeck() {
    const laneWidth = canvas.width / lanes.length;
    lanes.forEach((lane, index) => {
      const x = index * laneWidth + 18;
      const y = canvas.height - 158;
      const w = laneWidth - 36;
      const active = state.current?.target === lane.id && performance.now() < state.hintUntil;
      ctx.save();
      ctx.fillStyle = active ? lane.color : "#fffdf7";
      ctx.strokeStyle = lane.color;
      ctx.lineWidth = active ? 5 : 3;
      roundRect(x, y, w, 118, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = active ? "#ffffff" : "#1c2630";
      ctx.font = "900 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(lane.label, x + w / 2, y + 46);
      ctx.font = "800 16px system-ui";
      ctx.fillText(`${index + 1}`, x + w / 2, y + 82);
      ctx.restore();
    });
  }

  function drawCurrentFile(now) {
    if (!state.current) return;
    const scale = canvas.clientWidth < 560 ? 1.18 : 1;
    const age = Math.min(1, (now - state.current.createdAt) / 1400);
    const y = 152 + easeOut(age) * 220 + Math.sin(now / 260) * 7;
    const x = canvas.width / 2;
    const file = state.current;
    file.x = x;
    file.y = y;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(now / 420) * 0.035);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1c2630";
    ctx.lineWidth = 4;
    roundRect(-142, -66, 284, 132, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = file.target === "compress" ? "#e66a5d" : file.target === "convert" ? "#6f64c8" : file.target === "trash" ? "#2f3a45" : "#4f9f67";
    roundRect(-120, -46, 72, 52, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(file.ext, -84, -13);

    ctx.fillStyle = "#1c2630";
    ctx.font = "850 18px system-ui";
    ctx.textAlign = "left";
    fitText(file.name, -34, -24, 150);
    ctx.fillStyle = "#65727e";
    ctx.font = "800 16px system-ui";
    ctx.fillText(`${file.size} MB`, -34, 12);
    ctx.fillStyle = file.target === "compress" ? "#e66a5d" : file.target === "convert" ? "#6f64c8" : file.target === "trash" ? "#2f3a45" : "#0a6062";
    ctx.font = "800 14px system-ui";
    ctx.fillText(reasonFor(file), -34, 36);
    ctx.restore();
  }

  function drawPressure() {
    const x = 44;
    const y = 86;
    const h = canvas.height - 250;
    ctx.save();
    ctx.fillStyle = "#efe4d0";
    roundRect(x, y, 34, h, 8);
    ctx.fill();
    const fillHeight = Math.max(8, h * (state.queuePressure / 100));
    ctx.fillStyle = state.queuePressure > 72 ? "#e66a5d" : state.queuePressure > 46 ? "#f2b84b" : "#4f9f67";
    roundRect(x, y + h - fillHeight, 34, fillHeight, 8);
    ctx.fill();
    ctx.translate(x + 17, y + h + 28);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#65727e";
    ctx.font = "800 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("QUEUE PRESSURE", 0, 0);
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.font = "900 20px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(particle.text, particle.x, particle.y);
      ctx.restore();
    });
  }

  function drawOverlayCopy() {
    if (state.running) return;
    ctx.save();
    ctx.fillStyle = "rgba(255, 253, 247, 0.78)";
    roundRect(354, 210, 574, 122, 8);
    ctx.fill();
    ctx.fillStyle = "#1c2630";
    ctx.font = "900 30px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Sort files before the upload limit wins", canvas.width / 2, 256);
    ctx.fillStyle = "#65727e";
    ctx.font = "700 18px system-ui";
    ctx.fillText("Use 1, 2, 3, 4 or tap the lane buttons.", canvas.width / 2, 292);
    ctx.restore();
  }

  function updateParticles(delta) {
    state.particles.forEach((particle) => {
      particle.y -= 48 * delta;
      particle.life -= 0.95 * delta;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function burst(file, color, text) {
    state.particles.push({ x: file.x, y: file.y - 74, color, text, life: 1 });
  }

  function updateHud() {
    scoreValue.textContent = String(state.score);
    comboValue.textContent = `x${state.combo}`;
    timeValue.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    limitValue.textContent = `${state.uploadLimit} MB`;
    if (state.current) {
      currentFileName.textContent = state.current.name;
      currentFileType.textContent = state.current.ext;
      currentFileSize.textContent = `${state.current.size} MB`;
      limitBarFill.style.width = `${Math.min(100, Math.round((state.current.size / state.uploadLimit) * 100))}%`;
    }
  }

  function reasonFor(file) {
    if (file.target === "compress") return "Over limit";
    if (file.target === "convert") return "Wrong format";
    if (file.target === "trash") return "Duplicate";
    return "Ready";
  }

  function showModal(title, body, primary, secondary, stats, onPrimary, onSecondary) {
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modalPrimary.textContent = primary;
    modalSecondary.textContent = secondary;
    modalStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    modalPrimary.onclick = onPrimary;
    modalSecondary.onclick = onSecondary;
    modal.classList.remove("hidden");
  }

  function pulseLane(laneId) {
    laneButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.lane === laneId);
    });
    setTimeout(() => laneButtons.forEach((button) => button.classList.remove("active")), 160);
  }

  function fitText(text, x, y, maxWidth) {
    let value = text;
    while (ctx.measureText(value).width > maxWidth && value.length > 8) {
      value = `${value.slice(0, -5)}...`;
    }
    ctx.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function easeOut(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function pick(values) {
    return values[Math.floor(Math.random() * values.length)];
  }

  modalPrimary.addEventListener("click", () => reset(false));
  modalSecondary.addEventListener("click", () => reset(true));
  startButton.addEventListener("click", () => reset(false));
  restartButton.addEventListener("click", () => reset(false));
  hintButton.addEventListener("click", useHint);
  laneButtons.forEach((button) => button.addEventListener("click", () => chooseLane(button.dataset.lane)));
  document.querySelector(".bottom-strip a")?.addEventListener("click", () => window.UploadLimitPlatform.track("cta_click", { target: "free-pdf-tools" }));
  window.addEventListener("keydown", (event) => {
    const lane = lanes.find((item) => item.key === event.key);
    if (lane) chooseLane(lane.id);
    if (event.key.toLowerCase() === "h") useHint();
    if (event.key === "Enter" && !state.running) reset(false);
  });

  showModal(
    "Upload queue ready",
    "Sort files into the right lane. Keep the queue calm, build combo, and survive the upload rush.",
    "Play",
    "Practice",
    [
      ["Keys", "1-4"],
        ["Goal", "60s"],
      ["Ads", "Disabled"],
    ],
    () => reset(false),
    () => reset(true)
  );
  updateHud();
  requestAnimationFrame(tick);
})();
