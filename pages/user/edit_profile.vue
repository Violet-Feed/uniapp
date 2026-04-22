<template>
	<view class="container">
		<!-- 自定义导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<text class="nav-back-icon">←</text>
				<text class="nav-back-text">返回</text>
			</view>
			<view class="nav-title">编辑资料</view>
		</view>

		<view class="content">
			<view class="card">
				<view class="cell" @click="handleEditAvatar">
					<text class="cell-label">头像</text>
					<view class="cell-right">
						<image class="avatar" :src="avatar || defaultAvatar" mode="aspectFill"></image>
						<text class="cell-arrow">›</text>
					</view>
				</view>

				<view class="cell" @click="openUsernamePopup">
					<text class="cell-label">用户名</text>
					<view class="cell-right">
						<text class="cell-value">{{ username || '未设置' }}</text>
						<text class="cell-arrow">›</text>
					</view>
				</view>

				<view class="cell no-border" @click="openPasswordPopup">
					<text class="cell-label">密码</text>
					<view class="cell-right">
						<text class="cell-value">点击修改</text>
						<text class="cell-arrow">›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 用户名弹窗 -->
		<view class="popup-mask" v-if="popupType === 'username'" @click="closePopup">
			<view class="popup-card" @click.stop>
				<view class="popup-title">修改用户名</view>
				<input
					class="popup-input"
					v-model.trim="tempUsername"
					placeholder="请输入新用户名"
					maxlength="20"
				/>
				<view class="popup-actions">
					<view class="popup-btn cancel" @click="closePopup">取消</view>
					<view class="popup-btn confirm" @click="submitUsername">确定</view>
				</view>
			</view>
		</view>

		<!-- 密码弹窗 -->
		<view class="popup-mask" v-if="popupType === 'password'" @click="closePopup">
			<view class="popup-card" @click.stop>
				<view class="popup-title">修改密码</view>
				<input
					class="popup-input"
					v-model="tempPassword"
					type="password"
					password
					placeholder="请输入新密码"
				/>
				<input
					class="popup-input"
					v-model="tempConfirmPassword"
					type="password"
					password
					placeholder="请再次输入新密码"
				/>
				<view class="popup-actions">
					<view class="popup-btn cancel" @click="closePopup">取消</view>
					<view class="popup-btn confirm" @click="submitPassword">确定</view>
				</view>
			</view>
		</view>

		<view class="loading-mask" v-if="submitting">
			<view class="loading-box">提交中...</view>
		</view>
	</view>
</template>

<script>
import { getUserProfile, updateUserInfo } from '@/request/user.js'
import { uploadImage } from '@/request/common.js' // 按你的实际路径调整

export default {
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

			submitting: false
		}
	},

	onLoad() {
		this.userId = getApp().globalData.userId
		this.loadUserProfile()
	},

	methods: {
		goBack() {
			uni.navigateBack()
		},

		async loadUserProfile() {
			try {
				const res = await getUserProfile(this.userId, false, false)
				const info = res?.user_info || {}

				this.username = info.username || getApp().globalData.username || ''
				this.avatar = info.avatar || getApp().globalData.avatar || this.defaultAvatar

				getApp().globalData.username = this.username
				getApp().globalData.avatar = this.avatar
			} catch (e) {
				console.error('获取用户资料失败：', e)
				this.username = getApp().globalData.username || ''
				this.avatar = getApp().globalData.avatar || this.defaultAvatar
			}
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
			try {
				const ok = await updateUserInfo({
					type: 'username',
					value: newUsername
				})

				if (!ok) {
					throw new Error('updateUserInfo username 返回失败')
				}

				this.username = newUsername
				getApp().globalData.username = newUsername
				this.closePopup()

				uni.showToast({
					title: '用户名已更新',
					icon: 'success'
				})
			} catch (e) {
				console.error('修改用户名失败：', e)
				uni.showToast({
					title: '修改失败',
					icon: 'none'
				})
			} finally {
				this.submitting = false
			}
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
			try {
				const ok = await updateUserInfo({
					type: 'password',
					value: this.tempPassword
				})

				if (!ok) {
					throw new Error('updateUserInfo password 返回失败')
				}

				this.closePopup()
				uni.showToast({
					title: '密码已更新',
					icon: 'success'
				})
			} catch (e) {
				console.error('修改密码失败：', e)
				uni.showToast({
					title: '修改失败',
					icon: 'none'
				})
			} finally {
				this.submitting = false
			}
		},

		handleEditAvatar() {
			uni.showActionSheet({
				itemList: ['从相册选择', '拍照'],
				success: (res) => {
					const sourceType = res.tapIndex === 1 ? ['camera'] : ['album']
					this.chooseAndUploadAvatar(sourceType)
				}
			})
		},

		chooseAndUploadAvatar(sourceType) {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType,
				success: async (res) => {
					const filePath = res.tempFilePaths?.[0]
					if (!filePath) return

					this.submitting = true
					try {
						const uploadRes = await uploadImage(filePath, 'user_avatar')
						const sourceUrl =
							uploadRes?.source_url ||
							uploadRes?.data?.source_url ||
							''

						if (!sourceUrl) {
							throw new Error('上传头像未返回 source_url')
						}

						const ok = await updateUserInfo({
							type: 'avatar',
							value: sourceUrl
						})

						if (!ok) {
							throw new Error('updateUserInfo avatar 返回失败')
						}

						this.avatar = sourceUrl
						getApp().globalData.avatar = sourceUrl

						uni.showToast({
							title: '头像已更新',
							icon: 'success'
						})
					} catch (e) {
						console.error('修改头像失败：', e)
						uni.showToast({
							title: '修改失败',
							icon: 'none'
						})
					} finally {
						this.submitting = false
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.container {
	background-color: #f5f5f7;
	min-height: 100vh;
}

.nav-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 88rpx;
	padding: 0 16rpx;
	display: flex;
	align-items: center;
	background-color: #ffffff;
	box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
	z-index: 100;
}

.nav-back {
	display: flex;
	align-items: center;
	padding: 10rpx 10rpx 10rpx 0;
}

.nav-back-icon {
	font-size: 34rpx;
	margin-right: 4rpx;
}

.nav-back-text {
	font-size: 28rpx;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 32rpx;
	font-weight: 600;
	margin-right: 80rpx;
}

.content {
	padding: 110rpx 24rpx 24rpx;
	box-sizing: border-box;
}

.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 0 24rpx;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.cell {
	min-height: 108rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid #f2f2f2;
}

.cell.no-border {
	border-bottom: none;
}

.cell-label {
	font-size: 30rpx;
	color: #222;
	font-weight: 500;
}

.cell-right {
	display: flex;
	align-items: center;
	max-width: 70%;
}

.cell-value {
	font-size: 28rpx;
	color: #666;
	max-width: 320rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cell-arrow {
	font-size: 34rpx;
	color: #bbb;
	margin-left: 12rpx;
}

.avatar {
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	background: #f2f2f2;
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
	width: 78%;
	background: #fff;
	border-radius: 20rpx;
	padding: 32rpx 24rpx;
	box-sizing: border-box;
}

.popup-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #222;
	text-align: center;
	margin-bottom: 24rpx;
}

.popup-input {
	height: 84rpx;
	background: #f7f8fa;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	margin-bottom: 20rpx;
	box-sizing: border-box;
}

.popup-actions {
	display: flex;
	justify-content: space-between;
	gap: 20rpx;
	margin-top: 12rpx;
}

.popup-btn {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	border-radius: 40rpx;
	font-size: 28rpx;
}

.popup-btn.cancel {
	background: #f0f1f5;
	color: #666;
}

.popup-btn.confirm {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
}

.loading-box {
	background: #fff;
	color: #333;
	padding: 28rpx 36rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}
</style>