import express from "express";
import mongoose from "mongoose";
import { Provider } from "oidc-provider";
import configuration from "./configuration";
import { set } from "lodash";
import helmet from "helmet";
import path from "path";
import url from "url";
import routes from "./routes";
import { Server } from "http";
import Account from "./account";

const { PORT = 3000, ISSUER = `http://localhost:${PORT}` } = process.env;

configuration.findAccount = Account.findAccount;

const app = express();
app.use(helmet());

app.set("port", PORT);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

let server: Server;
(async () => {
  // await mongoose.connect("mongodb://localhost/oidc",
  //   {
  //     useNewUrlParser: true,
  //     useUnifiedTopology: true,
  //     useCreateIndex: true,
  //   }
  // );

  const provider = new Provider(ISSUER, { ...configuration });

  if (process.env.NODE_ENV === "production") {
    app.enable("trust proxy");
    provider.proxy = true;
    set(configuration, "cookies.short.secure", true);
    set(configuration, "cookies.long.secure", true);

    app.use((req, res, next) => {
      if (req.secure) {
        next();
      } else if (req.method === "GET" || req.method === "HEAD") {
        res.redirect(url.format({
          protocol: "https",
          host: req.get("host"),
          pathname: req.originalUrl,
        }));
      } else {
        res.status(400).json({
          error: "invalid_request",
          error_description: "do yourself a favor and only use https",
        });
      }
    });
  }

  routes(app, provider);
  app.use(provider.callback);
  server = app.listen(PORT, () => {
    console.log(`application is listening on port ${PORT}, check its /.well-known/openid-configuration`);
  });
})().catch((err) => {
  if (server && server.listening) { server.close(); }
  console.error(err);
  process.exitCode = 1;
});
