import React, { useState, useEffect } from "react";
import Header from "../../components/ui/Header";
import FileUploadZone from "./components/FileUploadZone";
import VerificationResults from "./components/VerificationResults";
import LoadingState from "./components/LoadingState";
import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import { verifyDocuments, checkServerHealth } from "../../utils/api";

const DocumentUploadAndVerification = () => {
  const [files, setFiles] = useState({
    student: null,
    father: null,
    mother: null,
    translated: null,
  });

  const [errors, setErrors] = useState({
    student: null,
    father: null,
    mother: null,
    translated: null,
    general: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking");

  // Check server health on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        await checkServerHealth();
        setServerStatus("online");
      } catch (error) {
        setServerStatus("offline");
        console.error("Server health check failed:", error);
      }
    };

    checkServer();
  }, []);

  const handleFileSelect = (type, file, error) => {
    setFiles((prev) => ({
      ...prev,
      [type]: file,
    }));

    setErrors((prev) => ({
      ...prev,
      [type]: error,
      general: null,
    }));
  };

  const validateForm = () => {
    const newErrors = { ...errors };
    let isValid = true;

    // Check required files
    if (!files?.student) {
      newErrors.student = "Student passport is required";
      isValid = false;
    }

    if (!files?.translated) {
      newErrors.translated = "Translated document is required";
      isValid = false;
    }

    // Check if at least one parent passport is provided
    if (!files?.father && !files?.mother) {
      newErrors.general =
        "At least one parent passport (Father or Mother) is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Check server status before submitting
    if (serverStatus === "offline") {
      setErrors((prev) => ({
        ...prev,
        general:
          "Unable to connect to verification server. Please check if the server is running on http://localhost:8000",
      }));
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setShowResults(false);
    setErrors((prev) => ({ ...prev, general: null }));

    try {
      const response = await verifyDocuments(files, (progress) => {
        // Update upload progress
        setLoadingProgress(Math.min(progress, 90)); // Reserve 90-100% for processing
      });

      // Simulate processing time after upload
      setLoadingProgress(95);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setLoadingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      setResults(response);
      setShowResults(true);
    } catch (error) {
      console.error("Document verification failed:", error);
      setErrors((prev) => ({
        ...prev,
        general: error?.message || "Verification failed. Please try again.",
      }));
    } finally {
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleReset = () => {
    setFiles({
      student: null,
      father: null,
      mother: null,
      translated: null,
    });
    setErrors({
      student: null,
      father: null,
      mother: null,
      translated: null,
      general: null,
    });
    setResults(null);
    setShowResults(false);
    setIsLoading(false);
    setLoadingProgress(0);
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `verification-results-${
      new Date()?.toISOString()?.split("T")?.[0]
    }.json`;

    const linkElement = document.createElement("a");
    linkElement?.setAttribute("href", dataUri);
    linkElement?.setAttribute("download", exportFileDefaultName);
    linkElement?.click();
  };

  const canSubmit =
    files?.student &&
    files?.translated &&
    (files?.father || files?.mother) &&
    serverStatus === "online";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <LoadingState progress={loadingProgress} />
        </main>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8 max-w-4xl">
          <VerificationResults
            results={results}
            onReset={handleReset}
            onDownload={handleDownload}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4">
            <Icon name="Shield" size={32} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Upload & Verification
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload family passport documents and translated materials for
            comprehensive verification analysis. Our system will compare
            information across all documents and provide detailed matching
            results.
          </p>

          {/* Server Status Indicator */}
          <div className="flex items-center justify-center mt-4">
            <div
              className={`flex items-center px-3 py-1 rounded-full text-sm ${
                serverStatus === "online"
                  ? "bg-success/10 text-success"
                  : serverStatus === "offline"
                  ? "bg-error/10 text-error"
                  : "bg-warning/10 text-warning"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  serverStatus === "online"
                    ? "bg-success animate-pulse"
                    : serverStatus === "offline"
                    ? "bg-error"
                    : "bg-warning animate-pulse"
                }`}
              ></div>
              {serverStatus === "online" && "Server Online"}
              {serverStatus === "offline" && "Server Offline"}
              {serverStatus === "checking" && "Checking Server..."}
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-lg shadow-minimal p-6">
            <div className="space-y-8">
              {/* General Error */}
              {errors?.general && (
                <div className="flex items-center p-4 bg-error/10 border border-error/20 rounded-lg">
                  <Icon
                    name="AlertCircle"
                    size={20}
                    className="text-error mr-3 flex-shrink-0"
                  />
                  <span className="text-sm text-error">{errors?.general}</span>
                </div>
              )}

              {/* Server Offline Warning */}
              {serverStatus === "offline" && (
                <div className="flex items-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <Icon
                    name="AlertTriangle"
                    size={20}
                    className="text-warning mr-3 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-warning font-medium">
                      Server Connection Issue
                    </div>
                    <div className="text-xs text-warning/80 mt-1">
                      Cannot connect to verification server at
                      http://localhost:8000. Please ensure the backend server is
                      running.
                    </div>
                  </div>
                </div>
              )}

              {/* File Upload Zones */}
              <FileUploadZone
                title="Student Passport"
                required
                file={files?.student}
                onFileSelect={(file, error) =>
                  handleFileSelect("student", file, error)
                }
                error={errors?.student}
                disabled={isLoading || serverStatus === "offline"}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadZone
                  title="Father Passport"
                  file={files?.father}
                  onFileSelect={(file, error) =>
                    handleFileSelect("father", file, error)
                  }
                  error={errors?.father}
                  disabled={isLoading || serverStatus === "offline"}
                />

                <FileUploadZone
                  title="Mother Passport"
                  file={files?.mother}
                  onFileSelect={(file, error) =>
                    handleFileSelect("mother", file, error)
                  }
                  error={errors?.mother}
                  disabled={isLoading || serverStatus === "offline"}
                />
              </div>

              <FileUploadZone
                title="Document To Check"
                required
                file={files?.translated}
                onFileSelect={(file, error) =>
                  handleFileSelect("translated", file, error)
                }
                error={errors?.translated}
                disabled={isLoading || serverStatus === "offline"}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border space-y-4 sm:space-y-0">
                <div className="text-sm text-muted-foreground">
                  <Icon name="Info" size={16} className="inline mr-2" />
                  At least one parent passport is required for verification
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    iconName="RotateCcw"
                    iconPosition="left"
                    onClick={handleReset}
                    disabled={
                      isLoading ||
                      (!files?.student &&
                        !files?.father &&
                        !files?.mother &&
                        !files?.translated)
                    }
                  >
                    Reset Form
                  </Button>

                  <Button
                    variant="default"
                    iconName="Shield"
                    iconPosition="left"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    loading={isLoading}
                  >
                    Verify Documents
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mx-auto mb-3">
                <Icon name="Shield" size={24} className="text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Secure Processing
              </h3>
              <p className="text-sm text-muted-foreground">
                All documents are processed securely and deleted after
                verification
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3">
                <Icon name="Zap" size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Fast Analysis
              </h3>
              <p className="text-sm text-muted-foreground">
                Advanced OCR technology provides results in under 60 seconds
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-3">
                <Icon name="CheckCircle" size={24} className="text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Accurate Results
              </h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive field-by-field comparison with detailed status
                reports
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentUploadAndVerification;
