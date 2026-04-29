<template>
	<view class="conversation-settings">
		<!-- 顶部导航栏 -->
		<view class="setting-header">
			<view class="header-left" @click="goBack">
				<text class="back-icon">←</text>
			</view>
			<view class="header-center">
				<text class="header-title">群聊设置</text>
			</view>
			<view class="header-right"></view>
		</view>

		<!-- 群聊成员区域 -->
		<view class="members-section">
			<view class="members-grid">
				<view
					class="member-item"
					v-for="(member, index) in displayMembers"
					:key="String(member.user_id || index)"
					@click="goToUserProfile(member)"
				>
					<image class="member-avatar" :src="member.avatar_uri || '/static/user_avatar.png'" mode="aspectFill"></image>
					<text class="member-name">{{ member.nick_name || '未命名' }}</text>
				</view>

				<view class="member-item add-btn" @click="goToAddMember">
					<view class="add-icon">
						<text class="icon">+</text>
					</view>
					<text class="member-name">添加</text>
				</view>

				<view class="member-item remove-btn" v-if="isGroupOwner" @click="goToRemoveMember">
					<view class="remove-icon">
						<text class="icon">−</text>
					</view>
					<text class="member-name">移除</text>
				</view>

				<view class="member-item expand-btn" v-if="members.length > currentMaxDisplay" @click="toggleExpand">
					<view class="expand-icon">
						<text class="icon">{{ isExpanded ? '︿' : '﹀' }}</text>
					</view>
					<text class="member-name">{{ isExpanded ? '收起' : '展开' }}</text>
				</view>
			</view>
		</view>

		<!-- 群聊信息区域 -->
		<view class="info-section">
			<view class="info-item" @click="chooseGroupAvatar">
				<text class="info-label">群头像</text>
				<view class="info-content">
					<image class="group-avatar" :src="groupAvatar || '/static/group_avatar.png'" mode="aspectFill"></image>
					<text class="arrow">›</text>
				</view>
			</view>

			<view class="info-item" @click="openEditDialog('name')">
				<text class="info-label">群聊名称</text>
				<view class="info-content">
					<text class="info-value">{{ groupName || '未设置' }}</text>
					<text class="arrow">›</text>
				</view>
			</view>

			<view class="info-item" @click="openDescriptionViewer">
				<text class="info-label">群聊资料</text>
				<view class="info-content">
					<text class="info-value">{{ groupDescription || '未设置' }}</text>
					<text class="arrow">›</text>
				</view>
			</view>

			<view class="info-item" @click="goToAiMember">
				<text class="info-label">群聊AI</text>
				<view class="info-content">
					<text class="arrow">›</text>
				</view>
			</view>

			<view class="info-item" @click="goToSearchMessages">
				<text class="info-label">查找聊天记录</text>
				<view class="info-content">
					<text class="arrow">›</text>
				</view>
			</view>

			<view class="info-item" @click="openEditDialog('selfNickName')">
				<text class="info-label">我在群里的昵称</text>
				<view class="info-content">
					<text class="info-value">{{ selfNickName || '未设置' }}</text>
					<text class="arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 退出群聊按钮 -->
		<view class="action-section">
			<button class="quit-btn" @click="quitGroup">退出群聊</button>
		</view>

		<!-- 群资料详情弹窗 -->
		<view class="desc-mask" v-if="showDescriptionPopup" @click="closeDescriptionViewer">
			<view class="desc-popup" @click.stop>
				<view class="desc-title">群聊资料</view>
				<scroll-view class="desc-scroll" scroll-y>
					<text class="desc-content">{{ groupDescription || '暂无群资料' }}</text>
				</scroll-view>
				<view class="desc-actions">
					<view class="desc-btn desc-cancel-btn" @click="closeDescriptionViewer">关闭</view>
					<view class="desc-btn desc-edit-btn" @click="editDescriptionFromViewer">修改</view>
				</view>
			</view>
		</view>

		<!-- 编辑弹窗 -->
		<view class="edit-mask" v-if="showEditPopup" @click="closeEditPopup">
			<view class="edit-popup" :class="{ 'edit-popup-large': editField === 'description' }" @click.stop>
				<view class="edit-title">{{ editTitle }}</view>
				<textarea
					v-if="editField === 'description'"
					class="edit-textarea"
					v-model="editValue"
					:placeholder="editPlaceholder"
					maxlength="-1"
				/>
				<input
					v-else
					class="edit-input"
					v-model="editValue"
					:placeholder="editPlaceholder"
				/>
				<view class="edit-actions">
					<view class="edit-btn cancel-btn" @click="closeEditPopup">取消</view>
					<view class="edit-btn confirm-btn" @click="confirmEdit">确定</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import DB from '@/utils/sqlite.js';
import { uploadImage } from '@/request/common.js';
import {
	updateConversationCore,
	updateConversationMember,
	removeConversationMember
} from '@/request/im.js';
import { getMemberInfosBySendersEnsure } from '@/utils/member_info';

export default {
	data() {
		return {
			conId: '',
			conShortId: '',
			conType: 0,
			groupName: '',
			groupAvatar: '',
			groupDescription: '',
			selfNickName: '',
			selfPrivilege: 0,
			members: [],
			isExpanded: false,
			maxDisplay: 19,
			showDescriptionPopup: false,
			showEditPopup: false,
			editField: '',
			editTitle: '',
			editValue: '',
			editPlaceholder: '',
			updating: false
		};
	},

	computed: {
		isGroupOwner() {
			return Number(this.selfPrivilege) === 1;
		},

		currentMaxDisplay() {
			return this.isGroupOwner ? 18 : 19;
		},

		displayMembers() {
			if (this.isExpanded) {
				return this.members;
			}

			const limit = this.isGroupOwner ? 18 : 19;
			return this.members.slice(0, limit);
		}
	},

	async onLoad(options) {
		this.conId = options.conId || '';
		this.conType = Number(options.conType || 0);
		if (!this.conId) return;
		await this.refreshPage();
	},

	async onPullDownRefresh() {
		await this.refreshPage();
	},

	methods: {
		async refreshPage() {
			try {
				const res = await DB.getConversationById(this.conId);
				const conversation = Array.isArray(res) ? res[0] : res;
				if (conversation) {
					this.conShortId = conversation.con_short_id ? String(conversation.con_short_id) : '';
					this.groupName = conversation.name || '';
					this.groupAvatar = conversation.avatar_uri || '';
					this.groupDescription = conversation.description || '';
				}

				const memberRes = await DB.pullUserMembers(this.conId);
				this.members = Array.isArray(memberRes) ? memberRes : [];

				const userId = getApp().globalData.userId;
				const selfInfos = await getMemberInfosBySendersEnsure(this.conId, this.conShortId, [
					{ sender_type: 1, sender_id: userId }
				]);

				if (Array.isArray(selfInfos) && selfInfos.length > 0) {
					this.selfNickName = selfInfos[0].nick_name || '';
					this.selfPrivilege = Number(selfInfos[0].privilege || 0);
				} else {
					this.selfNickName = '';
					this.selfPrivilege = 0;
				}
			} catch (err) {
				console.error('refreshPage failed:', err);
			} finally {
				uni.stopPullDownRefresh();
			}
		},

		goBack() {
			uni.navigateBack();
		},

		goToUserProfile(member) {
			if (!member.user_id) return;
			const userId = getApp().globalData.userId;
			if (String(member.user_id) === String(userId)) {
				uni.navigateTo({
					url: '/pages/user/my_profile_copy'
				});
				return;
			}
			uni.navigateTo({
				url: `/pages/user/user_profile?userId=${BigInt(member.user_id)}`
			});
		},

		goToAddMember() {
			uni.navigateTo({
				url: `/pages/im/add_member?conId=${this.conId}&conShortId=${this.conShortId}`
			});
		},

		goToRemoveMember() {
			if (!this.isGroupOwner) return;
			uni.navigateTo({
				url: `/pages/im/remove_member?conId=${this.conId}&conShortId=${this.conShortId}`
			});
		},

		toggleExpand() {
			this.isExpanded = !this.isExpanded;
		},

		chooseGroupAvatar() {
			if (this.updating) return;

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async res => {
					const filePath = res?.tempFilePaths?.[0] || '';
					if (!filePath) return;
					await this.updateGroupAvatar(filePath);
				}
			});
		},

		async updateGroupAvatar(filePath) {
			if (!this.conShortId || this.updating) return;

			this.updating = true;
			try {
				const uploadRes = await uploadImage(filePath, 'conv_avatar');
				const sourceUrl = uploadRes?.source_url || uploadRes?.sourceUrl || uploadRes?.url || '';

				if (!sourceUrl) {
					uni.showToast({
						title: '上传失败',
						icon: 'none'
					});
					return;
				}

				const ok = await updateConversationCore({
					conShortId: this.conShortId,
					type: 'avatarUri',
					value: sourceUrl
				});

				if (!ok) return;

				this.groupAvatar = sourceUrl;

				uni.showToast({
					title: '修改成功',
					icon: 'success'
				});
			} catch (err) {
				console.error('updateGroupAvatar failed:', err);
				uni.showToast({
					title: '修改失败',
					icon: 'none'
				});
			} finally {
				this.updating = false;
			}
		},

		openDescriptionViewer() {
			this.showDescriptionPopup = true;
		},

		closeDescriptionViewer() {
			this.showDescriptionPopup = false;
		},

		editDescriptionFromViewer() {
			this.closeDescriptionViewer();
			this.openEditDialog('description');
		},

		openEditDialog(field) {
			this.editField = field;
			if (field === 'name') {
				this.editTitle = '修改群聊名称';
				this.editValue = this.groupName || '';
				this.editPlaceholder = '请输入群聊名称';
			} else if (field === 'description') {
				this.editTitle = '修改群聊资料';
				this.editValue = this.groupDescription || '';
				this.editPlaceholder = '请输入群聊资料';
			} else if (field === 'selfNickName') {
				this.editTitle = '修改我在群里的昵称';
				this.editValue = this.selfNickName || '';
				this.editPlaceholder = '请输入群内昵称';
			}
			this.showEditPopup = true;
		},

		closeEditPopup() {
			this.showEditPopup = false;
			this.editField = '';
			this.editTitle = '';
			this.editValue = '';
			this.editPlaceholder = '';
		},

		async confirmEdit() {
			const value = (this.editValue || '').trim();
			if (!value) {
				uni.showToast({
					title: '内容不能为空',
					icon: 'none'
				});
				return;
			}

			if (!this.conShortId || this.updating) return;

			this.updating = true;
			try {
				let ok = false;

				if (this.editField === 'name') {
					ok = await updateConversationCore({
						conShortId: this.conShortId,
						type: 'name',
						value
					});

					if (ok) {
						this.groupName = value;
					}
				} else if (this.editField === 'description') {
					ok = await updateConversationCore({
						conShortId: this.conShortId,
						type: 'description',
						value
					});

					if (ok) {
						this.groupDescription = value;
					}
				} else if (this.editField === 'selfNickName') {
					ok = await updateConversationMember({
						conShortId: this.conShortId,
						type: 'nickname',
						value
					});

					if (ok) {
						this.selfNickName = value;
						this.members = this.members.map(member => {
							const userId = getApp().globalData.userId;
							if (String(member.user_id) === String(userId)) {
								return { ...member, nick_name: value };
							}
							return member;
						});
					}
				}

				if (!ok) return;

				this.closeEditPopup();
				uni.showToast({
					title: '修改成功',
					icon: 'success'
				});
			} catch (err) {
				console.error('confirmEdit failed:', err);
				uni.showToast({
					title: '修改失败',
					icon: 'none'
				});
			} finally {
				this.updating = false;
			}
		},

		goToAiMember() {
			uni.navigateTo({
				url: `/pages/agent/agent_member?conId=${this.conId}`
			});
		},

		goToSearchMessages() {
			uni.navigateTo({
				url: `/pages/im/search_messages?conId=${this.conId}&conType=${this.conType}`
			});
		},

		quitGroup() {
			uni.showModal({
				title: '提示',
				content: '确定要退出该群聊吗？',
				confirmText: '退出',
				confirmColor: '#ff4444',
				success: res => {
					if (res.confirm) {
						this.performQuitGroup();
					}
				}
			});
		},

		async performQuitGroup() {
			if (!this.conShortId || this.updating) return;

			const userId = getApp().globalData.userId;
			if (!userId) return;

			this.updating = true;
			try {
				const ok = await removeConversationMember({
					conShortId: this.conShortId,
					member: userId
				});

				if (!ok) return;


				uni.showToast({
					title: '已退出群聊',
					icon: 'success'
				});

				setTimeout(() => {
					uni.navigateBack({
						delta: 2
					});
				}, 300);
			} catch (err) {
				console.error('performQuitGroup failed:', err);
				uni.showToast({
					title: '退出失败',
					icon: 'none'
				});
			} finally {
				this.updating = false;
			}
		}
	}
};
</script>

<style scoped>
.conversation-settings {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.setting-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 56px;
	background: #fff;
	border-bottom: 1px solid #e5e5e5;
	padding: 0 16px;
}

.header-left,
.header-right {
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.back-icon {
	font-size: 24px;
	color: #333;
	font-weight: 500;
}

.header-center {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.header-title {
	font-size: 17px;
	font-weight: 600;
	color: #333;
}

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
	width: 20%;
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

.add-btn .add-icon,
.remove-btn .remove-icon,
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
.remove-icon .icon,
.expand-icon .icon {
	font-size: 50rpx;
	color: #999;
	font-weight: 300;
}

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

.group-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 12rpx;
	background-color: #f0f0f0;
	margin-right: 10rpx;
}

.arrow {
	font-size: 40rpx;
	color: #ccc;
	font-weight: 300;
}

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

.desc-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 998;
}

.desc-popup {
	width: 660rpx;
	max-height: 78vh;
	background: #fff;
	border-radius: 20rpx;
	padding: 36rpx 30rpx 24rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.desc-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	text-align: center;
	margin-bottom: 24rpx;
	flex-shrink: 0;
}

.desc-scroll {
	max-height: 52vh;
	background: #f7f8fa;
	border-radius: 14rpx;
	padding: 24rpx;
	box-sizing: border-box;
}

.desc-content {
	font-size: 28rpx;
	line-height: 1.7;
	color: #333;
	word-break: break-word;
	white-space: pre-wrap;
}

.desc-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: 24rpx;
	flex-shrink: 0;
}

.desc-btn {
	font-size: 28rpx;
	padding: 14rpx 26rpx;
	border-radius: 10rpx;
	margin-left: 20rpx;
}

.desc-cancel-btn {
	color: #666;
	background: #f2f3f5;
}

.desc-edit-btn {
	color: #fff;
	background: #667eea;
}

.edit-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.edit-popup {
	width: 620rpx;
	background: #fff;
	border-radius: 20rpx;
	padding: 36rpx 30rpx 24rpx;
	box-sizing: border-box;
}

.edit-popup-large {
	width: 660rpx;
	max-height: 78vh;
	display: flex;
	flex-direction: column;
}

.edit-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333;
	text-align: center;
	margin-bottom: 28rpx;
}

.edit-input {
	height: 84rpx;
	background: #f5f6f8;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 28rpx;
}

.edit-textarea {
	width: 100%;
	height: 52vh;
	max-height: 52vh;
	background: #f5f6f8;
	border-radius: 14rpx;
	padding: 24rpx;
	font-size: 28rpx;
	line-height: 1.7;
	color: #333;
	margin-bottom: 28rpx;
	box-sizing: border-box;
}

.edit-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.edit-btn {
	font-size: 28rpx;
	padding: 14rpx 26rpx;
	border-radius: 10rpx;
	margin-left: 20rpx;
}

.cancel-btn {
	color: #666;
	background: #f2f3f5;
}

.confirm-btn {
	color: #fff;
	background: #667eea;
}
</style>
