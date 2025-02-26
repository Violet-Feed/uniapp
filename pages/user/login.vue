<template>
    <view class="login-container">
        <view class="input-group">
            <input v-model="username" placeholder="请输入用户名" />
        </view>
        <view class="input-group">
            <input v-model="password" type="password" placeholder="请输入密码" />
        </view>
        <button @click="login">登录</button>
        <view class="register-link" @click="goToRegister">没有账号？去注册</view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            username: '',
            password: ''
        };
    },
    methods: {
        login() {
            if (!this.username || !this.password) {
                uni.showToast({
                    title: '用户名和密码不能为空',
                    icon: 'none'
                });
                return;
            }
            uni.request({
                url: 'http://127.0.0.1:3000/api/action/user/login/',
                method: 'POST',
				header: { 'content-type': 'application/x-www-form-urlencoded' },
                data: {
                    username: this.username,
                    password: this.password
                },
                success: (res) => {
                    if (res.statusCode === 200) {
                        const data = res.data;
                        if (data.message === "success") {
                            const token = data.token;
                            // 存储 token 到本地
                            uni.setStorageSync('token', token);
                            uni.showToast({
                                title: '登录成功',
                                icon: 'success'
                            });
							uni.reLaunch({
								url: '/pages/video/video'
							});
                        } else {
                            uni.showToast({
                                title: data.message,
                                icon: 'none'
                            });
                        }
                    } else {
                        uni.showToast({
                            title: '网络错误，请稍后重试',
                            icon: 'none'
                        });
                    }
                },
                fail: (err) => {
                    uni.showToast({
                        title: '网络错误，请稍后重试',
                        icon: 'none'
                    });
                }
            });
        },
        goToRegister() {
            uni.navigateTo({
                url: '/pages/user/register'
            });
        }
    }
};
</script>

<style scoped>
.login-container {
    padding: 20px;
}

.input-group {
    margin-bottom: 20px;
}

.input-group input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

button {
    padding: 10px;
    background-color: #0084ff;
    color: white;
    border: none;
    border-radius: 5px;
}

.register-link {
    margin-top: 20px;
    text-align: center;
    color: #0084ff;
    cursor: pointer;
}
</style>