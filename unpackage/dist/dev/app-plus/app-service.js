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
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
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
                    read_badge_count INTEGER,
                    read_index_end INTEGER,
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
    const sql = `INSERT INTO ${dbTable} VALUES ${data}`;
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
    const sql = `SELECT * FROM ${dbTable} WHERE con_short_id = ${conShortId} AND con_index < ${index} ORDER BY con_index DESC LIMIT 20`;
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
        conIndex: getApp().globalData.userConIndex,
        conversationList: []
      };
    },
    onLoad() {
      DB.selectConversation(this.conIndex).then((res) => {
        this.conversationList = res;
      }).catch((err) => {
        formatAppLog("error", "at pages/im/home.vue:43", "selectConversation err, err = ", error);
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
          url: `/pages/im/conversation?id=${conversation.con_short_id}&name=${conversation.name}&avatar=${conversation.avatar}`
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
  const _sfc_main$9 = {
    data() {
      return {
        chatTarget: {
          id: null,
          name: "",
          avatar: "",
          followers: 100,
          following: 50
        },
        messages: [],
        inputText: "",
        scrollTop: 0,
        myAvatar: "/static/logo.png"
      };
    },
    onLoad(options) {
      this.chatTarget.id = options.id;
      this.chatTarget.name = options.name;
      this.chatTarget.avatar = options.avatar;
      uni.setNavigationBarTitle({
        title: this.chatTarget.name
      });
      this.loadMessages();
    },
    methods: {
      loadMessages() {
        this.messages = [
          {
            isSelf: false,
            content: `你好，我是 ${this.chatTarget.name}`
          },
          {
            isSelf: true,
            content: "你好呀"
          }
        ];
        this.$nextTick(() => {
          this.scrollTop = this.$refs.chatMessages.scrollHeight;
        });
      },
      sendMessage() {
        if (this.inputText.trim() === "")
          return;
        this.messages.push({
          isSelf: true,
          content: this.inputText
        });
        this.inputText = "";
        this.$nextTick(() => {
          this.scrollTop = this.$refs.chatMessages.scrollHeight;
        });
        const token = getApp().globalData.token;
        const con_id = "1";
        uni.request({
          url: "http://127.0.0.1:3001/api/im/message/send",
          method: "POST",
          header: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
          },
          data: {
            con_id,
            msg_type: 1,
            msg_content: this.searchKeyword
          },
          success: (res) => {
            if (res.statusCode === 200)
              ;
            else {
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
      goToUserProfile() {
        uni.navigateTo({
          url: `/pages/user/user?id=${this.chatTarget.id}&name=${this.chatTarget.name}&avatar=${this.chatTarget.avatar}&followers=${this.chatTarget.followers}&following=${this.chatTarget.following}`
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
          vue.renderList($data.messages, (item, index) => {
            return vue.openBlock(), vue.createElementBlock(
              "view",
              {
                class: vue.normalizeClass(["message", { "message-left": item.isSelf === false, "message-right": item.isSelf === true }]),
                key: index
              },
              [
                vue.createCommentVNode(" 对方消息，头像在左 "),
                !item.isSelf ? (vue.openBlock(), vue.createElementBlock(
                  vue.Fragment,
                  { key: 0 },
                  [
                    vue.createElementVNode("view", {
                      class: "avatar",
                      onClick: _cache[0] || (_cache[0] = (...args) => $options.goToUserProfile && $options.goToUserProfile(...args))
                    }, [
                      vue.createElementVNode("image", {
                        src: $data.chatTarget.avatar
                      }, null, 8, ["src"])
                    ]),
                    vue.createElementVNode("view", { class: "message-content" }, [
                      vue.createElementVNode(
                        "view",
                        { class: "bubble" },
                        vue.toDisplayString(item.content),
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
                        vue.toDisplayString(item.content),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", {
                      class: "avatar",
                      onClick: _cache[1] || (_cache[1] = (...args) => $options.goToUserProfile && $options.goToUserProfile(...args))
                    }, [
                      vue.createElementVNode("image", { src: $data.myAvatar }, null, 8, ["src"])
                    ])
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
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.inputText = $event),
            placeholder: "请输入消息",
            onConfirm: _cache[3] || (_cache[3] = (...args) => $options.sendMessage && $options.sendMessage(...args))
          },
          null,
          544
          /* NEED_HYDRATION, NEED_PATCH */
        ), [
          [vue.vModelText, $data.inputText]
        ]),
        vue.createElementVNode("button", {
          onClick: _cache[4] || (_cache[4] = (...args) => $options.sendMessage && $options.sendMessage(...args))
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
    const res = await uni.request({
      url: "http://127.0.0.1:3001/api/im/message/get_by_init",
      method: "POST",
      header: {
        "content-type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      data: {
        user_con_index: index
      }
    });
    if (res.statusCode === 200) {
      formatAppLog("log", "at request/get_by_init.js:25", res);
      if (res.data.code === 1e3) {
        const conInfos = res.data.data.cons.map((item) => item.con_info);
        const values = conInfos.map((conInfo) => {
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
          return `(null, ${con_short_id}, '${con_id}', ${con_type}, '${name}', '${avatar_uri}', '${description}', '${notice}', ${owner_id}, ${create_time}, ${status}, ${min_index}, ${top_time_stamp}, ${push_status}, '${extra}', ${member_count}, ${badge_count}, ${read_badge_count}, ${read_index_end}, ${user_con_index})`;
        }).join(",");
        DB.insertConversation(values).catch((err) => {
          formatAppLog("error", "at request/get_by_init.js:59", "insertConversation err. err = ", err);
        });
        getApp().globalData.userConIndex = res.data.data.user_con_index;
        getApp().globalData.userCmdIndex = res.data.data.user_cmd_index;
        if (res.data.data.has_more === true) {
          doGetByInit(token, res.data.data.next_user_con_index);
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
      try {
        const res = await uni.request({
          url: "http://127.0.0.1:3000/api/action/user/get_info/",
          method: "GET",
          header: {
            "Authorization": `Bearer ${localToken}`
          }
        });
        if (res.statusCode === 200) {
          if (res.data.message === "success") {
            const {
              userId,
              avatar,
              username
            } = res.data;
            app.globalData.userId = userId;
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
      } catch (error2) {
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
