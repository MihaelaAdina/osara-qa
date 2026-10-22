import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import type { Options } from "k6/options";

const BASE_URL = __ENV.BASE_URL;
const ITERATIONS = Number(__ENV.ITERATIONS ?? 50);
const VUS = Number(__ENV.VUS ?? 1);

type Area = {
  id: string;
  kind: "locality" | "neighbourhood" | "suburb";
  name: { en: string; ro: string };
  parentId: string | null;
  aliases: string[];
};

const tests = {
  listsEveryArea,
  orderedWithFullShape,
  filtersByKind,
  refusesUnknownKind,
  filtersByParentId,
};

export const options: Options = {
  scenarios: Object.fromEntries(
    Object.keys(tests).map((name) => [
      name,
      { executor: "shared-iterations", exec: name, vus: VUS, iterations: ITERATIONS, maxDuration: "5m" },
    ]),
  ),
  thresholds: {
    checks: ["rate==1"],
    ...Object.fromEntries(Object.keys(tests).map((name) => [`checks{scenario:${name}}`, ["rate==1"]])),
    ...Object.fromEntries(Object.keys(tests).map((name) => [`completed_checks{scenario:${name}}`, [`count==${ITERATIONS}`]])),
  },
};

const completedChecks = new Counter("completed_checks");

// Each scenario calls this exactly once per iteration.
const verify: typeof check = (val, sets, tags) => {
  const ok = check(val, sets, tags);
  completedChecks.add(1);
  return ok;
};

const safeJson = <T>(res: http.RefinedResponse<"text">): T | null => {
  try {
    return res.json() as unknown as T;
  } catch {
    return null;
  }
};

const areasJson = (res: http.RefinedResponse<"text">) => {
  const body = safeJson<{ count: number; areas: Area[] }>(res);
  return body && Array.isArray(body.areas) ? body : { count: -1, areas: [] as Area[] };
};

export function listsEveryArea() {
  const res = http.get(`${BASE_URL}/api/areas`);
  const body = areasJson(res);
  verify(res, {
    "status is 200": (r) => r.status === 200,
    "count matches areas length": () => body.count === body.areas.length,
    "more than 300 areas": () => body.count > 300,
    "cache-control is no-store": (r) => r.headers["Cache-Control"] === "no-store",
  });
}

export function orderedWithFullShape() {
  const res = http.get(`${BASE_URL}/api/areas`);
  const { areas } = areasJson(res);
  const ids = areas.map((a) => a.id);
  const sorted = [...ids].sort();
  verify(res, {
    "status is 200": (r) => r.status === 200,
    "at least one area": () => areas.length > 0,
    "areas ordered by id": () => ids.every((id, i) => id === sorted[i]),
    "every area has the full shape": () =>
      areas.every(
        (a) =>
          Object.keys(a).sort().join() === "aliases,id,kind,name,parentId" &&
          typeof a.id === "string" &&
          /^(locality|neighbourhood|suburb)$/.test(a.kind) &&
          typeof a.name?.en === "string" &&
          typeof a.name?.ro === "string" &&
          Object.keys(a.name).length === 2 &&
          (a.parentId === null || typeof a.parentId === "string") &&
          Array.isArray(a.aliases),
      ),
  });
}

export function filtersByKind() {
  const res = http.get(`${BASE_URL}/api/areas?kind=neighbourhood`);
  const { areas } = areasJson(res);
  verify(res, {
    "status is 200": (r) => r.status === 200,
    "at least one area": () => areas.length > 0,
    "all are neighbourhoods": () => areas.every((a) => a.kind === "neighbourhood"),
    "contains timisoara-soarelui": () => areas.some((a) => a.id === "timisoara-soarelui"),
  });
}

export function refusesUnknownKind() {
  const res = http.get(`${BASE_URL}/api/areas?kind=city`, { responseCallback: http.expectedStatuses(400) });
  verify(res, {
    "status is 400": (r) => r.status === 400,
    "error body lists allowed kinds": (r) => {
      const body = safeJson<{ error: string; allowed: string[] }>(r);
      return (
        body !== null &&
        Object.keys(body).length === 2 &&
        body.error === "invalidKind" &&
        Array.isArray(body.allowed) &&
        body.allowed.join() === "locality,neighbourhood,suburb"
      );
    },
  });
}

export function filtersByParentId() {
  const res = http.get(`${BASE_URL}/api/areas?parentId=giroc`);
  const { areas } = areasJson(res);
  verify(res, {
    "status is 200": (r) => r.status === 200,
    "contains chisoda": () => areas.some((a) => a.id === "chisoda"),
    "all have parentId giroc": () => areas.every((a) => a.parentId === "giroc"),
  });
}
