<template>
	<view class="conversation-container">
		<!-- 搜索按钮 -->
		<button @click="goToSearchPage">搜索</button>
		<!-- 会话列表 -->
		<view class="conversation-list">
			<view class="conversation-item" v-for="(conversation, index) in conversationList" :key="index"
				@click="openChat(conversation)">
				<!-- 头像 -->
				<view class="avatar">
					<image :src="conversation.avatar"></image>
				</view>
				<!-- 会话信息 -->
				<view class="conversation-info">
					<!-- 对方名称 -->
					<view class="name">{{ conversation.name }}</view>
					<!-- 最新消息 -->
					<view class="last-message">{{ conversation.last_message }}</view>
				</view>
				<!-- 未读消息数量 -->
				<view class="unread-count" v-if="conversation.badge_count-conversation.read_badge_count > 0">
					{{ conversation.badge_count-conversation.read_badge_count }}
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import DB from '@/utils/sqlite.js'
	export default {
		data() {
			return {
				userConIndex: getApp().globalData.userConIndex,
				conversationList: [],
			};
		},
		onLoad() {
			DB.selectConversation(this.userConIndex)
				.then((res) => {
					this.conversationList = res;
				})
				.catch((err) => {
					console.error('selectConversation err', err);
				})
			uni.$on('normal_message', (data) => {
				// let index=-1;
				// for (let i = 0; i < this.conversationList.length; i++) {
				// 	if (this.conversationList[i].con_short_id == data.msg_body.con_short_id) {
				// 		index = i;
				// 		break;
				// 	}
				// }
				// if (index !== -1) {
				// 	const conversation = this.conversationList.splice(index, 1)[0];
				// }
				this.userConIndex=data.user_con_index;
				DB.selectConversation(this.userConIndex)
					.then((res) => {
						this.conversationList = res;
					})
					.catch((err) => {
						console.error('selectConversation err', err);
					})
			});
		},
		onUnload() {
			uni.$off('message');
		},
		methods: {
			// 跳转到搜索页面的方法
			goToSearchPage() {
				uni.navigateTo({
					url: '/pages/im/search'
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
</script>

<style scoped>
	.conversation-container {
		padding: 10px;
	}

	.conversation-list {
		display: flex;
		flex-direction: column;
	}

	.conversation-item {
		display: flex;
		align-items: center;
		padding: 10px;
		border-bottom: 1px solid #eee;
		cursor: pointer;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		overflow: hidden;
		margin-right: 10px;
	}

	.avatar image {
		width: 100%;
		height: 100%;
	}

	.conversation-info {
		flex: 1;
	}

	.name {
		font-weight: bold;
		margin-bottom: 5px;
	}

	.last-message {
		color: #666;
		font-size: 14px;
	}

	.unread-count {
		background-color: #ff0000;
		color: white;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 50%;
	}
</style>