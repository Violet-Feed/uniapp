<template>
	<view class="chat-container">
		<scroll-view class="chat-messages" scroll-y="true" :scroll-top="scrollTop" @scroll="onScroll">
			<view class="messages">
				<view v-for="(message, index) in messages" :key="index">
					<view class="message-time" v-if="shouldShowTime(index)">
						{{ formatTime(message.create_time) }}
					</view>
					<view class="message"
						:class="{ 'message-left': message.user_id!=userId, 'message-right': message.user_id==userId }">
						<view class="loading-spinner" v-if="message.status === -1"></view>
						<template v-if="message.user_id!=userId">
							<view class="avatar" @click="goToUserProfile(message)">
								<image :src="conversation.avatar_uri"></image>
							</view>
							<view class="message-content">
								<view class="bubble">{{ message.msg_content }}</view>
							</view>
						</template>
						<template v-else>
							<view class="message-content">
								<view class="bubble">{{ message.msg_content }}</view>
							</view>
							<view class="avatar" @click="goToUserProfile(message)">
								<image :src="myAvatar"></image>
							</view>
						</template>
					</view>
				</view>
			</view>
		</scroll-view>
		<view class="input-bar">
			<input v-model="inputText" placeholder="请输入消息" @confirm="sendMessage" />
			<button @click="sendMessage">发送</button>
		</view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	import DB from '@/utils/sqlite.js'
	import {
		getByConversation
	} from '@/request/get_by_conversation';

	export default {
		data() {
			return {
				userId: getApp().globalData.userId,
				conversation: {},
				conIndex: Number.MAX_SAFE_INTEGER,
				messages: [],
				inputText: '',
				scrollTop: 0,
				hasMore: true,
				myAvatar: getApp().globalData.avatar
			};
		},
		onLoad(options) {
			this.conversation.con_short_id = 0;
			this.conversation.con_id = options.conId;
			this.conversation.con_type = Number(options.conType);
			uni.setNavigationBarTitle({
				title: options.name
			});
			DB.selectConversation(options.conId)
				.then((res) => {
					if (res.length > 0) {
						this.conversation = res[0];
					}
					return DB.pullMessage(this.conversation.con_id, this.conIndex);
				})
				.then((res) => {
					res.reverse();
					this.messages = res;
					if (this.messages.length > 0) {
						this.conIndex = this.messages[0].con_index - 1;
					}
					if (this.conIndex <= this.conversation.min_index) {
						this.hasMore = false;
					} else if (this.messages.length < 20) {
						return getByConversation(this.conversation.con_short_id, this.conIndex, 20 - this.messages
							.length);
					}
				})
				.then((res) => {
					if (res && res.length > 0) {
						this.messages = res.concat(this.messages);
						this.conIndex = this.messages[0].con_index - 1;
					}
					if (!res || res.length === 0 || this.conIndex <= this.conversation.min_index) {
						this.hasMore = false;
					}
					setTimeout(() => {
						this.scrollToBottom();
					}, 100);
				})
				.catch((err) => {
					console.error("pullMessage err", err);
				});

			uni.$on('normal_message', (data) => {
				if (this.conversation.con_id == data.msg_body.con_id) {
					//TODO:device_id
					if (this.userId == data.msg_body.user_id) {
						for (let i = this.messages.length - 1; i >= 0; i--) {
							if (this.messages[i].client_msg_id == data.msg_body.client_msg_id) {
								this.messages[i].msg_id = data.msg_body.msg_id;
								this.messages[i].con_index = data.msg_body.con_index;
								this.messages[i].status = 0;
								break;
							}
							if(this.messages[i].con_index&&this.messages[i].con_index<data.msg_body.con_index){
								this.messages.push(data.msg_body);
								break;
							}
						}
					} else {
						this.messages.push(data.msg_body);
					}
				}
			});
		},
		onUnload() {
			uni.$off('message');
		},
		methods: {
			async sendMessage() {
				if (this.inputText.trim() === '') return;
				const token = getApp().globalData.token;
				const clientMsgId = getApp().globalData.msgIdGenerator.nextId();
				const data = {
					con_short_id: BigInt(this.conversation.con_short_id),
					con_id: this.conversation.con_id,
					con_type: this.conversation.con_type,
					client_msg_id: clientMsgId,
					msg_type: 1,
					msg_content: this.inputText
				};
				const dataJson = JSONbig.stringify(data);
				console.log(dataJson);
				const res = await uni.request({
					url: 'http://127.0.0.1:3000/api/im/send_message',
					method: 'POST',
					header: {
						'content-type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					data: dataJson
				});
				if (res.statusCode === 200) {
					console.log(res.data);
					if (res.data.code === 1000) {
						this.messages.push({
							user_id: this.userId,
							con_short_id: this.conversation.con_short_id,
							con_id: this.conversation.con_id,
							con_type: this.conversation.con_type,
							client_msg_id: clientMsgId,
							msg_type: 1,
							msg_content: this.inputText,
							create_time: Date.now()/1000,
							status: -1
						});
						this.inputText = '';
						this.scrollToBottom();
					} else {
						uni.showToast({
							title: '服务器错误',
							icon: 'none'
						});
					}
				} else {
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				}
			},
			goToUserProfile(message) {
				uni.navigateTo({
					url: `/pages/user/user_profile?userId=${BigInt(message.user_id)}`
				});
			},
			scrollToBottom() {
				this.$nextTick(() => {
					const query = uni.createSelectorQuery();
					query.select('.chat-messages').boundingClientRect();
					query.select('.messages').boundingClientRect();
					query.exec(res => {
						const scrollViewHeight = res[0].height;
						const scrollContentHeight = res[1].height;
						if (scrollContentHeight > scrollViewHeight) {
							this.scrollTop = scrollContentHeight - scrollViewHeight;
						}
					});
				});
			},
			onScroll(e) {
				if (e.detail.scrollTop === 0 && this.hasMore) {
					DB.pullMessage(this.conversation.con_id, this.conIndex)
						.then((res) => {
							res.reverse();
							if (res.length > 0) {
								if (this.conIndex != res[res.length - 1].con_index) {
									console.error("TODO:getByConversation");
								}
								this.messages = res.concat(this.messages);
								if (this.messages.length > 0) {
									this.conIndex = this.messages[0].con_index - 1;
								}
							}
							if (this.conIndex <= this.conversation.min_index) {
								this.hasMore = false;
							} else if (res.length < 20) {
								return getByConversation(this.conversation.con_short_id, this.conIndex, 20 - res
									.length);
							}
						})
						.then((res) => {
							if (res && res.length > 0) {
								this.messages = res.concat(this.messages);
								this.conIndex = this.messages[0].con_index - 1;
							}
							if (!res || res.length === 0 || this.conIndex <= this.conversation.min_index) {
								this.hasMore = false;
							}
						})
						.catch((err) => {
							console.error("pullMessage err", err);
						});
				}
			},
			formatTime(timestamp) {
				const date = new Date(timestamp * 1000);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1);
				const day = String(date.getDate());
				const hour = String(date.getHours()).padStart(2, '0');
				const minute = String(date.getMinutes()).padStart(2, '0');
				return `${year}年${month}月${day}日 ${hour}:${minute}`;
			},
			shouldShowTime(index) {
				if (index === 0) {
					return true;
				}
				const currentTime = this.messages[index].create_time;
				const prevTime = this.messages[index - 1].create_time;
				const timeDiff = (currentTime - prevTime) / 60;
				return timeDiff > 5;
			}
		}
	};
</script>

<style scoped>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		position: relative;
	}

	.chat-header {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px;
		border-bottom: 1px solid #eee;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background-color: white;
		z-index: 1;
	}

	.chat-header .name {
		font-weight: bold;
		font-size: 18px;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		margin-top: 10px;
		margin-bottom: 70px;
		padding-left: 10px;
		padding-right: 10px;
		box-sizing: border-box;
	}

	.message {
		display: flex;
		margin-bottom: 10px;
		align-items: center;
	}

	.message-left {
		justify-content: flex-start;
	}

	.message-right {
		justify-content: flex-end;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		margin: 0 10px;
	}

	.avatar image {
		width: 100%;
		height: 100%;
	}

	.message-content {
		max-width: 70%;
	}

	.bubble {
		padding: 10px;
		border-radius: 10px;
		background-color: #f0f0f0;
	}

	.message-right .bubble {
		background-color: #0084ff;
		color: white;
	}

	.input-bar {
		display: flex;
		padding: 10px;
		border-top: 1px solid #ccc;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: white;
		box-sizing: border-box;
	}

	.input-bar input {
		flex: 1;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 5px;
		margin-right: 10px;
		height: 40px;
		box-sizing: border-box;
	}

	.input-bar button {
		padding: 0 20px;
		background-color: #0084ff;
		color: white;
		border: none;
		border-radius: 5px;
		height: 40px;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.loading-spinner {
		border: 2px solid rgba(0, 0, 0, 0.3);
		border-left-color: rgba(0, 0, 0, 0.6);
		border-radius: 50%;
		width: 12px;
		height: 12px;
		animation: spin 1s linear infinite;
		margin-right: 10px;
		align-self: center;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.message-time {
		text-align: center;
		margin-bottom: 5px;
		color: #999;
		font-size: 12px;
	}
</style>