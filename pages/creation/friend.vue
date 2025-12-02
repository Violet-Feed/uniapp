<template>
    <view class="container">
        <!-- 双列创作列表 -->
        <view class="creation-grid-container">
            <!-- 初始加载状态 -->
            <view v-if="loading && creations.length === 0" class="initial-loading">
                <view class="loading-spinner"></view>
                <text class="loading-text">精彩内容加载中...</text>
            </view>

            <!-- 双列网格 -->
            <view class="creation-grid" v-else-if="creations.length > 0">
				<view 
					class="creation-card" 
					v-for="(creation, index) in creations" 
					:key="`creation-${creation.creation_id}-${index}`" 
					@click="goToCreationDetail(creation)"
				>
                    <!-- 图片容器 -->
                    <view class="image-wrapper">
                        <image 
                            class="card-image" 
                            :src="creation.image || '/static/images/default.png'" 
                            mode="aspectFill"
                            @error="handleImageError(creation)"
                            lazy-load
                        ></image>
                        <!-- 渐变遮罩 -->
                        <view class="image-gradient"></view>
                        <!-- 类型标签 -->
                        <view class="type-badge" v-if="creation.type">
                            <text>{{ creation.type === 'video' ? '📹' : '🖼️' }}</text>
                        </view>
                    </view>
                    
                    <!-- 内容区域 -->
                    <view class="card-content">
                        <view class="card-title-container">
                            <text class="card-title">{{ creation.title }}</text>
                        </view>

                        <!-- 作者信息 + 点赞 -->
                        <view class="card-footer">
                            <view class="card-author">
                                <image 
                                    class="author-avatar" 
                                    :src="creation.author?.avatar || '/static/user_avatar.png'" 
                                    mode="aspectFill"
                                    lazy-load
                                ></image>
                                <view class="author-info">
                                    <text class="author-name">
                                        {{ creation.author?.name || '未知作者' }}
                                    </text>
                                    <text class="card-time">
                                        {{ creation.time }}
                                    </text>
                                </view>
                            </view>
                            <view 
                                class="card-likes" 
                                @click.stop="toggleDigg(creation, index)"
                            >
                                <text 
                                    class="like-icon" 
                                    :class="{ liked: creation.is_digg }"
                                >
                                    {{ creation.is_digg ? '♥' : '♡' }}
                                </text>
                                <text class="like-count">{{ formatNumber(creation.likes) }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>

            <!-- 空状态 -->
            <view v-else class="empty-state">
                <text class="empty-icon">🎨</text>
                <text class="empty-text">暂无创作内容</text>
                <text class="empty-hint">快去创作第一个作品吧！</text>
            </view>
            
            <!-- 加载更多 -->
            <view v-if="loading && creations.length > 0" class="loading-more">
                <view class="loading-spinner small"></view>
                <text class="loading-more-text">正在加载更多...</text>
            </view>
        </view>
    </view>
</template>

<script>
import { getCreationsByFriend } from '@/request/creation.js'; 
import { digg, cancelDigg } from '@/request/action.js'; 

export default {
    data() {
        return {
            creations: [],
            loading: false,
            currentPage: 1,
            hasMore: true
        };
    },
    onLoad() {
        this.loadInitialData();
    },
    onReachBottom() {
        if (!this.loading && this.hasMore) this.loadMore();
    },
    onPullDownRefresh() {
        this.loadInitialData().finally(() => {
            uni.stopPullDownRefresh();
        });
    },
    methods: {
        /* ====== 列表加载 ====== */
        async loadInitialData() {
            this.loading = true;
            this.currentPage = 1;
            this.hasMore = true;
            try {
                const list = await this.fetchPage(this.currentPage);
                this.creations = list;
                if (!list.length) this.hasMore = false;
            } catch (err) {
                console.error("初始数据加载失败：", err);
                uni.showToast({ title: "加载失败，请重试", icon: "none" });
            } finally {
                this.loading = false;
            }
        },
        
        async loadMore() {
            if (!this.hasMore) return;
            this.loading = true;
            const nextPage = this.currentPage + 1;
            try {
                const list = await this.fetchPage(nextPage);
                if (!list.length) {
                    this.hasMore = false;
                } else {
                    this.creations = this.creations.concat(list);
                    this.currentPage = nextPage;
                }
            } catch (err) {
                console.error("加载更多失败：", err);
                uni.showToast({ title: "加载更多失败", icon: "none" });
            } finally {
                this.loading = false;
            }
        },

		async fetchPage(page) {
			const res = await getCreationsByFriend(page);

			const rawList = res && Array.isArray(res.creations) ? res.creations : [];
			if (!rawList.length) return [];

			return rawList.map(item => ({
				creation_id: item.creation_id,
				// 新增：作者 ID（给详情页用）
				user_id: item.user_id || item.userId || '',
				// 新增：素材类型（1 图片 / 2 视频）
				material_type: item.material_type || item.materialType || 1,

				image: item.cover_url || item.material_url || '',
				title: item.title || '',
				type: (item.material_type || item.materialType) === 2 ? 'video' : 'image',
				likes: item.digg_count || 0,
				is_digg: !!item.is_digg,
				time: this.formatCreationTime(item.create_time),
				author: {
					avatar: item.avatar || '',
					name: item.username || ''
				},
				raw: item
			}));
		},
        
        handleImageError(creation) {
            if (creation) {
                creation.image = "/static/images/default.png";
            }
        },
        
		goToCreationDetail(creation) {
			if (!creation || !creation.creation_id) return;

			const creationId = encodeURIComponent(creation.creation_id);
			const userId = encodeURIComponent(creation.user_id || '');

			// 两种判断都兼容：string 类型字段 或 数字类型 material_type
			const isVideo =
				creation.type === 'video' ||
				Number(creation.material_type) === 2;

			const basePath = isVideo
				? '/pages/creation/creation_video'
				: '/pages/creation/creation_image';

			uni.navigateTo({
				url: `${basePath}?creationId=${creationId}&userId=${userId}`
			});
		},
        /* ====== 点赞 / 取消点赞 ====== */
        async toggleDigg(creation, index) {
            if (!creation || creation._digging) return;
            creation._digging = true;

            try {
                if (creation.is_digg) {
                    // 取消点赞
                    await cancelDigg("creation",creation.creation_id);
                    this.creations[index].is_digg = false;
                    if (this.creations[index].likes > 0) {
                        this.creations[index].likes -= 1;
                    }
                } else {
                    // 点赞
                    await digg("creation",creation.creation_id);
                    this.creations[index].is_digg = true;
                    this.creations[index].likes += 1;
                }
            } catch (err) {
                console.error('点赞操作失败:', err);
                uni.showToast({
                    title: '操作失败，请稍后重试',
                    icon: 'none'
                });
            } finally {
                creation._digging = false;
            }
        },

        /* ====== 时间 / 数字格式化 ====== */
        formatCreationTime(msTimestamp) {
            if (!msTimestamp) return '';
            // 防御：如果是秒级时间戳，转成毫秒
            if (msTimestamp < 1e12) {
                msTimestamp = msTimestamp * 1000;
            }

            const now = new Date();
            const target = new Date(msTimestamp);
            const nowMs = now.getTime();
            const diffMs = nowMs - msTimestamp;
            const diffSec = Math.floor(diffMs / 1000);

            if (diffSec < 60) {
                return '刚刚';
            }
            if (diffSec < 3600) {
                const m = Math.floor(diffSec / 60);
                return `${m}分钟前`;
            }

            const oneDayMs = 24 * 60 * 60 * 1000;
            const todayStart = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            ).getTime();

            const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
            const hhmm = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`;

            if (msTimestamp >= todayStart) {
                return `今天 ${hhmm}`;
            }
            if (msTimestamp >= todayStart - oneDayMs) {
                return `昨天 ${hhmm}`;
            }

            const diffDay = Math.floor(diffMs / oneDayMs);
            if (diffDay < 7) {
                return `${diffDay}天前`;
            }

            const year = target.getFullYear();
            const month = target.getMonth() + 1;
            const day = target.getDate();

            if (year !== now.getFullYear()) {
                return `${year}年${month}月${day}日`;
            }
            return `${month}月${day}日`;
        },
        
        formatNumber(num) {
            if (!num) return '0';
            if (num >= 10000) {
                return (num / 10000).toFixed(1) + 'w';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k';
            }
            return num.toString();
        }
    }
};
</script>

<style scoped>
.container {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    background: linear-gradient(to bottom, #f8f9fa 0%, #f5f5f7 100%);
    min-height: 100vh;
}

/* ==================== 创作列表 ==================== */
.creation-grid-container {
    padding: 12px 8px;
    box-sizing: border-box;
}

.initial-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    margin-top: 16px;
    font-size: 14px;
    color: #999;
}

.creation-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.creation-card {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    transition: all 0.3s;
}

.creation-card:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.image-wrapper {
    position: relative;
    width: 100%;
    height: 240px;
    overflow: hidden;
}

.card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
    pointer-events: none;
}

.type-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.card-content {
    padding: 10px;
}

.card-title-container {
    margin-bottom: 8px;
}

.card-title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* 作者信息：头像 + 右侧用户名 + 时间 */
.card-author {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.author-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid #f0f0f0;
    object-fit: cover;
    flex-shrink: 0;
}

.author-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
}

.author-name {
    font-size: 11px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-time {
    font-size: 10px;
    color: #999;
}

/* 点赞区域 */
.card-likes {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}

.like-icon {
    font-size: 14px;
    line-height: 1;
}

.like-icon.liked {
    color: #e74c3c;
}

.like-count {
    font-size: 11px;
    color: #999;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 100px 0;
}

.empty-icon {
    font-size: 80px;
    margin-bottom: 16px;
}

.empty-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 13px;
    color: #999;
}

/* 加载更多 */
.loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 0;
}

.loading-spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
}

.loading-more-text {
    font-size: 13px;
    color: #999;
}
</style>
