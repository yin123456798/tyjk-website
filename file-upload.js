// 文件上传功能模块
// 支持图片上传到Supabase Storage

class FileUploader {
    constructor() {
        this.supabase = window.supabase;
        this.bucketName = 'tyjk-files'; // 存储桶名称
    }

    // 初始化存储桶
    async initBucket() {
        try {
            // 由于listBuckets权限问题，我们跳过检查，直接假设存储桶存在
            console.log('跳过存储桶检查，假设存储桶已存在:', this.bucketName);
            // 注意：存储桶需要在Supabase控制台手动创建
        } catch (error) {
            console.error('初始化存储桶失败:', error);
        }
    }

    // 上传图片文件
    async uploadImage(file, folder = 'uploads') {
        try {
            // 验证文件类型
            if (!this.isValidImage(file)) {
                throw new Error('只支持图片文件格式：JPG, PNG, GIF, WebP');
            }

            // 验证文件大小（最大5MB）
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('文件大小不能超过5MB');
            }

            // 生成唯一文件名
            const fileName = this.generateFileName(file);
            const filePath = `${folder}/${fileName}`;

            // 上传文件到Supabase Storage
            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // 获取文件URL（私有存储桶需要签名URL）
            const { data: urlData, error: urlError } = await this.supabase.storage
                .from(this.bucketName)
                .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1年有效期

            if (urlError) {
                console.error('创建签名URL失败:', urlError);
                // 如果创建签名URL失败，但文件已上传成功，返回公共URL
                const publicUrl = this.supabase.storage
                    .from(this.bucketName)
                    .getPublicUrl(filePath);
                
                return {
                    success: true,
                    url: publicUrl.data.publicUrl,
                    path: filePath,
                    fileName: fileName,
                    warning: '使用公共URL，签名URL创建失败'
                };
            }

            return {
                success: true,
                url: urlData.signedUrl,
                path: filePath,
                fileName: fileName
            };

        } catch (error) {
            console.error('文件上传失败:', error);
            console.error('错误详情:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            
            // 提供更友好的错误信息
            let errorMessage = error.message;
            if (error.message.includes('Object not found')) {
                errorMessage = '存储桶配置错误，请检查Supabase Storage设置';
            } else if (error.message.includes('JWT')) {
                errorMessage = '认证失败，请检查API密钥配置';
            } else if (error.message.includes('bucket')) {
                errorMessage = '存储桶不存在或权限不足';
            }
            
            return {
                success: false,
                error: errorMessage,
                originalError: error.message
            };
        }
    }

    // 验证图片文件
    isValidImage(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    }

    // 生成唯一文件名
    generateFileName(file) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        return `${timestamp}_${random}.${extension}`;
    }

    // 删除文件
    async deleteFile(filePath) {
        try {
            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .remove([filePath]);

            if (error) {
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('文件删除失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 预览图片
    previewImage(file, previewElement) {
        if (file && this.isValidImage(file)) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    // 压缩图片（可选功能）
    async compressImage(file, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = function() {
                // 计算新的尺寸
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为Blob
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, file.type, quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }
}

// 创建全局实例
window.fileUploader = new FileUploader();

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    if (window.fileUploader) {
        window.fileUploader.initBucket();
    }
});

// 导出类
window.FileUploader = FileUploader; 