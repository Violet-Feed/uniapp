export const download = (url, userId) => {
	const filePath = '_doc/image/user_avatar_' + userId;
	// plus.io.resolveLocalFileSystemURL('_doc/image/', (entry) => {
	// 	entry.getFile('user_avatar_' + userId, {
	// 		create: false
	// 	}, (fileEntry) => {
	// 		fileEntry.remove(() => {
	// 			startDownload();
	// 		}, (error) => {
	// 			console.error('remove file err', error);
	// 		});
	// 	}, (error) => {
	// 		startDownload();
	// 	});
	// }, (error) => {
	// 	console.error('resolveLocalFileSystemURL err', error);
	// });
	startDownload();
	function startDownload() {
		const downloadTask = plus.downloader.createDownload(url, {
			filename: filePath
		}, (downloadResult, status) => {
			uni.hideLoading();
			if (status !== 200) {
				console.log("下载失败");
				plus.downloader.clear();
			}
		});
		downloadTask.start();
	}
};