import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './BugReportForm.css';

// Helper function to get browser and device info
const getBrowserDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  
  return {
    userAgent,
    platform,
    language,
    screenResolution,
    viewport,
    timestamp: new Date().toISOString()
  };
};

const BugReportForm = ({ onSubmit, isSubmitting = false, selectedRepo }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    screenshot: null,
    deviceInfo: getBrowserDeviceInfo()
  });
  
  const [errors, setErrors] = useState({});
  const [filePreview, setFilePreview] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', or null
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    // Update device info on component mount
    setFormData(prev => ({
      ...prev,
      deviceInfo: getBrowserDeviceInfo()
    }));
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFile = (file) => {
    if (!file) return null;
    
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validImageTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, WebP)';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const fileError = validateFile(file);
    
    if (fileError) {
      setErrors(prev => ({
        ...prev,
        screenshot: fileError
      }));
      setFormData(prev => ({
        ...prev,
        screenshot: null
      }));
      setFilePreview(null);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      screenshot: file
    }));
    
    // Clear file error
    setErrors(prev => ({
      ...prev,
      screenshot: ''
    }));
    
    // Create preview for images
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitStatus(null);
      const submitData = {
        ...formData,
        repository_id: selectedRepo?.id || null
      };
      await onSubmit(submitData);
      setSubmitStatus('success');
      setSubmitMessage('Bug report submitted successfully!');
      
      // Clear form on success
      setFormData({
        title: '',
        description: '',
        screenshot: null,
        deviceInfo: getBrowserDeviceInfo()
      });
      setFilePreview(null);
      setErrors({});
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'Failed to submit bug report. Please try again.');
    }
  };

  const formatDeviceInfo = (deviceInfo) => {
    return `Browser: ${deviceInfo.userAgent}
Platform: ${deviceInfo.platform}
Language: ${deviceInfo.language}
Screen: ${deviceInfo.screenResolution}
Viewport: ${deviceInfo.viewport}
Timestamp: ${deviceInfo.timestamp}`;
  };

  return (
    <form onSubmit={handleSubmit} className="bug-report-form">
      <h2>Report a Bug</h2>
      
      {selectedRepo && (
        <div className="selected-repository">
          <strong>Repository:</strong> {selectedRepo.owner.login}/{selectedRepo.name}
          {selectedRepo.description && (
            <p className="repo-description">{selectedRepo.description}</p>
          )}
        </div>
      )}
      
      {submitStatus === 'success' && (
        <div className="success-message" role="alert">
          {submitMessage}
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="error-message" role="alert">
          {submitMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={errors.title ? 'error' : ''}
          placeholder="Brief description of the issue"
        />
        {errors.title && <span className="error-text">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className={errors.description ? 'error' : ''}
          placeholder="Detailed description of the bug..."
          rows="5"
        />
        {errors.description && <span className="error-text">{errors.description}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="screenshot">Screenshot (optional)</label>
        <input
          type="file"
          id="screenshot"
          name="screenshot"
          accept="image/*"
          onChange={handleFileChange}
          className={errors.screenshot ? 'error' : ''}
        />
        {errors.screenshot && <span className="error-text">{errors.screenshot}</span>}
        
        {filePreview && (
          <div className="file-preview">
            <img src={filePreview} alt="Screenshot preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="deviceInfo">Browser/Device Info (Auto-filled)</label>
        <textarea
          id="deviceInfo"
          name="deviceInfo"
          value={formatDeviceInfo(formData.deviceInfo)}
          readOnly
          rows="5"
          className="device-info-display"
        />
      </div>

      <div className="form-actions">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? (
            <>
              <span className="loading-spinner" />
              Submitting...
            </>
          ) : (
            'Submit Bug Report'
          )}
        </button>
      </div>
    </form>
  );
};

BugReportForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  selectedRepo: PropTypes.object
};

export default BugReportForm;
