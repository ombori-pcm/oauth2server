import { model, Schema } from "mongoose";

const baseOptions = {
  discriminatorKey: "__type",
  collection: "data",
};
const Base = model("Base", new Schema({}, baseOptions));

export default Base;
