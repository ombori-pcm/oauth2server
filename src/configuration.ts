import { ClientMetadata, Configuration, interactionPolicy } from "oidc-provider";

const { Prompt, base: policy } = interactionPolicy;

// copies the default policy, already has login and consent prompt policies
const interactions = policy();

// create a requestable prompt with no implicit checks
const selectAccount = new Prompt({
  name: "select_account",
  requestable: true,
});

// add to index 0, order goes select_account > login > consent
interactions.add(selectAccount, 0);

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
};

const configuration: Configuration = {
    clients: [
        client1, client2,
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
        deviceFlow: { enabled: true }, // defaults to false
        // sessionManagement: { enabled: true}
    },
    ttl: {
        AccessToken: 1 * 60 * 60, // 1 hour in seconds
        AuthorizationCode: 10 * 60, // 10 minutes in seconds
        IdToken: 1 * 60 * 60, // 1 hour in seconds
        DeviceCode: 10 * 60, // 10 minutes in seconds
        RefreshToken: 1 * 24 * 60 * 60, // 1 day in seconds
    },
    scopes: ["api"],
};

export default configuration;
