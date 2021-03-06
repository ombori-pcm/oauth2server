import User, { IUser } from "./models/user.model";
import { KoaContextWithOIDC } from "oidc-provider";

const store = new Map();
const logins = new Map();

interface IProfile {
    sub: string;
    email: string;
    role: string;
}

const Profile = (accountId: string, user: IUser) => {
    return {
        sub: accountId, // it is essential to always return a sub claim
        email: user.email,
        role: user.role
    };
};

interface ILogin {
    username: string;
    password: string;
}

export const findByLogin = async (login: ILogin) => {
    const { username, password } = login;
    console.log("findByLogin", username);
    // ross@ombori.com
    if (!logins.get(username)) {
        await User.findOne({ email: username }, (err, client) => {
            if (err) { return null; }
            return client;
        }).then((client) => {
            if (client) {
                logins.set(username, new Account(client._id, Profile(client._id, client)));
            }
        });
    }
    const acct = logins.get(username);
    if (!acct) { return null; }
    return acct;
};

export const findAccount = async (ctx: KoaContextWithOIDC, id: string, token: any) => {
    console.log("findAccount", id);
    // token is a reference to the token used for which a given account is being loaded,
    //   it is undefined in scenarios where account claims are returned from authorization endpoint
    // ctx is the koa request context
    return store.get(id);
};

class Account {
    private accountId: string;
    private profile: IProfile;

    constructor(accountId: string, profile: IProfile) {
        this.accountId = accountId;
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
    public async claims(use: string, scope: string) { // eslint-disable-line no-unused-vars
        if (this.profile) {
            return {
                sub: this.accountId, // it is essential to always return a sub claim
            };
        }
    }

}

export default Account;
