/* Read-only xArm API client. No model inference, control, or mutation requests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MomoAPI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TYPE_NAMES = Object.freeze({
    normal: "정상", A121: "운반 하중 증가 · A121", B82: "상부 하중 · B82",
    C182: "하부 하중 · C182", D: "최초 파지 실패 · D", E: "들어 올리다 이탈 · E",
    F: "작업물 범위 밖 · F", foam_contact: "폼 접촉", station_disturbance: "작업대 흔들림",
    normal_like: "정상 유사 · 원경보 유지", unknown: "유형 미상", no_alarm: "미경보",
    unavailable: "분류 불가", not_applicable: "보조 추정 비대상"
  });

  function alarmLabel(value) {
    if (value === true) return "이상 경보";
    if (value === false) return "미경보";
    if (value === null || value === undefined) return "미판정";
    throw new TypeError("alarm must be true, false, or null");
  }
  function typeLabel(value) { return TYPE_NAMES[value] || (value == null ? "미제공" : String(value)); }
  function numberLabel(value, digits = 3) {
    return typeof value === "number" && Number.isFinite(value)
      ? value.toLocaleString("ko-KR", { maximumFractionDigits: digits }) : "—";
  }
  function cursorParts(value) {
    if (typeof value !== "string") return null;
    const match = /^(.+):(\d+)$/.exec(value);
    if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
    return { instance: match[1], sequence: Number(match[2]) };
  }
  function cursorTransition(previous, next) {
    const current = cursorParts(next), old = cursorParts(previous);
    if (!current) return "invalid";
    if (!old) return "first";
    if (current.instance !== old.instance) return "restart";
    if (current.sequence === old.sequence) return "duplicate";
    if (current.sequence < old.sequence) return "rewind";
    return current.sequence === old.sequence + 1 ? "next" : "gap";
  }
  function historyRevision(status) {
    const r = status?.latest;
    if (!r) return null;
    const d = r.detectors || {}, a = r.auxiliary || {}, o = r.operator || {};
    // Samples, ages and in-motion residual maxima must not turn History into a 5 Hz query.
    return JSON.stringify([r.id, r.cycle?.phase, r.model_profile,
      d.catboost?.alarm, d.catboost?.score, d.gru?.alarm,
      d.combined?.alarm, d.combined?.type, a.estimate_status, a.estimated_type,
      o.confirmed, o.label, o.outcome, r.quality?.error]);
  }

  class Client {
    constructor(options = {}) {
      this.baseURL = (options.baseURL || "").replace(/\/$/, "");
      this.prefix = "/api/v1";
      this.fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
      this.EventSourceImpl = options.EventSourceImpl === undefined ? globalThis.EventSource : options.EventSourceImpl;
      if (typeof this.fetchImpl !== "function") throw new Error("fetch is required");
      this.onStatus = options.onStatus || (() => {});
      this.onCycles = options.onCycles || (() => {});
      this.onModels = options.onModels || (() => {});
      this.onConnection = options.onConnection || (() => {});
      this.onError = options.onError || (() => {});
      this.onRefreshRequired = options.onRefreshRequired || (() => {});
      this.pollMs = options.pollMs ?? 5000;
      this.historyRefreshMs = options.historyRefreshMs ?? 3000;
      this.timeoutMs = options.timeoutMs ?? 10000;
      this.historyQuery = { limit: 25, offset: 0, ...(options.historyQuery || {}) };
      this.cursor = null;
      this.closed = true;
      this._opened = false;
      this._controllers = new Set();
      this._refreshPromise = null;
      this._historyTimer = null;
      this._lastHistoryAt = 0;
      this._historyVersion = 0;
      this._statusVersion = 0;
      this._historyRevision = undefined;
    }

    url(path, query = {}) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params.set(key, value === null ? "null" : String(value));
      });
      return this.baseURL + this.prefix + path + (params.size ? "?" + params : "");
    }
    async get(path, query = {}) {
      const controller = new AbortController();
      this._controllers.add(controller);
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.url(path, query), {
          method: "GET", cache: "no-store", credentials: "same-origin",
          headers: { Accept: "application/json" }, signal: controller.signal
        });
        if (!response.ok) throw new Error("API HTTP " + response.status + ": " + path);
        return await response.json();
      } finally {
        clearTimeout(timer);
        this._controllers.delete(controller);
      }
    }
    health() { return this.get("/health"); }
    status() { return this.get("/status"); }
    models() { return this.get("/models"); }
    listCycles(query = this.historyQuery) { return this.get("/cycles", query); }
    cycle(id) { return this.get("/cycles/" + encodeURIComponent(id)); }
    series(id, query = {}) {
      return this.get("/cycles/" + encodeURIComponent(id) + "/series", {
        ...query, channels: Array.isArray(query.channels) ? query.channels.join(",") : query.channels
      });
    }
    metrics(query = {}) { return this.get("/metrics", query); }
    trends(query = {}) { return this.get("/trends", query); }
    csvURL(query = this.historyQuery) {
      const allFiltered = { ...query };
      delete allFiltered.limit;
      delete allFiltered.offset;
      return this.url("/cycles.csv", allFiltered);
    }
    async csvInfo(query = this.historyQuery) {
      const controller = new AbortController();
      this._controllers.add(controller);
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const url = this.csvURL(query);
      try {
        const response = await this.fetchImpl(url, { method: "HEAD", cache: "no-store",
          credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("CSV HTTP " + response.status);
        const total = response.headers.get("X-Export-Total"), rows = response.headers.get("X-Export-Rows");
        const truncated = response.headers.get("X-Export-Truncated");
        if (!/^\d+$/.test(total ?? "") || !/^\d+$/.test(rows ?? "") || !["true", "false"].includes(truncated)) {
          throw new Error("CSV export limits unavailable; do not assume a complete export");
        }
        return { url, total: Number(total), rows: Number(rows), truncated: truncated === "true" };
      } finally {
        clearTimeout(timer);
        this._controllers.delete(controller);
      }
    }
    setHistoryQuery(query) {
      this.historyQuery = { limit: 25, offset: 0, ...query };
      return this.refreshHistory();
    }
    async refreshHistory() {
      const version = ++this._historyVersion;
      const result = await this.listCycles({ ...this.historyQuery });
      if (!Array.isArray(result.items) || !Number.isInteger(result.total)) throw new Error("Invalid cycles response");
      if (!this.closed && version === this._historyVersion) {
        this._lastHistoryAt = Date.now();
        this.onCycles(result);
      }
      return result;
    }
    _deliverStatus(result, scheduleHistory = true) {
      const revision = historyRevision(result);
      const changed = revision !== this._historyRevision;
      this._historyRevision = revision;
      this.onStatus(result); // Live cards render synchronously; no History timer applies.
      if (scheduleHistory) this._scheduleHistory(changed);
    }
    async _readStatus(scheduleHistory = true) {
      const version = ++this._statusVersion;
      const result = await this.status();
      if (!this.closed && version === this._statusVersion) this._deliverStatus(result, scheduleHistory);
      return result;
    }
    refresh(reason = "manual", includeModels = false) {
      if (this._refreshPromise) return this._refreshPromise;
      this.onRefreshRequired(reason);
      this._refreshPromise = Promise.all([
        this._readStatus(false),
        this.refreshHistory(),
        ...(includeModels ? [this.models().then(value => { if (!this.closed) this.onModels(value); return value; })] : [])
      ]).finally(() => { this._refreshPromise = null; });
      return this._refreshPromise;
    }
    _scheduleHistory(immediate = false) {
      if (this.closed) return;
      if (this._historyTimer !== null) {
        if (!immediate) return;
        clearTimeout(this._historyTimer);
      }
      const delay = immediate ? 0 : Math.max(0, this.historyRefreshMs - (Date.now() - this._lastHistoryAt));
      this._historyTimer = setTimeout(() => {
        this._historyTimer = null;
        if (!this.closed) this.refreshHistory().catch(error => this.onError(error));
      }, delay);
    }
    _streamStatus(event) {
      if (this.closed) return;
      try {
        const next = event.lastEventId;
        const transition = cursorTransition(this.cursor, next);
        if (transition === "duplicate") return;
        const payload = JSON.parse(event.data);
        ++this._statusVersion; // An older in-flight REST response must not replace this SSE state.
        this._deliverStatus(payload);
        if (transition !== "invalid") this.cursor = next;
        if (["gap", "restart", "rewind", "invalid"].includes(transition)) {
          this.refresh("SSE_" + transition).catch(error => this.onError(error));
        }
      } catch (error) {
        this.onError(error);
        this.refresh("SSE_parse_error").catch(failure => this.onError(failure));
      }
    }
    async start() {
      if (!this.closed) return;
      this.closed = false;
      this._opened = false;
      this.cursor = null;
      this._historyRevision = undefined;
      this.onConnection("connecting");
      await this.refresh("initial", true).catch(error => this.onError(error));
      if (this.closed) return;
      if (typeof this.EventSourceImpl === "function") {
        this._stream = new this.EventSourceImpl(this.url("/events"));
        this._stream.addEventListener("status", event => this._streamStatus(event));
        this._stream.addEventListener("reset", () => {
          if (this.closed) return;
          this.cursor = null;
          this.refresh("SSE_reset").catch(error => this.onError(error));
        });
        this._stream.onopen = () => {
          if (this.closed) return;
          this.onConnection("connected");
          if (this._opened) this.refresh("SSE_reconnect").catch(error => this.onError(error));
          this._opened = true;
        };
        // Native EventSource retains Last-Event-ID when reconnecting. Keep old data visibly stale.
        this._stream.onerror = () => { if (!this.closed) this.onConnection("reconnecting"); };
      } else this.onConnection("polling");
      this._pollTimer = setInterval(() => {
        if (this._pollInFlight) return;
        this._pollInFlight = true;
        this._readStatus()
          .catch(error => { if (!this.closed) { this.onConnection("offline"); this.onError(error); } })
          .finally(() => { this._pollInFlight = false; });
      }, this.pollMs);
    }
    stop() {
      this.closed = true;
      ++this._historyVersion;
      ++this._statusVersion;
      if (this._stream) this._stream.close();
      clearInterval(this._pollTimer);
      clearTimeout(this._historyTimer);
      this._historyTimer = null;
      for (const controller of this._controllers) controller.abort();
      this.onConnection("closed");
    }
  }
  return Object.freeze({ Client, TYPE_NAMES, alarmLabel, typeLabel, numberLabel, cursorTransition, historyRevision });
});
