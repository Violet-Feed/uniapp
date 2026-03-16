<template>
	<view class="create-page">
		<view class="nav-bar">
			<view class="nav-left" @click="goBack">
				<text class="nav-action">返回</text>
			</view>
			<view class="nav-title">创建智能体</view>
			<view class="nav-right" @click="submitCreate">
				<text class="nav-action nav-action-primary">
					{{ submitting ? '创建中' : '创建' }}
				</text>
			</view>
		</view>

		<view class="form-wrap">
			<view class="form-card">
				<view class="avatar-section">
					<view class="avatar-click" @click="chooseAvatar">
						<image
							class="avatar-preview"
							:src="form.avatarUri || defaultAvatar"
							mode="aspectFill"
						/>
					</view>
				</view>

				<view class="form-item">
					<text class="label">名称</text>
					<view class="input-box">
						<input
							class="input"
							type="text"
							:value="form.agentName"
							@input="onAgentNameInput"
							placeholder="请输入智能体名称"
							placeholder-class="input-placeholder"
							maxlength="50"
							confirm-type="done"
							:adjust-position="true"
							cursor-spacing="20"
						/>
					</view>
				</view>

				<view class="form-item">
					<text class="label">简介</text>
					<view class="textarea-box">
						<textarea
							class="textarea"
							:value="form.description"
							@input="onDescriptionInput"
							placeholder="请输入智能体描述"
							placeholder-class="input-placeholder"
							maxlength="300"
							auto-height
							:adjust-position="true"
							cursor-spacing="20"
						/>
					</view>
				</view>

				<view class="form-item">
					<text class="label">人格设定</text>
					<view class="textarea-box">
						<textarea
							class="textarea textarea-large"
							:value="form.personality"
							@input="onPersonalityInput"
							placeholder="请输入智能体人格设定"
							placeholder-class="input-placeholder"
							maxlength="1000"
							auto-height
							:adjust-position="true"
							cursor-spacing="20"
						/>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { createAgent } from '@/request/agent.js';
import { uploadImage } from '@/request/common.js';

export default {
	data() {
		return {
			submitting: false,
			uploadingAvatar: false,
			defaultAvatar: '/static/ai.png',
			form: {
				agentName: '',
				avatarUri: '',
				description: '',
				personality: ''
			}
		};
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},

		onAgentNameInput(e) {
			this.form.agentName = e?.detail?.value || '';
		},

		onDescriptionInput(e) {
			this.form.description = e?.detail?.value || '';
		},

		onPersonalityInput(e) {
			this.form.personality = e?.detail?.value || '';
		},

		chooseAvatar() {
			if (this.uploadingAvatar || this.submitting) return;

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					const filePath = res?.tempFilePaths?.[0];
					if (!filePath) return;

					this.uploadingAvatar = true;
					const uploadRes = await uploadImage(filePath, 'agent_avatar');
					this.uploadingAvatar = false;

					if (uploadRes === undefined) return;

					const avatarUri = this.parseAvatarUri(uploadRes);
					if (!avatarUri) return;

					this.form.avatarUri = avatarUri;
				}
			});
		},

		parseAvatarUri(uploadRes) {
			if (!uploadRes) return '';
			if (typeof uploadRes === 'string') return uploadRes;
			if (typeof uploadRes === 'object') return uploadRes.source_url || '';
			return '';
		},

		async submitCreate() {
			if (this.submitting || this.uploadingAvatar) return;

			const agentName = (this.form.agentName || '').trim();
			if (!agentName) return;

			this.submitting = true;

			const res = await createAgent({
				agentName,
				avatarUri: this.form.avatarUri || '',
				description: (this.form.description || '').trim(),
				personality: (this.form.personality || '').trim()
			});

			this.submitting = false;
			if (res === undefined) return;

			const agentId = res?.agent_id ? String(res.agent_id) : '';
			if (!agentId) return;

			uni.redirectTo({
				url: `/pages/agent/agent_detail?agentId=${encodeURIComponent(agentId)}`
			});
		}
	}
};
</script>

<style scoped>
.create-page {
	min-height: 100vh;
	background: #f7f8fa;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: calc(var(--status-bar-height) + 12rpx) 24rpx 12rpx;
	background: #ffffff;
	border-bottom: 1rpx solid #eceef2;
	box-sizing: content-box;
}

.nav-left,
.nav-right {
	min-width: 100rpx;
	display: flex;
	align-items: center;
}

.nav-left {
	justify-content: flex-start;
}

.nav-right {
	justify-content: flex-end;
}

.nav-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #1f2329;
}

.nav-action {
	font-size: 28rpx;
	color: #4e5969;
}

.nav-action-primary {
	color: #4f7cff;
	font-weight: 600;
}

.form-wrap {
	padding: 24rpx;
}

.form-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx;
	box-shadow: 0 6rpx 24rpx rgba(31, 35, 41, 0.04);
}

.avatar-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-bottom: 24rpx;
	margin-bottom: 24rpx;
	border-bottom: 1rpx solid #f0f2f5;
}

.avatar-click {
	padding: 8rpx;
}

.avatar-preview {
	width: 132rpx;
	height: 132rpx;
	border-radius: 28rpx;
	background: #eef1f6;
}

.form-item {
	display: flex;
	flex-direction: column;
	margin-bottom: 24rpx;
}

.form-item:last-child {
	margin-bottom: 0;
}

.label {
	font-size: 28rpx;
	font-weight: 600;
	color: #1f2329;
	margin-bottom: 12rpx;
}

.input-box,
.textarea-box {
	width: 100%;
	background: #f7f8fa;
	border-radius: 16rpx;
	padding: 0 20rpx;
	box-sizing: border-box;
}

.input {
	width: 100%;
	height: 88rpx;
	font-size: 28rpx;
	color: #1f2329;
}

.textarea-box {
	padding: 20rpx;
}

.textarea {
	width: 100%;
	min-height: 180rpx;
	font-size: 28rpx;
	line-height: 1.6;
	color: #1f2329;
}

.textarea-large {
	min-height: 260rpx;
}

.input-placeholder {
	color: #a0a7b4;
}
</style>