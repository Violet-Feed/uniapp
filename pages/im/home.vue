<template>
	<view class="conversation-container">
		<button @click="goToSearchPage">搜索</button>
		<view class="conversation-list">
			<view class="conversation-item" v-for="(conversation, index) in conversationList" :key="index"
				@click="openChat(conversation)">
				<view class="avatar">
					<image :src="conversation.avatar_uri"></image>
				</view>
				<view class="conversation-info">
					<view class="name">{{ conversation.name }}</view>
					<view class="last-message">{{ conversation.last_message }}</view>
				</view>
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
			DB.pullConversation(this.userConIndex)
				.then((res) => {
					this.conversationList = res;
				})
				.catch((err) => {
					console.error('pullConversation err', err);
				})
			uni.$on('normal_message', (data) => {
				this.userConIndex=data.user_con_index;
				let index=-1;
				for (let i = 0; i < this.conversationList.length; i++) {
					if (this.conversationList[i].con_short_id == data.msg_body.con_short_id) {
						this.conversationList[i].badge_count=data.badge_count;
						this.conversationList[i].user_con_index=data.user_con_index;
						this.conversationList[i].last_message=data.msg_body.msg_content;
						index = i;
						break;
					}
				}
				if (index !== -1) {
					const conversation = this.conversationList.splice(index, 1)[0];
					this.conversationList.unshift(conversation);
				}
			});
		},
		onUnload() {
			uni.$off('message');
		},
		methods: {
			goToSearchPage() {
				uni.navigateTo({
					url: '/pages/im/search'
				});
			},
			openChat(conversation) {
				uni.navigateTo({
					url: `/pages/im/conversation?conId=${conversation.con_id}&name=${conversation.name}&conType=${conversation.con_type}`
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