import { Schema, Document } from "mongoose";
import Base from "./single-collection";

export interface IUser extends Document {
    email: string;
    role: string;
}

const UserSchema = new Schema(
  {
    email: { type: String, required: true, index: { unique: true } },
    role: {
      type: String,
      required: true,
      enum: ["sysadmin", "admin", "editor", "viewer"],
      default: "editor",
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export default Base.discriminator<IUser>("User", UserSchema);
