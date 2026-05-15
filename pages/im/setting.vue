<template>
	<view class="conversation-settings">
		<!-- 顶部导航栏 -->
		<view class="setting-header" :style="headerStyle">
			<view class="header-content" :style="headerContentStyle">
				<view class="header-left" @click="goBack">
					<text class="iconfont icon-fanhui back-icon"></text>
				</view>

				<view class="header-center">
					<text class="header-title">群聊设置</text>
				</view>

				<view class="header-right"></view>
			</view>
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
					<image
						class="member-avatar"
						:src="member.avatar_uri || '/static/user_avatar.png'"
						mode="aspectFill"
					></image>
					<text class="member-name">{{ member.nick_name || '未命名' }}</text>
				</view>

				<view class="member-item add-btn" @click="goToAddMember">
					<view class="add-icon">
						<text class="icon">+</text>
					</view>
					<text class="member-name">邀请</text>
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
			<view class="info-item" @click="openAvatarSourcePopup">
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

		<!-- 头像裁剪窗口 -->
		<avatar-cropper
			:visible="avatarCropper.visible"
			:src="avatarCropper.src"
			title="裁剪群头像"
			mask-shape="circle"
			@close="closeAvatarCropper"
			@confirm="onGroupAvatarCropped"
		/>

		<view class="avatar-source-mask" v-if="avatarSourceVisible" @click="closeAvatarSourcePopup">
			<view class="avatar-source-panel" @click.stop>
				<view class="avatar-source-item" @click="chooseGroupAvatarForCrop('camera')">拍照</view>
				<view class="avatar-source-item" @click="chooseGroupAvatarForCrop('album')">从相册选择</view>
			</view>
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
					:adjust-position="false"
					maxlength="-1"
				/>

				<input
					v-else
					class="edit-input"
					v-model="editValue"
					:placeholder="editPlaceholder"
					:adjust-position="false"
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
import AvatarCropper from '@/components/avatar-cropper.vue';

export default {
	components: {
		AvatarCropper
	},

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
			updating: false,

			statusBarHeight: 0,
			headerContentHeight: 38,
			headerHeight: 38,

			avatarCropper: {
				visible: false,
				src: ''
			},

			avatarSourceVisible: false
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
		},

		headerStyle() {
			return (
				'height:' + this.headerHeight + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;'
			);
		},

		headerContentStyle() {
			return 'height:' + this.headerContentHeight + 'px;';
		}
	},

	async onLoad(options) {
		this.initHeaderLayout();

		this.conId = options.conId || '';
		this.conType = Number(options.conType || 0);

		if (!this.conId) return;

		await this.refreshPage();
	},

	onShow() {
		this.initHeaderLayout();
	},

	onBackPress() {
		if (this.avatarCropper.visible) {
			this.closeAvatarCropper()
			return true
		}
		return false
	},

	methods: {
		initHeaderLayout() {
			try {
				const sys = uni.getSystemInfoSync();
				const statusBarHeight = Number(sys.statusBarHeight || 0);

				this.statusBarHeight = statusBarHeight;
				this.headerContentHeight = 38;
				this.headerHeight = this.statusBarHeight + this.headerContentHeight;
			} catch (err) {
				this.statusBarHeight = 0;
				this.headerContentHeight = 38;
				this.headerHeight = 38;
			}
		},

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

		openAvatarSourcePopup() {
			if (this.updating) return
			this.avatarSourceVisible = true
		},

		closeAvatarSourcePopup() {
			this.avatarSourceVisible = false
		},

		chooseGroupAvatarForCrop(sourceType) {
			if (this.updating) return

			this.closeAvatarSourcePopup()

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: [sourceType],
				success: res => {
					const filePath = res?.tempFilePaths?.[0] || '';
					if (!filePath) return;

					this.avatarCropper = {
						visible: true,
						src: filePath
					};
				}
			});
		},

		closeAvatarCropper() {
			this.avatarCropper = {
				visible: false,
				src: ''
			};
		},

		async onGroupAvatarCropped(filePath) {
			this.closeAvatarCropper();

			if (!filePath) return;

			await this.updateGroupAvatar(filePath);
		},

		async updateGroupAvatar(filePath) {
			if (!this.conShortId || this.updating) return;

			this.updating = true;

			const uploadRes = await uploadImage(filePath, 'conv_avatar');
			const sourceUrl =
				uploadRes?.source_url ||
				uploadRes?.sourceUrl ||
				uploadRes?.url ||
				uploadRes?.data?.source_url ||
				'';

			if (!sourceUrl) {
				this.updating = false;
				return;
			}

			const ok = await updateConversationCore({
				conShortId: this.conShortId,
				type: 'avatarUri',
				value: sourceUrl
			});

			if (!ok) {
				this.updating = false;
				return;
			}

			this.groupAvatar = sourceUrl;

			uni.showToast({
				title: '修改成功',
				icon: 'success'
			});

			this.updating = false;
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

			if (!ok) {
				this.updating = false;
				return;
			}

			this.closeEditPopup();

			uni.showToast({
				title: '修改成功',
				icon: 'success'
			});

			this.updating = false;
		},

		goToAiMember() {
			uni.navigateTo({
				url: `/pages/agent/agent_member?conId=${this.conId}`
			});
		},

		goToSearchMessages() {
			uni.showToast({
				title: '开发中',
				icon: 'none'
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

			const ok = await removeConversationMember({
				conShortId: this.conShortId,
				member: userId
			});

			if (!ok) {
				this.updating = false;
				return;
			}

			uni.showToast({
				title: '已退出群聊',
				icon: 'success'
			});

			setTimeout(() => {
				uni.navigateBack({
					delta: 2
				});
			}, 300);

			this.updating = false;
		}
	}
};
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.conversation-settings {
	min-height: 100vh;
	background-color: #f5f5f5;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.setting-header {
	width: 100%;
	background: #ffffff;
	box-sizing: border-box;
	overflow: hidden;
}

.header-content {
	width: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	padding-left: 8px;
	padding-right: 8px;
	padding-bottom: 4px;
	box-sizing: border-box;
}

.header-left,
.header-right {
	width: 34px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-sizing: border-box;
}

.back-icon {
	font-size: 19px;
	line-height: 20px;
	color: #222;
	font-weight: 400;
}

.header-center {
	flex: 1;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.header-title {
	font-size: 17px;
	line-height: 20px;
	font-weight: 400;
	color: #222;
}

.members-section {
	background-color: #ffffff;
	padding: 22rpx 6rpx 2rpx;
	margin: 12rpx 10rpx 16rpx;
	border-radius: 16rpx;
	box-sizing: border-box;
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
	margin-bottom: 24rpx;
	box-sizing: border-box;
}

.member-avatar {
	width: 116rpx;
	height: 116rpx;
	border-radius: 14rpx;
	background-color: #f0f0f0;
}

.member-name {
	font-size: 24rpx;
	font-weight: 400;
	color: #333;
	margin-top: 8rpx;
	text-align: center;
	width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding: 0 3rpx;
	box-sizing: border-box;
}

.add-btn .add-icon,
.remove-btn .remove-icon,
.expand-btn .expand-icon {
	width: 116rpx;
	height: 116rpx;
	border-radius: 14rpx;
	border: 2rpx dashed #ccc;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #fafafa;
	box-sizing: border-box;
}

.add-icon .icon,
.remove-icon .icon,
.expand-icon .icon {
	font-size: 58rpx;
	color: #999;
	font-weight: 400;
	line-height: 1;
}

.info-section {
	background-color: #ffffff;
	margin: 0 10rpx 16rpx;
	border-radius: 16rpx;
	overflow: hidden;
	box-sizing: border-box;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
	box-sizing: border-box;
}

.info-item:last-child {
	border-bottom: none;
}

.info-label {
	font-size: 30rpx;
	font-weight: 400;
	color: #333;
}

.info-content {
	display: flex;
	align-items: center;
	max-width: 60%;
}

.info-value {
	font-size: 28rpx;
	font-weight: 400;
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
	font-weight: 400;
}

.action-section {
	padding: 0 10rpx 18rpx;
	box-sizing: border-box;
}

.quit-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background-color: #ffffff;
	color: #ff4444;
	font-size: 32rpx;
	font-weight: 400;
	border-radius: 16rpx;
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
	padding: 36rpx 30rpx 26rpx;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.desc-title {
	font-size: 32rpx;
	font-weight: 400;
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
	font-weight: 400;
	line-height: 1.7;
	color: #333;
	word-break: break-word;
	white-space: pre-wrap;
}

.desc-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: 28rpx;
	flex-shrink: 0;
}

.desc-btn {
	min-width: 112rpx;
	height: 64rpx;
	line-height: 64rpx;
	text-align: center;
	font-size: 30rpx;
	font-weight: 400;
	padding: 0 34rpx;
	border-radius: 14rpx;
	margin-left: 22rpx;
	box-sizing: border-box;
}

.desc-cancel-btn {
	color: #666;
	background: #f2f3f5;
}

.desc-edit-btn {
	color: #8a5a2b;
	background: rgba(253, 231, 209, 1);
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
	padding: 38rpx 30rpx 28rpx;
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
	font-weight: 400;
	color: #333;
	text-align: center;
	margin-bottom: 30rpx;
}

.edit-input {
	height: 88rpx;
	background: #f5f6f8;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	font-weight: 400;
	color: #333;
	margin-bottom: 30rpx;
	box-sizing: border-box;
}

.edit-textarea {
	width: 100%;
	height: 52vh;
	max-height: 52vh;
	background: #f5f6f8;
	border-radius: 14rpx;
	padding: 24rpx;
	font-size: 28rpx;
	font-weight: 400;
	line-height: 1.7;
	color: #333;
	margin-bottom: 30rpx;
	box-sizing: border-box;
}

.edit-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.edit-btn {
	min-width: 112rpx;
	height: 64rpx;
	line-height: 64rpx;
	text-align: center;
	font-size: 30rpx;
	font-weight: 400;
	padding: 0 34rpx;
	border-radius: 14rpx;
	margin-left: 22rpx;
	box-sizing: border-box;
}

.cancel-btn {
	color: #666;
	background: #f2f3f5;
}

.confirm-btn {
	color: #8a5a2b;
	background: rgba(253, 231, 209, 1);
}

.avatar-source-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1200;
	background: rgba(0, 0, 0, 0.36);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	box-sizing: border-box;
}
.avatar-source-panel {
	width: 100%;
	padding: 16rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}
.avatar-source-item {
	height: 96rpx;
	line-height: 96rpx;
	text-align: center;
	background: #ffffff;
	color: #222222;
	font-size: 30rpx;
	font-weight: 400;
	box-sizing: border-box;
}
.avatar-source-item:first-child {
	border-radius: 28rpx 28rpx 0 0;
}
.avatar-source-item:last-child {
	border-radius: 0 0 28rpx 28rpx;
	border-top: 1px solid #f1f1f1;
}
</style>