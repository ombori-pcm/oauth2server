import nanoid from "nanoid";

const store = new Map();
const logins = new Map();

interface IProfile {
    sub: string;
    address: {
        country: string;
        formatted: string;
        locality: string;
        postal_code: string;
        region: string;
        street_address: string;
    };
    birthdate: string;
    email: string;
    email_verified: boolean;
    family_name: string;
    gender: string;
    given_name: string;
    locale: string;
    middle_name: string;
    name: string;
    nickname: string;
    phone_number: string;
    phone_number_verified: boolean;
    picture: string;
    preferred_username: string;
    profile: string;
    updated_at: number;
    website: string;
    zoneinfo: string;
}

const Profile = (accountId) => ({
    sub: accountId, // it is essential to always return a sub claim

    address: {
        country: "000",
        formatted: "000",
        locality: "000",
        postal_code: "000",
        region: "000",
        street_address: "000",
    },
    birthdate: "1987-10-16",
    email: "johndoe@example.com",
    email_verified: false,
    family_name: "Doe",
    gender: "male",
    given_name: "John",
    locale: "en-US",
    middle_name: "Middle",
    name: "John Doe",
    nickname: "Johny",
    phone_number: "+49 000 000000",
    phone_number_verified: false,
    picture: "http://lorempixel.com/400/200/",
    preferred_username: "johnny",
    profile: "https://johnswebsite.com",
    updated_at: 1454704946,
    website: "http://example.com",
    zoneinfo: "Europe/Berlin",
});

class Account {
    public static async findByFederated(provider, claims) {
        const id = `${provider}.${claims.sub}`;
        if (!logins.get(id)) {
            logins.set(id, new Account(id, claims));
        }
        return logins.get(id);
    }

    public static async findByLogin(login) {
        if (!logins.get(login)) {
            logins.set(login, new Account(login, Profile(login)));
        }

        return logins.get(login);
    }

    public static async findAccount(ctx, id, token) {
        // token is a reference to the token used for which a given account is being loaded,
        //   it is undefined in scenarios where account claims are returned from authorization endpoint
        // ctx is the koa request context
        if (!store.get(id)) {
            store.set(id, new Account(id, Profile(id)));
        }
        return store.get(id);
    }

    private accountId: string;
    private profile: IProfile;

    constructor(id: string, profile: IProfile) {
        this.accountId = id || nanoid();
        this.profile = profile;
        store.set(this.accountId, this);
    }

    /**
     * @param use - can either be "id_token" or "userinfo", depending on
     *   where the specific claims are intended to be put in.
     * @param scope - the intended scope, while oidc-provider will mask
     *   claims depending on the scope automatically you might want to skip
     *   loading some claims from external resources etc. based on this detail
     *   or not return them in id tokens but only userinfo and so on.
     */
    public async claims(use, scope) { // eslint-disable-line no-unused-vars
        if (this.profile) {
            return {
                sub: this.accountId, // it is essential to always return a sub claim
                email: this.profile.email,
                email_verified: this.profile.email_verified,
                family_name: this.profile.family_name,
                given_name: this.profile.given_name,
                locale: this.profile.locale,
                name: this.profile.name,
            };
        }

        return Profile(this.accountId);
    }

}

export default Account;
