export class User {
    constructor(uid, name, privilege, password = "", group_id="", user_id="", card = 0) {
        this._uid = uid;
        this._name = name;
        this._privilege = privilege;
        this._password = password;
        this._group_id = group_id;
        this._user_id = user_id;
        this._card = card; //64 int to 40 bit int
    }

    get uid() {
        return this._uid;
    }

    set uid(value) {
        this._uid = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get privilege() {
        return this._privilege;
    }

    set privilege(value) {
        this._privilege = value;
    }

    get password() {
        return this._password;
    }

    set password(value) {
        this._password = value;
    }

    get group_id() {
        return this._group_id;
    }

    set group_id(value) {
        this._group_id = value;
    }

    get user_id() {
        return this._user_id;
    }

    set user_id(value) {
        this._user_id = value;
    }

    get card() {
        return this._card;
    }

    set card(value) {
        this._card = value;
    }
}