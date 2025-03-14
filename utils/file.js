function download (url, filePath){
	const downloadTask = plus.downloader.createDownload(url, {
		filename: filePath
	}, (downloadResult, status) => {
		uni.hideLoading();
		if (status !== 200) {
			console.error("download err");
			plus.downloader.clear();
		}
	});
	downloadTask.start();
}

function remove (filePath) {
	return new Promise((resolve, reject) => {
		plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs)=> {
			fs.root.getFile(filePath, {}, (fileEntry)=> {
				fileEntry.remove((e)=> {
					resolve(e);
				}, (e)=> {
					reject(e);
				});
			}, (e)=> {
				reject(e);
			});
		}, (e)=> {
			reject(e);
		});
	});
}

export default {
	download,
	remove
};