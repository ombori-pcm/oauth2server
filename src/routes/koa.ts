/* eslint-disable no-console, max-len, camelcase, no-unused-vars */
import assert from "assert";
import querystring from "querystring";
import { inspect } from "util";
import { InteractionResults } from "oidc-provider";
import { isEmpty } from "lodash";
import bodyParser from "koa-body";
import Router, {RouterContext} from "koa-router";

import { renderError } from "oidc-provider/lib/helpers/defaults"; // make your own, you'll need it anyway
import { findByLogin } from "../account";

const keys = new Set();
const debug = (obj) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key);
  if (isEmpty(value)) { return acc; }
  acc[key] = inspect(value, { depth: null });
  return acc;
}, {}), "<br/>", ": ", {
  encodeURIComponent(value) { return keys.has(value) ? `<strong>${value}</strong>` : value; },
});

export default (provider: any) => {
  const router = new Router();
  const { constructor: { errors: { SessionNotFound } } } = provider;

  router.use(async (ctx: RouterContext, next) => {
    ctx.set("Pragma", "no-cache");
    ctx.set("Cache-Control", "no-cache, no-store");
    try {
      await next();
    } catch (err) {
      if (err instanceof SessionNotFound) {
        ctx.status = err.status;
        const { message: error, error_description } = err;
        renderError(ctx, { error, error_description }, err);
      } else {
        throw err;
      }
    }
  });

  router.get("/interaction/:uid", async (ctx: any, next) => {
    const {
      uid, prompt, params, session,
    } = await provider.interactionDetails(ctx.req, ctx.res);
    const client = await provider.Client.find(params.client_id);

    switch (prompt.name) {
      case "select_account": {
        if (!session) {
          return provider.interactionFinished(ctx.req, ctx.res, {
            select_account: {},
          }, { mergeWithLastSubmission: false });
        }

        const account = await provider.Account.findAccount(ctx, session.accountId);
        const { email } = await account.claims("prompt", "email", { email: null }, []);

        return ctx.render("select_account", {
          client,
          uid,
          email,
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
      case "login": {
        return ctx.render("login", {
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
        return ctx.render("interaction", {
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
        return next();
    }
  });

  const body = bodyParser({
    text: false, json: false, patchNode: true, patchKoa: true,
  });

  router.post("/interaction/:uid/login", body, async (ctx: any) => {
    const { prompt: { name } } = await provider.interactionDetails(ctx.req, ctx.res);
    assert.equal(name, "login");

    const account = await findByLogin(ctx.request.body);

    let result = {};

    if (!account) {
        throw new Error("User not registered!");
    } else {
        result = {
            select_account: {}, // make sure its skipped by the interaction policy since we just logged in
            login: {
                account: account.accountId,
            },
        };
    }

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post("/interaction/:uid/continue", body, async (ctx: any) => {
    const interaction = await provider.interactionDetails(ctx.req, ctx.res);
    const { prompt: { name, details } } = interaction;
    assert.equal(name, "select_account");

    if (ctx.request.body.switch) {
      if (interaction.params.prompt) {
        const prompts = new Set(interaction.params.prompt.split(" "));
        prompts.add("login");
        interaction.params.prompt = [...prompts].join(" ");
      } else {
        interaction.params.prompt = "logout";
      }
      await interaction.save();
    }

    const result = { select_account: {} };
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  router.post("/interaction/:uid/confirm", body, async (ctx: any) => {
    const { prompt: { name, details } } = await provider.interactionDetails(ctx.req, ctx.res);
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
    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: true,
    });
  });

  router.get("/interaction/:uid/abort", async (ctx: any) => {
    const result = {
      error: "access_denied",
      error_description: "End-User aborted interaction",
    };

    return provider.interactionFinished(ctx.req, ctx.res, result, {
      mergeWithLastSubmission: false,
    });
  });

  return router;
};
