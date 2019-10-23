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

const client: ClientMetadata = {
  client_id: "foo",
  client_secret: "bar",
  redirect_uris: ["http://lvh.me:8080/cb"]
};

const configuration: Configuration = {
  // ... see available options /docs
  clients: [
    client,
    // + other client properties
  ],
};

app.set("port", appPort);

app.get("/", (req, res) => {
  res.send("The sedulous hyena ate the antelope!");
});
const provider = new Provider("http://localhost:3000", configuration);
app.use("/", provider.callback);
app.listen(app.get("port"));
