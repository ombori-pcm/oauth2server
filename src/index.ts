import express from "express";
import mongoose from "mongoose";
import { ClientMetadata, Configuration, Provider } from "oidc-provider";

mongoose.connect("mongodb://localhost/test", {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  // we're connected!
  console.log("Connected!");
});

const app = express();
const appPort = 3000;

const client1: ClientMetadata = {
  client_id: "test_implicit_app",
  client_secret: "bar",
  grant_types: ["implicit"],
  redirect_uris: ["https://testapp/signin-oidc"],
  response_types: ["id_token"],
  token_endpoint_auth_method: "none",
};

const client2: ClientMetadata = {
  client_id: "test_oauth_app",
  client_secret: "super_secret",
  grant_types: ["client_credentials"],
  redirect_uris: [],
  response_types: [],
}

const configuration: Configuration = {
  // ... see available options /docs
  clients: [
    client1, client2,
    // + other client properties
  ],
  features: {
    clientCredentials: { enabled: true },
    devInteractions: { enabled: true },
    introspection: { enabled: true },
  },
  scopes: ["api"],
};

app.set("port", appPort);

// app.get("/", (req, res) => {
//   res.send("The sedulous hyena ate the antelope!");
// });
const provider = new Provider("http://localhost:3000", configuration);
app.use("/", provider.callback);
app.listen(app.get("port"));
