(() => {
  "use strict";

  const API_BASE = "http://127.0.0.1:8000";
  const MODELS = { random_forest: "Random forest", linear_regression: "Linear regression" };

  const $ = (s) => document.querySelector(s);
  const form = $("#form");
  const panel = $("#panel");
  const submitBtn = $("#submit");
  const el = {
    score: $("#score"), band: $("#band"), context: $("#context"), nudges: $("#nudges"),
    sun: $("#sun"), trail: $("#trail"), errTitle: $("#err-title"), errCopy: $("#err-copy"),
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ARC = { cx: 200, cy: 200, r: 160 };
  let shown = 0;       // score currently drawn on the arc
  let frame = 0;
  let busy = false;
  let scores = {};     // latest score per model for the current answers

  /* ---------- arc + sun ---------- */
  function place(v) {
    const a = Math.PI * (1 - v / 10);
    const x = ARC.cx + ARC.r * Math.cos(a);
    const y = ARC.cy - ARC.r * Math.sin(a);
    el.sun.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    el.trail.style.strokeDashoffset = String(100 - v * 10);
    el.score.textContent = v.toFixed(2);
  }

  function animateTo(target) {
    cancelAnimationFrame(frame);
    if (reduceMotion) { shown = target; place(target); return; }
    const from = shown, t0 = performance.now(), dur = 1300;
    const step = (t) => {
      const k = Math.min((t - t0) / dur, 1);
      shown = from + (target - from) * (1 - Math.pow(1 - k, 3));
      place(shown);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  /* ---------- copy ---------- */
  const BANDS = [
    { max: 4, tone: "night", name: "Running low", text: "Your answers point to strain right now. Small changes to sleep and screen time tend to help most." },
    { max: 7, tone: "dusk", name: "Holding steady", text: "Your rhythm is fairly steady, with room to recover and reset." },
    { max: 10.01, tone: "day", name: "Feeling bright", text: "Your habits point to a well-supported baseline. Keep doing what's working." },
  ];

  function nudgesFor(p) {
    const out = [];
    if (p.sleep_hours_per_night < 7) out.push("You sleep under 7 hours a night. A steadier bedtime is usually the quickest win.");
    if (p.avg_daily_usage_hours > 6) out.push("Screen time is above 6 hours a day. Try one phone-free hour before bed.");
    if (p.daily_unlocks > 100) out.push("You unlock your phone over 100 times a day. Muting non-essential notifications can cut that.");
    if (p.physical_activity_hours < 0.5) out.push("Even a 20-minute walk a day counts as physical activity.");
    if (p.stress_level === "High" || p.stress_level === "Very High") out.push("Stress is running high. Talking it through with someone you trust can help.");
    if (!out.length) out.push("Your habits look steady. Keep the routine that's working.");
    return out.slice(0, 3);
  }

  /* ---------- state ---------- */
  const setState = (s) => { panel.dataset.state = s; };

  function updateCompare() {
    const current = form.elements.selected_model.value;
    document.querySelectorAll(".compare [data-m]").forEach((d) => {
      const v = scores[d.dataset.m];
      d.querySelector("b").textContent = typeof v === "number" ? v.toFixed(2) : "-";
      d.classList.toggle("active", d.dataset.m === current);
    });
  }

  function renderResult(score, payload) {
    const band = BANDS.find((b) => score < b.max);
    panel.dataset.tone = band.tone;
    el.band.textContent = band.name;
    el.context.textContent = band.text;
    el.nudges.innerHTML = "";
    nudgesFor(payload).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      el.nudges.appendChild(li);
    });
    updateCompare();
    panel.classList.remove("stale");
    setState("result");
    animateTo(score);
  }

  function fail(title, copy) {
    el.errTitle.textContent = title;
    el.errCopy.textContent = copy;
    setState("error");
  }

  /* ---------- form helpers ---------- */
  function collect() {
    const fd = new FormData(form); // includes the model radios linked with form="form"
    const g = (k) => String(fd.get(k) ?? "").trim();
    const n = (k) => (g(k) === "" ? NaN : Number(g(k)));
    return {
      age: n("age"),
      gender: g("gender"),
      country: g("country"),
      academic_level: g("academic_level"),
      most_used_platform: g("most_used_platform"),
      purpose_of_use: g("purpose_of_use"),
      avg_daily_usage_hours: n("avg_daily_usage_hours"),
      daily_unlocks: n("daily_unlocks"),
      study_hours: n("study_hours"),
      physical_activity_hours: n("physical_activity_hours"),
      sleep_hours_per_night: n("sleep_hours_per_night"),
      stress_level: g("stress_level"),
      selected_model: g("selected_model") || "random_forest",
    };
  }

  function validate(p) {
    const errs = {};
    const whole = (k, min, max) => {
      if (Number.isNaN(p[k])) errs[k] = "Enter a number.";
      else if (!Number.isInteger(p[k])) errs[k] = "Use a whole number.";
      else if (p[k] < min || p[k] > max) errs[k] = `Enter a value from ${min} to ${max}.`;
    };
    whole("age", 10, 100);
    whole("daily_unlocks", 0, 100000);
    ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use", "stress_level"].forEach((k) => {
      if (!p[k]) errs[k] = k === "country" ? "Enter your country." : "Choose an option.";
    });
    return errs;
  }

  const fieldOf = (name) => form.querySelector(`[data-field="${name}"]`);

  function showErrors(errs) {
    let first = true;
    Object.entries(errs).forEach(([name, msg]) => {
      const f = fieldOf(name);
      if (!f) return;
      f.classList.add("has-error");
      f.querySelector(".err").textContent = msg;
      if (first) { f.querySelector("input, select")?.focus(); first = false; }
    });
  }

  function clearErrors() {
    form.querySelectorAll(".has-error").forEach((f) => f.classList.remove("has-error"));
  }

  function serverErrors(detail) {
    const errs = {};
    if (Array.isArray(detail)) {
      detail.forEach((d) => {
        const name = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        if (name && fieldOf(name)) errs[name] = d.msg || "Invalid value.";
      });
    }
    return errs;
  }

  /* ---------- sliders ---------- */
  function syncRange(r) {
    const out = form.querySelector(`output[for="${r.id}"]`);
    if (out) out.textContent = `${Number(r.value).toFixed(1)} h`;
    r.style.setProperty("--p", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
  }
  form.querySelectorAll('input[type="range"]').forEach(syncRange);

  /* ---------- request ---------- */
  async function run() {
    if (busy) return;
    clearErrors();
    const payload = collect();
    const errs = validate(payload);
    if (Object.keys(errs).length) { showErrors(errs); return; }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    panel.classList.remove("stale");
    setState("loading");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const body = await res.json().catch(() => null);

      if (res.status === 422) {
        const se = serverErrors(body?.detail);
        showErrors(se);
        return fail("Some answers need fixing", Object.keys(se).length
          ? "The server rejected a few answers. They're marked in the form."
          : "The server rejected these answers. Check them and try again.");
      }
      if (!res.ok) {
        return fail("The prediction failed",
          typeof body?.detail === "string" ? body.detail : `The server responded with status ${res.status}.`);
      }
      const score = body?.predicted_mental_health_score;
      if (typeof score !== "number") {
        return fail("Unexpected response", "The server replied, but the score was missing.");
      }

      scores[payload.selected_model] = score;
      renderResult(score, payload);
    } catch (err) {
      fail(err.name === "AbortError" ? "The server took too long" : "Can't reach the server",
        `Couldn't get an answer from ${API_BASE}. Start the backend with "uvicorn main:app --reload" and try again.`);
    } finally {
      clearTimeout(timer);
      busy = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
  }

  /* ---------- events ---------- */
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); });

  form.addEventListener("input", (e) => {
    e.target.closest("[data-field]")?.classList.remove("has-error");
    if (e.target.type === "range") syncRange(e.target);
    scores = {};                       // answers changed, so earlier scores are out of date
    updateCompare();
    if (panel.dataset.state === "result") panel.classList.add("stale");
  });

  // Switching model after a result recalculates straight away
  document.querySelectorAll('input[name="selected_model"]').forEach((r) => {
    r.addEventListener("change", () => {
      updateCompare();
      if (panel.dataset.state === "result") run();
    });
  });

  $("#retry").addEventListener("click", run);

  place(0);
  updateCompare();
})();
