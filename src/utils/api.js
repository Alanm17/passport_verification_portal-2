import axios from "axios";

// Create axios instance with base configuration
const api = axios?.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000, // 30 seconds timeout for file uploads
  // Remove default Content-Type header to let browser set it automatically for FormData
});

// Request interceptor for adding common headers
api?.interceptors?.request?.use(
  (config) => {
    // Add any auth headers if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api?.interceptors?.response?.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error?.code === "ECONNREFUSED") {
      throw new Error(
        "Unable to connect to verification server. Please check if the server is running."
      );
    }

    if (error?.response?.status === 413) {
      throw new Error("File size too large. Please use smaller files.");
    }

    if (error?.response?.status === 415) {
      throw new Error(
        "Unsupported file format. Please use PDF, JPG, or PNG files."
      );
    }

    if (error?.response?.status >= 500) {
      throw new Error("Server error occurred. Please try again later.");
    }

    if (error?.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
);

// Document verification API
export const verifyDocuments = async (files, onProgress = null) => {
  try {
    const formData = new FormData();

    // Append files to form data with exact field names expected by backend
    if (files?.student) {
      formData?.append("student_passport", files?.student);
    }
    if (files?.father) {
      formData?.append("father_passport", files?.father);
    }
    if (files?.mother) {
      formData?.append("mother_passport", files?.mother);
    }
    if (files?.translated) {
      formData?.append("translated_doc", files?.translated);
    }

    // Log FormData contents for debugging
    console.log("Sending FormData with files:");
    for (let [key, value] of formData?.entries()) {
      console.log(`${key}:`, value?.name || value);
    }

    const response = await api?.post("/check-docs", formData, {
      // Don't set Content-Type header - let browser set it automatically with boundary
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent?.total) {
          const percentCompleted = Math.round(
            (progressEvent?.loaded * 100) / progressEvent?.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return response?.data;
  } catch (error) {
    console.error("Document verification failed:", error);

    // Enhanced error logging for debugging
    if (error?.response) {
      console.error("Response status:", error?.response?.status);
      console.error("Response data:", error?.response?.data);
      console.error("Response headers:", error?.response?.headers);
    }

    throw error;
  }
};

// Health check API
export const checkServerHealth = async () => {
  try {
    const response = await api?.get("/health", {
      timeout: 5000, // 5 seconds timeout for health check
    });
    return response?.data;
  } catch (error) {
    console.error("Server health check failed:", error);
    return false;
  }
};

export default api;
