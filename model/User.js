class User {
    constructor(id= null, username = null, display_name = null, balance = 0) {
        this.id = id;
        this.username = username;
        this.display_name = display_name;
        this.balance = balance;
    }
}

module.exports = {User};
