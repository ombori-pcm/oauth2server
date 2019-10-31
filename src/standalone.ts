import mongoose from "mongoose";
import { Provider } from "oidc-provider";
import configuration from "./configuration";
import { set } from "lodash";
import render from "koa-ejs";
import helmet from "koa-helmet";
import path from "path";
import routes from "./routes/koa";
import { Server } from "http";
import { findAccount } from "./account";
import dotenv from "dotenv";

dotenv.config();

const { PORT = 3000, ISSUER = `http://localhost:${PORT}`, MONGO_URL } = process.env;

configuration.findAccount = findAccount;

let server: Server;

(async () => {
  mongoose.connect(MONGO_URL,
    {
      socketTimeoutMS: 0,
      keepAlive: true,
      reconnectTries: 30,
      useNewUrlParser: true,
      dbName: "grid-admin-qa"
    }
  );
  const connection = mongoose.connection;

  connection.on("reconnectFailed", () => new Error("reconnect failed"));
  connection.on("error", () => {
    throw new Error(`unable to connect to database: ${MONGO_URL}`);
  });

  const provider = new Provider(ISSUER, { ...configuration });

  provider.use(helmet());

  if (process.env.NODE_ENV === "production") {
    provider.proxy = true;
    set(configuration, "cookies.short.secure", true);
    set(configuration, "cookies.long.secure", true);

    provider.use(async (ctx, next) => {
      if (ctx.secure) {
        await next();
      } else if (ctx.method === "GET" || ctx.method === "HEAD") {
        ctx.redirect(ctx.href.replace(/^http:\/\//i, "https://"));
      } else {
        ctx.body = {
          error: "invalid_request",
          error_description: "do yourself a favor and only use https",
        };
        ctx.status = 400;
      }
    });
  }

  render(provider.app, {
    cache: false,
    viewExt: "ejs",
    layout: "_layout",
    root: path.join(__dirname, "views"),
  });
  provider.use(routes(provider).routes());
  server = provider.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
  });
})().catch((err) => {
  if (server && server.listening) { server.close(); }
  console.error(err);
  process.exitCode = 1;
});
