import { Document, Schema, model } from "mongoose";

export interface IOAuth2 extends Document {
    payload: {};
    expiresAt: Date;
}

const DefaultSchema = new Schema({
    payload: { type: Schema.Types.Mixed },
    expiresAt: { type: Date }
});

DefaultSchema.index({expiresAt: 1}, { expireAfterSeconds: 1});

const GrantableSchema = DefaultSchema.index({ "payload.grantId": 1});

export const GrantableModel = (collection: string) => model<IOAuth2>("OAuth", GrantableSchema, collection);

const DeviceCodeSchema = DefaultSchema.index({ "payload.userCode": 1 }, { unique: true });

export const DeviceCodeModel = model<IOAuth2>("OAuth", DeviceCodeSchema, "device_code");

const SessionSchema = DefaultSchema.index({ "payload.uid": 1 }, { unique: true });

export const SessionModel = model<IOAuth2>("OAuth", SessionSchema, "session");

export default (collection: string) => model<IOAuth2>("OAuth", DefaultSchema, collection);
