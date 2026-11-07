// Roteador HTTP minimalista (sem Express - ver nota em server/store.js sobre
// por que este projeto nao usa pacotes externos). Suporta parametros de rota
// (":id"), leitura de query string, corpo JSON e um pequeno sistema de
// middlewares por rota (ex: exigir login, exigir papel de admin).
const { URL } = require("url");

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function compilePath(path) {
  const paramNames = [];
  const pattern = path
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, ...handlers) {
    const { regex, paramNames } = compilePath(path);
    this.routes.push({ method, regex, paramNames, handlers });
  }

  get(path, ...handlers) {
    this.add("GET", path, ...handlers);
  }

  post(path, ...handlers) {
    this.add("POST", path, ...handlers);
  }

  put(path, ...handlers) {
    this.add("PUT", path, ...handlers);
  }

  delete(path, ...handlers) {
    this.add("DELETE", path, ...handlers);
  }

  async handle(req, res, pathname) {
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;
      const params = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      req.params = params;
      try {
        for (const handler of route.handlers) {
          let shortCircuited = false;
          await handler(req, res, () => {
            shortCircuited = true;
          });
          if (res.writableEnded) return true;
          if (!shortCircuited) break;
        }
      } catch (error) {
        if (error instanceof HttpError) {
          sendJson(res, error.statusCode, { error: error.message });
        } else {
          console.error(error);
          sendJson(res, 500, { error: "Erro interno no servidor." });
        }
      }
      return true;
    }
    return false;
  }
}

function sendJson(res, statusCode, body) {
  if (res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX_BYTES = 2 * 1024 * 1024; // 2MB e mais que suficiente para os formularios deste app
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new HttpError(413, "Corpo da requisição muito grande."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpError(400, "JSON inválido no corpo da requisição."));
      }
    });
    req.on("error", reject);
  });
}

function parseUrl(req) {
  const full = new URL(req.url, "http://localhost");
  const query = {};
  full.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return { pathname: full.pathname, query };
}

module.exports = { Router, HttpError, sendJson, readJsonBody, parseUrl };
