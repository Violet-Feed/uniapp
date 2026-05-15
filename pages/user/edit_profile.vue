<template>
	<view class="container">
		<!-- 自定义导航栏 -->
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-content" :style="navContentStyle">
				<view class="nav-left" @click="goBack">
					<text class="iconfont icon-fanhui nav-back-icon" :style="navBackIconStyle"></text>
				</view>

				<view class="nav-title-wrap">
					<text class="nav-title" :style="navTitleStyle">编辑资料</text>
				</view>

				<view class="nav-right"></view>
			</view>
		</view>

		<view class="content" :style="contentStyle">
			<view class="card" :style="cardStyle">
				<view class="cell" :style="cellStyle" @click="openAvatarSourcePopup">
					<text class="cell-label" :style="cellLabelStyle">头像</text>
					<view class="cell-right">
						<image class="avatar" :style="avatarStyle" :src="avatar || defaultAvatar" mode="aspectFill"></image>
						<text class="cell-arrow" :style="cellArrowStyle">›</text>
					</view>
				</view>

				<view class="cell" :style="cellStyle" @click="openUsernamePopup">
					<text class="cell-label" :style="cellLabelStyle">用户名</text>
					<view class="cell-right">
						<text class="cell-value" :style="cellValueStyle">{{ username || '未设置' }}</text>
						<text class="cell-arrow" :style="cellArrowStyle">›</text>
					</view>
				</view>

				<view class="cell no-border" :style="cellStyle" @click="openPasswordPopup">
					<text class="cell-label" :style="cellLabelStyle">密码</text>
					<view class="cell-right">
						<text class="cell-value" :style="cellValueStyle">点击修改</text>
						<text class="cell-arrow" :style="cellArrowStyle">›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 用户名弹窗 -->
		<view class="popup-mask" v-if="popupType === 'username'" @click="closePopup">
			<view class="popup-card" :style="popupCardStyle" @click.stop>
				<view class="popup-title" :style="popupTitleStyle">修改用户名</view>
				<input
					class="popup-input"
					:style="popupInputStyle"
					v-model.trim="tempUsername"
					placeholder="请输入新用户名"
					:adjust-position="false"
					maxlength="20"
				/>
				<view class="popup-actions">
					<view class="popup-btn cancel" :style="popupBtnStyle" @click="closePopup">取消</view>
					<view class="popup-btn confirm" :style="popupBtnStyle" @click="submitUsername">确定</view>
				</view>
			</view>
		</view>

		<!-- 密码弹窗 -->
		<view class="popup-mask" v-if="popupType === 'password'" @click="closePopup">
			<view class="popup-card" :style="popupCardStyle" @click.stop>
				<view class="popup-title" :style="popupTitleStyle">修改密码</view>
				<input
					class="popup-input"
					:style="popupInputStyle"
					v-model="tempPassword"
					type="password"
					password
					placeholder="请输入新密码"
					:adjust-position="false"
				/>
				<input
					class="popup-input"
					:style="popupInputStyle"
					v-model="tempConfirmPassword"
					type="password"
					password
					placeholder="请再次输入新密码"
					:adjust-position="false"
				/>
				<view class="popup-actions">
					<view class="popup-btn cancel" :style="popupBtnStyle" @click="closePopup">取消</view>
					<view class="popup-btn confirm" :style="popupBtnStyle" @click="submitPassword">确定</view>
				</view>
			</view>
		</view>

		<!-- 头像裁剪窗口 -->
		<avatar-cropper
			:visible="avatarCropper.visible"
			:src="avatarCropper.src"
			title="裁剪头像"
			mask-shape="circle"
			@close="closeAvatarCropper"
			@confirm="onUserAvatarCropped"
		/>

		<view class="avatar-source-mask" v-if="avatarSourceVisible" @click="closeAvatarSourcePopup">
			<view class="avatar-source-panel" @click.stop>
				<view class="avatar-source-item" @click="chooseAvatarForCrop('camera')">拍照</view>
				<view class="avatar-source-item" @click="chooseAvatarForCrop('album')">从相册选择</view>
			</view>
		</view>

		<view class="loading-mask" v-if="submitting">
			<view class="loading-box" :style="loadingBoxStyle">提交中...</view>
		</view>
	</view>
</template>

<script>
import { getUserProfile, updateUserInfo } from '@/request/user.js'
import { uploadImage } from '@/request/common.js'
import DB from '@/utils/sqlite.js'
import { enqueueEntityAvatars } from '@/utils/im-cache.js'
import AvatarCropper from '@/components/avatar-cropper.vue'

const clamp = (value, min, max) => {
	return Math.max(min, Math.min(max, value))
}

export default {
	components: {
		AvatarCropper
	},

	data() {
		return {
			userId: null,
			username: '',
			avatar: '',
			defaultAvatar: '/static/user_avatar.png',

			popupType: '',
			tempUsername: '',
			tempPassword: '',
			tempConfirmPassword: '',

			avatarCropper: {
				visible: false,
				src: ''
			},

			avatarSourceVisible: false,

			submitting: false,

			windowWidth: 375,
			statusBarHeight: 0,
			safeBottom: 0,

			navContentHeight: 38,
			navHeight: 38,

			contentPaddingX: 14,
			contentPaddingTop: 12,

			cardRadius: 14,
			cardPaddingX: 14,
			cellHeight: 54,

			avatarSize: 40,

			navBackIconSize: 19,
			navTitleFontSize: 17,
			cellLabelFontSize: 15,
			cellValueFontSize: 14,
			cellArrowFontSize: 22,

			popupWidth: 312,
			popupRadius: 18,
			popupPaddingX: 14,
			popupPaddingY: 18,
			popupTitleFontSize: 16,
			popupInputHeight: 42,
			popupInputFontSize: 14,
			popupBtnHeight: 40,
			popupBtnFontSize: 14,
			loadingFontSize: 14
		}
	},

	computed: {
		navBarStyle() {
			return (
				'height:' + this.navHeight + 'px;' +
				'padding-top:' + this.statusBarHeight + 'px;'
			)
		},

		navContentStyle() {
			return 'height:' + this.navContentHeight + 'px;'
		},

		navBackIconStyle() {
			return 'font-size:' + this.navBackIconSize + 'px;'
		},

		navTitleStyle() {
			return 'font-size:' + this.navTitleFontSize + 'px;'
		},

		contentStyle() {
			return (
				'padding:' +
				(this.navHeight + this.contentPaddingTop) +
				'px ' +
				this.contentPaddingX +
				'px ' +
				(24 + this.safeBottom) +
				'px;'
			)
		},

		cardStyle() {
			return (
				'border-radius:' + this.cardRadius + 'px;' +
				'padding-left:' + this.cardPaddingX + 'px;' +
				'padding-right:' + this.cardPaddingX + 'px;'
			)
		},

		cellStyle() {
			return 'min-height:' + this.cellHeight + 'px;'
		},

		cellLabelStyle() {
			return 'font-size:' + this.cellLabelFontSize + 'px;'
		},

		cellValueStyle() {
			return 'font-size:' + this.cellValueFontSize + 'px;'
		},

		cellArrowStyle() {
			return 'font-size:' + this.cellArrowFontSize + 'px;'
		},

		avatarStyle() {
			const radius = Math.floor(this.avatarSize / 2)
			return (
				'width:' + this.avatarSize + 'px;' +
				'height:' + this.avatarSize + 'px;' +
				'border-radius:' + radius + 'px;'
			)
		},

		popupCardStyle() {
			return (
				'width:' + this.popupWidth + 'px;' +
				'border-radius:' + this.popupRadius + 'px;' +
				'padding:' + this.popupPaddingY + 'px ' + this.popupPaddingX + 'px;'
			)
		},

		popupTitleStyle() {
			return 'font-size:' + this.popupTitleFontSize + 'px;'
		},

		popupInputStyle() {
			return (
				'height:' + this.popupInputHeight + 'px;' +
				'font-size:' + this.popupInputFontSize + 'px;'
			)
		},

		popupBtnStyle() {
			return (
				'height:' + this.popupBtnHeight + 'px;' +
				'line-height:' + this.popupBtnHeight + 'px;' +
				'border-radius:' + Math.floor(this.popupBtnHeight / 2) + 'px;' +
				'font-size:' + this.popupBtnFontSize + 'px;'
			)
		},

		loadingBoxStyle() {
			return 'font-size:' + this.loadingFontSize + 'px;'
		}
	},

	onLoad() {
		this.initResponsiveLayout()
		this.userId = getApp().globalData.userId
		this.loadUserProfile()
	},

	onShow() {
		this.initResponsiveLayout()
	},

	onBackPress() {
		if (this.avatarCropper.visible) {
			this.closeAvatarCropper()
			return true
		}

		return false
	},

	methods: {
		initResponsiveLayout() {
			try {
				const sys = uni.getSystemInfoSync()
				const windowWidth = Number(sys.windowWidth || 375)
				const statusBarHeight = Number(sys.statusBarHeight || 0)
				const safeAreaInsets = sys.safeAreaInsets || {}
				const smallScreenBoost = windowWidth <= 360 ? 1 : 0

				this.windowWidth = windowWidth
				this.statusBarHeight = statusBarHeight
				this.safeBottom = Number(safeAreaInsets.bottom || 0)

				this.navContentHeight = 38
				this.navHeight = this.statusBarHeight + this.navContentHeight

				this.contentPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.contentPaddingTop = clamp(Math.floor(windowWidth * 0.032), 10, 14)

				this.cardRadius = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cardPaddingX = clamp(Math.floor(windowWidth * 0.038), 12, 18)
				this.cellHeight = clamp(Math.floor(windowWidth * 0.144), 52, 60)

				this.avatarSize = clamp(Math.floor(windowWidth * 0.106), 38, 44)

				this.navBackIconSize = clamp(Math.floor(this.navContentHeight * 0.5), 18, 21)
				this.navTitleFontSize = clamp(Math.floor(this.navContentHeight * 0.44) + smallScreenBoost, 16, 18)

				this.cellLabelFontSize = clamp(Math.floor(windowWidth * 0.04) + smallScreenBoost, 15, 16)
				this.cellValueFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 14, 15)
				this.cellArrowFontSize = clamp(Math.floor(windowWidth * 0.058), 20, 24)

				this.popupWidth = clamp(Math.floor(windowWidth * 0.82), 292, 336)
				this.popupRadius = clamp(Math.floor(windowWidth * 0.046), 16, 20)
				this.popupPaddingX = clamp(Math.floor(windowWidth * 0.038), 14, 18)
				this.popupPaddingY = clamp(Math.floor(windowWidth * 0.048), 16, 22)

				this.popupTitleFontSize = clamp(Math.floor(windowWidth * 0.043) + smallScreenBoost, 16, 18)
				this.popupInputHeight = clamp(Math.floor(windowWidth * 0.112), 40, 46)
				this.popupInputFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 14, 15)

				this.popupBtnHeight = clamp(Math.floor(windowWidth * 0.106), 38, 44)
				this.popupBtnFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 14, 15)
				this.loadingFontSize = clamp(Math.floor(windowWidth * 0.037) + smallScreenBoost, 14, 15)
			} catch (err) {
				this.windowWidth = 375
				this.statusBarHeight = 0
				this.safeBottom = 0

				this.navContentHeight = 38
				this.navHeight = 38

				this.contentPaddingX = 14
				this.contentPaddingTop = 12

				this.cardRadius = 14
				this.cardPaddingX = 14
				this.cellHeight = 54

				this.avatarSize = 40

				this.navBackIconSize = 19
				this.navTitleFontSize = 17
				this.cellLabelFontSize = 15
				this.cellValueFontSize = 14
				this.cellArrowFontSize = 22

				this.popupWidth = 312
				this.popupRadius = 18
				this.popupPaddingX = 14
				this.popupPaddingY = 18
				this.popupTitleFontSize = 16
				this.popupInputHeight = 42
				this.popupInputFontSize = 14
				this.popupBtnHeight = 40
				this.popupBtnFontSize = 14
				this.loadingFontSize = 14
			}
		},

		goBack() {
			uni.navigateBack()
		},

		async loadUserProfile() {
			const res = await getUserProfile(this.userId, false, false)
			if (res) {
				const info = res.user_info || {}
				this.username = info.username || getApp().globalData.username || ''
				this.avatar = info.avatar || getApp().globalData.avatar || this.defaultAvatar
				getApp().globalData.username = this.username
				getApp().globalData.avatar = this.avatar
				return
			}

			try {
				const rows = await DB.getUsersByIds([this.userId])
				const user = rows?.[0] || null
				if (user) {
					this.username = user.username || getApp().globalData.username || ''
					this.avatar = user.local_avatar_uri || user.avatar_uri || this.defaultAvatar
					return
				}
			} catch (e) {
				console.error('读取本地用户资料失败：', e)
			}

			this.username = getApp().globalData.username || ''
			this.avatar = getApp().globalData.avatar || this.defaultAvatar
		},

		closePopup() {
			this.popupType = ''
			this.tempUsername = ''
			this.tempPassword = ''
			this.tempConfirmPassword = ''
		},

		openUsernamePopup() {
			this.tempUsername = this.username
			this.popupType = 'username'
		},

		openPasswordPopup() {
			this.tempPassword = ''
			this.tempConfirmPassword = ''
			this.popupType = 'password'
		},

		async submitUsername() {
			const newUsername = (this.tempUsername || '').trim()

			if (!newUsername) {
				uni.showToast({
					title: '用户名不能为空',
					icon: 'none'
				})
				return
			}

			if (newUsername === this.username) {
				this.closePopup()
				return
			}

			this.submitting = true

			const ok = await updateUserInfo({
				type: 'username',
				value: newUsername
			})

			if (ok) {
				this.username = newUsername
				getApp().globalData.username = newUsername

				try {
					await DB.updateUser(this.userId, {
						username: newUsername,
						modify_time: Date.now()
					})
				} catch (e) {
					console.error('更新本地用户名失败：', e)
				}

				this.closePopup()

				uni.showToast({
					title: '用户名已更新',
					icon: 'success'
				})
			}
			this.submitting = false
		},

		async submitPassword() {
			if (!this.tempPassword || !this.tempConfirmPassword) {
				uni.showToast({
					title: '请完整填写密码',
					icon: 'none'
				})
				return
			}

			if (this.tempPassword !== this.tempConfirmPassword) {
				uni.showToast({
					title: '两次密码不一致',
					icon: 'none'
				})
				return
			}

			this.submitting = true

			const ok = await updateUserInfo({
				type: 'password',
				value: this.tempPassword
			})

			if (ok) {
				this.closePopup()

				uni.showToast({
					title: '密码已更新',
					icon: 'success'
				})
			}
			this.submitting = false
		},

		openAvatarSourcePopup() {
			if (this.submitting) return
			this.avatarSourceVisible = true
		},

		closeAvatarSourcePopup() {
			this.avatarSourceVisible = false
		},

		chooseAvatarForCrop(sourceType) {
			if (this.submitting) return

			this.closeAvatarSourcePopup()

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: [sourceType],
				success: (res) => {
					const filePath = res.tempFilePaths?.[0]
					if (!filePath) return

					this.avatarCropper = {
						visible: true,
						src: filePath
					}
				}
			})
		},

		closeAvatarCropper() {
			this.avatarCropper = {
				visible: false,
				src: ''
			}
		},

		async onUserAvatarCropped(filePath) {
			console.log(222);
			this.closeAvatarCropper()
			await this.uploadUserAvatar(filePath)
		},

		async uploadUserAvatar(filePath) {
			console.log(111);
			if (!filePath || this.submitting) return

			this.submitting = true

			const uploadRes = await uploadImage(filePath, 'user_avatar')
			if (!uploadRes) {
				this.submitting = false
				return
			}
			const url = uploadRes.source_url || uploadRes.data?.source_url || ''

			const ok = await updateUserInfo({
				type: 'avatar',
				value: url
			})

			if (ok) {
				this.avatar = url
				getApp().globalData.avatar = url

				try {
					await DB.updateUser(this.userId, {
						avatar_uri: url,
						local_avatar_uri: '',
						modify_time: Date.now()
					})
				} catch (e) {
					console.error('更新本地头像失败：', e)
				}

				enqueueEntityAvatars('user', [this.userId])

				uni.showToast({
					title: '头像已更新',
					icon: 'success'
				})
			}
			this.submitting = false
		}
	}
}
</script>

<style>
@import "@/static/icon/iconfont.css";
</style>

<style scoped>
.container {
	background-color: #f7f8fa;
	min-height: 100vh;
	font-family: "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
	box-sizing: border-box;
}

.nav-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	background-color: #ffffff;
	z-index: 100;
	box-sizing: border-box;
	overflow: hidden;
}

.nav-content {
	width: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	padding-left: 8px;
	padding-right: 8px;
	padding-bottom: 4px;
	box-sizing: border-box;
}

.nav-left,
.nav-right {
	width: 76px;
	height: 30px;
	display: flex;
	align-items: center;
	flex-shrink: 0;
	box-sizing: border-box;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
}

.nav-back-icon {
	line-height: 1;
	color: #222;
	font-weight: 400;
}

.nav-title-wrap {
	flex: 1;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 0;
	box-sizing: border-box;
}

.nav-title {
	color: #222;
	font-weight: 400;
	line-height: 1;
}

.content {
	box-sizing: border-box;
}

.card {
	background: #ffffff;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
	box-sizing: border-box;
}

.cell {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #f2f2f2;
	box-sizing: border-box;
}

.cell.no-border {
	border-bottom: none;
}

.cell-label {
	color: #222;
	font-weight: 400;
	line-height: 1;
}

.cell-right {
	display: flex;
	align-items: center;
	max-width: 70%;
	min-width: 0;
}

.cell-value {
	color: #666;
	max-width: 320rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 400;
}

.cell-arrow {
	color: #bbbbbb;
	margin-left: 10px;
	font-weight: 400;
	line-height: 1;
}

.avatar {
	background: #f2f2f2;
	flex-shrink: 0;
}

.popup-mask,
.loading-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}

.popup-card {
	background: #ffffff;
	box-sizing: border-box;
}

.popup-title {
	font-weight: 400;
	color: #222;
	text-align: center;
	margin-bottom: 16px;
	line-height: 1.4;
}

.popup-input {
	background: #f7f8fa;
	border-radius: 12px;
	padding: 0 12px;
	color: #222;
	font-weight: 400;
	margin-bottom: 12px;
	box-sizing: border-box;
}

.popup-actions {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	margin-top: 4px;
}

.popup-btn {
	flex: 1;
	text-align: center;
	font-weight: 400;
	box-sizing: border-box;
}

.popup-btn.cancel {
	background: #f0f1f5;
	color: #666;
}

.popup-btn.confirm {
	background: rgba(253, 231, 209, 1);
	color: #8a5a2b;
}

.loading-box {
	background: #ffffff;
	color: #333333;
	padding: 14px 18px;
	border-radius: 14px;
	font-weight: 400;
	box-sizing: border-box;
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