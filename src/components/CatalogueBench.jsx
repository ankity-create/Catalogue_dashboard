import React, { useState, useEffect, useRef, useCallback } from "react";

/* ---------- design tokens ---------- */
const T = {
  paper: "#F6F7F4",
  card: "#FFFFFF",
  ink: "#1A231D",
  muted: "#75807A",
  line: "#E1E6E0",
  leaf: "#2F7D4F",
  leafSoft: "#E8F2EB",
  amber: "#B4690E",
  red: "#B3401F",
  mono: "'SFMono-Regular', ui-monospace, 'JetBrains Mono', Menlo, monospace",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
};

/* ---------- standard product schema ---------- */
const OPT_WARRANTY = [
  "1-year comprehensive product warranty, 5-year PCB warranty, and 10-year compressor warranty",
];
const OPT_UNBOXING = [
  "Please record or photograph the unpacking process to verify the product's condition upon delivery.",
];
const OPT_REPLACEMENT = [
  "Applicable only in cases of incorrect delivery or transit damage. Requests must be submitted on the same day of delivery in unused condition with original packaging.",
];
const OPT_RETURN = [
  "Not applicable once unpacked/installed.",
];
const OPT_UNLOADING = [
  "Unloading of heavy machinery shall be done at the customer's end. Please ensure sufficient manpower/equipment is arranged at delivery time.",
];
const OPT_INSTALL = [
  "Installation and technical services can be arranged directly through brand-authorized technicians upon request (standard installation charges apply).",
];

const DEFAULTS = {
  warranty_policy: OPT_WARRANTY[0],
  unboxing_requirement: OPT_UNBOXING[0],
  replacement_policy: OPT_REPLACEMENT[0],
  return_policy: OPT_RETURN[0],
  unloading_responsibility: OPT_UNLOADING[0],
  installation_support: OPT_INSTALL[0],
};

const GROUPS = [
  { id: "basics", title: "Identity & pricing" },
  { id: "tech", title: "1 · Technical details" },
  { id: "other", title: "2 · Other details" },
  { id: "policy", title: "3 · Policies" },
  { id: "install", title: "4 · Unloading & installation" },
];

const FIELDS = [
  { group: "basics", key: "brand", label: "Brand", req: true },
  { group: "basics", key: "product_name", label: "Product name", req: true },
  { group: "basics", key: "category", label: "Category", req: true, hint: "e.g. Air Conditioner" },
  { group: "basics", key: "subcategory", label: "Subcategory", req: false, hint: "e.g. Split AC" },
  { group: "basics", key: "mrp_inr", label: "MRP (₹)", req: true },
  { group: "basics", key: "country_of_origin", label: "Country of origin", req: false },

  { group: "tech", key: "model_number", label: "Model no.", req: true },
  { group: "tech", key: "size", label: "Size", req: false },
  { group: "tech", key: "colour", label: "Colour", req: false },
  { group: "tech", key: "dimensions_outer", label: "Dimensions — outer", req: false, hint: "W x D x H cm" },
  { group: "tech", key: "dimensions_inner", label: "Dimensions — inner", req: false, hint: "W x D x H cm" },
  { group: "tech", key: "capacity_size", label: "Capacity", req: true, hint: "e.g. 1.5 Ton / 190 L / 7 kg" },
  { group: "tech", key: "power_wattage", label: "Power / wattage", req: false },
  { group: "tech", key: "energy_rating", label: "Energy rating", req: false, hint: "e.g. 5 Star (BEE)" },
  { group: "tech", key: "weight", label: "Weight", req: false },

  { group: "other", key: "key_features", label: "Key features", req: true, long: true, hint: "one per line" },
  { group: "other", key: "ideal_for", label: "Ideal for", req: false, hint: "e.g. families of 4-6, small kitchens" },
  { group: "other", key: "how_to_use", label: "How to use", req: false, long: true },
  { group: "other", key: "in_box_contents", label: "In the box", req: false, long: true },
  { group: "other", key: "description", label: "Standard description", req: true, long: true },

  { group: "policy", key: "warranty_policy", label: "Warranty policy", req: true, options: OPT_WARRANTY },
  { group: "policy", key: "unboxing_requirement", label: "Unboxing requirement", req: true, options: OPT_UNBOXING },
  { group: "policy", key: "replacement_policy", label: "Replacement policy", req: true, options: OPT_REPLACEMENT },
  { group: "policy", key: "return_policy", label: "Return policy", req: true, options: OPT_RETURN },

  { group: "install", key: "unloading_responsibility", label: "Unloading responsibility", req: true, options: OPT_UNLOADING },
  { group: "install", key: "installation_support", label: "Installation & technical support", req: true, options: OPT_INSTALL },
];

const REQUIRED = FIELDS.filter((f) => f.req).map((f) => f.key);

const emptyProduct = () => ({
  id: "sku_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  createdAt: new Date().toISOString(),
  raw: "",
  fields: Object.fromEntries(FIELDS.map((f) => [f.key, DEFAULTS[f.key] || ""])),
});

const PRESETS = [
  { id: "1200", label: "1200 × 1200 — PDP hero", size: 1200 },
  { id: "800", label: "800 × 800 — listing", size: 800 },
  { id: "500", label: "500 × 500 — thumbnail", size: 500 },
];

function resizeToSquare(img, size, format, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);
  const pad = Math.round(size * 0.04);
  const box = size - pad * 2;
  const scale = Math.min(box / img.width, box / img.height);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
  return canvas.toDataURL(format, quality);
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read " + file.name));
    r.readAsDataURL(file);
  });
}

function imageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("File is not a readable image"));
    img.src = src;
  });
}

function slug(s) {
  return (s || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

const STORE_KEY = "catalogue-bench-skus-v1";

async function saveAll(products) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    return true;
  } catch (e) {
    console.error("save failed", e);
    return false;
  }
}

async function loadAll() {
  try {
    const r = localStorage.getItem(STORE_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

function tryDownload(name, text, mime) {
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) {
    console.error("download blocked", e);
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function csvEscape(v) {
  const s = String(v ?? "").replace(/\r?\n/g, " | ");
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const EXPORT_COLS = [{ key: "id", label: "SKU ID" }, ...FIELDS.map((f) => ({ key: f.key, label: f.label }))];

function buildCSV(products) {
  const head = EXPORT_COLS.map((c) => csvEscape(c.label)).join(",");
  const rows = products.map((p) =>
    EXPORT_COLS.map((c) => csvEscape(c.key === "id" ? p.id : p.fields[c.key])).join(",")
  );
  // Leading BOM so Excel opens UTF-8 (₹ and accents) correctly.
  return "﻿" + head + "\n" + rows.join("\n");
}

function buildJSON(products) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: products.length,
      products: products.map((p) => ({ id: p.id, createdAt: p.createdAt, ...p.fields })),
    },
    null,
    2
  );
}

/* ---------- data-dump parser ---------- */
const LONG_KEYS = new Set(FIELDS.filter((f) => f.long).map((f) => f.key));

// Label variants that can appear in raw pasted text / OCR output, per field key.
const DUMP_ALIASES = {
  brand: ["brand", "make", "manufacturer"],
  product_name: ["product name", "product title", "item name", "title", "name", "product"],
  category: ["product category", "category", "product type"],
  subcategory: ["subcategory", "sub category"],
  mrp_inr: ["maximum retail price", "mrp inr", "m r p", "mrp rs", "mrp", "price"],
  country_of_origin: ["country of origin", "made in", "origin", "country"],
  model_number: ["model number", "model no", "model code", "model"],
  size: ["size"],
  colour: ["colour", "color"],
  dimensions_outer: ["outer dimensions", "dimensions outer", "outer size", "external dimensions"],
  dimensions_inner: ["inner dimensions", "dimensions inner", "inner size", "internal dimensions"],
  capacity_size: ["capacity", "tonnage", "volume"],
  power_wattage: ["power wattage", "power consumption", "wattage", "power"],
  energy_rating: ["energy rating", "star rating", "bee rating", "energy efficiency", "energy"],
  weight: ["net weight", "gross weight", "product weight", "weight"],
  key_features: ["key features", "special features", "highlights", "features"],
  ideal_for: ["ideal for", "suitable for", "recommended for", "best for"],
  how_to_use: ["how to use", "instructions", "directions", "usage"],
  in_box_contents: ["what's in the box", "whats in the box", "in the box", "box contents", "package contents", "in box"],
  // Kept deliberately specific: bare "about"/"details" match too much prose and misfire.
  description: ["standard description", "product description", "about this item", "description", "overview"],
  warranty_policy: ["warranty policy", "warranty period", "warranty"],
  unboxing_requirement: ["unboxing requirement", "unboxing"],
  replacement_policy: ["replacement policy", "replacement"],
  return_policy: ["return policy", "returns", "return"],
  unloading_responsibility: ["unloading responsibility", "unloading"],
  installation_support: ["installation and technical support", "installation support", "installation", "technical support"],
};

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Per-alias matcher. A label is recognised when the line either (a) starts with the
// alias followed by a delimiter (":", "=", tab, a spaced "-", or 2+ spaces) and a value,
// or (b) is exactly the alias on its own (a heading). Longest alias first so
// "model number" wins over "model". Delimiters allowing 2+ spaces help OCR'd spec tables
// like "Brand      Voltas".
const DUMP_MATCHERS = Object.entries(DUMP_ALIASES)
  .flatMap(([key, aliases]) => aliases.map((a) => ({ key, alias: a })))
  .sort((a, b) => b.alias.length - a.alias.length)
  .map(({ key, alias }) => {
    const body = alias.split(" ").map(reEscape).join("[^a-z0-9]+");
    const withValue = "^\\s*" + body + "(?:\\s*[:=\\t]+\\s*|\\s*[-–—]\\s+|\\s{2,})(.+)$";
    const alone = "^\\s*" + body + "\\s*[:=]?\\s*$";
    return { key, re: new RegExp(withValue + "|" + alone, "i") };
  });

function matchDumpLabel(line) {
  for (const { key, re } of DUMP_MATCHERS) {
    const m = line.match(re);
    // m[1] is the same-line value; undefined when the line is a bare heading.
    if (m) return { key, value: (m[1] || "").trim(), heading: m[1] === undefined };
  }
  return null;
}

// Any "Label: value" / "Label = value" / "Label<tab>value" line, recognised or not.
// Used to STOP multi-line capture at the next field boundary, so an unknown label never
// gets swallowed into the previous field. Dash and multi-space are excluded here — too
// common inside prose to treat as a generic boundary.
const GENERIC_LABEL = /^\s*[A-Za-z][A-Za-z0-9 ()/&.'-]{0,38}?\s*[:=\t]\s*\S/;

// Parse a raw blob into { fields: {key: value}, unmatched: [lines] }.
// Short fields take only their own line's value. Long fields (features, description, …)
// capture following plain lines but stop at the next label-looking line or a blank line,
// so fields are never merged and unknown labels are surfaced instead of absorbed.
function parseDump(text) {
  const lines = (text || "").split(/\r?\n/).map((l) => l.trim());
  const fields = {};
  const unmatched = [];
  let cur = null; // active long-field key, or null
  let buf = [];

  const setField = (k, v) => {
    const val = (v || "").trim();
    if (val && !(k in fields)) fields[k] = val; // first non-empty value wins
  };
  const flushLong = () => {
    if (cur) setField(cur, buf.join("\n").replace(/\n{3,}/g, "\n\n").trim());
    cur = null;
    buf = [];
  };

  for (const line of lines) {
    if (!line) {
      flushLong(); // a blank line ends a captured block
      continue;
    }
    const m = matchDumpLabel(line);
    if (m) {
      flushLong();
      if (LONG_KEYS.has(m.key)) {
        cur = m.key;
        buf = m.value ? [m.value] : [];
      } else {
        setField(m.key, m.value); // short field: same line only, never absorbs
      }
      continue;
    }
    if (GENERIC_LABEL.test(line)) {
      // Some other labelled line we don't map — a boundary, not content.
      flushLong();
      unmatched.push(line);
      continue;
    }
    if (cur) buf.push(line); // continuation of the active long field
    else unmatched.push(line);
  }
  flushLong();
  return { fields, unmatched };
}

function completeness(p) {
  const filled = REQUIRED.filter((k) => (p.fields[k] || "").trim() !== "").length;
  return filled / REQUIRED.length;
}

const inputStyle = {
  width: "100%",
  border: `1px solid ${T.line}`,
  borderRadius: 6,
  padding: "7px 9px",
  fontSize: 13,
  fontFamily: T.mono,
  color: T.ink,
  background: "#FCFDFB",
  outline: "none",
  boxSizing: "border-box",
};

function Field({ def, value, onChange }) {
  const labelEl = (
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: T.muted }}>
      {def.label}
      {def.req && <span style={{ color: T.leaf }}> *</span>}
    </span>
  );

  if (def.options) {
    const isPreset = value === "" || def.options.includes(value);
    return (
      <label style={{ display: "block" }}>
        {labelEl}
        <div style={{ marginTop: 4 }}>
          <select
            value={isPreset ? value : "__custom"}
            style={inputStyle}
            onChange={(e) => onChange(e.target.value === "__custom" ? " " : e.target.value)}
          >
            <option value="">— select —</option>
            {def.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
          {!isPreset && (
            <input
              style={{ ...inputStyle, marginTop: 6 }}
              value={value}
              autoFocus
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type the custom policy text"
            />
          )}
        </div>
      </label>
    );
  }

  const common = {
    value: value || "",
    onChange: (e) => onChange(e.target.value),
    style: { ...inputStyle, ...(def.long ? { minHeight: 64, resize: "vertical" } : {}) },
    placeholder: def.hint || "",
  };
  return (
    <label style={{ display: "block" }}>
      {labelEl}
      <div style={{ marginTop: 4 }}>{def.long ? <textarea {...common} /> : <input {...common} />}</div>
    </label>
  );
}

function Meter({ value }) {
  const pct = Math.round(value * 100);
  const color = value === 1 ? T.leaf : value >= 0.5 ? T.amber : T.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: T.line, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, minWidth: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function Btn({ children, onClick, kind = "ghost", disabled, small }) {
  const base = {
    border: "1px solid " + (kind === "primary" ? T.leaf : T.line),
    background: kind === "primary" ? T.leaf : "#fff",
    color: kind === "primary" ? "#fff" : T.ink,
    borderRadius: 6,
    padding: small ? "5px 10px" : "8px 14px",
    fontSize: small ? 12 : 13,
    fontWeight: 600,
    fontFamily: T.sans,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
  };
  return (
    <button style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,24,.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%", maxHeight: "85vh", overflow: "auto", padding: 16, fontFamily: T.sans }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 18, cursor: "pointer", color: T.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ImagePanel({ product }) {
  const [items, setItems] = useState([]);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [format, setFormat] = useState("image/jpeg");
  const [imgError, setImgError] = useState("");

  const addFiles = async (files) => {
    setImgError("");
    if (!files || !files.length) return;
    const next = [];
    const failed = [];
    for (const f of files) {
      try {
        const url = await readAsDataURL(f);
        const img = await imageFromSrc(url);
        next.push({ name: f.name, url, w: img.width, h: img.height, img });
      } catch (e) {
        failed.push(f.name || "file");
      }
    }
    if (next.length) setItems((prev) => [...prev, ...next]);
    if (failed.length) setImgError("Couldn't read: " + failed.join(", ") + " — use JPEG/PNG/WebP.");
    if (!next.length && !failed.length) setImgError("No image files found in that selection.");
  };

  const [previewImg, setPreviewImg] = useState(null);

  const saveOne = (item, idx) => {
    const dataUrl = resizeToSquare(item.img, preset.size, format, 0.9);
    const ext = format === "image/png" ? "png" : "jpg";
    const name = `${slug(product.fields.brand)}-${slug(product.fields.product_name)}-${preset.size}-${idx + 1}.${ext}`;
    setPreviewImg({ dataUrl, name });
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <select value={preset.id} onChange={(e) => setPreset(PRESETS.find((p) => p.id === e.target.value))} style={{ ...inputStyle, width: "auto" }}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="image/jpeg">JPEG (white bg)</option>
          <option value="image/png">PNG</option>
        </select>
        <label style={{ border: `1px solid ${T.leaf}`, background: T.leaf, color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          + Add images
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} />
        </label>
        {imgError && <span style={{ fontSize: 12, color: T.red }}>{imgError}</span>}
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}
        style={{ border: `1.5px dashed ${T.line}`, borderRadius: 8, padding: 12, minHeight: 90, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "#FCFDFB" }}
      >
        {items.length === 0 && (
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>
            Drop product photos here — resized on your device, nothing is uploaded.
          </span>
        )}
        {items.map((it, i) => (
          <div key={i} style={{ width: 110 }}>
            <div style={{ width: 110, height: 110, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <img src={it.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} />
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, margin: "3px 0" }}>{it.w}×{it.h} → {preset.size}²</div>
            <div style={{ display: "flex", gap: 4 }}>
              <Btn small onClick={() => saveOne(it, i)}>Save</Btn>
              <Btn small onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Btn>
            </div>
          </div>
        ))}
      </div>
      {previewImg && (
        <Modal title={previewImg.name} onClose={() => setPreviewImg(null)}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
            If it didn't download automatically, long-press the image (phone) or right-click it (computer) and choose "Save image".
          </div>
          <img src={previewImg.dataUrl} alt="Resized product" style={{ width: "100%", border: `1px solid ${T.line}`, borderRadius: 8, display: "block" }} />
        </Modal>
      )}
    </div>
  );
}

const FIELD_LABEL = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));

function DataDumpPanel({ product, onApply }) {
  const [text, setText] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [ocr, setOcr] = useState(null); // {status, pct, msg}
  const [result, setResult] = useState(null); // {applied:[{key,value}], skipped:[...], unmatched:[...]}

  const runOCR = async (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) {
      setOcr({ status: "error", msg: "No image found — drop a JPEG/PNG/WebP screenshot." });
      return;
    }
    setOcr({ status: "loading", pct: 0 });
    try {
      const mod = await import("tesseract.js");
      const recognize = mod.recognize || (mod.default && mod.default.recognize);
      let combined = "";
      for (const f of imgs) {
        const url = await readAsDataURL(f);
        const { data } = await recognize(url, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") setOcr({ status: "loading", pct: Math.round(m.progress * 100) });
          },
        });
        combined += (combined ? "\n" : "") + (data.text || "");
      }
      setText((t) => (t ? t + "\n" : "") + combined);
      setOcr({ status: "done" });
    } catch (e) {
      setOcr({ status: "error", msg: "Could not read the image on this device. " + (e.message || "") });
    }
  };

  const readAndFill = () => {
    const parsed = parseDump(text);
    const applied = [];
    const skipped = [];
    const values = {};
    for (const [key, value] of Object.entries(parsed.fields)) {
      if (!(key in product.fields)) continue;
      const isBlank = String(product.fields[key] || "").trim() === "";
      if (isBlank || overwrite) {
        values[key] = value;
        applied.push({ key, value });
      } else {
        skipped.push({ key, value });
      }
    }
    if (applied.length) onApply(values);
    setResult({ applied, skipped, unmatched: parsed.unmatched });
  };

  const rowStyle = { fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${T.line}`, display: "flex", gap: 8 };
  const keyStyle = { fontFamily: T.mono, color: T.muted, minWidth: 150, flexShrink: 0 };

  return (
    <div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
        Paste raw product data (copied text, or lines like <code>Brand: Voltas</code>, <code>MRP: 45990</code>) — or drop
        a screenshot to read it on this device. Recognised fields fill the blanks automatically.
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Brand: Voltas\nProduct name: 1.5 Ton 5 Star Split AC\nModel no: SAC 183V\nMRP: 45990\nCapacity: 1.5 Ton\nKey features:\n- Copper condenser\n- Turbo cooling"}
        style={{ ...inputStyle, minHeight: 150, width: "100%" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "10px 0" }}>
        <label style={{ border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          + Screenshot (OCR)
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { runOCR(e.target.files); e.target.value = ""; }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.ink }}>
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Overwrite fields that already have a value
        </label>
        {ocr?.status === "loading" && (
          <span style={{ fontSize: 12, color: T.amber, fontFamily: T.mono }}>reading image… {ocr.pct}%</span>
        )}
        {ocr?.status === "error" && <span style={{ fontSize: 12, color: T.red }}>{ocr.msg}</span>}
      </div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); runOCR(e.dataTransfer.files); }}
        style={{ border: `1.5px dashed ${T.line}`, borderRadius: 8, padding: 12, fontSize: 12, color: T.muted, fontFamily: T.mono, background: "#FCFDFB", marginBottom: 10 }}
      >
        …or drop a screenshot here. Images are read on your device — nothing is uploaded.
      </div>
      <Btn kind="primary" onClick={readAndFill} disabled={!text.trim()}>Read &amp; fill blanks</Btn>

      {result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
            Filled {result.applied.length} field{result.applied.length !== 1 ? "s" : ""}
            {result.skipped.length ? ` · ${result.skipped.length} already set (skipped)` : ""}
          </div>
          {result.applied.map(({ key, value }) => (
            <div key={key} style={rowStyle}>
              <span style={{ ...keyStyle, color: T.leaf }}>{FIELD_LABEL[key] || key}</span>
              <span style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{value}</span>
            </div>
          ))}
          {result.skipped.map(({ key, value }) => (
            <div key={key} style={{ ...rowStyle, opacity: 0.55 }}>
              <span style={keyStyle}>{FIELD_LABEL[key] || key}</span>
              <span style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{value}</span>
            </div>
          ))}
          {result.applied.length === 0 && result.skipped.length === 0 && (
            <div style={{ fontSize: 12, color: T.muted }}>
              No known fields matched. Try labelling lines like <code>Brand:</code>, <code>Model no:</code>, <code>MRP:</code>.
            </div>
          )}
          {result.unmatched.length > 0 && (
            <details style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
              <summary style={{ cursor: "pointer" }}>{result.unmatched.length} line(s) not recognised</summary>
              <div style={{ fontFamily: T.mono, fontSize: 11, whiteSpace: "pre-wrap", marginTop: 4 }}>
                {result.unmatched.join("\n")}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function CatalogueBench() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [exportModal, setExportModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dumpTarget, setDumpTarget] = useState(null);
  const saveTimer = useRef(null);

  const openExport = (kind) => {
    const text = kind === "csv" ? buildCSV(products) : buildJSON(products);
    const name = kind === "csv" ? "catalogue-export.csv" : "catalogue-export.json";
    const mime = kind === "csv" ? "text/csv" : "application/json";
    setCopied(false);
    setExportModal({ text, name, mime });
    tryDownload(name, text, mime);
  };

  useEffect(() => {
    (async () => {
      const raw = await loadAll();
      const list = raw.map((p) => ({
        ...p,
        fields: Object.fromEntries(FIELDS.map((f) => [f.key, (p.fields && p.fields[f.key]) || DEFAULTS[f.key] || ""])),
      }));
      setProducts(list);
      if (list.length) setSelected(list[0].id);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback((next) => {
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveAll(next);
      setSaveState(ok ? "saved" : "error");
    }, 500);
  }, []);

  const update = (next) => { setProducts(next); persist(next); };
  const current = products.find((p) => p.id === selected);

  const addProduct = () => {
    const p = emptyProduct();
    update([p, ...products]);
    setSelected(p.id);
    setError("");
  };

  const removeProduct = (id) => {
    const next = products.filter((p) => p.id !== id);
    update(next);
    if (selected === id) setSelected(next[0]?.id || null);
  };

  const patch = (id, fn) => update(products.map((p) => (p.id === id ? fn(p) : p)));

  const openDump = () => {
    if (current) {
      setDumpTarget(current.id);
    } else {
      const p = emptyProduct();
      update([p, ...products]);
      setSelected(p.id);
      setDumpTarget(p.id);
    }
  };

  const dumpProduct = products.find((p) => p.id === dumpTarget);
  const applyDump = (values) =>
    patch(dumpTarget, (p) => ({ ...p, fields: { ...p.fields, ...values } }));

  if (loading) return <div style={{ fontFamily: T.sans, padding: 40, color: T.muted }}>Loading your catalogue…</div>;

  return (
    <div style={{ fontFamily: T.sans, background: T.paper, minHeight: "100vh", color: T.ink }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${T.line}`, background: T.card, flexWrap: "wrap" }}>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
          CATALOGUE<span style={{ color: T.leaf }}>/</span>BENCH
        </div>
        <span style={{ fontSize: 12, color: T.muted }}>{products.length} SKU{products.length !== 1 ? "s" : ""}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: saveState === "error" ? T.red : T.muted }}>
          {saveState === "saving" ? "saving…" : saveState === "error" ? "save failed — retry by editing" : "saved"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn small onClick={openDump}>⤵ Data dump</Btn>
          <Btn small onClick={() => openExport("csv")} disabled={!products.length}>Export CSV</Btn>
          <Btn small onClick={() => openExport("json")} disabled={!products.length}>Export JSON</Btn>
          <Btn small kind="primary" onClick={addProduct}>+ New SKU</Btn>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* sidebar */}
        <div style={{ width: 230, minWidth: 180, borderRight: `1px solid ${T.line}`, padding: 10, alignSelf: "stretch" }}>
          {products.length === 0 && (
            <div style={{ fontSize: 12, color: T.muted, padding: 8 }}>No SKUs yet. Add one to start.</div>
          )}
          {products.map((p) => {
            const c = completeness(p);
            const active = p.id === selected;
            return (
              <div key={p.id} onClick={() => setSelected(p.id)}
                style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: active ? T.leafSoft : "transparent", border: `1px solid ${active ? T.leaf : "transparent"}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.fields.product_name || "Untitled product"}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.muted, margin: "2px 0 5px" }}>
                  {p.fields.brand || "—"} · {p.fields.model_number || "—"}
                </div>
                <Meter value={c} />
              </div>
            );
          })}
        </div>

        {/* editor */}
        <div style={{ flex: 1, padding: 18, maxWidth: 880 }}>
          {!current ? (
            <div style={{ color: T.muted, fontSize: 14, padding: 30 }}>
              Add a SKU to start building your catalog.
            </div>
          ) : (
            <>
              {/* step 2: grouped record */}
              {GROUPS.map((g) => {
                const gf = FIELDS.filter((f) => f.group === g.id);
                return (
                  <div key={g.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>
                      {g.title}
                    </div>
                    {gf.some((f) => !f.long) && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
                        {gf.filter((f) => !f.long).map((f) => (
                          <Field key={f.key} def={f} value={current.fields[f.key]}
                            onChange={(v) => patch(current.id, (p) => ({ ...p, fields: { ...p.fields, [f.key]: v } }))} />
                        ))}
                      </div>
                    )}
                    {gf.some((f) => f.long) && (
                      <div style={{ display: "grid", gap: 12, marginTop: gf.some((f) => !f.long) ? 12 : 0 }}>
                        {gf.filter((f) => f.long).map((f) => (
                          <Field key={f.key} def={f} value={current.fields[f.key]}
                            onChange={(v) => patch(current.id, (p) => ({ ...p, fields: { ...p.fields, [f.key]: v } }))} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* step 3: images */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>
                  Images — square, white-padded, resized locally
                </div>
                <ImagePanel key={current.id} product={current} />
              </div>

              {/* delete button */}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => removeProduct(current.id)}>Delete SKU</Btn>
              </div>
            </>
          )}
        </div>
      </div>

      {dumpProduct && (
        <Modal
          title={"Data dump → " + (dumpProduct.fields.product_name || "new SKU")}
          onClose={() => setDumpTarget(null)}
        >
          <DataDumpPanel key={dumpProduct.id} product={dumpProduct} onApply={applyDump} />
        </Modal>
      )}

      {exportModal && (
        <Modal title={"Export — " + exportModal.name} onClose={() => setExportModal(null)}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
            A download was attempted. If no file appeared (common on phones), use "Copy all" and paste into a spreadsheet or text file.
          </div>
          <textarea readOnly value={exportModal.text} onFocus={(e) => e.target.select()}
            style={{ ...inputStyle, minHeight: 220, width: "100%" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Btn kind="primary" onClick={async () => setCopied(await copyText(exportModal.text))}>
              {copied ? "Copied ✓" : "Copy all"}
            </Btn>
            <Btn onClick={() => tryDownload(exportModal.name, exportModal.text, exportModal.mime)}>Retry download</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}