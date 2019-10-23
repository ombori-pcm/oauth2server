import express from "express";
import mongoose from "mongoose";
import Provider from "oidc-provider";

mongoose.connect("mongodb://localhost/test", {useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  // we're connected!
  console.log("Connected!");
});

const app = express();
const appPort = 3000;

app.set("port", appPort);

app.get("/", (req, res) => {
  res.send("The sedulous hyena ate the antelope!");
});
const oidc = new Provider("http://localhost:3000");
app.use("/", oidc.callback);
app.listen(app.get("port"));
