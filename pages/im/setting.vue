<template>
	<view class="conversation-settings">
		<!-- 群聊成员区域 -->
		<view class="members-section">
			<view class="members-grid">
				<!-- 显示的成员列表 -->
				<view 
					class="member-item" 
					v-for="(member, index) in displayMembers" 
					:key="member.user_id"
					@click="goToUserProfile(member)"
				>
					<image class="member-avatar" :src="member.avatar || '/static/default-avatar.png'" mode="aspectFill"></image>
					<text class="member-name">{{ member.nick_name || '未命名' }}</text>
				</view>
				
				<!-- 加号按钮 -->
				<view class="member-item add-btn" @click="goToAddMember">
					<view class="add-icon">
						<text class="icon">+</text>
					</view>
					<text class="member-name">添加</text>
				</view>
				
				<!-- 展开/收起按钮（当成员超过20个时显示） -->
				<view 
					class="member-item expand-btn" 
					v-if="members.length > maxDisplay"
					@click="toggleExpand"
				>
					<view class="expand-icon">
						<text class="icon">{{ isExpanded ? '︿' : '﹀' }}</text>
					</view>
					<text class="member-name">{{ isExpanded ? '收起' : '展开' }}</text>
				</view>
			</view>
		</view>
		
		<!-- 群聊信息区域 -->
		<view class="info-section">
			<!-- 群聊名称 -->
			<view class="info-item" @click="editGroupName">
				<text class="info-label">群聊名称</text>
				<view class="info-content">
					<text class="info-value">{{ groupName }}</text>
					<text class="arrow">›</text>
				</view>
			</view>
			
			<!-- 群资料 -->
			<view class="info-item" @click="editGroupDescription">
				<text class="info-label">群资料</text>
				<view class="info-content">
					<text class="info-value">{{ groupDescription || '未设置' }}</text>
					<text class="arrow">›</text>
				</view>
			</view>
			
			<!-- 查找聊天记录 -->
			<view class="info-item" @click="goToSearchMessages">
				<text class="info-label">查找聊天记录</text>
				<view class="info-content">
					<text class="arrow">›</text>
				</view>
			</view>
		</view>
		
		<!-- 退出群聊按钮 -->
		<view class="action-section">
			<button class="quit-btn" @click="quitGroup">退出群聊</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				conversationId: '', // 会话ID
				groupName: '技术交流群', // 群聊名称
				groupDescription: '这是一个技术交流群', // 群资料
				members: [], // 所有成员列表
				isExpanded: false, // 是否展开
				maxDisplay: 19, // 最多显示成员数（留一个位置给加号，如果有展开按钮则是18）
			}
		},
		computed: {
			// 计算要显示的成员列表
			displayMembers() {
				if (this.isExpanded) {
					// 展开状态：显示所有成员
					return this.members;
				} else {
					// 收起状态：最多显示19个（如果超过20个，第20个位置留给展开按钮）
					const limit = this.members.length > 20 ? 18 : 19;
					return this.members.slice(0, limit);
				}
			}
		},
		onLoad(options) {
			// 获取传递的会话ID
			if (options.conversationId) {
				this.conversationId = options.conversationId;
				this.loadGroupInfo();
			}
		},
		methods: {
			// 加载群聊信息
			loadGroupInfo() {
				// 模拟数据，实际应该调用API
				this.members = [
					{ user_id: '1001', nick_name: '张三', avatar: '' },
					{ user_id: '1002', nick_name: '李四', avatar: '' },
					{ user_id: '1003', nick_name: '王五', avatar: '' },
					{ user_id: '1004', nick_name: '赵六', avatar: '' },
					{ user_id: '1005', nick_name: '钱七', avatar: '' },
					// ... 更多成员
				];
				
				// TODO: 调用API获取群聊信息
				// this.getGroupMembers();
			},
			
			// 获取群聊成员列表
			getGroupMembers() {
				// TODO: 实现API调用
				uni.request({
					url: '/api/group/members',
					data: {
						conversationId: this.conversationId
					},
					success: (res) => {
						this.members = res.data.members || [];
					}
				});
			},
			
			// 跳转到用户个人页
			goToUserProfile(member) {
				uni.navigateTo({
					url: `/pages/user/user_profile?userId=${BigInt(member.user_id)}`
				});
			},
			
			// 跳转到添加成员界面
			goToAddMember() {
				uni.navigateTo({
					url: `/pages/group/add_member?conversationId=${this.conversationId}`
				});
			},
			
			// 展开/收起成员列表
			toggleExpand() {
				this.isExpanded = !this.isExpanded;
			},
			
			// 编辑群聊名称
			editGroupName() {
				uni.navigateTo({
					url: `/pages/group/edit_name?conversationId=${this.conversationId}&name=${this.groupName}`
				});
			},
			
			// 编辑群资料
			editGroupDescription() {
				uni.navigateTo({
					url: `/pages/group/edit_description?conversationId=${this.conversationId}&description=${this.groupDescription}`
				});
			},
			
			// 查找聊天记录
			goToSearchMessages() {
				uni.navigateTo({
					url: `/pages/chat/search_messages?conversationId=${this.conversationId}`
				});
			},
			
			// 退出群聊
			quitGroup() {
				uni.showModal({
					title: '提示',
					content: '确定要退出该群聊吗？',
					success: (res) => {
						if (res.confirm) {
							// TODO: 调用退出群聊API
							this.performQuitGroup();
						}
					}
				});
			},
			
			// 执行退出群聊操作
			performQuitGroup() {
				uni.showLoading({ title: '退出中...' });
				
				// TODO: 调用API
				uni.request({
					url: '/api/group/quit',
					method: 'POST',
					data: {
						conversationId: this.conversationId
					},
					success: (res) => {
						uni.hideLoading();
						uni.showToast({
							title: '已退出群聊',
							icon: 'success'
						});
						
						// 返回上一页或首页
						setTimeout(() => {
							uni.navigateBack({
								delta: 2 // 返回到会话列表
							});
						}, 1500);
					},
					fail: (err) => {
						uni.hideLoading();
						uni.showToast({
							title: '退出失败',
							icon: 'none'
						});
					}
				});
			}
		}
	}
</script>

<style scoped>
	.conversation-settings {
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	/* 成员区域 */
	.members-section {
		background-color: #ffffff;
		padding: 20rpx 30rpx;
		margin-bottom: 20rpx;
	}
	
	.members-grid {
		display: flex;
		flex-wrap: wrap;
	}
	
	.member-item {
		width: 20%; /* 一行5个 */
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.member-avatar {
		width: 100rpx;
		height: 100rpx;
		border-radius: 10rpx;
		background-color: #f0f0f0;
	}
	
	.member-name {
		font-size: 24rpx;
		color: #333;
		margin-top: 10rpx;
		text-align: center;
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0 5rpx;
	}
	
	/* 加号按钮 */
	.add-btn .add-icon,
	.expand-btn .expand-icon {
		width: 100rpx;
		height: 100rpx;
		border-radius: 10rpx;
		border: 2rpx dashed #ccc;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #fafafa;
	}
	
	.add-icon .icon,
	.expand-icon .icon {
		font-size: 50rpx;
		color: #999;
		font-weight: 300;
	}
	
	/* 信息区域 */
	.info-section {
		background-color: #ffffff;
		margin-bottom: 20rpx;
	}
	
	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.info-item:last-child {
		border-bottom: none;
	}
	
	.info-label {
		font-size: 30rpx;
		color: #333;
	}
	
	.info-content {
		display: flex;
		align-items: center;
		max-width: 60%;
	}
	
	.info-value {
		font-size: 28rpx;
		color: #999;
		margin-right: 10rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	.arrow {
		font-size: 40rpx;
		color: #ccc;
		font-weight: 300;
	}
	
	/* 操作区域 */
	.action-section {
		padding: 30rpx;
	}
	
	.quit-btn {
		width: 100%;
		height: 90rpx;
		line-height: 90rpx;
		background-color: #ffffff;
		color: #ff4444;
		font-size: 32rpx;
		border-radius: 10rpx;
		border: none;
	}
	
	.quit-btn::after {
		border: none;
	}
</style>