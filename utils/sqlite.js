// 数据库名称
const dbName = 'violet';
// 数据库地址
const dbPath = '_doc/db/violet.db';

// 判断数据库是否打开
function isOpen() {
	return plus.sqlite.isOpenDatabase({
		name: dbName,
		path: dbPath
	});
}

// 打开数据库，没有则创建
function openSqlite() {
	return new Promise((resolve, reject) => {
		plus.sqlite.openDatabase({
			name: dbName,
			path: dbPath,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

// 关闭数据库
function closeSqlite() {
	return new Promise((resolve, reject) => {
		plus.sqlite.closeDatabase({
			name: dbName,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

// 数据库建表
function createTable(dbTable, data) {
	const {
		userId
	} = getApp().globalData;
	const conTable = "conversation_" + userId;
	const msgTable = "message_" + userId;
	const sqls = [
		`CREATE TABLE IF NOT EXISTS ${conTable} (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    con_short_id INTEGER,
                    con_id TEXT,
                    con_type INTEGER,
                    name TEXT,
                    avatar_uri TEXT,
                    description TEXT,
                    notice TEXT,
                    owner_id INTEGER,
                    create_time INTEGER,
                    status INTEGER,
                    min_index INTEGER,
                    top_time_stamp INTEGER,
                    push_status INTEGER,
                    extra TEXT,
                    member_count INTEGER,
                    badge_count INTEGER,
					read_index_end INTEGER,
                    read_badge_count INTEGER,
                    user_con_index INTEGER
                );`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_con_short_id ON ${conTable} (con_short_id);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_con_index ON ${conTable} (user_con_index);`,
		`CREATE TABLE IF NOT EXISTS ${msgTable} (
					id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
					user_id INTEGER,
					con_short_id INTEGER,
					con_id TEXT,
					con_type INTEGER,
					msg_id INTEGER,
					msg_type INTEGER,
					msg_content TEXT,
					create_time INTEGER,
					con_index INTEGER
				);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_msg_id ON ${msgTable} (msg_id);`,
		`CREATE INDEX IF NOT EXISTS idx_con_short_id_con_index ON ${msgTable} (con_short_id, con_index);`
	];
	return new Promise((resolve, reject) => {
		let err = null;
		plus.sqlite.executeSql({
			name: dbName,
			sql: sqls[0],
			success() {
				plus.sqlite.executeSql({
					name: dbName,
					sql: sqls[1],
					success() {},
					fail(e) {
						console.error(e)
						err = e;
					}
				});
				plus.sqlite.executeSql({
					name: dbName,
					sql: sqls[2],
					success() {},
					fail(e) {
						console.error(e)
						err = e;
					}
				});
			},
			fail(e) {
				console.error(e)
				err = e;
			}
		});
		plus.sqlite.executeSql({
			name: dbName,
			sql: sqls[3],
			success() {
				plus.sqlite.executeSql({
					name: dbName,
					sql: sqls[4],
					success() {},
					fail(e) {
						console.error(e)
						err = e;
					}
				});
				plus.sqlite.executeSql({
					name: dbName,
					sql: sqls[5],
					success() {},
					fail(e) {
						console.error(e)
						err = e;
					}
				});
			},
			fail(e) {
				console.error(e)
				err = e;
			}
		});
		if (err === null) resolve();
		else reject();
	});
}

function insertConversation(data) {
	const {
		userId
	} = getApp().globalData;
	const dbTable = "conversation_" + userId;
	const sql = `INSERT OR REPLACE INTO ${dbTable} VALUES ${data}`;
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({
			name: dbName,
			sql: sql,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

function insertMessage(data) {
	const {
		userId
	} = getApp().globalData;
	const dbTable = "message_" + userId;
	const sql = `INSERT OR IGNORE INTO ${dbTable} VALUES ${data}`;
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({
			name: dbName,
			sql: sql,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

function selectConversation(index) {
	const {
		userId
	} = getApp().globalData;
	const dbTable = "conversation_" + userId;
	const sql = `SELECT * FROM ${dbTable} WHERE user_con_index <= ${index} ORDER BY user_con_index DESC LIMIT 50`;
	return new Promise((resolve, reject) => {
		plus.sqlite.selectSql({
			name: dbName,
			sql: sql,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

function selectMessage(conShortId, index) {
	const {
		userId
	} = getApp().globalData;
	const dbTable = "message_" + userId;
	const sql =
		`SELECT * FROM ${dbTable} WHERE con_short_id = ${conShortId} AND con_index <= ${index} ORDER BY con_index DESC LIMIT 20`;
	return new Promise((resolve, reject) => {
		plus.sqlite.selectSql({
			name: dbName,
			sql: sql,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

// 删除表里的数据
function deleteTableData(dbTable, condition = '') {
	if (dbTable !== undefined) {
		const sql = `DELETE FROM ${dbTable} ${condition}`;
		return new Promise((resolve, reject) => {
			plus.sqlite.executeSql({
				name: dbName,
				sql: sql,
				success(e) {
					resolve(e);
				},
				fail(e) {
					reject(e);
				}
			});
		});
	}
	return Promise.reject('错误删除');
}

// 修改数据表里的数据
function updateTableData(dbTable, data, lname, lvalue) {
	let sql;
	if (lname === undefined) {
		sql = `UPDATE ${dbTable} SET ${data}`;
	} else {
		sql = `UPDATE ${dbTable} SET ${data} WHERE ${lname} = '${lvalue}'`;
	}
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({
			name: dbName,
			sql: sql,
			success(e) {
				resolve(e);
			},
			fail(e) {
				reject(e);
			}
		});
	});
}

// 默认导出整个对象
export default {
	isOpen,
	openSqlite,
	closeSqlite,
	createTable,
	insertConversation,
	insertMessage,
	selectConversation,
	selectMessage,
	deleteTableData,
	updateTableData,
};