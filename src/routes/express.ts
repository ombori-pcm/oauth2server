import assert from "assert";
import querystring from "querystring";
import { inspect } from "util";
import { InteractionResults } from "oidc-provider";
import isEmpty from "lodash/isEmpty";
import { urlencoded, Express, NextFunction, Request, Response } from "express";
import { findByLogin } from "../account";

const body = urlencoded({ extended: false });

const keys = new Set();

const debug = (obj: any) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key);
  if (isEmpty(value)) { return acc; }
  acc[key] = inspect(value, { depth: null });
  return acc;
}, {}), "<br/>", ": ", {
  encodeURIComponent(value) { return keys.has(value) ? `<strong>${value}</strong>` : value; },
});

export default (app: Express, provider: any ) => {
  const { constructor: { errors: { SessionNotFound } } } = provider;

  app.use((req, res, next) => {
    const orig = res.render;
    // you'll probably want to use a full blown render engine capable of layouts
    res.render = (view, locals) => {
      app.render(view, locals, (err, html) => {
        if (err) { throw err; }
        orig.call(res, "_layout", {
          ...locals,
          body: html,
        });
      });
    };
    next();
  });

  function setNoCache(req: Request, res: Response, next: NextFunction) {
    res.set("Pragma", "no-cache");
    res.set("Cache-Control", "no-cache, no-store");
    next();
  }

  app.get("/interaction/:uid", setNoCache, async (req, res, next) => {
    try {
      const {
        uid, prompt, params, session,
      } = await provider.interactionDetails(req, res);

      const client = await provider.Client.find(params.client_id);

      switch (prompt.name) {
        case "login": {
          return res.render("login", {
            client,
            uid,
            details: prompt.details,
            params,
            title: "Sign-in",
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        case "consent": {
          return res.render("interaction", {
            client,
            uid,
            details: prompt.details,
            params,
            title: "Authorize",
            session: session ? debug(session) : undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        default:
          return undefined;
      }
    } catch (err) {
      return next(err);
    }
  });

  app.post("/interaction/:uid/login", setNoCache, body, async (req, res, next) => {
    try {
      const { prompt: { name } } = await provider.interactionDetails(req, res);
      assert.equal(name, "login");

      const account = await findByLogin(req.body);
      let result = {};
      if (!account) {
        result = {
          error: "unauthorize_client",
          error_description: "Invalid credentials interaction",
        };
      } else {
        result = {
          login: {
            account: account.accountId,
          },
        };
      }
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post("/interaction/:uid/confirm", setNoCache, body, async (req, res, next) => {
    try {
      const { prompt: { name, details } } = await provider.interactionDetails(req, res);
      assert.equal(name, "consent");

      const consent: InteractionResults = {};

      // any scopes you do not wish to grant go in here
      //   otherwise details.scopes.new.concat(details.scopes.accepted) will be granted
      consent.rejectedScopes = [];

      // any claims you do not wish to grant go in here
      //   otherwise all claims mapped to granted scopes
      //   and details.claims.new.concat(details.claims.accepted) will be granted
      consent.rejectedClaims = [];

      // replace = false means previously rejected scopes and claims remain rejected
      // changing this to true will remove those rejections in favour of just what you rejected above
      consent.replace = false;

      const result = { consent };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next(err);
    }
  });

  app.get("/interaction/:uid/abort", setNoCache, async (req, res, next) => {
    try {
      const result = {
        error: "access_denied",
        error_description: "End-User aborted interaction",
    };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof SessionNotFound) {
      // handle interaction expired / session not found error
    }
    next(error);
  });
};
