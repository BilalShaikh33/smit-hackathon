// Zero-dependency, pure-JS stand-in for Mongoose + MongoDB.
//
// Why this exists: this machine's Windows Device Guard / WDAC policy blocks
// execution of unsigned binaries, which means mongodb-memory-server (and any
// locally-downloaded mongod.exe) cannot launch. Rather than depend on a native
// process, this module implements just the slice of the Mongoose API this
// project actually uses (Schema/model/find/findOne/findById/findOneAndUpdate/
// findByIdAndUpdate/create/countDocuments/updateMany/aggregate, plus
// sort/skip/limit/select/populate/lean query chaining) backed by an in-memory
// store that is persisted to JSON files under backend/data/.
//
// Swap MONGO_URI in .env to point at a real MongoDB/Atlas cluster and
// src/db/adapter.js will use the real `mongoose` package instead — no
// controller/model code needs to change either way.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const registry = new Map(); // modelName -> { schema, docs: [] }

function genId() {
  return crypto.randomBytes(12).toString('hex');
}

function dataFile(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function loadDocs(name) {
  const file = dataFile(name);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persist(name) {
  const entry = registry.get(name);
  if (!entry) return;
  fs.writeFileSync(dataFile(name), JSON.stringify(entry.docs, null, 2));
}

// ---------- path helpers ----------

function getPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPath(obj, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// Array-aware path resolution for filter matching, e.g. "messages.flagged"
// resolves through the "messages" array and returns each element's "flagged".
function getPathValues(obj, dottedPath) {
  let contexts = [obj];
  for (const part of dottedPath.split('.')) {
    const next = [];
    for (const ctx of contexts) {
      if (ctx == null) continue;
      const val = ctx[part];
      if (Array.isArray(val)) next.push(...val);
      else next.push(val);
    }
    contexts = next;
  }
  return contexts;
}

function toComparable(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).getTime();
  return v;
}

function escapeForFilterRegex(pattern) {
  return pattern; // callers pass already-safe patterns; kept for clarity at call sites
}

function matchCondition(values, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
    return Object.entries(cond).every(([op, opVal]) => {
      switch (op) {
        case '$regex': {
          const re = new RegExp(opVal, cond.$options || '');
          return values.some((v) => typeof v === 'string' && re.test(v));
        }
        case '$options':
          return true; // consumed alongside $regex
        case '$exists':
          return values.some((v) => v !== undefined) === Boolean(opVal);
        case '$gte':
          return values.some((v) => v !== undefined && toComparable(v) >= toComparable(opVal));
        case '$lt':
          return values.some((v) => v !== undefined && toComparable(v) < toComparable(opVal));
        case '$in':
          return values.some((v) => opVal.includes(v));
        default:
          return true;
      }
    });
  }
  return values.some((v) => v === cond);
}

function matchFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((sub) => matchFilter(doc, sub));
    if (key === '$and') return cond.every((sub) => matchFilter(doc, sub));
    return matchCondition(getPathValues(doc, key), cond);
  });
}

function cmp(a, b) {
  const ca = toComparable(a ?? null);
  const cb = toComparable(b ?? null);
  if (ca < cb) return -1;
  if (ca > cb) return 1;
  return 0;
}

function applyUpdate(doc, update, { isInsert } = {}) {
  if (update.$set) Object.entries(update.$set).forEach(([k, v]) => { if (v !== undefined) setPath(doc, k, v); });
  if (isInsert && update.$setOnInsert) Object.entries(update.$setOnInsert).forEach(([k, v]) => setPath(doc, k, v));
  if (update.$push) {
    Object.entries(update.$push).forEach(([field, val]) => {
      if (!Array.isArray(doc[field])) doc[field] = [];
      if (val && typeof val === 'object' && Array.isArray(val.$each)) doc[field].push(...val.$each);
      else doc[field].push(val);
    });
  }
  if (update.$unset) Object.keys(update.$unset).forEach((k) => setPath(doc, k, undefined));
  // Plain (non-operator) fields are treated as an implicit $set for convenience.
  const hasOperators = Object.keys(update).some((k) => k.startsWith('$'));
  if (!hasOperators) Object.entries(update).forEach(([k, v]) => setPath(doc, k, v));
  return doc;
}

// ---------- defaults from schema shape ----------

function isLeafTypeToken(v) {
  return v === String || v === Number || v === Boolean || v === Date || v === '__ObjectId__' || v === '__Mixed__';
}

// A node is a *field descriptor* (e.g. `{ type: Boolean, default: true }`) only if
// its "type" property is itself a recognized type token/array/Schema — NOT just
// because the node happens to have a key literally named "type". This distinction
// matters because several models here (Plan, SystemLog) have a real field named
// "type" (e.g. 'diet' | 'workout'), so the schema's top-level definition object
// itself has a "type" key without being a descriptor for a "type"-named field.
function isFieldDescriptor(node) {
  return Boolean(node) && typeof node === 'object' && !Array.isArray(node) && !(node instanceof Schema)
    && 'type' in node && (isLeafTypeToken(node.type) || Array.isArray(node.type) || node.type instanceof Schema);
}

function buildDefaults(defNode) {
  if (Array.isArray(defNode)) return [];
  if (isLeafTypeToken(defNode)) return undefined;
  if (defNode instanceof Schema) return {};
  if (defNode && typeof defNode === 'object') {
    if (isFieldDescriptor(defNode)) {
      if (defNode.default !== undefined) return typeof defNode.default === 'function' ? defNode.default() : defNode.default;
      return Array.isArray(defNode.type) ? [] : undefined;
    }
    const obj = {};
    for (const [k, v] of Object.entries(defNode)) obj[k] = buildDefaults(v);
    return obj;
  }
  return undefined;
}

function deepMerge(base, override) {
  if (override === undefined) return base;
  if (override === null || typeof override !== 'object' || Array.isArray(override) || override instanceof Date) return override;
  const out = { ...(base && typeof base === 'object' ? base : {}) };
  for (const k of Object.keys(override)) out[k] = deepMerge(base?.[k], override[k]);
  return out;
}

// ---------- Schema ----------

class Schema {
  constructor(definition = {}, options = {}) {
    this.definition = definition;
    this.options = options;
    this.methods = {};
    this.hooks = { pre: { save: [] } };
    this.indexes = [];
  }
  pre(event, fn) {
    if (!this.hooks.pre[event]) this.hooks.pre[event] = [];
    this.hooks.pre[event].push(fn);
  }
  index(spec, opts) {
    this.indexes.push({ spec, opts });
  }
}

Schema.Types = { ObjectId: '__ObjectId__', Mixed: '__Mixed__' };

async function runPreSaveHooks(schema, doc) {
  for (const hook of schema.hooks.pre.save || []) {
    await new Promise((resolve, reject) => {
      const next = (err) => (err ? reject(err) : resolve());
      const result = hook.call(doc, next);
      if (result && typeof result.then === 'function') result.then(() => resolve(), reject);
    });
  }
}

// ---------- Document wrapping ----------

function attachHelpers(doc, name, schema) {
  Object.defineProperty(doc, '_snapshot', { value: { ...doc }, enumerable: false, configurable: true, writable: true });
  Object.defineProperty(doc, 'isModified', {
    value: function (field) { return this[field] !== this._snapshot[field]; },
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(doc, 'save', {
    value: async function () {
      await runPreSaveHooks(schema, this);
      if (schema.options.timestamps) this.updatedAt = new Date();
      persist(name);
      this._snapshot = { ...this };
      return this;
    },
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(doc, 'toObject', {
    value: function () { return { ...this }; },
    enumerable: false,
    configurable: true,
  });
  for (const [methodName, fn] of Object.entries(schema.methods)) {
    Object.defineProperty(doc, methodName, { value: fn, enumerable: false, configurable: true });
  }
  return doc;
}

function leanClone(doc) {
  return JSON.parse(JSON.stringify(doc));
}

function applySelect(doc, select) {
  if (!doc || !select) return doc;
  const clone = { ...doc };
  if (select.trim().startsWith('-')) {
    select.split(/\s+/).forEach((tok) => { if (tok.startsWith('-')) delete clone[tok.slice(1)]; });
  } else {
    const keep = new Set(['_id', ...select.split(/\s+/).filter(Boolean)]);
    Object.keys(clone).forEach((k) => { if (!keep.has(k)) delete clone[k]; });
  }
  return clone;
}

function applyPopulate(doc, path, select, schema) {
  if (!doc) return doc;
  const fieldDef = schema.definition[path];
  const refName = fieldDef?.ref;
  if (!refName) return doc;
  const refEntry = registry.get(refName);
  const clone = { ...doc };
  const refId = doc[path];
  const refDoc = refEntry?.docs.find((d) => d._id === refId);
  clone[path] = refDoc ? applySelect(refDoc, select || '') : null;
  return clone;
}

// ---------- Query (thenable, chainable) ----------

class Query {
  constructor(modelName, schema, execFn, { single }) {
    this._modelName = modelName;
    this._schema = schema;
    this._exec = execFn;
    this._single = single;
    this._sort = null;
    this._skip = 0;
    this._limit = Infinity;
    this._select = null;
    this._populates = [];
    this._lean = false;
  }
  sort(spec) { this._sort = spec; return this; }
  skip(n) { this._skip = n; return this; }
  limit(n) { this._limit = n; return this; }
  select(spec) { this._select = spec; return this; }
  populate(pathOrObj, select) {
    if (typeof pathOrObj === 'object') this._populates.push({ path: pathOrObj.path, select: pathOrObj.select });
    else this._populates.push({ path: pathOrObj, select });
    return this;
  }
  lean() { this._lean = true; return this; }

  async _materialize() {
    let arr = await this._exec();
    if (this._sort) {
      const [field, dir] = Object.entries(this._sort)[0];
      arr = [...arr].sort((a, b) => cmp(getPath(a, field), getPath(b, field)) * dir);
    }
    if (!this._single) {
      arr = arr.slice(this._skip, this._limit === Infinity ? undefined : this._skip + this._limit);
    }
    return arr;
  }

  async _finalizeOne(doc) {
    if (!doc) return null;
    let out = doc;
    const needsClone = this._select || this._populates.length || this._lean;
    if (needsClone) out = { ...doc };
    if (this._select) out = applySelect(out, this._select);
    for (const p of this._populates) out = applyPopulate(out, p.path, p.select, this._schema);
    if (this._lean) return leanClone(out);
    return attachHelpers(out, this._modelName, this._schema);
  }

  async then(resolve, reject) {
    try {
      const arr = await this._materialize();
      if (this._single) {
        const result = await this._finalizeOne(arr[0] ?? null);
        resolve(result);
      } else {
        const results = await Promise.all(arr.map((d) => this._finalizeOne(d)));
        resolve(results);
      }
    } catch (err) {
      reject(err);
    }
  }
  catch(reject) { return Promise.resolve(this).then(undefined, reject); }
}

// ---------- Aggregate ----------

function resolveExprValue(doc, expr) {
  if (typeof expr === 'string' && expr.startsWith('$')) return getPath(doc, expr.slice(1));
  return expr;
}

function runProjectStage(doc, spec) {
  const out = {};
  for (const [key, val] of Object.entries(spec)) {
    if (val && typeof val === 'object' && '$size' in val) {
      const arr = resolveExprValue(doc, val.$size);
      out[key] = Array.isArray(arr) ? arr.length : 0;
    } else if (val === 1 || val === true) {
      out[key] = doc[key];
    } else {
      out[key] = resolveExprValue(doc, val);
    }
  }
  return out;
}

function runGroupStage(docs, spec) {
  const { _id: idExpr, ...accumulators } = spec;
  const groups = new Map();
  for (const doc of docs) {
    const key = idExpr === null || idExpr === undefined ? null : resolveExprValue(doc, idExpr);
    const keyStr = JSON.stringify(key);
    if (!groups.has(keyStr)) groups.set(keyStr, { _id: key, docs: [] });
    groups.get(keyStr).docs.push(doc);
  }
  return Array.from(groups.values()).map((group) => {
    const result = { _id: group._id };
    for (const [field, accExpr] of Object.entries(accumulators)) {
      const [op, val] = Object.entries(accExpr)[0];
      if (op === '$sum') {
        result[field] = typeof val === 'number'
          ? group.docs.length * val
          : group.docs.reduce((sum, d) => sum + (Number(resolveExprValue(d, val)) || 0), 0);
      } else if (op === '$avg') {
        const nums = group.docs.map((d) => Number(resolveExprValue(d, val)) || 0);
        result[field] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      }
    }
    return result;
  });
}

// ---------- Model factory ----------

function model(name, schema) {
  if (registry.has(name)) return registry.get(name).ModelClass;

  const entry = { schema, docs: loadDocs(name) };
  registry.set(name, entry);

  class Model {
    static find(filter = {}) {
      return new Query(name, schema, async () => entry.docs.filter((d) => matchFilter(d, filter)), { single: false });
    }
    static findOne(filter = {}) {
      return new Query(name, schema, async () => entry.docs.filter((d) => matchFilter(d, filter)), { single: true });
    }
    static findById(id) {
      return Model.findOne({ _id: id });
    }
    static findOneAndUpdate(filter, update, opts = {}) {
      return new Query(name, schema, async () => {
        let doc = entry.docs.find((d) => matchFilter(d, filter));
        let isInsert = false;
        if (!doc && opts.upsert) {
          doc = buildDefaults(schema.definition);
          doc._id = genId();
          // Real MongoDB seeds a new upserted document with the filter's own
          // equality conditions (e.g. `{user, date}`) before applying the update —
          // callers rely on that instead of repeating those fields in $setOnInsert.
          Object.entries(filter).forEach(([k, v]) => {
            if (k.startsWith('$')) return;
            if (v && typeof v === 'object' && !(v instanceof Date)) return; // skip operator conditions ($regex, $exists, ...)
            setPath(doc, k, v);
          });
          if (schema.options.timestamps) doc.createdAt = new Date();
          entry.docs.push(doc);
          isInsert = true;
        }
        if (!doc) return [];
        applyUpdate(doc, update, { isInsert });
        if (schema.options.timestamps) doc.updatedAt = new Date();
        persist(name);
        return [doc];
      }, { single: true });
    }
    static findByIdAndUpdate(id, update, opts = {}) {
      return Model.findOneAndUpdate({ _id: id }, update, opts);
    }
    static async create(input) {
      if (Array.isArray(input)) return Promise.all(input.map((i) => Model.create(i)));
      const doc = deepMerge(buildDefaults(schema.definition), input);
      doc._id = genId();
      if (schema.options.timestamps) {
        doc.createdAt = new Date();
        doc.updatedAt = new Date();
      }
      attachHelpers(doc, name, schema);
      doc._snapshot = {}; // everything on a brand-new doc counts as modified
      await runPreSaveHooks(schema, doc);
      entry.docs.push(doc);
      persist(name);
      doc._snapshot = { ...doc };
      return doc;
    }
    static async countDocuments(filter = {}) {
      return entry.docs.filter((d) => matchFilter(d, filter)).length;
    }
    static async updateMany(filter, update) {
      const matches = entry.docs.filter((d) => matchFilter(d, filter));
      matches.forEach((d) => {
        applyUpdate(d, update);
        if (schema.options.timestamps) d.updatedAt = new Date();
      });
      persist(name);
      return { modifiedCount: matches.length };
    }
    static async aggregate(pipeline) {
      let data = entry.docs.map((d) => ({ ...d }));
      for (const stage of pipeline) {
        const [opName] = Object.keys(stage);
        if (opName === '$match') data = data.filter((d) => matchFilter(d, stage.$match));
        else if (opName === '$project') data = data.map((d) => runProjectStage(d, stage.$project));
        else if (opName === '$group') data = runGroupStage(data, stage.$group);
        else throw new Error(`miniMongoose: unsupported aggregate stage "${opName}"`);
      }
      return data;
    }
  }

  entry.ModelClass = Model;
  return Model;
}

async function connect() {
  // No real connection needed — data is loaded per-model and persisted synchronously.
  console.log('[db] Using embedded pure-JS data store (no native MongoDB binary required).');
}

async function disconnect() {
  for (const name of registry.keys()) persist(name);
}

module.exports = { Schema, model, connect, disconnect };
