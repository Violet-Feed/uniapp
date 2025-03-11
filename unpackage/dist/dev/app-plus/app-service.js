if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$b = {
    data() {
      return {};
    },
    methods: {}
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", null, " video ");
  }
  const PagesVideoVideo = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$b], ["__file", "D:/H/Desktop/Violet/uniapp/pages/video/video.vue"]]);
  function requireNativePlugin(name) {
    return weex.requireModule(name);
  }
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const dbName = "violet";
  const dbPath = "_doc/db/violet.db";
  function isOpen() {
    return plus.sqlite.isOpenDatabase({
      name: dbName,
      path: dbPath
    });
  }
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
            success() {
            },
            fail(e) {
              formatAppLog("error", "at utils/sqlite.js:103", e);
              err = e;
            }
          });
          plus.sqlite.executeSql({
            name: dbName,
            sql: sqls[2],
            success() {
            },
            fail(e) {
              formatAppLog("error", "at utils/sqlite.js:112", e);
              err = e;
            }
          });
        },
        fail(e) {
          formatAppLog("error", "at utils/sqlite.js:118", e);
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
            success() {
            },
            fail(e) {
              formatAppLog("error", "at utils/sqlite.js:131", e);
              err = e;
            }
          });
          plus.sqlite.executeSql({
            name: dbName,
            sql: sqls[5],
            success() {
            },
            fail(e) {
              formatAppLog("error", "at utils/sqlite.js:140", e);
              err = e;
            }
          });
        },
        fail(e) {
          formatAppLog("error", "at utils/sqlite.js:146", e);
          err = e;
        }
      });
      if (err === null)
        resolve();
      else
        reject();
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
        sql,
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
        sql,
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
        sql,
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
    const sql = `SELECT * FROM ${dbTable} WHERE con_short_id = ${conShortId} AND con_index <= ${index} ORDER BY con_index DESC LIMIT 20`;
    return new Promise((resolve, reject) => {
      plus.sqlite.selectSql({
        name: dbName,
        sql,
        success(e) {
          resolve(e);
        },
        fail(e) {
          reject(e);
        }
      });
    });
  }
  function deleteTableData(dbTable, condition = "") {
    if (dbTable !== void 0) {
      const sql = `DELETE FROM ${dbTable} ${condition}`;
      return new Promise((resolve, reject) => {
        plus.sqlite.executeSql({
          name: dbName,
          sql,
          success(e) {
            resolve(e);
          },
          fail(e) {
            reject(e);
          }
        });
      });
    }
    return Promise.reject("错误删除");
  }
  function updateTableData(dbTable, data, lname, lvalue) {
    let sql;
    if (lname === void 0) {
      sql = `UPDATE ${dbTable} SET ${data}`;
    } else {
      sql = `UPDATE ${dbTable} SET ${data} WHERE ${lname} = '${lvalue}'`;
    }
    return new Promise((resolve, reject) => {
      plus.sqlite.executeSql({
        name: dbName,
        sql,
        success(e) {
          resolve(e);
        },
        fail(e) {
          reject(e);
        }
      });
    });
  }
  const DB = {
    isOpen,
    openSqlite,
    closeSqlite,
    createTable,
    insertConversation,
    insertMessage,
    selectConversation,
    selectMessage,
    deleteTableData,
    updateTableData
  };
  const _sfc_main$a = {
    data() {
      return {
        userConIndex: getApp().globalData.userConIndex,
        conversationList: []
      };
    },
    onLoad() {
      DB.selectConversation(this.userConIndex).then((res) => {
        this.conversationList = res;
      }).catch((err) => {
        formatAppLog("error", "at pages/im/home.vue:43", "selectConversation err", err);
      });
    },
    methods: {
      // 跳转到搜索页面的方法
      goToSearchPage() {
        uni.navigateTo({
          url: "/pages/im/search"
        });
      },
      // 打开聊天页面的方法
      openChat(conversation) {
        uni.navigateTo({
          url: `/pages/im/conversation?conShortId=${conversation.con_short_id}&conId=${conversation.con_id}&conType=${conversation.con_type}&name=${conversation.name}`
        });
      }
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "conversation-container" }, [
      vue.createCommentVNode(" 搜索按钮 "),
      vue.createElementVNode("button", {
        onClick: _cache[0] || (_cache[0] = (...args) => $options.goToSearchPage && $options.goToSearchPage(...args))
      }, "搜索"),
      vue.createCommentVNode(" 会话列表 "),
      vue.createElementVNode("view", { class: "conversation-list" }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.conversationList, (conversation, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "conversation-item",
              key: index,
              onClick: ($event) => $options.openChat(conversation)
            }, [
              vue.createCommentVNode(" 头像 "),
              vue.createElementVNode("view", { class: "avatar" }, [
                vue.createElementVNode("image", {
                  src: conversation.avatar
                }, null, 8, ["src"])
              ]),
              vue.createCommentVNode(" 会话信息 "),
              vue.createElementVNode("view", { class: "conversation-info" }, [
                vue.createCommentVNode(" 对方名称 "),
                vue.createElementVNode(
                  "view",
                  { class: "name" },
                  vue.toDisplayString(conversation.name),
                  1
                  /* TEXT */
                ),
                vue.createCommentVNode(" 最新消息 "),
                vue.createElementVNode(
                  "view",
                  { class: "last-message" },
                  vue.toDisplayString(conversation.lastMessage),
                  1
                  /* TEXT */
                )
              ]),
              vue.createCommentVNode(" 未读消息数量 "),
              conversation.badge_count - conversation.read_badge_count > 0 ? (vue.openBlock(), vue.createElementBlock(
                "view",
                {
                  key: 0,
                  class: "unread-count"
                },
                vue.toDisplayString(conversation.badge_count - conversation.read_badge_count),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])
    ]);
  }
  const PagesImHome = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$a], ["__scopeId", "data-v-1764cc5c"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/im/home.vue"]]);
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  var jsonBigint = { exports: {} };
  var stringify = { exports: {} };
  var lookup = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    62,
    0,
    62,
    0,
    63,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    0,
    0,
    0,
    0,
    63,
    0,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51
  ];
  function base64Decode(source, target) {
    var sourceLength = source.length;
    var paddingLength = source[sourceLength - 2] === "=" ? 2 : source[sourceLength - 1] === "=" ? 1 : 0;
    var tmp;
    var byteIndex = 0;
    var baseLength = sourceLength - paddingLength & 4294967292;
    for (var i = 0; i < baseLength; i += 4) {
      tmp = lookup[source.charCodeAt(i)] << 18 | lookup[source.charCodeAt(i + 1)] << 12 | lookup[source.charCodeAt(i + 2)] << 6 | lookup[source.charCodeAt(i + 3)];
      target[byteIndex++] = tmp >> 16 & 255;
      target[byteIndex++] = tmp >> 8 & 255;
      target[byteIndex++] = tmp & 255;
    }
    if (paddingLength === 1) {
      tmp = lookup[source.charCodeAt(i)] << 10 | lookup[source.charCodeAt(i + 1)] << 4 | lookup[source.charCodeAt(i + 2)] >> 2;
      target[byteIndex++] = tmp >> 8 & 255;
      target[byteIndex++] = tmp & 255;
    }
    if (paddingLength === 2) {
      tmp = lookup[source.charCodeAt(i)] << 2 | lookup[source.charCodeAt(i + 1)] >> 4;
      target[byteIndex++] = tmp & 255;
    }
  }
  const crypto = {
    getRandomValues(arr) {
      if (!(arr instanceof Int8Array || arr instanceof Uint8Array || arr instanceof Int16Array || arr instanceof Uint16Array || arr instanceof Int32Array || arr instanceof Uint32Array || arr instanceof Uint8ClampedArray)) {
        throw new Error("Expected an integer array");
      }
      if (arr.byteLength > 65536) {
        throw new Error("Can only request a maximum of 65536 bytes");
      }
      var crypto2 = requireNativePlugin("DCloud-Crypto");
      base64Decode(crypto2.getRandomValues(arr.byteLength), new Uint8Array(
        arr.buffer,
        arr.byteOffset,
        arr.byteLength
      ));
      return arr;
    }
  };
  var bignumber = { exports: {} };
  (function(module) {
    (function(globalObject) {
      var BigNumber2, isNumeric = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i, mathceil = Math.ceil, mathfloor = Math.floor, bignumberError = "[BigNumber Error] ", tooManyDigits = bignumberError + "Number primitive has more than 15 significant digits: ", BASE = 1e14, LOG_BASE = 14, MAX_SAFE_INTEGER = 9007199254740991, POWS_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13], SQRT_BASE = 1e7, MAX = 1e9;
      function clone(configObject) {
        var div, convertBase, parseNumeric, P = BigNumber3.prototype = { constructor: BigNumber3, toString: null, valueOf: null }, ONE = new BigNumber3(1), DECIMAL_PLACES = 20, ROUNDING_MODE = 4, TO_EXP_NEG = -7, TO_EXP_POS = 21, MIN_EXP = -1e7, MAX_EXP = 1e7, CRYPTO = false, MODULO_MODE = 1, POW_PRECISION = 0, FORMAT = {
          prefix: "",
          groupSize: 3,
          secondaryGroupSize: 0,
          groupSeparator: ",",
          decimalSeparator: ".",
          fractionGroupSize: 0,
          fractionGroupSeparator: " ",
          // non-breaking space
          suffix: ""
        }, ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz", alphabetHasNormalDecimalDigits = true;
        function BigNumber3(v, b) {
          var alphabet, c, caseChanged, e, i, isNum, len, str, x = this;
          if (!(x instanceof BigNumber3))
            return new BigNumber3(v, b);
          if (b == null) {
            if (v && v._isBigNumber === true) {
              x.s = v.s;
              if (!v.c || v.e > MAX_EXP) {
                x.c = x.e = null;
              } else if (v.e < MIN_EXP) {
                x.c = [x.e = 0];
              } else {
                x.e = v.e;
                x.c = v.c.slice();
              }
              return;
            }
            if ((isNum = typeof v == "number") && v * 0 == 0) {
              x.s = 1 / v < 0 ? (v = -v, -1) : 1;
              if (v === ~~v) {
                for (e = 0, i = v; i >= 10; i /= 10, e++)
                  ;
                if (e > MAX_EXP) {
                  x.c = x.e = null;
                } else {
                  x.e = e;
                  x.c = [v];
                }
                return;
              }
              str = String(v);
            } else {
              if (!isNumeric.test(str = String(v)))
                return parseNumeric(x, str, isNum);
              x.s = str.charCodeAt(0) == 45 ? (str = str.slice(1), -1) : 1;
            }
            if ((e = str.indexOf(".")) > -1)
              str = str.replace(".", "");
            if ((i = str.search(/e/i)) > 0) {
              if (e < 0)
                e = i;
              e += +str.slice(i + 1);
              str = str.substring(0, i);
            } else if (e < 0) {
              e = str.length;
            }
          } else {
            intCheck(b, 2, ALPHABET.length, "Base");
            if (b == 10 && alphabetHasNormalDecimalDigits) {
              x = new BigNumber3(v);
              return round(x, DECIMAL_PLACES + x.e + 1, ROUNDING_MODE);
            }
            str = String(v);
            if (isNum = typeof v == "number") {
              if (v * 0 != 0)
                return parseNumeric(x, str, isNum, b);
              x.s = 1 / v < 0 ? (str = str.slice(1), -1) : 1;
              if (BigNumber3.DEBUG && str.replace(/^0\.0*|\./, "").length > 15) {
                throw Error(tooManyDigits + v);
              }
            } else {
              x.s = str.charCodeAt(0) === 45 ? (str = str.slice(1), -1) : 1;
            }
            alphabet = ALPHABET.slice(0, b);
            e = i = 0;
            for (len = str.length; i < len; i++) {
              if (alphabet.indexOf(c = str.charAt(i)) < 0) {
                if (c == ".") {
                  if (i > e) {
                    e = len;
                    continue;
                  }
                } else if (!caseChanged) {
                  if (str == str.toUpperCase() && (str = str.toLowerCase()) || str == str.toLowerCase() && (str = str.toUpperCase())) {
                    caseChanged = true;
                    i = -1;
                    e = 0;
                    continue;
                  }
                }
                return parseNumeric(x, String(v), isNum, b);
              }
            }
            isNum = false;
            str = convertBase(str, b, 10, x.s);
            if ((e = str.indexOf(".")) > -1)
              str = str.replace(".", "");
            else
              e = str.length;
          }
          for (i = 0; str.charCodeAt(i) === 48; i++)
            ;
          for (len = str.length; str.charCodeAt(--len) === 48; )
            ;
          if (str = str.slice(i, ++len)) {
            len -= i;
            if (isNum && BigNumber3.DEBUG && len > 15 && (v > MAX_SAFE_INTEGER || v !== mathfloor(v))) {
              throw Error(tooManyDigits + x.s * v);
            }
            if ((e = e - i - 1) > MAX_EXP) {
              x.c = x.e = null;
            } else if (e < MIN_EXP) {
              x.c = [x.e = 0];
            } else {
              x.e = e;
              x.c = [];
              i = (e + 1) % LOG_BASE;
              if (e < 0)
                i += LOG_BASE;
              if (i < len) {
                if (i)
                  x.c.push(+str.slice(0, i));
                for (len -= LOG_BASE; i < len; ) {
                  x.c.push(+str.slice(i, i += LOG_BASE));
                }
                i = LOG_BASE - (str = str.slice(i)).length;
              } else {
                i -= len;
              }
              for (; i--; str += "0")
                ;
              x.c.push(+str);
            }
          } else {
            x.c = [x.e = 0];
          }
        }
        BigNumber3.clone = clone;
        BigNumber3.ROUND_UP = 0;
        BigNumber3.ROUND_DOWN = 1;
        BigNumber3.ROUND_CEIL = 2;
        BigNumber3.ROUND_FLOOR = 3;
        BigNumber3.ROUND_HALF_UP = 4;
        BigNumber3.ROUND_HALF_DOWN = 5;
        BigNumber3.ROUND_HALF_EVEN = 6;
        BigNumber3.ROUND_HALF_CEIL = 7;
        BigNumber3.ROUND_HALF_FLOOR = 8;
        BigNumber3.EUCLID = 9;
        BigNumber3.config = BigNumber3.set = function(obj) {
          var p, v;
          if (obj != null) {
            if (typeof obj == "object") {
              if (obj.hasOwnProperty(p = "DECIMAL_PLACES")) {
                v = obj[p];
                intCheck(v, 0, MAX, p);
                DECIMAL_PLACES = v;
              }
              if (obj.hasOwnProperty(p = "ROUNDING_MODE")) {
                v = obj[p];
                intCheck(v, 0, 8, p);
                ROUNDING_MODE = v;
              }
              if (obj.hasOwnProperty(p = "EXPONENTIAL_AT")) {
                v = obj[p];
                if (v && v.pop) {
                  intCheck(v[0], -MAX, 0, p);
                  intCheck(v[1], 0, MAX, p);
                  TO_EXP_NEG = v[0];
                  TO_EXP_POS = v[1];
                } else {
                  intCheck(v, -MAX, MAX, p);
                  TO_EXP_NEG = -(TO_EXP_POS = v < 0 ? -v : v);
                }
              }
              if (obj.hasOwnProperty(p = "RANGE")) {
                v = obj[p];
                if (v && v.pop) {
                  intCheck(v[0], -MAX, -1, p);
                  intCheck(v[1], 1, MAX, p);
                  MIN_EXP = v[0];
                  MAX_EXP = v[1];
                } else {
                  intCheck(v, -MAX, MAX, p);
                  if (v) {
                    MIN_EXP = -(MAX_EXP = v < 0 ? -v : v);
                  } else {
                    throw Error(bignumberError + p + " cannot be zero: " + v);
                  }
                }
              }
              if (obj.hasOwnProperty(p = "CRYPTO")) {
                v = obj[p];
                if (v === !!v) {
                  if (v) {
                    if (typeof crypto != "undefined" && crypto && (crypto.getRandomValues || crypto.randomBytes)) {
                      CRYPTO = v;
                    } else {
                      CRYPTO = !v;
                      throw Error(bignumberError + "crypto unavailable");
                    }
                  } else {
                    CRYPTO = v;
                  }
                } else {
                  throw Error(bignumberError + p + " not true or false: " + v);
                }
              }
              if (obj.hasOwnProperty(p = "MODULO_MODE")) {
                v = obj[p];
                intCheck(v, 0, 9, p);
                MODULO_MODE = v;
              }
              if (obj.hasOwnProperty(p = "POW_PRECISION")) {
                v = obj[p];
                intCheck(v, 0, MAX, p);
                POW_PRECISION = v;
              }
              if (obj.hasOwnProperty(p = "FORMAT")) {
                v = obj[p];
                if (typeof v == "object")
                  FORMAT = v;
                else
                  throw Error(bignumberError + p + " not an object: " + v);
              }
              if (obj.hasOwnProperty(p = "ALPHABET")) {
                v = obj[p];
                if (typeof v == "string" && !/^.?$|[+\-.\s]|(.).*\1/.test(v)) {
                  alphabetHasNormalDecimalDigits = v.slice(0, 10) == "0123456789";
                  ALPHABET = v;
                } else {
                  throw Error(bignumberError + p + " invalid: " + v);
                }
              }
            } else {
              throw Error(bignumberError + "Object expected: " + obj);
            }
          }
          return {
            DECIMAL_PLACES,
            ROUNDING_MODE,
            EXPONENTIAL_AT: [TO_EXP_NEG, TO_EXP_POS],
            RANGE: [MIN_EXP, MAX_EXP],
            CRYPTO,
            MODULO_MODE,
            POW_PRECISION,
            FORMAT,
            ALPHABET
          };
        };
        BigNumber3.isBigNumber = function(v) {
          if (!v || v._isBigNumber !== true)
            return false;
          if (!BigNumber3.DEBUG)
            return true;
          var i, n, c = v.c, e = v.e, s = v.s;
          out:
            if ({}.toString.call(c) == "[object Array]") {
              if ((s === 1 || s === -1) && e >= -MAX && e <= MAX && e === mathfloor(e)) {
                if (c[0] === 0) {
                  if (e === 0 && c.length === 1)
                    return true;
                  break out;
                }
                i = (e + 1) % LOG_BASE;
                if (i < 1)
                  i += LOG_BASE;
                if (String(c[0]).length == i) {
                  for (i = 0; i < c.length; i++) {
                    n = c[i];
                    if (n < 0 || n >= BASE || n !== mathfloor(n))
                      break out;
                  }
                  if (n !== 0)
                    return true;
                }
              }
            } else if (c === null && e === null && (s === null || s === 1 || s === -1)) {
              return true;
            }
          throw Error(bignumberError + "Invalid BigNumber: " + v);
        };
        BigNumber3.maximum = BigNumber3.max = function() {
          return maxOrMin(arguments, -1);
        };
        BigNumber3.minimum = BigNumber3.min = function() {
          return maxOrMin(arguments, 1);
        };
        BigNumber3.random = function() {
          var pow2_53 = 9007199254740992;
          var random53bitInt = Math.random() * pow2_53 & 2097151 ? function() {
            return mathfloor(Math.random() * pow2_53);
          } : function() {
            return (Math.random() * 1073741824 | 0) * 8388608 + (Math.random() * 8388608 | 0);
          };
          return function(dp) {
            var a, b, e, k, v, i = 0, c = [], rand = new BigNumber3(ONE);
            if (dp == null)
              dp = DECIMAL_PLACES;
            else
              intCheck(dp, 0, MAX);
            k = mathceil(dp / LOG_BASE);
            if (CRYPTO) {
              if (crypto.getRandomValues) {
                a = crypto.getRandomValues(new Uint32Array(k *= 2));
                for (; i < k; ) {
                  v = a[i] * 131072 + (a[i + 1] >>> 11);
                  if (v >= 9e15) {
                    b = crypto.getRandomValues(new Uint32Array(2));
                    a[i] = b[0];
                    a[i + 1] = b[1];
                  } else {
                    c.push(v % 1e14);
                    i += 2;
                  }
                }
                i = k / 2;
              } else if (crypto.randomBytes) {
                a = crypto.randomBytes(k *= 7);
                for (; i < k; ) {
                  v = (a[i] & 31) * 281474976710656 + a[i + 1] * 1099511627776 + a[i + 2] * 4294967296 + a[i + 3] * 16777216 + (a[i + 4] << 16) + (a[i + 5] << 8) + a[i + 6];
                  if (v >= 9e15) {
                    crypto.randomBytes(7).copy(a, i);
                  } else {
                    c.push(v % 1e14);
                    i += 7;
                  }
                }
                i = k / 7;
              } else {
                CRYPTO = false;
                throw Error(bignumberError + "crypto unavailable");
              }
            }
            if (!CRYPTO) {
              for (; i < k; ) {
                v = random53bitInt();
                if (v < 9e15)
                  c[i++] = v % 1e14;
              }
            }
            k = c[--i];
            dp %= LOG_BASE;
            if (k && dp) {
              v = POWS_TEN[LOG_BASE - dp];
              c[i] = mathfloor(k / v) * v;
            }
            for (; c[i] === 0; c.pop(), i--)
              ;
            if (i < 0) {
              c = [e = 0];
            } else {
              for (e = -1; c[0] === 0; c.splice(0, 1), e -= LOG_BASE)
                ;
              for (i = 1, v = c[0]; v >= 10; v /= 10, i++)
                ;
              if (i < LOG_BASE)
                e -= LOG_BASE - i;
            }
            rand.e = e;
            rand.c = c;
            return rand;
          };
        }();
        BigNumber3.sum = function() {
          var i = 1, args = arguments, sum = new BigNumber3(args[0]);
          for (; i < args.length; )
            sum = sum.plus(args[i++]);
          return sum;
        };
        convertBase = /* @__PURE__ */ function() {
          var decimal = "0123456789";
          function toBaseOut(str, baseIn, baseOut, alphabet) {
            var j, arr = [0], arrL, i = 0, len = str.length;
            for (; i < len; ) {
              for (arrL = arr.length; arrL--; arr[arrL] *= baseIn)
                ;
              arr[0] += alphabet.indexOf(str.charAt(i++));
              for (j = 0; j < arr.length; j++) {
                if (arr[j] > baseOut - 1) {
                  if (arr[j + 1] == null)
                    arr[j + 1] = 0;
                  arr[j + 1] += arr[j] / baseOut | 0;
                  arr[j] %= baseOut;
                }
              }
            }
            return arr.reverse();
          }
          return function(str, baseIn, baseOut, sign, callerIsToString) {
            var alphabet, d, e, k, r, x, xc, y, i = str.indexOf("."), dp = DECIMAL_PLACES, rm = ROUNDING_MODE;
            if (i >= 0) {
              k = POW_PRECISION;
              POW_PRECISION = 0;
              str = str.replace(".", "");
              y = new BigNumber3(baseIn);
              x = y.pow(str.length - i);
              POW_PRECISION = k;
              y.c = toBaseOut(
                toFixedPoint(coeffToString(x.c), x.e, "0"),
                10,
                baseOut,
                decimal
              );
              y.e = y.c.length;
            }
            xc = toBaseOut(str, baseIn, baseOut, callerIsToString ? (alphabet = ALPHABET, decimal) : (alphabet = decimal, ALPHABET));
            e = k = xc.length;
            for (; xc[--k] == 0; xc.pop())
              ;
            if (!xc[0])
              return alphabet.charAt(0);
            if (i < 0) {
              --e;
            } else {
              x.c = xc;
              x.e = e;
              x.s = sign;
              x = div(x, y, dp, rm, baseOut);
              xc = x.c;
              r = x.r;
              e = x.e;
            }
            d = e + dp + 1;
            i = xc[d];
            k = baseOut / 2;
            r = r || d < 0 || xc[d + 1] != null;
            r = rm < 4 ? (i != null || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : i > k || i == k && (rm == 4 || r || rm == 6 && xc[d - 1] & 1 || rm == (x.s < 0 ? 8 : 7));
            if (d < 1 || !xc[0]) {
              str = r ? toFixedPoint(alphabet.charAt(1), -dp, alphabet.charAt(0)) : alphabet.charAt(0);
            } else {
              xc.length = d;
              if (r) {
                for (--baseOut; ++xc[--d] > baseOut; ) {
                  xc[d] = 0;
                  if (!d) {
                    ++e;
                    xc = [1].concat(xc);
                  }
                }
              }
              for (k = xc.length; !xc[--k]; )
                ;
              for (i = 0, str = ""; i <= k; str += alphabet.charAt(xc[i++]))
                ;
              str = toFixedPoint(str, e, alphabet.charAt(0));
            }
            return str;
          };
        }();
        div = /* @__PURE__ */ function() {
          function multiply(x, k, base) {
            var m, temp, xlo, xhi, carry = 0, i = x.length, klo = k % SQRT_BASE, khi = k / SQRT_BASE | 0;
            for (x = x.slice(); i--; ) {
              xlo = x[i] % SQRT_BASE;
              xhi = x[i] / SQRT_BASE | 0;
              m = khi * xlo + xhi * klo;
              temp = klo * xlo + m % SQRT_BASE * SQRT_BASE + carry;
              carry = (temp / base | 0) + (m / SQRT_BASE | 0) + khi * xhi;
              x[i] = temp % base;
            }
            if (carry)
              x = [carry].concat(x);
            return x;
          }
          function compare2(a, b, aL, bL) {
            var i, cmp;
            if (aL != bL) {
              cmp = aL > bL ? 1 : -1;
            } else {
              for (i = cmp = 0; i < aL; i++) {
                if (a[i] != b[i]) {
                  cmp = a[i] > b[i] ? 1 : -1;
                  break;
                }
              }
            }
            return cmp;
          }
          function subtract(a, b, aL, base) {
            var i = 0;
            for (; aL--; ) {
              a[aL] -= i;
              i = a[aL] < b[aL] ? 1 : 0;
              a[aL] = i * base + a[aL] - b[aL];
            }
            for (; !a[0] && a.length > 1; a.splice(0, 1))
              ;
          }
          return function(x, y, dp, rm, base) {
            var cmp, e, i, more, n, prod, prodL, q, qc, rem, remL, rem0, xi, xL, yc0, yL, yz, s = x.s == y.s ? 1 : -1, xc = x.c, yc = y.c;
            if (!xc || !xc[0] || !yc || !yc[0]) {
              return new BigNumber3(
                // Return NaN if either NaN, or both Infinity or 0.
                !x.s || !y.s || (xc ? yc && xc[0] == yc[0] : !yc) ? NaN : (
                  // Return ±0 if x is ±0 or y is ±Infinity, or return ±Infinity as y is ±0.
                  xc && xc[0] == 0 || !yc ? s * 0 : s / 0
                )
              );
            }
            q = new BigNumber3(s);
            qc = q.c = [];
            e = x.e - y.e;
            s = dp + e + 1;
            if (!base) {
              base = BASE;
              e = bitFloor(x.e / LOG_BASE) - bitFloor(y.e / LOG_BASE);
              s = s / LOG_BASE | 0;
            }
            for (i = 0; yc[i] == (xc[i] || 0); i++)
              ;
            if (yc[i] > (xc[i] || 0))
              e--;
            if (s < 0) {
              qc.push(1);
              more = true;
            } else {
              xL = xc.length;
              yL = yc.length;
              i = 0;
              s += 2;
              n = mathfloor(base / (yc[0] + 1));
              if (n > 1) {
                yc = multiply(yc, n, base);
                xc = multiply(xc, n, base);
                yL = yc.length;
                xL = xc.length;
              }
              xi = yL;
              rem = xc.slice(0, yL);
              remL = rem.length;
              for (; remL < yL; rem[remL++] = 0)
                ;
              yz = yc.slice();
              yz = [0].concat(yz);
              yc0 = yc[0];
              if (yc[1] >= base / 2)
                yc0++;
              do {
                n = 0;
                cmp = compare2(yc, rem, yL, remL);
                if (cmp < 0) {
                  rem0 = rem[0];
                  if (yL != remL)
                    rem0 = rem0 * base + (rem[1] || 0);
                  n = mathfloor(rem0 / yc0);
                  if (n > 1) {
                    if (n >= base)
                      n = base - 1;
                    prod = multiply(yc, n, base);
                    prodL = prod.length;
                    remL = rem.length;
                    while (compare2(prod, rem, prodL, remL) == 1) {
                      n--;
                      subtract(prod, yL < prodL ? yz : yc, prodL, base);
                      prodL = prod.length;
                      cmp = 1;
                    }
                  } else {
                    if (n == 0) {
                      cmp = n = 1;
                    }
                    prod = yc.slice();
                    prodL = prod.length;
                  }
                  if (prodL < remL)
                    prod = [0].concat(prod);
                  subtract(rem, prod, remL, base);
                  remL = rem.length;
                  if (cmp == -1) {
                    while (compare2(yc, rem, yL, remL) < 1) {
                      n++;
                      subtract(rem, yL < remL ? yz : yc, remL, base);
                      remL = rem.length;
                    }
                  }
                } else if (cmp === 0) {
                  n++;
                  rem = [0];
                }
                qc[i++] = n;
                if (rem[0]) {
                  rem[remL++] = xc[xi] || 0;
                } else {
                  rem = [xc[xi]];
                  remL = 1;
                }
              } while ((xi++ < xL || rem[0] != null) && s--);
              more = rem[0] != null;
              if (!qc[0])
                qc.splice(0, 1);
            }
            if (base == BASE) {
              for (i = 1, s = qc[0]; s >= 10; s /= 10, i++)
                ;
              round(q, dp + (q.e = i + e * LOG_BASE - 1) + 1, rm, more);
            } else {
              q.e = e;
              q.r = +more;
            }
            return q;
          };
        }();
        function format(n, i, rm, id) {
          var c0, e, ne, len, str;
          if (rm == null)
            rm = ROUNDING_MODE;
          else
            intCheck(rm, 0, 8);
          if (!n.c)
            return n.toString();
          c0 = n.c[0];
          ne = n.e;
          if (i == null) {
            str = coeffToString(n.c);
            str = id == 1 || id == 2 && (ne <= TO_EXP_NEG || ne >= TO_EXP_POS) ? toExponential(str, ne) : toFixedPoint(str, ne, "0");
          } else {
            n = round(new BigNumber3(n), i, rm);
            e = n.e;
            str = coeffToString(n.c);
            len = str.length;
            if (id == 1 || id == 2 && (i <= e || e <= TO_EXP_NEG)) {
              for (; len < i; str += "0", len++)
                ;
              str = toExponential(str, e);
            } else {
              i -= ne;
              str = toFixedPoint(str, e, "0");
              if (e + 1 > len) {
                if (--i > 0)
                  for (str += "."; i--; str += "0")
                    ;
              } else {
                i += e - len;
                if (i > 0) {
                  if (e + 1 == len)
                    str += ".";
                  for (; i--; str += "0")
                    ;
                }
              }
            }
          }
          return n.s < 0 && c0 ? "-" + str : str;
        }
        function maxOrMin(args, n) {
          var k, y, i = 1, x = new BigNumber3(args[0]);
          for (; i < args.length; i++) {
            y = new BigNumber3(args[i]);
            if (!y.s || (k = compare(x, y)) === n || k === 0 && x.s === n) {
              x = y;
            }
          }
          return x;
        }
        function normalise(n, c, e) {
          var i = 1, j = c.length;
          for (; !c[--j]; c.pop())
            ;
          for (j = c[0]; j >= 10; j /= 10, i++)
            ;
          if ((e = i + e * LOG_BASE - 1) > MAX_EXP) {
            n.c = n.e = null;
          } else if (e < MIN_EXP) {
            n.c = [n.e = 0];
          } else {
            n.e = e;
            n.c = c;
          }
          return n;
        }
        parseNumeric = /* @__PURE__ */ function() {
          var basePrefix = /^(-?)0([xbo])(?=\w[\w.]*$)/i, dotAfter = /^([^.]+)\.$/, dotBefore = /^\.([^.]+)$/, isInfinityOrNaN = /^-?(Infinity|NaN)$/, whitespaceOrPlus = /^\s*\+(?=[\w.])|^\s+|\s+$/g;
          return function(x, str, isNum, b) {
            var base, s = isNum ? str : str.replace(whitespaceOrPlus, "");
            if (isInfinityOrNaN.test(s)) {
              x.s = isNaN(s) ? null : s < 0 ? -1 : 1;
            } else {
              if (!isNum) {
                s = s.replace(basePrefix, function(m, p1, p2) {
                  base = (p2 = p2.toLowerCase()) == "x" ? 16 : p2 == "b" ? 2 : 8;
                  return !b || b == base ? p1 : m;
                });
                if (b) {
                  base = b;
                  s = s.replace(dotAfter, "$1").replace(dotBefore, "0.$1");
                }
                if (str != s)
                  return new BigNumber3(s, base);
              }
              if (BigNumber3.DEBUG) {
                throw Error(bignumberError + "Not a" + (b ? " base " + b : "") + " number: " + str);
              }
              x.s = null;
            }
            x.c = x.e = null;
          };
        }();
        function round(x, sd, rm, r) {
          var d, i, j, k, n, ni, rd, xc = x.c, pows10 = POWS_TEN;
          if (xc) {
            out: {
              for (d = 1, k = xc[0]; k >= 10; k /= 10, d++)
                ;
              i = sd - d;
              if (i < 0) {
                i += LOG_BASE;
                j = sd;
                n = xc[ni = 0];
                rd = mathfloor(n / pows10[d - j - 1] % 10);
              } else {
                ni = mathceil((i + 1) / LOG_BASE);
                if (ni >= xc.length) {
                  if (r) {
                    for (; xc.length <= ni; xc.push(0))
                      ;
                    n = rd = 0;
                    d = 1;
                    i %= LOG_BASE;
                    j = i - LOG_BASE + 1;
                  } else {
                    break out;
                  }
                } else {
                  n = k = xc[ni];
                  for (d = 1; k >= 10; k /= 10, d++)
                    ;
                  i %= LOG_BASE;
                  j = i - LOG_BASE + d;
                  rd = j < 0 ? 0 : mathfloor(n / pows10[d - j - 1] % 10);
                }
              }
              r = r || sd < 0 || // Are there any non-zero digits after the rounding digit?
              // The expression  n % pows10[d - j - 1]  returns all digits of n to the right
              // of the digit at j, e.g. if n is 908714 and j is 2, the expression gives 714.
              xc[ni + 1] != null || (j < 0 ? n : n % pows10[d - j - 1]);
              r = rm < 4 ? (rd || r) && (rm == 0 || rm == (x.s < 0 ? 3 : 2)) : rd > 5 || rd == 5 && (rm == 4 || r || rm == 6 && // Check whether the digit to the left of the rounding digit is odd.
              (i > 0 ? j > 0 ? n / pows10[d - j] : 0 : xc[ni - 1]) % 10 & 1 || rm == (x.s < 0 ? 8 : 7));
              if (sd < 1 || !xc[0]) {
                xc.length = 0;
                if (r) {
                  sd -= x.e + 1;
                  xc[0] = pows10[(LOG_BASE - sd % LOG_BASE) % LOG_BASE];
                  x.e = -sd || 0;
                } else {
                  xc[0] = x.e = 0;
                }
                return x;
              }
              if (i == 0) {
                xc.length = ni;
                k = 1;
                ni--;
              } else {
                xc.length = ni + 1;
                k = pows10[LOG_BASE - i];
                xc[ni] = j > 0 ? mathfloor(n / pows10[d - j] % pows10[j]) * k : 0;
              }
              if (r) {
                for (; ; ) {
                  if (ni == 0) {
                    for (i = 1, j = xc[0]; j >= 10; j /= 10, i++)
                      ;
                    j = xc[0] += k;
                    for (k = 1; j >= 10; j /= 10, k++)
                      ;
                    if (i != k) {
                      x.e++;
                      if (xc[0] == BASE)
                        xc[0] = 1;
                    }
                    break;
                  } else {
                    xc[ni] += k;
                    if (xc[ni] != BASE)
                      break;
                    xc[ni--] = 0;
                    k = 1;
                  }
                }
              }
              for (i = xc.length; xc[--i] === 0; xc.pop())
                ;
            }
            if (x.e > MAX_EXP) {
              x.c = x.e = null;
            } else if (x.e < MIN_EXP) {
              x.c = [x.e = 0];
            }
          }
          return x;
        }
        function valueOf(n) {
          var str, e = n.e;
          if (e === null)
            return n.toString();
          str = coeffToString(n.c);
          str = e <= TO_EXP_NEG || e >= TO_EXP_POS ? toExponential(str, e) : toFixedPoint(str, e, "0");
          return n.s < 0 ? "-" + str : str;
        }
        P.absoluteValue = P.abs = function() {
          var x = new BigNumber3(this);
          if (x.s < 0)
            x.s = 1;
          return x;
        };
        P.comparedTo = function(y, b) {
          return compare(this, new BigNumber3(y, b));
        };
        P.decimalPlaces = P.dp = function(dp, rm) {
          var c, n, v, x = this;
          if (dp != null) {
            intCheck(dp, 0, MAX);
            if (rm == null)
              rm = ROUNDING_MODE;
            else
              intCheck(rm, 0, 8);
            return round(new BigNumber3(x), dp + x.e + 1, rm);
          }
          if (!(c = x.c))
            return null;
          n = ((v = c.length - 1) - bitFloor(this.e / LOG_BASE)) * LOG_BASE;
          if (v = c[v])
            for (; v % 10 == 0; v /= 10, n--)
              ;
          if (n < 0)
            n = 0;
          return n;
        };
        P.dividedBy = P.div = function(y, b) {
          return div(this, new BigNumber3(y, b), DECIMAL_PLACES, ROUNDING_MODE);
        };
        P.dividedToIntegerBy = P.idiv = function(y, b) {
          return div(this, new BigNumber3(y, b), 0, 1);
        };
        P.exponentiatedBy = P.pow = function(n, m) {
          var half, isModExp, i, k, more, nIsBig, nIsNeg, nIsOdd, y, x = this;
          n = new BigNumber3(n);
          if (n.c && !n.isInteger()) {
            throw Error(bignumberError + "Exponent not an integer: " + valueOf(n));
          }
          if (m != null)
            m = new BigNumber3(m);
          nIsBig = n.e > 14;
          if (!x.c || !x.c[0] || x.c[0] == 1 && !x.e && x.c.length == 1 || !n.c || !n.c[0]) {
            y = new BigNumber3(Math.pow(+valueOf(x), nIsBig ? n.s * (2 - isOdd(n)) : +valueOf(n)));
            return m ? y.mod(m) : y;
          }
          nIsNeg = n.s < 0;
          if (m) {
            if (m.c ? !m.c[0] : !m.s)
              return new BigNumber3(NaN);
            isModExp = !nIsNeg && x.isInteger() && m.isInteger();
            if (isModExp)
              x = x.mod(m);
          } else if (n.e > 9 && (x.e > 0 || x.e < -1 || (x.e == 0 ? x.c[0] > 1 || nIsBig && x.c[1] >= 24e7 : x.c[0] < 8e13 || nIsBig && x.c[0] <= 9999975e7))) {
            k = x.s < 0 && isOdd(n) ? -0 : 0;
            if (x.e > -1)
              k = 1 / k;
            return new BigNumber3(nIsNeg ? 1 / k : k);
          } else if (POW_PRECISION) {
            k = mathceil(POW_PRECISION / LOG_BASE + 2);
          }
          if (nIsBig) {
            half = new BigNumber3(0.5);
            if (nIsNeg)
              n.s = 1;
            nIsOdd = isOdd(n);
          } else {
            i = Math.abs(+valueOf(n));
            nIsOdd = i % 2;
          }
          y = new BigNumber3(ONE);
          for (; ; ) {
            if (nIsOdd) {
              y = y.times(x);
              if (!y.c)
                break;
              if (k) {
                if (y.c.length > k)
                  y.c.length = k;
              } else if (isModExp) {
                y = y.mod(m);
              }
            }
            if (i) {
              i = mathfloor(i / 2);
              if (i === 0)
                break;
              nIsOdd = i % 2;
            } else {
              n = n.times(half);
              round(n, n.e + 1, 1);
              if (n.e > 14) {
                nIsOdd = isOdd(n);
              } else {
                i = +valueOf(n);
                if (i === 0)
                  break;
                nIsOdd = i % 2;
              }
            }
            x = x.times(x);
            if (k) {
              if (x.c && x.c.length > k)
                x.c.length = k;
            } else if (isModExp) {
              x = x.mod(m);
            }
          }
          if (isModExp)
            return y;
          if (nIsNeg)
            y = ONE.div(y);
          return m ? y.mod(m) : k ? round(y, POW_PRECISION, ROUNDING_MODE, more) : y;
        };
        P.integerValue = function(rm) {
          var n = new BigNumber3(this);
          if (rm == null)
            rm = ROUNDING_MODE;
          else
            intCheck(rm, 0, 8);
          return round(n, n.e + 1, rm);
        };
        P.isEqualTo = P.eq = function(y, b) {
          return compare(this, new BigNumber3(y, b)) === 0;
        };
        P.isFinite = function() {
          return !!this.c;
        };
        P.isGreaterThan = P.gt = function(y, b) {
          return compare(this, new BigNumber3(y, b)) > 0;
        };
        P.isGreaterThanOrEqualTo = P.gte = function(y, b) {
          return (b = compare(this, new BigNumber3(y, b))) === 1 || b === 0;
        };
        P.isInteger = function() {
          return !!this.c && bitFloor(this.e / LOG_BASE) > this.c.length - 2;
        };
        P.isLessThan = P.lt = function(y, b) {
          return compare(this, new BigNumber3(y, b)) < 0;
        };
        P.isLessThanOrEqualTo = P.lte = function(y, b) {
          return (b = compare(this, new BigNumber3(y, b))) === -1 || b === 0;
        };
        P.isNaN = function() {
          return !this.s;
        };
        P.isNegative = function() {
          return this.s < 0;
        };
        P.isPositive = function() {
          return this.s > 0;
        };
        P.isZero = function() {
          return !!this.c && this.c[0] == 0;
        };
        P.minus = function(y, b) {
          var i, j, t, xLTy, x = this, a = x.s;
          y = new BigNumber3(y, b);
          b = y.s;
          if (!a || !b)
            return new BigNumber3(NaN);
          if (a != b) {
            y.s = -b;
            return x.plus(y);
          }
          var xe = x.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x.c, yc = y.c;
          if (!xe || !ye) {
            if (!xc || !yc)
              return xc ? (y.s = -b, y) : new BigNumber3(yc ? x : NaN);
            if (!xc[0] || !yc[0]) {
              return yc[0] ? (y.s = -b, y) : new BigNumber3(xc[0] ? x : (
                // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
                ROUNDING_MODE == 3 ? -0 : 0
              ));
            }
          }
          xe = bitFloor(xe);
          ye = bitFloor(ye);
          xc = xc.slice();
          if (a = xe - ye) {
            if (xLTy = a < 0) {
              a = -a;
              t = xc;
            } else {
              ye = xe;
              t = yc;
            }
            t.reverse();
            for (b = a; b--; t.push(0))
              ;
            t.reverse();
          } else {
            j = (xLTy = (a = xc.length) < (b = yc.length)) ? a : b;
            for (a = b = 0; b < j; b++) {
              if (xc[b] != yc[b]) {
                xLTy = xc[b] < yc[b];
                break;
              }
            }
          }
          if (xLTy) {
            t = xc;
            xc = yc;
            yc = t;
            y.s = -y.s;
          }
          b = (j = yc.length) - (i = xc.length);
          if (b > 0)
            for (; b--; xc[i++] = 0)
              ;
          b = BASE - 1;
          for (; j > a; ) {
            if (xc[--j] < yc[j]) {
              for (i = j; i && !xc[--i]; xc[i] = b)
                ;
              --xc[i];
              xc[j] += BASE;
            }
            xc[j] -= yc[j];
          }
          for (; xc[0] == 0; xc.splice(0, 1), --ye)
            ;
          if (!xc[0]) {
            y.s = ROUNDING_MODE == 3 ? -1 : 1;
            y.c = [y.e = 0];
            return y;
          }
          return normalise(y, xc, ye);
        };
        P.modulo = P.mod = function(y, b) {
          var q, s, x = this;
          y = new BigNumber3(y, b);
          if (!x.c || !y.s || y.c && !y.c[0]) {
            return new BigNumber3(NaN);
          } else if (!y.c || x.c && !x.c[0]) {
            return new BigNumber3(x);
          }
          if (MODULO_MODE == 9) {
            s = y.s;
            y.s = 1;
            q = div(x, y, 0, 3);
            y.s = s;
            q.s *= s;
          } else {
            q = div(x, y, 0, MODULO_MODE);
          }
          y = x.minus(q.times(y));
          if (!y.c[0] && MODULO_MODE == 1)
            y.s = x.s;
          return y;
        };
        P.multipliedBy = P.times = function(y, b) {
          var c, e, i, j, k, m, xcL, xlo, xhi, ycL, ylo, yhi, zc, base, sqrtBase, x = this, xc = x.c, yc = (y = new BigNumber3(y, b)).c;
          if (!xc || !yc || !xc[0] || !yc[0]) {
            if (!x.s || !y.s || xc && !xc[0] && !yc || yc && !yc[0] && !xc) {
              y.c = y.e = y.s = null;
            } else {
              y.s *= x.s;
              if (!xc || !yc) {
                y.c = y.e = null;
              } else {
                y.c = [0];
                y.e = 0;
              }
            }
            return y;
          }
          e = bitFloor(x.e / LOG_BASE) + bitFloor(y.e / LOG_BASE);
          y.s *= x.s;
          xcL = xc.length;
          ycL = yc.length;
          if (xcL < ycL) {
            zc = xc;
            xc = yc;
            yc = zc;
            i = xcL;
            xcL = ycL;
            ycL = i;
          }
          for (i = xcL + ycL, zc = []; i--; zc.push(0))
            ;
          base = BASE;
          sqrtBase = SQRT_BASE;
          for (i = ycL; --i >= 0; ) {
            c = 0;
            ylo = yc[i] % sqrtBase;
            yhi = yc[i] / sqrtBase | 0;
            for (k = xcL, j = i + k; j > i; ) {
              xlo = xc[--k] % sqrtBase;
              xhi = xc[k] / sqrtBase | 0;
              m = yhi * xlo + xhi * ylo;
              xlo = ylo * xlo + m % sqrtBase * sqrtBase + zc[j] + c;
              c = (xlo / base | 0) + (m / sqrtBase | 0) + yhi * xhi;
              zc[j--] = xlo % base;
            }
            zc[j] = c;
          }
          if (c) {
            ++e;
          } else {
            zc.splice(0, 1);
          }
          return normalise(y, zc, e);
        };
        P.negated = function() {
          var x = new BigNumber3(this);
          x.s = -x.s || null;
          return x;
        };
        P.plus = function(y, b) {
          var t, x = this, a = x.s;
          y = new BigNumber3(y, b);
          b = y.s;
          if (!a || !b)
            return new BigNumber3(NaN);
          if (a != b) {
            y.s = -b;
            return x.minus(y);
          }
          var xe = x.e / LOG_BASE, ye = y.e / LOG_BASE, xc = x.c, yc = y.c;
          if (!xe || !ye) {
            if (!xc || !yc)
              return new BigNumber3(a / 0);
            if (!xc[0] || !yc[0])
              return yc[0] ? y : new BigNumber3(xc[0] ? x : a * 0);
          }
          xe = bitFloor(xe);
          ye = bitFloor(ye);
          xc = xc.slice();
          if (a = xe - ye) {
            if (a > 0) {
              ye = xe;
              t = yc;
            } else {
              a = -a;
              t = xc;
            }
            t.reverse();
            for (; a--; t.push(0))
              ;
            t.reverse();
          }
          a = xc.length;
          b = yc.length;
          if (a - b < 0) {
            t = yc;
            yc = xc;
            xc = t;
            b = a;
          }
          for (a = 0; b; ) {
            a = (xc[--b] = xc[b] + yc[b] + a) / BASE | 0;
            xc[b] = BASE === xc[b] ? 0 : xc[b] % BASE;
          }
          if (a) {
            xc = [a].concat(xc);
            ++ye;
          }
          return normalise(y, xc, ye);
        };
        P.precision = P.sd = function(sd, rm) {
          var c, n, v, x = this;
          if (sd != null && sd !== !!sd) {
            intCheck(sd, 1, MAX);
            if (rm == null)
              rm = ROUNDING_MODE;
            else
              intCheck(rm, 0, 8);
            return round(new BigNumber3(x), sd, rm);
          }
          if (!(c = x.c))
            return null;
          v = c.length - 1;
          n = v * LOG_BASE + 1;
          if (v = c[v]) {
            for (; v % 10 == 0; v /= 10, n--)
              ;
            for (v = c[0]; v >= 10; v /= 10, n++)
              ;
          }
          if (sd && x.e + 1 > n)
            n = x.e + 1;
          return n;
        };
        P.shiftedBy = function(k) {
          intCheck(k, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER);
          return this.times("1e" + k);
        };
        P.squareRoot = P.sqrt = function() {
          var m, n, r, rep, t, x = this, c = x.c, s = x.s, e = x.e, dp = DECIMAL_PLACES + 4, half = new BigNumber3("0.5");
          if (s !== 1 || !c || !c[0]) {
            return new BigNumber3(!s || s < 0 && (!c || c[0]) ? NaN : c ? x : 1 / 0);
          }
          s = Math.sqrt(+valueOf(x));
          if (s == 0 || s == 1 / 0) {
            n = coeffToString(c);
            if ((n.length + e) % 2 == 0)
              n += "0";
            s = Math.sqrt(+n);
            e = bitFloor((e + 1) / 2) - (e < 0 || e % 2);
            if (s == 1 / 0) {
              n = "5e" + e;
            } else {
              n = s.toExponential();
              n = n.slice(0, n.indexOf("e") + 1) + e;
            }
            r = new BigNumber3(n);
          } else {
            r = new BigNumber3(s + "");
          }
          if (r.c[0]) {
            e = r.e;
            s = e + dp;
            if (s < 3)
              s = 0;
            for (; ; ) {
              t = r;
              r = half.times(t.plus(div(x, t, dp, 1)));
              if (coeffToString(t.c).slice(0, s) === (n = coeffToString(r.c)).slice(0, s)) {
                if (r.e < e)
                  --s;
                n = n.slice(s - 3, s + 1);
                if (n == "9999" || !rep && n == "4999") {
                  if (!rep) {
                    round(t, t.e + DECIMAL_PLACES + 2, 0);
                    if (t.times(t).eq(x)) {
                      r = t;
                      break;
                    }
                  }
                  dp += 4;
                  s += 4;
                  rep = 1;
                } else {
                  if (!+n || !+n.slice(1) && n.charAt(0) == "5") {
                    round(r, r.e + DECIMAL_PLACES + 2, 1);
                    m = !r.times(r).eq(x);
                  }
                  break;
                }
              }
            }
          }
          return round(r, r.e + DECIMAL_PLACES + 1, ROUNDING_MODE, m);
        };
        P.toExponential = function(dp, rm) {
          if (dp != null) {
            intCheck(dp, 0, MAX);
            dp++;
          }
          return format(this, dp, rm, 1);
        };
        P.toFixed = function(dp, rm) {
          if (dp != null) {
            intCheck(dp, 0, MAX);
            dp = dp + this.e + 1;
          }
          return format(this, dp, rm);
        };
        P.toFormat = function(dp, rm, format2) {
          var str, x = this;
          if (format2 == null) {
            if (dp != null && rm && typeof rm == "object") {
              format2 = rm;
              rm = null;
            } else if (dp && typeof dp == "object") {
              format2 = dp;
              dp = rm = null;
            } else {
              format2 = FORMAT;
            }
          } else if (typeof format2 != "object") {
            throw Error(bignumberError + "Argument not an object: " + format2);
          }
          str = x.toFixed(dp, rm);
          if (x.c) {
            var i, arr = str.split("."), g1 = +format2.groupSize, g2 = +format2.secondaryGroupSize, groupSeparator = format2.groupSeparator || "", intPart = arr[0], fractionPart = arr[1], isNeg = x.s < 0, intDigits = isNeg ? intPart.slice(1) : intPart, len = intDigits.length;
            if (g2) {
              i = g1;
              g1 = g2;
              g2 = i;
              len -= i;
            }
            if (g1 > 0 && len > 0) {
              i = len % g1 || g1;
              intPart = intDigits.substr(0, i);
              for (; i < len; i += g1)
                intPart += groupSeparator + intDigits.substr(i, g1);
              if (g2 > 0)
                intPart += groupSeparator + intDigits.slice(i);
              if (isNeg)
                intPart = "-" + intPart;
            }
            str = fractionPart ? intPart + (format2.decimalSeparator || "") + ((g2 = +format2.fractionGroupSize) ? fractionPart.replace(
              new RegExp("\\d{" + g2 + "}\\B", "g"),
              "$&" + (format2.fractionGroupSeparator || "")
            ) : fractionPart) : intPart;
          }
          return (format2.prefix || "") + str + (format2.suffix || "");
        };
        P.toFraction = function(md) {
          var d, d0, d1, d2, e, exp, n, n0, n1, q, r, s, x = this, xc = x.c;
          if (md != null) {
            n = new BigNumber3(md);
            if (!n.isInteger() && (n.c || n.s !== 1) || n.lt(ONE)) {
              throw Error(bignumberError + "Argument " + (n.isInteger() ? "out of range: " : "not an integer: ") + valueOf(n));
            }
          }
          if (!xc)
            return new BigNumber3(x);
          d = new BigNumber3(ONE);
          n1 = d0 = new BigNumber3(ONE);
          d1 = n0 = new BigNumber3(ONE);
          s = coeffToString(xc);
          e = d.e = s.length - x.e - 1;
          d.c[0] = POWS_TEN[(exp = e % LOG_BASE) < 0 ? LOG_BASE + exp : exp];
          md = !md || n.comparedTo(d) > 0 ? e > 0 ? d : n1 : n;
          exp = MAX_EXP;
          MAX_EXP = 1 / 0;
          n = new BigNumber3(s);
          n0.c[0] = 0;
          for (; ; ) {
            q = div(n, d, 0, 1);
            d2 = d0.plus(q.times(d1));
            if (d2.comparedTo(md) == 1)
              break;
            d0 = d1;
            d1 = d2;
            n1 = n0.plus(q.times(d2 = n1));
            n0 = d2;
            d = n.minus(q.times(d2 = d));
            n = d2;
          }
          d2 = div(md.minus(d0), d1, 0, 1);
          n0 = n0.plus(d2.times(n1));
          d0 = d0.plus(d2.times(d1));
          n0.s = n1.s = x.s;
          e = e * 2;
          r = div(n1, d1, e, ROUNDING_MODE).minus(x).abs().comparedTo(
            div(n0, d0, e, ROUNDING_MODE).minus(x).abs()
          ) < 1 ? [n1, d1] : [n0, d0];
          MAX_EXP = exp;
          return r;
        };
        P.toNumber = function() {
          return +valueOf(this);
        };
        P.toPrecision = function(sd, rm) {
          if (sd != null)
            intCheck(sd, 1, MAX);
          return format(this, sd, rm, 2);
        };
        P.toString = function(b) {
          var str, n = this, s = n.s, e = n.e;
          if (e === null) {
            if (s) {
              str = "Infinity";
              if (s < 0)
                str = "-" + str;
            } else {
              str = "NaN";
            }
          } else {
            if (b == null) {
              str = e <= TO_EXP_NEG || e >= TO_EXP_POS ? toExponential(coeffToString(n.c), e) : toFixedPoint(coeffToString(n.c), e, "0");
            } else if (b === 10 && alphabetHasNormalDecimalDigits) {
              n = round(new BigNumber3(n), DECIMAL_PLACES + e + 1, ROUNDING_MODE);
              str = toFixedPoint(coeffToString(n.c), n.e, "0");
            } else {
              intCheck(b, 2, ALPHABET.length, "Base");
              str = convertBase(toFixedPoint(coeffToString(n.c), e, "0"), 10, b, s, true);
            }
            if (s < 0 && n.c[0])
              str = "-" + str;
          }
          return str;
        };
        P.valueOf = P.toJSON = function() {
          return valueOf(this);
        };
        P._isBigNumber = true;
        if (configObject != null)
          BigNumber3.set(configObject);
        return BigNumber3;
      }
      function bitFloor(n) {
        var i = n | 0;
        return n > 0 || n === i ? i : i - 1;
      }
      function coeffToString(a) {
        var s, z, i = 1, j = a.length, r = a[0] + "";
        for (; i < j; ) {
          s = a[i++] + "";
          z = LOG_BASE - s.length;
          for (; z--; s = "0" + s)
            ;
          r += s;
        }
        for (j = r.length; r.charCodeAt(--j) === 48; )
          ;
        return r.slice(0, j + 1 || 1);
      }
      function compare(x, y) {
        var a, b, xc = x.c, yc = y.c, i = x.s, j = y.s, k = x.e, l = y.e;
        if (!i || !j)
          return null;
        a = xc && !xc[0];
        b = yc && !yc[0];
        if (a || b)
          return a ? b ? 0 : -j : i;
        if (i != j)
          return i;
        a = i < 0;
        b = k == l;
        if (!xc || !yc)
          return b ? 0 : !xc ^ a ? 1 : -1;
        if (!b)
          return k > l ^ a ? 1 : -1;
        j = (k = xc.length) < (l = yc.length) ? k : l;
        for (i = 0; i < j; i++)
          if (xc[i] != yc[i])
            return xc[i] > yc[i] ^ a ? 1 : -1;
        return k == l ? 0 : k > l ^ a ? 1 : -1;
      }
      function intCheck(n, min, max, name) {
        if (n < min || n > max || n !== mathfloor(n)) {
          throw Error(bignumberError + (name || "Argument") + (typeof n == "number" ? n < min || n > max ? " out of range: " : " not an integer: " : " not a primitive number: ") + String(n));
        }
      }
      function isOdd(n) {
        var k = n.c.length - 1;
        return bitFloor(n.e / LOG_BASE) == k && n.c[k] % 2 != 0;
      }
      function toExponential(str, e) {
        return (str.length > 1 ? str.charAt(0) + "." + str.slice(1) : str) + (e < 0 ? "e" : "e+") + e;
      }
      function toFixedPoint(str, e, z) {
        var len, zs;
        if (e < 0) {
          for (zs = z + "."; ++e; zs += z)
            ;
          str = zs + str;
        } else {
          len = str.length;
          if (++e > len) {
            for (zs = z, e -= len; --e; zs += z)
              ;
            str += zs;
          } else if (e < len) {
            str = str.slice(0, e) + "." + str.slice(e);
          }
        }
        return str;
      }
      BigNumber2 = clone();
      BigNumber2["default"] = BigNumber2.BigNumber = BigNumber2;
      if (module.exports) {
        module.exports = BigNumber2;
      } else {
        if (!globalObject) {
          globalObject = typeof self != "undefined" && self ? self : window;
        }
        globalObject.BigNumber = BigNumber2;
      }
    })(commonjsGlobal);
  })(bignumber);
  var bignumberExports = bignumber.exports;
  (function(module) {
    var BigNumber2 = bignumberExports;
    var JSON = module.exports;
    (function() {
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, gap, indent, meta = {
        // table of character substitutions
        "\b": "\\b",
        "	": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        '"': '\\"',
        "\\": "\\\\"
      }, rep;
      function quote(string) {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function(a) {
          var c = meta[a];
          return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
      }
      function str(key, holder) {
        var i, k, v, length, mind = gap, partial, value = holder[key], isBigNumber = value != null && (value instanceof BigNumber2 || BigNumber2.isBigNumber(value));
        if (value && typeof value === "object" && typeof value.toJSON === "function") {
          value = value.toJSON(key);
        }
        if (typeof rep === "function") {
          value = rep.call(holder, key, value);
        }
        switch (typeof value) {
          case "string":
            if (isBigNumber) {
              return value;
            } else {
              return quote(value);
            }
          case "number":
            return isFinite(value) ? String(value) : "null";
          case "boolean":
          case "null":
          case "bigint":
            return String(value);
          case "object":
            if (!value) {
              return "null";
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === "[object Array]") {
              length = value.length;
              for (i = 0; i < length; i += 1) {
                partial[i] = str(i, value) || "null";
              }
              v = partial.length === 0 ? "[]" : gap ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" : "[" + partial.join(",") + "]";
              gap = mind;
              return v;
            }
            if (rep && typeof rep === "object") {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                if (typeof rep[i] === "string") {
                  k = rep[i];
                  v = str(k, value);
                  if (v) {
                    partial.push(quote(k) + (gap ? ": " : ":") + v);
                  }
                }
              }
            } else {
              Object.keys(value).forEach(function(k2) {
                var v2 = str(k2, value);
                if (v2) {
                  partial.push(quote(k2) + (gap ? ": " : ":") + v2);
                }
              });
            }
            v = partial.length === 0 ? "{}" : gap ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
      }
      if (typeof JSON.stringify !== "function") {
        JSON.stringify = function(value, replacer, space) {
          var i;
          gap = "";
          indent = "";
          if (typeof space === "number") {
            for (i = 0; i < space; i += 1) {
              indent += " ";
            }
          } else if (typeof space === "string") {
            indent = space;
          }
          rep = replacer;
          if (replacer && typeof replacer !== "function" && (typeof replacer !== "object" || typeof replacer.length !== "number")) {
            throw new Error("JSON.stringify");
          }
          return str("", { "": value });
        };
      }
    })();
  })(stringify);
  var stringifyExports = stringify.exports;
  var BigNumber = null;
  const suspectProtoRx = /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
  const suspectConstructorRx = /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;
  var json_parse$1 = function(options) {
    var _options = {
      strict: false,
      // not being strict means do not generate syntax errors for "duplicate key"
      storeAsString: false,
      // toggles whether the values should be stored as BigNumber (default) or a string
      alwaysParseAsBig: false,
      // toggles whether all numbers should be Big
      useNativeBigInt: false,
      // toggles whether to use native BigInt instead of bignumber.js
      protoAction: "error",
      constructorAction: "error"
    };
    if (options !== void 0 && options !== null) {
      if (options.strict === true) {
        _options.strict = true;
      }
      if (options.storeAsString === true) {
        _options.storeAsString = true;
      }
      _options.alwaysParseAsBig = options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
      _options.useNativeBigInt = options.useNativeBigInt === true ? options.useNativeBigInt : false;
      if (typeof options.constructorAction !== "undefined") {
        if (options.constructorAction === "error" || options.constructorAction === "ignore" || options.constructorAction === "preserve") {
          _options.constructorAction = options.constructorAction;
        } else {
          throw new Error(
            `Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`
          );
        }
      }
      if (typeof options.protoAction !== "undefined") {
        if (options.protoAction === "error" || options.protoAction === "ignore" || options.protoAction === "preserve") {
          _options.protoAction = options.protoAction;
        } else {
          throw new Error(
            `Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`
          );
        }
      }
    }
    var at, ch, escapee = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "	"
    }, text, error = function(m) {
      throw {
        name: "SyntaxError",
        message: m,
        at,
        text
      };
    }, next = function(c) {
      if (c && c !== ch) {
        error("Expected '" + c + "' instead of '" + ch + "'");
      }
      ch = text.charAt(at);
      at += 1;
      return ch;
    }, number = function() {
      var number2, string2 = "";
      if (ch === "-") {
        string2 = "-";
        next("-");
      }
      while (ch >= "0" && ch <= "9") {
        string2 += ch;
        next();
      }
      if (ch === ".") {
        string2 += ".";
        while (next() && ch >= "0" && ch <= "9") {
          string2 += ch;
        }
      }
      if (ch === "e" || ch === "E") {
        string2 += ch;
        next();
        if (ch === "-" || ch === "+") {
          string2 += ch;
          next();
        }
        while (ch >= "0" && ch <= "9") {
          string2 += ch;
          next();
        }
      }
      number2 = +string2;
      if (!isFinite(number2)) {
        error("Bad number");
      } else {
        if (BigNumber == null)
          BigNumber = bignumberExports;
        if (string2.length > 15)
          return _options.storeAsString ? string2 : _options.useNativeBigInt ? BigInt(string2) : new BigNumber(string2);
        else
          return !_options.alwaysParseAsBig ? number2 : _options.useNativeBigInt ? BigInt(number2) : new BigNumber(number2);
      }
    }, string = function() {
      var hex, i, string2 = "", uffff;
      if (ch === '"') {
        var startAt = at;
        while (next()) {
          if (ch === '"') {
            if (at - 1 > startAt)
              string2 += text.substring(startAt, at - 1);
            next();
            return string2;
          }
          if (ch === "\\") {
            if (at - 1 > startAt)
              string2 += text.substring(startAt, at - 1);
            next();
            if (ch === "u") {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string2 += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === "string") {
              string2 += escapee[ch];
            } else {
              break;
            }
            startAt = at;
          }
        }
      }
      error("Bad string");
    }, white = function() {
      while (ch && ch <= " ") {
        next();
      }
    }, word = function() {
      switch (ch) {
        case "t":
          next("t");
          next("r");
          next("u");
          next("e");
          return true;
        case "f":
          next("f");
          next("a");
          next("l");
          next("s");
          next("e");
          return false;
        case "n":
          next("n");
          next("u");
          next("l");
          next("l");
          return null;
      }
      error("Unexpected '" + ch + "'");
    }, value, array = function() {
      var array2 = [];
      if (ch === "[") {
        next("[");
        white();
        if (ch === "]") {
          next("]");
          return array2;
        }
        while (ch) {
          array2.push(value());
          white();
          if (ch === "]") {
            next("]");
            return array2;
          }
          next(",");
          white();
        }
      }
      error("Bad array");
    }, object = function() {
      var key, object2 = /* @__PURE__ */ Object.create(null);
      if (ch === "{") {
        next("{");
        white();
        if (ch === "}") {
          next("}");
          return object2;
        }
        while (ch) {
          key = string();
          white();
          next(":");
          if (_options.strict === true && Object.hasOwnProperty.call(object2, key)) {
            error('Duplicate key "' + key + '"');
          }
          if (suspectProtoRx.test(key) === true) {
            if (_options.protoAction === "error") {
              error("Object contains forbidden prototype property");
            } else if (_options.protoAction === "ignore") {
              value();
            } else {
              object2[key] = value();
            }
          } else if (suspectConstructorRx.test(key) === true) {
            if (_options.constructorAction === "error") {
              error("Object contains forbidden constructor property");
            } else if (_options.constructorAction === "ignore") {
              value();
            } else {
              object2[key] = value();
            }
          } else {
            object2[key] = value();
          }
          white();
          if (ch === "}") {
            next("}");
            return object2;
          }
          next(",");
          white();
        }
      }
      error("Bad object");
    };
    value = function() {
      white();
      switch (ch) {
        case "{":
          return object();
        case "[":
          return array();
        case '"':
          return string();
        case "-":
          return number();
        default:
          return ch >= "0" && ch <= "9" ? number() : word();
      }
    };
    return function(source, reviver) {
      var result;
      text = source + "";
      at = 0;
      ch = " ";
      result = value();
      white();
      if (ch) {
        error("Syntax error");
      }
      return typeof reviver === "function" ? function walk(holder, key) {
        var v, value2 = holder[key];
        if (value2 && typeof value2 === "object") {
          Object.keys(value2).forEach(function(k) {
            v = walk(value2, k);
            if (v !== void 0) {
              value2[k] = v;
            } else {
              delete value2[k];
            }
          });
        }
        return reviver.call(holder, key, value2);
      }({ "": result }, "") : result;
    };
  };
  var parse = json_parse$1;
  var json_stringify = stringifyExports.stringify;
  var json_parse = parse;
  jsonBigint.exports = function(options) {
    return {
      parse: json_parse(options),
      stringify: json_stringify
    };
  };
  jsonBigint.exports.parse = json_parse();
  jsonBigint.exports.stringify = json_stringify;
  var jsonBigintExports = jsonBigint.exports;
  const JSONbig = /* @__PURE__ */ getDefaultExportFromCjs(jsonBigintExports);
  const _sfc_main$9 = {
    data() {
      return {
        userId: getApp().globalData.userId,
        conversation: {
          conShortId: 0,
          conId: "",
          conType: 0,
          name: ""
        },
        conIndex: Number.MAX_VALUE,
        messages: [],
        inputText: "",
        scrollTop: 0,
        myAvatar: "/static/logo.png"
      };
    },
    onLoad(options) {
      this.conversation.conShortId = Number(options.conShortId);
      this.conversation.conId = options.conId;
      this.conversation.conType = Number(options.conType);
      this.conversation.name = options.name;
      uni.setNavigationBarTitle({
        title: this.conversation.name
      });
      DB.selectMessage(BigInt(this.conversation.conShortId), this.conIndex).then((res) => {
        this.messages = res;
        this.messages.reverse();
      }).catch((err) => {
        formatAppLog("error", "at pages/im/conversation.vue:70", "selectMessage err", err);
      });
    },
    methods: {
      async sendMessage() {
        if (this.inputText.trim() === "")
          return;
        const token = getApp().globalData.token;
        const data = {
          con_short_id: BigInt(this.conversation.conShortId),
          con_id: this.conversation.conId,
          con_type: this.conversation.conType,
          msg_type: 1,
          msg_content: this.inputText
        };
        const dataJson = JSONbig.stringify(data);
        formatAppLog("log", "at pages/im/conversation.vue:85", dataJson);
        const res = await uni.request({
          url: "http://127.0.0.1:3001/api/im/message/send",
          method: "POST",
          header: {
            "content-type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          data: dataJson
        });
        formatAppLog("log", "at pages/im/conversation.vue:95", res);
        if (res.statusCode === 200) {
          if (res.data.code === 1e3) {
            this.messages.push({
              user_id: this.userId,
              con_short_id: this.conversation.conShortId,
              con_id: this.conversation.conId,
              con_type: this.conversation.conType,
              msg_type: 1,
              msg_content: this.inputText
            });
            this.inputText = "";
            this.$nextTick(() => {
              this.scrollTop = this.$refs.chatMessages.scrollHeight;
            });
          } else {
            uni.showToast({
              title: "服务器错误",
              icon: "none"
            });
          }
        } else {
          uni.showToast({
            title: "网络错误",
            icon: "none"
          });
        }
      },
      goToUserProfile(message) {
        uni.navigateTo({
          url: `/pages/user/user?id=${message.user_id}&name=${message.name}&avatar=${message.avatar}`
        });
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "chat-container" }, [
      vue.createCommentVNode(" 聊天消息列表 "),
      vue.createElementVNode("scroll-view", {
        class: "chat-messages",
        "scroll-y": "true",
        "scroll-top": $data.scrollTop,
        ref: "chatMessages"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.messages, (message, index) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                class: vue.normalizeClass(["message", { "message-left": message.user_id != $data.userId, "message-right": message.user_id == $data.userId }]),
                key: index
              },
              [
                vue.createCommentVNode(" 对方消息，头像在左 "),
                message.user_id != $data.userId ? (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 0 },
                  [
                    vue.createElementVNode("view", {
                      class: "avatar",
                      onClick: ($event) => $options.goToUserProfile(message)
                    }, [
                      vue.createElementVNode("image", {
                        src: $data.conversation.avatar
                      }, null, 8, ["src"])
                    ], 8, ["onClick"]),
                    vue.createElementVNode("view", { class: "message-content" }, [
                      vue.createElementVNode(
                        "view",
                        { class: "bubble" },
                        vue.toDisplayString(message.msg_content),
                        1
                        /* TEXT */
                      )
                    ])
                  ],
                  64
                  /* STABLE_FRAGMENT */
                )) : (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  [
                    vue.createCommentVNode(" 自己消息，头像在右 "),
                    vue.createElementVNode("view", { class: "message-content" }, [
                      vue.createElementVNode(
                        "view",
                        { class: "bubble" },
                        vue.toDisplayString(message.msg_content),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", {
                      class: "avatar",
                      onClick: ($event) => $options.goToUserProfile(message)
                    }, [
                      vue.createElementVNode("image", { src: $data.myAvatar }, null, 8, ["src"])
                    ], 8, ["onClick"])
                  ],
                  64
                  /* STABLE_FRAGMENT */
                ))
              ],
              2
              /* CLASS */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ], 8, ["scroll-top"]),
      vue.createCommentVNode(" 输入框和发送按钮，固定在屏幕底部 "),
      vue.createElementVNode("view", { class: "input-bar" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.inputText = $event),
            placeholder: "请输入消息",
            onConfirm: _cache[1] || (_cache[1] = (...args) => $options.sendMessage && $options.sendMessage(...args))
          },
          null,
          544
          /* NEED_HYDRATION, NEED_PATCH */
        ), [
          [vue.vModelText, $data.inputText]
        ]),
        vue.createElementVNode("button", {
          onClick: _cache[2] || (_cache[2] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        }, "发送")
      ])
    ]);
  }
  const PagesImConversation = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$9], ["__scopeId", "data-v-a3a521f6"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/im/conversation.vue"]]);
  const _sfc_main$8 = {
    data() {
      return {};
    },
    methods: {}
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view");
  }
  const PagesShopShop = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$8], ["__file", "D:/H/Desktop/Violet/uniapp/pages/shop/shop.vue"]]);
  const _sfc_main$7 = {
    data() {
      return {
        userInfo: {
          id: null,
          name: "",
          avatar: "",
          followers: 0,
          following: 0
        }
      };
    },
    onLoad(options) {
      this.userInfo.id = getApp().globalData.userId;
      this.userInfo.name = getApp().globalData.username;
      this.userInfo.avatar = getApp().globalData.avatar;
      this.userInfo.followers = 0;
      this.userInfo.following = 0;
    },
    methods: {
      goToFansList() {
        uni.navigateTo({
          url: `/pages/user/followed_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
        });
      },
      goToFollowingList() {
        uni.navigateTo({
          url: `/pages/user/following_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
        });
      },
      logout() {
        getApp().globalData.socketTask.close({
          code: 1e3,
          // 关闭原因代码，1000 表示正常关闭
          reason: "logout",
          success() {
            formatAppLog("log", "at pages/user/me.vue:51", "WebSocket 连接关闭成功");
          },
          fail(err) {
            formatAppLog("error", "at pages/user/me.vue:54", "WebSocket 连接关闭失败:", err);
          }
        });
        delete getApp().globalData.token;
        uni.removeStorageSync("token");
        uni.reLaunch({
          url: "/pages/video/video"
          // 替换为你的首页路径
        });
      }
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "user-profile-container" }, [
      vue.createElementVNode("view", { class: "avatar" }, [
        vue.createElementVNode("image", {
          src: $data.userInfo.avatar
        }, null, 8, ["src"])
      ]),
      vue.createElementVNode(
        "view",
        { class: "name" },
        vue.toDisplayString($data.userInfo.name),
        1
        /* TEXT */
      ),
      vue.createElementVNode("view", { class: "stats" }, [
        vue.createElementVNode(
          "view",
          {
            onClick: _cache[0] || (_cache[0] = (...args) => $options.goToFansList && $options.goToFansList(...args))
          },
          "粉丝数: " + vue.toDisplayString($data.userInfo.followers),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "view",
          {
            onClick: _cache[1] || (_cache[1] = (...args) => $options.goToFollowingList && $options.goToFollowingList(...args))
          },
          "关注数: " + vue.toDisplayString($data.userInfo.following),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("button", {
        style: { "background-color": "#aa0000", "color": "white" },
        onClick: _cache[2] || (_cache[2] = (...args) => $options.logout && $options.logout(...args))
      }, "退出登录")
    ]);
  }
  const PagesUserMe = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$7], ["__scopeId", "data-v-4dafeecb"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/me.vue"]]);
  const _sfc_main$6 = {
    data() {
      return {
        userInfo: {
          id: null,
          name: "",
          avatar: "",
          followers: 0,
          following: 0
        },
        // 假设初始状态为未关注，可根据实际业务逻辑修改
        isFollowed: false
      };
    },
    onLoad(options) {
      this.userInfo.id = options.id;
      this.userInfo.name = options.name;
      this.userInfo.avatar = options.avatar;
    },
    methods: {
      goBackToChat() {
        uni.navigateTo({
          url: `/pages/im/conversation?id=${this.userInfo.id}&name=${this.userInfo.name}&avatar=${this.userInfo.avatar}`
        });
      },
      goToFansList() {
        uni.navigateTo({
          url: `/pages/user/followed_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
        });
      },
      goToFollowingList() {
        uni.navigateTo({
          url: `/pages/user/following_list?id=${this.userInfo.id}&name=${this.userInfo.name}`
        });
      },
      toggleFollow() {
        this.isFollowed = !this.isFollowed;
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "user-profile-container" }, [
      vue.createElementVNode("view", { class: "avatar" }, [
        vue.createElementVNode("image", {
          src: $data.userInfo.avatar
        }, null, 8, ["src"])
      ]),
      vue.createElementVNode(
        "view",
        { class: "name" },
        vue.toDisplayString($data.userInfo.name),
        1
        /* TEXT */
      ),
      vue.createElementVNode("view", { class: "stats" }, [
        vue.createElementVNode(
          "view",
          {
            onClick: _cache[0] || (_cache[0] = (...args) => $options.goToFansList && $options.goToFansList(...args))
          },
          "粉丝数: " + vue.toDisplayString($data.userInfo.followers),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "view",
          {
            onClick: _cache[1] || (_cache[1] = (...args) => $options.goToFollowingList && $options.goToFollowingList(...args))
          },
          "关注数: " + vue.toDisplayString($data.userInfo.following),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("view", { class: "button-group" }, [
        vue.createElementVNode(
          "button",
          {
            style: vue.normalizeStyle({ backgroundColor: $data.isFollowed ? "#ccc" : "#0084ff", color: $data.isFollowed ? "#333" : "white" }),
            onClick: _cache[2] || (_cache[2] = (...args) => $options.toggleFollow && $options.toggleFollow(...args))
          },
          vue.toDisplayString($data.isFollowed ? "已关注" : "关注"),
          5
          /* TEXT, STYLE */
        ),
        vue.createElementVNode("button", {
          style: { "background-color": "#0084ff", "color": "white" },
          onClick: _cache[3] || (_cache[3] = (...args) => $options.goBackToChat && $options.goBackToChat(...args))
        }, "发消息")
      ])
    ]);
  }
  const PagesUserUser = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$6], ["__scopeId", "data-v-0f7520f0"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/user.vue"]]);
  const _sfc_main$5 = {
    data() {
      return {
        userId: null,
        userName: ""
      };
    },
    onLoad(options) {
      this.userId = options.id;
      this.userName = options.name;
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "following-list-container" }, [
      vue.createElementVNode(
        "view",
        null,
        "关注列表 - " + vue.toDisplayString($data.userId) + " - " + vue.toDisplayString($data.userName),
        1
        /* TEXT */
      ),
      vue.createCommentVNode(" 这里可以添加具体的关注列表展示逻辑 ")
    ]);
  }
  const PagesUserFollowingList = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$5], ["__scopeId", "data-v-5d140a69"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/following_list.vue"]]);
  const _sfc_main$4 = {
    data() {
      return {
        userId: null,
        userName: ""
      };
    },
    onLoad(options) {
      this.userId = options.id;
      this.userName = options.name;
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "fans-list-container" }, [
      vue.createElementVNode(
        "view",
        null,
        "粉丝列表 - " + vue.toDisplayString($data.userId) + " - " + vue.toDisplayString($data.userName),
        1
        /* TEXT */
      ),
      vue.createCommentVNode(" 这里可以添加具体的粉丝列表展示逻辑 ")
    ]);
  }
  const PagesUserFollowedList = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$4], ["__scopeId", "data-v-176c98ad"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/followed_list.vue"]]);
  const _sfc_main$3 = {
    data() {
      return {
        username: "",
        password: ""
      };
    },
    methods: {
      async login() {
        if (!this.username || !this.password) {
          uni.showToast({
            title: "用户名和密码不能为空",
            icon: "none"
          });
          return;
        }
        const res = await uni.request({
          url: "http://127.0.0.1:3000/api/action/user/login/",
          method: "POST",
          header: {
            "content-type": "application/x-www-form-urlencoded"
          },
          data: {
            username: this.username,
            password: this.password
          }
        });
        if (res.statusCode === 200) {
          const data = res.data;
          if (data.message === "success") {
            const token = data.token;
            uni.setStorageSync("token", token);
            DB.createTable().catch((err) => {
              formatAppLog("error", "at pages/user/login.vue:51", "createTable err, err = ", err);
            });
            uni.showToast({
              title: "登录成功",
              icon: "success"
            });
            uni.reLaunch({
              url: "/pages/video/video"
            });
          } else {
            uni.showToast({
              title: data.message,
              icon: "none"
            });
          }
        } else {
          uni.showToast({
            title: "网络错误，请稍后重试",
            icon: "none"
          });
        }
      },
      goToRegister() {
        uni.navigateTo({
          url: "/pages/user/register"
        });
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-container" }, [
      vue.createElementVNode("view", { class: "input-group" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.username = $event),
            placeholder: "请输入用户名"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.username]
        ])
      ]),
      vue.createElementVNode("view", { class: "input-group" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.password = $event),
            type: "password",
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.password]
        ])
      ]),
      vue.createElementVNode("button", {
        onClick: _cache[2] || (_cache[2] = (...args) => $options.login && $options.login(...args))
      }, "登录"),
      vue.createElementVNode("view", {
        class: "register-link",
        onClick: _cache[3] || (_cache[3] = (...args) => $options.goToRegister && $options.goToRegister(...args))
      }, "没有账号？去注册")
    ]);
  }
  const PagesUserLogin = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$3], ["__scopeId", "data-v-6163e5ce"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/login.vue"]]);
  const _sfc_main$2 = {
    data() {
      return {
        username: "",
        password: "",
        confirmPassword: ""
      };
    },
    methods: {
      register() {
        if (!this.username || !this.password) {
          uni.showToast({
            title: "用户名和密码不能为空",
            icon: "none"
          });
          return;
        }
        if (this.password != this.confirmPassword) {
          uni.showToast({
            title: "密码不一致",
            icon: "none"
          });
          return;
        }
        uni.request({
          url: "http://127.0.0.1:3000/api/action/user/register/",
          method: "POST",
          header: {
            "content-type": "application/x-www-form-urlencoded"
          },
          data: {
            username: this.username,
            password: this.password,
            confirmPassword: this.confirmPassword
          },
          success: (res) => {
            if (res.statusCode === 200) {
              const data = res.data;
              if (data.message === "success") {
                uni.showToast({
                  title: "注册成功",
                  icon: "success"
                });
                uni.reLaunch({
                  url: "/pages/user/login"
                });
              } else {
                uni.showToast({
                  title: data.message,
                  icon: "none"
                });
              }
            } else {
              uni.showToast({
                title: "网络错误，请稍后重试",
                icon: "none"
              });
            }
          },
          fail: (err) => {
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      },
      goToLogin() {
        uni.navigateTo({
          url: "/pages/user/login"
        });
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "register-container" }, [
      vue.createElementVNode("view", { class: "input-group" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.username = $event),
            placeholder: "请输入用户名"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.username]
        ])
      ]),
      vue.createElementVNode("view", { class: "input-group" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.password = $event),
            type: "password",
            placeholder: "请输入密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.password]
        ])
      ]),
      vue.createElementVNode("view", { class: "input-group" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.confirmPassword = $event),
            type: "password",
            placeholder: "确认密码"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.confirmPassword]
        ])
      ]),
      vue.createElementVNode("button", {
        onClick: _cache[3] || (_cache[3] = (...args) => $options.register && $options.register(...args))
      }, "注册"),
      vue.createElementVNode("view", {
        class: "login-link",
        onClick: _cache[4] || (_cache[4] = (...args) => $options.goToLogin && $options.goToLogin(...args))
      }, "已有账号？去登录")
    ]);
  }
  const PagesUserRegister = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2], ["__scopeId", "data-v-fd534bf9"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/user/register.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        searchKeyword: "",
        // 搜索关键词
        userList: [],
        // 用户列表
        hasSearched: false
        // 是否已经进行过搜索
      };
    },
    methods: {
      // 搜索用户的方法
      searchUsers() {
        if (!this.searchKeyword) {
          uni.showToast({
            title: "请输入用户名",
            icon: "none"
          });
          return;
        }
        this.hasSearched = true;
        const token = getApp().globalData.token;
        uni.request({
          url: "http://127.0.0.1:3000/api/action/user/search/",
          method: "GET",
          header: {
            Authorization: `Bearer ${token}`
          },
          data: {
            term: this.searchKeyword
          },
          success: (res) => {
            if (res.statusCode === 200) {
              this.userList = res.data.userList;
              formatAppLog("log", "at pages/im/search.vue:54", res);
            } else {
              uni.showToast({
                title: "搜索失败，请稍后重试",
                icon: "none"
              });
            }
          },
          fail: (err) => {
            uni.showToast({
              title: "网络错误，请稍后重试",
              icon: "none"
            });
          }
        });
      },
      // 跳转到用户个人页的方法
      goToUserPage(user) {
        uni.navigateTo({
          url: `/pages/user/user?id=${user.userId}&name=${user.username}&avatar=${user.avatar}`
        });
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "search-page" }, [
      vue.createCommentVNode(" 搜索栏 "),
      vue.createElementVNode("view", { class: "search-bar" }, [
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.searchKeyword = $event),
            placeholder: "请输入用户名"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.searchKeyword]
        ]),
        vue.createElementVNode("button", {
          onClick: _cache[1] || (_cache[1] = (...args) => $options.searchUsers && $options.searchUsers(...args))
        }, "搜索")
      ]),
      vue.createCommentVNode(" 用户列表 "),
      $data.userList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "user-list"
      }, [
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.userList, (user, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: "user-item",
              key: index,
              onClick: ($event) => $options.goToUserPage(user)
            }, [
              vue.createElementVNode("view", { class: "avatar" }, [
                vue.createElementVNode("image", {
                  src: user.avatar
                }, null, 8, ["src"])
              ]),
              vue.createElementVNode(
                "view",
                { class: "user-name" },
                vue.toDisplayString(user.username),
                1
                /* TEXT */
              )
            ], 8, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (vue.openBlock(), vue.createElementBlock(
        vue.Fragment,
        { key: 1 },
        [
          $data.hasSearched ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "no-result"
          }, "暂无搜索结果")) : vue.createCommentVNode("v-if", true)
        ],
        2112
        /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
      ))
    ]);
  }
  const PagesImSearch = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1], ["__scopeId", "data-v-739b0953"], ["__file", "D:/H/Desktop/Violet/uniapp/pages/im/search.vue"]]);
  __definePage("pages/video/video", PagesVideoVideo);
  __definePage("pages/im/home", PagesImHome);
  __definePage("pages/im/conversation", PagesImConversation);
  __definePage("pages/shop/shop", PagesShopShop);
  __definePage("pages/user/me", PagesUserMe);
  __definePage("pages/user/user", PagesUserUser);
  __definePage("pages/user/following_list", PagesUserFollowingList);
  __definePage("pages/user/followed_list", PagesUserFollowedList);
  __definePage("pages/user/login", PagesUserLogin);
  __definePage("pages/user/register", PagesUserRegister);
  __definePage("pages/im/search", PagesImSearch);
  const connectWebSocket = () => {
    const app = getApp();
    const {
      token
    } = app.globalData;
    if (!token) {
      uni.reLaunch({
        url: "/pages/user/login"
      });
      return;
    }
    let heartBeatInterval;
    const socketTask = uni.connectSocket({
      url: `ws://127.0.0.1:3001/api/im/ws?token=${token}`,
      success() {
        formatAppLog("log", "at utils/websocket.js:17", "WebSocket 连接请求已发送");
      },
      fail(err) {
        formatAppLog("error", "at utils/websocket.js:20", "WebSocket 连接请求失败:", err);
        setTimeout(() => {
          connectWebSocket();
        }, 3e3);
      }
    });
    socketTask.onOpen(() => {
      formatAppLog("log", "at utils/websocket.js:28", "WebSocket 连接已成功建立");
      heartBeatInterval = setInterval(() => {
        socketTask.send({
          data: "ping",
          success() {
            formatAppLog("log", "at utils/websocket.js:33", "ping 消息发送成功");
          },
          fail(err) {
            formatAppLog("error", "at utils/websocket.js:36", "ping 消息发送失败:", err);
          }
        });
      }, 5e3);
    });
    socketTask.onMessage((res) => {
      formatAppLog("log", "at utils/websocket.js:43", "收到服务器消息:", res.data);
    });
    socketTask.onClose(() => {
      formatAppLog("log", "at utils/websocket.js:47", "WebSocket 连接已关闭");
      clearInterval(heartBeatInterval);
    });
    socketTask.onError((err) => {
      formatAppLog("error", "at utils/websocket.js:52", "WebSocket 连接出错:", err);
    });
    app.globalData.socketTask = socketTask;
  };
  const getByInit = () => {
    const {
      token
    } = getApp().globalData;
    if (!token) {
      return;
    }
    doGetByInit(token, 0);
  };
  async function doGetByInit(token, index) {
    var res = await uni.request({
      url: "http://127.0.0.1:3001/api/im/message/get_by_init",
      method: "POST",
      header: {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      data: {
        user_con_index: index
      },
      dataType: "string"
    });
    if (res.statusCode === 200) {
      res = JSONbig.parse(res.data);
      formatAppLog("log", "at request/get_by_init.js:28", res);
      if (res.code === 1e3) {
        const conInfos = res.data.cons.map((item) => item.con_info);
        const msgBodies = res.data.cons.flatMap((item) => item.msg_bodies);
        const conValues = conInfos.map((conInfo) => {
          const {
            con_short_id,
            con_id,
            con_type,
            user_con_index,
            badge_count
          } = conInfo;
          const {
            name,
            avatar_uri,
            description,
            notice,
            owner_id,
            create_time,
            status,
            extra: coreExtra,
            member_count
          } = conInfo.con_core_info;
          const {
            min_index,
            top_time_stamp,
            push_status,
            read_index_end,
            read_badge_count,
            extra: settingExtra
          } = conInfo.con_setting_info;
          const extra = `${coreExtra},${settingExtra}`;
          return `(null, ${con_short_id}, '${con_id}', ${con_type}, '${name}', '${avatar_uri}', '${description}', '${notice}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra}', ${member_count}, ${badge_count}, ${read_index_end}, ${read_badge_count}, ${user_con_index})`;
        }).join(",");
        const msgValues = msgBodies.map((msg) => {
          const {
            user_id,
            con_short_id,
            con_id,
            con_type,
            msg_id,
            msg_type,
            msg_content,
            create_time,
            con_index
          } = msg;
          return `(null, ${user_id}, ${con_short_id}, '${con_id}', ${con_type}, ${msg_id}, ${msg_type}, '${msg_content}', ${create_time}, ${con_index})`;
        }).join(",");
        DB.insertConversation(conValues).catch((err) => {
          formatAppLog("error", "at request/get_by_init.js:77", "insertConversation err", err);
        });
        DB.insertMessage(msgValues).catch((err) => {
          formatAppLog("error", "at request/get_by_init.js:80", "insertMessage err", err);
        });
        getApp().globalData.userConIndex = res.data.user_con_index;
        getApp().globalData.userCmdIndex = res.data.user_cmd_index;
        if (res.data.has_more === true) {
          doGetByInit(token, res.data.next_user_con_index);
        }
      } else {
        uni.showToast({
          title: "服务器错误",
          icon: "none"
        });
      }
    } else {
      uni.showToast({
        title: "网络错误",
        icon: "none"
      });
    }
  }
  const checkAuth = async () => {
    const app = getApp();
    const {
      token
    } = app.globalData;
    if (token) {
      return true;
    }
    const localToken = uni.getStorageSync("token");
    if (localToken) {
      app.globalData.token = localToken;
      const res = await uni.request({
        url: "http://127.0.0.1:3000/api/action/user/get_info/",
        method: "GET",
        header: {
          "Authorization": `Bearer ${localToken}`
        }
      });
      if (res.statusCode === 200) {
        if (res.data.code === 1e3) {
          const {
            userId,
            avatar,
            username
          } = res.data;
          app.globalData.userId = BigInt(userId);
          app.globalData.avatar = avatar;
          app.globalData.username = username;
          connectWebSocket();
          getByInit();
          return true;
        } else {
          uni.showToast({
            title: "登录过期",
            icon: "none"
          });
          throw new Error("invaild token");
        }
      } else {
        uni.showToast({
          title: "网络错误",
          icon: "none"
        });
      }
    }
    uni.reLaunch({
      url: "/pages/user/login"
    });
    return false;
  };
  const _sfc_main = {
    onLaunch() {
      const platform = uni.getSystemInfoSync().platform;
      checkAuth();
      this.initRouterGuard();
      if (platform === "android" || platform == "ios") {
        DB.openSqlite();
      }
    },
    methods: {
      initRouterGuard() {
        const routerMethods = ["navigateTo", "redirectTo", "reLaunch", "switchTab"];
        routerMethods.forEach((method) => {
          uni.addInterceptor(method, {
            invoke(args) {
              const noAuthPages = [
                "/pages/user/login",
                "/pages/user/register"
              ];
              if (!noAuthPages.includes(args.url)) {
                return checkAuth().then((hasAuth) => {
                  if (hasAuth) {
                    return args;
                  }
                  return false;
                });
              }
              return args;
            }
          });
        });
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return null;
  }
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "D:/H/Desktop/Violet/uniapp/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
