<template>
	<view class="chat-container">
		<!-- 聊天消息列表 -->
		<scroll-view class="chat-messages" scroll-y="true" :scroll-top="scrollTop" ref="chatMessages">
			<view class="message"
				:class="{ 'message-left': message.user_id!=userId, 'message-right': message.user_id==userId }"
				v-for="(message, index) in messages" :key="index">
				<!-- 对方消息，头像在左 -->
				<template v-if="message.user_id!=userId">
					<view class="avatar" @click="goToUserProfile(message)">
						<image :src="conversation.avatar"></image>
					</view>
					<view class="message-content">
						<view class="bubble">{{ message.msg_content }}</view>
					</view>
				</template>
				<!-- 自己消息，头像在右 -->
				<template v-else>
					<view class="message-content">
						<view class="bubble">{{ message.msg_content }}</view>
					</view>
					<view class="avatar" @click="goToUserProfile(message)">
						<image :src="myAvatar"></image>
					</view>
				</template>
			</view>
		</scroll-view>
		<!-- 输入框和发送按钮，固定在屏幕底部 -->
		<view class="input-bar">
			<input v-model="inputText" placeholder="请输入消息" @confirm="sendMessage" />
			<button @click="sendMessage">发送</button>
		</view>
	</view>
</template>

<script>
	import JSONbig from 'json-bigint';
	import DB from '@/utils/sqlite.js'
	export default {
		data() {
			return {
				userId: getApp().globalData.userId,
				conversation: {
					conShortId: 0,
					conId: '',
					conType: 0,
					name: '',
				},
				conIndex: Number.MAX_VALUE,
				messages: [],
				inputText: '',
				scrollTop: 0,
				myAvatar: '/static/logo.png'
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
			DB.selectMessage(BigInt(this.conversation.conShortId), this.conIndex)
				.then((res) => {
					this.messages = res;
					this.messages.reverse();
				})
				.catch((err) => {
					console.error("selectMessage err", err);
				})
		},
		methods: {
			async sendMessage() {
				if (this.inputText.trim() === '') return;
				const token = getApp().globalData.token;
				const data={
					con_short_id: BigInt(this.conversation.conShortId),
					con_id: this.conversation.conId,
					con_type: this.conversation.conType,
					msg_type: 1,
					msg_content: this.inputText
				}
				const dataJson= JSONbig.stringify(data)
				console.log(dataJson);
				const res = await uni.request({
					url: 'http://127.0.0.1:3001/api/im/message/send',
					method: 'POST',
					header: {
						'content-type': 'application/json',
						'Authorization': `Bearer ${token}`,
					},
					data: dataJson,
				});
				console.log(res);
				if (res.statusCode === 200) {
					if (res.data.code === 1000) {
						this.messages.push({
							user_id: this.userId,
							con_short_id: this.conversation.conShortId,
							con_id: this.conversation.conId,
							con_type: this.conversation.conType,
							msg_type: 1,
							msg_content: this.inputText
						});
						this.inputText = '';
						this.$nextTick(() => {
							this.scrollTop = this.$refs.chatMessages.scrollHeight;
						});
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
					url: `/pages/user/user?id=${message.user_id}&name=${message.name}&avatar=${message.avatar}`
				});
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
		/* 固定顶栏 */
		top: 0;
		left: 0;
		right: 0;
		background-color: white;
		/* 设置背景颜色 */
		z-index: 1;
		/* 设置层级，确保在消息列表之上 */
	}

	.chat-header .name {
		font-weight: bold;
		font-size: 18px;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		margin-top: 10px;
		margin-bottom: 60px;
		/* 为输入栏留出空间 */
		padding-left: 10px;
		/* 统一消息左右间距 */
		padding-right: 10px;
		box-sizing: border-box;
		/* 确保 padding 包含在元素宽度内 */
	}

	.message {
		display: flex;
		margin-bottom: 10px;
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
		/* 头像距离左右两侧的距离相同 */
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
		/* 输入框高度 */
		box-sizing: border-box;
	}

	.input-bar button {
		padding: 0 20px;
		/* 调整按钮内边距 */
		background-color: #0084ff;
		color: white;
		border: none;
		border-radius: 5px;
		height: 40px;
		/* 按钮高度和输入框相同 */
		box-sizing: border-box;
		display: flex;
		/* 使用 flex 布局让文字上下居中 */
		justify-content: center;
		align-items: center;
	}
</style>