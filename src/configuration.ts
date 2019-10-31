import { ClientMetadata, Configuration, interactionPolicy } from "oidc-provider";

const { Prompt, base: policy } = interactionPolicy;

// copies the default policy, already has login and consent prompt policies
const interactions = policy();

const client1: ClientMetadata = {
    client_id: "id.ombori.com",
    client_secret: "sec_key",
    grant_types: ["implicit"],
    redirect_uris: ["https://ombori/signin-oidc"],
    response_types: ["id_token"],
    token_endpoint_auth_method: "none",
};

const configuration: Configuration = {
    clients: [
        client1,
    ],
    interactions: {
        policy: interactions,
        url(ctx, interaction) {
            return `/interaction/${ctx.oidc.uid}`;
        },
    },
    cookies: {
        long: { signed: true, maxAge: (1 * 24 * 60 * 60) * 1000 }, // 1 day in ms
        short: { signed: true },
        keys: ["some secret key", "and also the old rotated away some time ago", "and one more"],
    },
    features: {
        clientCredentials: { enabled: true }, // defaults to false
        devInteractions: { enabled: false }, // defaults to true
        introspection: { enabled: true }, // defaults to false
    },
    ttl: {
        IdToken: 1 * 60 * 60, // 1 hour in seconds
    },
    scopes: ["api"],
    claims: {
        address: ["address"],
        email: ["email", "email_verified"],
        phone: ["phone_number", "phone_number_verified"],
        profile: ["birthdate", "family_name", "gender", "given_name", "locale", "middle_name", "name",
            "nickname", "picture", "preferred_username", "profile", "updated_at", "website", "zoneinfo"],
    },
};

export default configuration;
