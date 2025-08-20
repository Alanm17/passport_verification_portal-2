import React from 'react';
import Icon from '../../../components/AppIcon';

const LoadingState = ({ progress = 0 }) => {
  const steps = [
    { id: 1, label: 'Uploading documents', icon: 'Upload' },
    { id: 2, label: 'Processing images', icon: 'Image' },
    { id: 3, label: 'Extracting text data', icon: 'FileText' },
    { id: 4, label: 'Comparing information', icon: 'Search' },
    { id: 5, label: 'Generating results', icon: 'CheckCircle' }
  ];

  const currentStep = Math.min(Math.ceil((progress / 100) * steps?.length), steps?.length);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      {/* Main Loading Animation */}
      <div className="relative mb-8">
        <div className="w-24 h-24 border-4 border-muted rounded-full"></div>
        <div 
          className="absolute top-0 left-0 w-24 h-24 border-4 border-primary rounded-full border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="Shield" size={32} className="text-primary" />
        </div>
      </div>
      {/* Progress Information */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Verifying Documents
        </h2>
        <p className="text-muted-foreground mb-4">
          Please wait while we analyze your passport documents...
        </p>
        
        {/* Progress Bar */}
        <div className="w-80 max-w-full bg-muted rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {progress}% Complete
        </p>
      </div>
      {/* Processing Steps */}
      <div className="w-full max-w-md space-y-3">
        {steps?.map((step, index) => {
          const isCompleted = index + 1 < currentStep;
          const isCurrent = index + 1 === currentStep;
          const isPending = index + 1 > currentStep;

          return (
            <div 
              key={step?.id}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                isCompleted 
                  ? 'bg-success/10 text-success' 
                  : isCurrent 
                    ? 'bg-primary/10 text-primary' :'bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isCompleted 
                  ? 'bg-success text-white' 
                  : isCurrent 
                    ? 'bg-primary text-white' :'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? (
                  <Icon name="Check" size={16} />
                ) : (
                  <Icon 
                    name={step?.icon} 
                    size={16} 
                    className={isCurrent ? 'animate-pulse' : ''} 
                  />
                )}
              </div>
              <span className={`text-sm font-medium ${
                isCompleted ? 'line-through opacity-75' : ''
              }`}>
                {step?.label}
              </span>
              {isCurrent && (
                <div className="flex space-x-1 ml-auto">
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Additional Information */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground max-w-md">
          This process typically takes 30-60 seconds depending on document size and complexity. 
          Please do not refresh or close this page.
        </p>
      </div>
    </div>
  );
};

export default LoadingState;