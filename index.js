var io = require('socket.io')(server);
var express = require('express');
var app = express();
app.use(express.static('public'))

// app.use(express.static('./www'));

app.set('view engine', 'ejs');

var server = require('http').Server(app);
var io = require('socket.io')(server);
var mysql = require('mysql2');
const cookieParser = require('cookie-parser');
const path = require("path");

app.use(cookieParser());

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'baquy123',
    database: 'taixiu'
});

app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
var loginMessage = '';
var registerMessage = '';
const User = require('./model/User').User;
const Bet = require('./model/Bet').Bet
var user = null;
var bets = []
app.get('/', async function (req, res) {
    let cookies = req.cookies;
    if (!cookies.user_id) {
        res.redirect('/login');
    } else {
        let BXH = await getBXH();
        user = getUserById(cookies.user_id).then(function (user) {
            res.render(__dirname + '/views/index.ejs', {
                user: user,
                bxh: BXH,
            });
        });
    }
})

app.get('/login', function (req, res) {
    let cookies = req.cookies;
    if (cookies.user_id) {
        res.redirect('/');
    } else {
        res.render(__dirname + '/views/login.ejs', {
            loginMessage: loginMessage
        });
        loginMessage = '';
    }
})

app.get('/register', function (req, res) {
    let cookies = req.cookies;
    if (cookies.user_id) {
        res.redirect('/');
    } else {
        res.render(__dirname + '/views/register.ejs', {
            registerMessage: registerMessage
        });
        registerMessage = '';
    }
})

app.post('/register', function (req, res) {
    let cookies = req.cookies;
    if (cookies.user_id) {
        res.redirect('/');
    } else {
        let username = req.body.username;
        let password = req.body.password;
        let display_name = req.body.display_name;
        let password_confirmation = req.body.password_confirmation;
        if (password !== password_confirmation) {
            registerMessage = 'Mật khẩu không khớp';
            res.redirect('/register');
        } else {
            isDuplicateUser(username).then(function (isDuplicate) {
                if (isDuplicate.length > 0) {
                    console.log(isDuplicate);
                    registerMessage = 'Tên đăng nhập đã tồn tại';
                    res.redirect('/register');
                    return;
                } else {
                    let user = {
                        username: username,
                        password: password,
                        display_name: display_name,
                        balance: 0
                    };
                    createUser(user).then(function (result) {
                        if (result) {
                            res.redirect('/login');
                        } else {
                            registerMessage = 'Tài khoản đã tồn tại';
                            res.redirect('/register');
                        }
                    })
                }
            })
        }
    }
})


app.get('/logout', function (req, res) {
    res.clearCookie('user_id');
    res.clearCookie('user_username');
    res.redirect('/login');
})

app.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ? AND password = ? limit 1', [username, password], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                user = new User(results[0].id, results[0].username);
                res.cookie('user_id', user.id);
                res.cookie('user_username', user.username);

                res.redirect('/');
            } else {
                loginMessage = 'Incorrect Username and/or Password!';
                res.redirect('/login');
            }
            res.end();
        });
    }
})


// port
server.listen(process.env.PORT || 1337, function () {
    console.log('server dang chay....');
});

// tài xỉu

async function getUserById(id) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE id = ?', [id], function (error, results, fields) {
            if (error) reject(error);
            if (results.length > 0) {
                let user = new User(results[0].id, results[0].username, results[0].display_name, results[0].balance);
                resolve(user)
            }
        });
    })
}

async function createUser(user) {
    return new Promise((resolve, reject) => {
        connection.query('INSERT INTO users (username, password, display_name, balance) VALUES (?, ?, ?, ?)', [user.username, user.password, user.display_name, user.balance], function (error, results, fields) {
            if (error) reject(error);
            resolve(results)
        });
    })
}

async function isDuplicateUser(username) {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM users WHERE username = ?', [username], function (error, results, fields) {
            if (error) reject(error);
            if (results.length > 0) {
                resolve(results)
            }
        });
    })
}

async function getBXH() {
    return new Promise((resolve,reject) => {
        connection.query('SELECT * FROM users ORDER BY balance DESC LIMIT 5 ',function(err, results,field) {
            if (err) reject(err);
            if (results.length > 0) {
                const listUser = [];
                results.forEach(result => {
                    listUser.push({ displayName: result.display_name, balance: result.balance })
                })
                resolve(listUser)
            }
        })
    })
}


var Taixiu = function () {

    // cài đặt
    this.idPhien = 0; // id phiên đặt
    this.timeDatCuoc = 10; // thời gian đặt cược = 60s;
    this.timechophienmoi = 10; // thời gian chờ phiên mới = 10s;
    this.soNguoiChonTai = 0; // Số người đặt tài
    this.soNguoiChonXiu = 0; // Số người đặt xỉu
    this.tongTienDatTai = 0; // tổng tiền đặt tài
    this.tongTienDatXiu = 0; // tổng tiền đặt xỉu
    this.time = this.timeDatCuoc; // thời gian
    this.coTheDatCuoc = true; // có thể đặt hay không
    this.idChonTai = []; // array id chọn tài
    this.idChonXiu = []; // array id chọn xỉu
    this.ketQua = ''; // kết quá
    this.BXH = [];


    // game bắt đầu
    this.gameStart = async function () {
        // code
        seft = this;
        seft.idPhien++;
        seft.coTheDatCuoc = true // có thể đặt
        seft.soNguoiChonTai = 0; // Số người đặt tài
        seft.soNguoiChonXiu = 0; // Số người đặt xỉu
        seft.tongTienDatTai = 0; // tổng tiền đặt tài
        seft.tongTienDatXiu = 0; // tổng tiền đặt xỉu
        seft.idChonTai = []; // array id chọn tài
        seft.idChonXiu = []; // array id chọn xỉu
        seft.time = seft.timeDatCuoc;
        seft.BXH = await getBXH();
        this.BXH = seft.BXH;

        io.sockets.emit('bxh', this.BXH);

        // console.log('newgame');
        io.sockets.emit('gameStart', this.ketQua);
        loopAGame = setInterval(function () {
            seft.time--;
            io.sockets.emit('gameData', {
                idGame: seft.idPhien,
                soNguoiChonTai: seft.soNguoiChonTai,
                soNguoiChonXiu: seft.soNguoiChonXiu,
                tongTienDatTai: seft.tongTienDatTai,
                tongTienDatXiu: seft.tongTienDatXiu,
                soNguoiChonTai: seft.soNguoiChonTai,
                time: seft.time,
            });
            ketqua = seft.gameRandomResult();
            // console.log('idGame:' + seft.idPhien);
            // console.log('soNguoiChonTai:' + seft.soNguoiChonTai);
            // console.log('soNguoiChonXiu:' + seft.soNguoiChonXiu);
            // console.log('tongTienDatTai:' + seft.tongTienDatTai);
            // console.log('tongTienDatXiu:' + seft.tongTienDatXiu);
            // console.log('time:' + seft.time);
            if (seft.time == 0) {
                clearInterval(loopAGame);
                seft.gameOver();
            }
        }, 1000);
        // console.log( 'tongTienDatXiu:' + JSON.stringify(ketqua));

        // console.log();
    };
    // game kết thúc
    this.gameOver = function () {
        seft = this;
        seft.coTheDatCuoc = false // không thể đặt
        seft.time = seft.timechophienmoi;
        this.ketQua = seft.gameRandomResult();
        io.sockets.emit('gameOver', this.ketQua);
        // console.log(JSON.stringify(this.ketQua));
        idWin = this.ketQua.result == 'tai' ? seft.idChonTai : seft.idChonXiu;
        idWin.forEach((data) => {
            io.to(data.id).emit('winGame', {
                msg: 'Bạn đã thắng ' + data.tien * 2 + ' điểm'
            });
        });
        let winner = bets.filter((data) => {
            return data.cau === this.ketQua.result;
        })
        let loser = bets.filter((data) => {
            return data.cau !== this.ketQua.result;
        })
        console.log(winner);
        winner.forEach((data) => {
            io.sockets.emit('win_' + data.user_id, {
                balance: data.money * 2
            })
            connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [data.money, data.user_id], function (error, results, fields) {
                if (error) throw error;
                console.log(results);
            });
        })
        loser.forEach((data) => {
            connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [data.money, data.user_id], function (error, results, fields) {
                if (error) throw error;
                console.log(results);
            });
        })
        bets = []
        loopAGame = setInterval(function () {
            seft.time--;
            // console.log(seft.time);
            io.sockets.emit('gameData', {
                idGame: seft.idPhien,
                soNguoiChonTai: seft.soNguoiChonTai,
                soNguoiChonXiu: seft.soNguoiChonXiu,
                tongTienDatTai: seft.tongTienDatTai,
                tongTienDatXiu: seft.tongTienDatXiu,
                soNguoiChonTai: seft.soNguoiChonTai,
                time: seft.time,
            });
            if (seft.time == 0) {
                clearInterval(loopAGame);
                seft.gameStart();
            }
        }, 1000);
    };
    // đặt cược
    this.putMoney = function (id, cau, tien, user_id) {
        // nếu đang trong thời gian chờ (coTheDatCuoc == false)
        if (this.coTheDatCuoc == false) {
            return {
                status: 'error',
                error: 'Không thể đặt, vui lòng chờ giây lát'
            };
        }
        let bet = bets.find(bet => {
            return bet.user_id === user_id && bet.cau === cau
        })
        if (bet) {
            bet.money = bet.money + tien
            index = bets.findIndex((bet => bet.user_id === user_id && bet.cau === cau))
            bets[index] = bet
        } else {
            bets.push(new Bet(user_id, cau, tien))
        }
        console.log(bets)
        if (cau == 'tai') {
            // thêm tiền vào tổng số tiền đặt tài
            this.tongTienDatTai += tien;
            // thêm id vào list id array nếu chưa có
            if (!this.idChonTai.find(x => x.id === id)) {
                this.idChonTai.push({
                    id: id,
                    cau: 'tai',
                    tien: tien
                });
                this.soNguoiChonTai++;
            } else {
                // nếu tìm thấy thì cộng thêm tiền vô
                this.idChonTai.find(x => x.id === id).tien += tien;
            }

        } else if (cau == 'xiu') {
            // thêm tiền vào tổng số tiền đặt tài
            this.tongTienDatXiu += tien;
            // thêm id vào list id array nếu chưa có
            if (!this.idChonXiu.find(x => x.id === id)) {
                this.idChonXiu.push({
                    id: id,
                    cau: 'xiu',
                    tien: tien
                });
                this.soNguoiChonXiu++;
            } else {
                // nếu tìm thấy thì cộng thêm tiền vô
                this.idChonXiu.find(x => x.id === id).tien += tien;
            }
        }
        return {
            status: 'success'
        }
    }
    // random kết quả
    this.gameRandomResult = function () {
        dice1 = Math.floor(1 + Math.random() * (6));
        dice2 = Math.floor(1 + Math.random() * (6));
        dice3 = Math.floor(1 + Math.random() * (6));
        return {
            dice1: dice1,
            dice2: dice2,
            dice3: dice3,
            result: dice1 + dice2 + dice3 <= 9 ? 'xiu' : 'tai'
        };
    }

}

tx = new Taixiu();

io.on('connection', function (socket) {
    socket.on('pull', function (data) {
        msg = tx.putMoney(data.id, data.dice, data.money, data.user_id);
        socket.emit('pull', {
            msg: msg,
            money: data.money
        });
    });
});
tx.gameStart();