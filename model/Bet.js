class Bet {
    constructor(user_id, cau, money) {
        this._money = money;
        this._user_id = user_id;
        this._cau = cau;
    }

    get cau() {
        return this._cau;
    }

    set cau(value) {
        this._cau = value;
    }

    get user_id() {
        return this._user_id;
    }

    set user_id(value) {
        this._user_id = value;
    }

    get money() {
        return this._money;
    }

    set money(value) {
        this._money = value;
    }
}

module.exports = {Bet}
