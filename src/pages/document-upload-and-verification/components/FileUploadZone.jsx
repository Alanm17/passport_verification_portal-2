import React, { useRef, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FileUploadZone = ({ 
  title, 
  required = false, 
  file, 
  onFileSelect, 
  error, 
  disabled = false 
}) => {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes?.includes(selectedFile?.type)) {
      onFileSelect(null, 'Please select a valid image (JPEG, PNG) or PDF file');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (selectedFile?.size > maxSize) {
      onFileSelect(null, 'File size must be less than 50MB');
      return;
    }

    onFileSelect(selectedFile, null);
  };

  const handleDragOver = (e) => {
    e?.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFile = e?.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e) => {
    const selectedFile = e?.target?.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleBrowseClick = () => {
    if (!disabled && fileInputRef?.current) {
      fileInputRef?.current?.click();
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null, null);
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          {title}
          {required && (
            <span className="text-error ml-1" title="Required field">*</span>
          )}
        </h3>
        {!required && (
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Optional
          </span>
        )}
      </div>
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
          ${isDragOver && !disabled 
            ? 'border-primary bg-primary/5' 
            : file 
              ? 'border-success bg-success/5' 
              : error 
                ? 'border-error bg-error/5' :'border-border bg-muted/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-primary/5'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!file && !disabled ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {file ? (
          /* File Selected State */
          (<div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg">
                <Icon 
                  name={file?.type === 'application/pdf' ? 'FileText' : 'Image'} 
                  size={24} 
                  className="text-success" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file?.size)} • {file?.type?.split('/')?.[1]?.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-success/10 rounded-full">
                <Icon name="Check" size={16} className="text-success" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                iconSize={16}
                className="text-muted-foreground hover:text-error"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleRemoveFile();
                }}
                disabled={disabled}
              >
                Remove
              </Button>
            </div>
          </div>)
        ) : (
          /* Empty State */
          (<div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-lg mx-auto mb-4">
              <Icon 
                name="Upload" 
                size={32} 
                className={error ? "text-error" : "text-muted-foreground"} 
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse files
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center">
                  <Icon name="FileImage" size={14} className="mr-1" />
                  JPEG, PNG
                </span>
                <span className="flex items-center">
                  <Icon name="FileText" size={14} className="mr-1" />
                  PDF
                </span>
                <span className="flex items-center">
                  <Icon name="HardDrive" size={14} className="mr-1" />
                  Max 50MB
                </span>
              </div>
            </div>
          </div>)
        )}
      </div>
      {/* Error Message */}
      {error && (
        <div className="flex items-center mt-2 text-sm text-error">
          <Icon name="AlertCircle" size={16} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;