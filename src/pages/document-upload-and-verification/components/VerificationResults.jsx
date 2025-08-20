import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VerificationResults = ({ results, onReset, onDownload }) => {
  const [expandedSections, setExpandedSections] = useState({
    student: true,
    father: false,
    mother: false,
    translated: false,
    rawJson: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev?.[section]
    }));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'exact_match': case'match':
        return 'text-success bg-success/10';
      case 'close_match': case'partial_match': case'warning':
        return 'text-warning bg-warning/10';
      case 'mismatch': case'missing': case'error':
        return 'text-error bg-error/10';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'exact_match': case'match':
        return 'CheckCircle';
      case 'close_match': case'partial_match': case'warning':
        return 'AlertTriangle';
      case 'mismatch': case'missing': case'error':
        return 'XCircle';
      default:
        return 'HelpCircle';
    }
  };

  const renderFieldComparison = (field, value, status) => (
    <div key={field} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground capitalize">
          {field?.replace(/_/g, ' ')}
        </span>
        <p className="text-sm text-muted-foreground mt-1 break-words">
          {value || 'Not provided'}
        </p>
      </div>
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
        <Icon name={getStatusIcon(status)} size={14} />
        <span className="capitalize">{status?.replace(/_/g, ' ') || 'Unknown'}</span>
      </div>
    </div>
  );

  const renderPassportSection = (title, data, sectionKey, isRequired = false) => {
    if (!data && !isRequired) return null;

    const hasData = data && Object.keys(data)?.length > 0;
    const isExpanded = expandedSections?.[sectionKey];

    return (
      <div className="bg-card border border-border rounded-lg shadow-minimal">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${hasData ? 'bg-success/10' : 'bg-muted'}`}>
              <Icon 
                name="FileText" 
                size={20} 
                className={hasData ? 'text-success' : 'text-muted-foreground'} 
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                {title}
                {isRequired && <span className="text-error ml-1">*</span>}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasData ? `${Object.keys(data)?.length} fields processed` : 'No data available'}
              </p>
            </div>
          </div>
          <Icon 
            name={isExpanded ? "ChevronUp" : "ChevronDown"} 
            size={20} 
            className="text-muted-foreground" 
          />
        </div>
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-border">
            {hasData ? (
              <div className="space-y-1 mt-4">
                {Object.entries(data)?.map(([field, fieldData]) => {
                  if (typeof fieldData === 'object' && fieldData !== null) {
                    return renderFieldComparison(field, fieldData?.value, fieldData?.status);
                  }
                  return renderFieldComparison(field, fieldData, 'unknown');
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No verification data available</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Verification Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Document analysis completed on {new Date()?.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={onDownload}
          >
            Export JSON
          </Button>
          <Button
            variant="secondary"
            iconName="RotateCcw"
            iconPosition="left"
            onClick={onReset}
          >
            New Verification
          </Button>
        </div>
      </div>
      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-lg">
              <Icon name="CheckCircle" size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exact Matches</p>
              <p className="text-2xl font-bold text-foreground">
                {results?.summary?.exact_matches || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-warning/10 rounded-lg">
              <Icon name="AlertTriangle" size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-foreground">
                {results?.summary?.warnings || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-error/10 rounded-lg">
              <Icon name="XCircle" size={20} className="text-error" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mismatches</p>
              <p className="text-2xl font-bold text-foreground">
                {results?.summary?.mismatches || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Detailed Results */}
      <div className="space-y-4">
        {renderPassportSection("Student Passport", results?.student, "student", true)}
        {renderPassportSection("Father Passport", results?.father, "father")}
        {renderPassportSection("Mother Passport", results?.mother, "mother")}
        {renderPassportSection("Translated Document", results?.translated, "translated", true)}
      </div>
      {/* Raw JSON Viewer */}
      <div className="bg-card border border-border rounded-lg shadow-minimal">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection('rawJson')}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg">
              <Icon name="Code" size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Raw JSON Data</h3>
              <p className="text-sm text-muted-foreground">Technical inspection view</p>
            </div>
          </div>
          <Icon 
            name={expandedSections?.rawJson ? "ChevronUp" : "ChevronDown"} 
            size={20} 
            className="text-muted-foreground" 
          />
        </div>

        {expandedSections?.rawJson && (
          <div className="px-4 pb-4 border-t border-border">
            <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto mt-4 max-h-96 overflow-y-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationResults;