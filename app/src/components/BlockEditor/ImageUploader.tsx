/**
 * ImageUploader Component
 *
 * 图片上传组件
 * 支持粘贴、拖拽、点击上传
 */

import { useState, useCallback, useRef, memo } from 'react';

export type ImageSize = 'small' | 'medium' | 'large' | 'original';
export type ImageAlign = 'left' | 'center' | 'right';

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<string>; // 返回图片 URL
  onInsert?: (url: string, size: ImageSize, align: ImageAlign, caption: string) => void;
  maxSize?: number; // 最大文件大小（字节），默认 10MB
  accept?: string; // 接受的文件类型
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ImageUploader: React.FC<ImageUploaderProps> = memo(({
  onUpload,
  onInsert,
  maxSize = DEFAULT_MAX_SIZE,
  accept = 'image/*',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>('medium');
  const [imageAlign, setImageAlign] = useState<ImageAlign>('center');
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    // 验证文件大小
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      alert(`文件大小超过限制（最大 ${maxSizeMB}MB）`);
      return;
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 创建本地预览
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // 调用上传函数
      const uploadedUrl = await onUpload(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 使用上传后的 URL 替换预览 URL
      setPreviewUrl(uploadedUrl);

      // 如果有 onInsert 回调，延迟后自动插入
      if (onInsert) {
        setTimeout(() => {
          onInsert(uploadedUrl, imageSize, imageAlign, caption);
          reset();
        }, 500);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('图片上传失败，请重试');
      reset();
    } finally {
      setIsUploading(false);
    }
  }, [maxSize, onUpload, onInsert, imageSize, imageAlign, caption]);

  // 重置状态
  const reset = useCallback(() => {
    setPreviewUrl(null);
    setCaption('');
    setUploadProgress(0);
    setImageSize('medium');
    setImageAlign('center');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 处理文件输入变化
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 点击上传区域
  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  // 插入图片按钮
  const handleInsert = useCallback(() => {
    if (previewUrl && onInsert) {
      onInsert(previewUrl, imageSize, imageAlign, caption);
      reset();
    }
  }, [previewUrl, imageSize, imageAlign, caption, onInsert, reset]);

  // 取消按钮
  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        // 上传区域
        <div
          className={`image-uploader-dropzone ${isDragging ? 'image-uploader-dropzone--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {isUploading ? (
            <div className="image-uploader-progress">
              <div className="image-uploader-progress-bar">
                <div
                  className="image-uploader-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="image-uploader-progress-text">上传中... {uploadProgress}%</span>
            </div>
          ) : (
            <div className="image-uploader-prompt">
              <svg className="image-uploader-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="image-uploader-text">
                拖拽图片到这里，或点击上传
              </span>
              <span className="image-uploader-hint">
                支持 PNG、JPG、GIF 等格式，最大 {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </span>
            </div>
          )}
        </div>
      ) : (
        // 预览和设置区域
        <div className="image-uploader-preview">
          <div className={`image-uploader-preview-image image-uploader-preview-image--${imageSize}`} style={{ textAlign: imageAlign }}>
            <img src={previewUrl} alt="Preview" />
          </div>

          <div className="image-uploader-controls">
            <div className="image-uploader-control-group">
              <label>尺寸</label>
              <div className="image-uploader-size-options">
                {(['small', 'medium', 'large', 'original'] as ImageSize[]).map((size) => (
                  <button
                    key={size}
                    className={`image-uploader-size-btn ${imageSize === size ? 'image-uploader-size-btn--active' : ''}`}
                    onClick={() => setImageSize(size)}
                  >
                    {size === 'small' && '小'}
                    {size === 'medium' && '中'}
                    {size === 'large' && '大'}
                    {size === 'original' && '原图'}
                  </button>
                ))}
              </div>
            </div>

            <div className="image-uploader-control-group">
              <label>对齐</label>
              <div className="image-uploader-align-options">
                {(['left', 'center', 'right'] as ImageAlign[]).map((align) => (
                  <button
                    key={align}
                    className={`image-uploader-align-btn ${imageAlign === align ? 'image-uploader-align-btn--active' : ''}`}
                    onClick={() => setImageAlign(align)}
                  >
                    {align === 'left' && '左对齐'}
                    {align === 'center' && '居中'}
                    {align === 'right' && '右对齐'}
                  </button>
                ))}
              </div>
            </div>

            <div className="image-uploader-control-group">
              <label>说明</label>
              <input
                type="text"
                className="image-uploader-caption-input"
                placeholder="添加图片说明..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <div className="image-uploader-actions">
              <button
                className="image-uploader-action-btn image-uploader-action-btn--primary"
                onClick={handleInsert}
              >
                插入图片
              </button>
              <button
                className="image-uploader-action-btn image-uploader-action-btn--secondary"
                onClick={handleCancel}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageUploader.displayName = 'ImageUploader';

export { ImageUploader };
export default ImageUploader;
