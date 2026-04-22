const API_BASE_URL = 'http://localhost:5114/api';

class ApiService {
  // Helper method for making requests
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      let data;
      try {
      data = await response.json();
      } catch {
      data = { message: 'Invalid JSON response' };
      }

      console.log('API Response:', { 
      status: response.status, 
      url, 
      data 
      });

      if (!response.ok) {
      const errorMsg = data.message || data.error || JSON.stringify(data);
      throw new Error(errorMsg);
    }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password, userType) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, userType }),
    });
  }

  async registerUser(userData) {
    return this.request('/auth/register/user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async registerCraftsman(craftsmanData) {
    return this.request('/auth/register/craftsman', {
      method: 'POST',
      body: JSON.stringify(craftsmanData),
    });
  }

  // Craftsman endpoints
  async getCraftsmanProfile(id) {
    return this.request(`/craftsmen/${id}`);
  }

  async updateCraftsman(id, craftsmanData) {
    return this.request(`/craftsmen/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...craftsmanData,
        craftsmanId: id
      }),
    });
  }

  async rateCraftsman(craftsmanId, rating) {
    return this.request(`/craftsmen/${craftsmanId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  // Job Orders endpoints
  async getJobOrdersByCraftsman(craftsmanId) {
    return this.request(`/joborders/craftsman/${craftsmanId}`);
  }

  async createJobOrder(jobOrder) {
    return this.request('/joborders', {
      method: 'POST',
      body: JSON.stringify(jobOrder),
    });
  }

  async updateJobOrder(id, jobOrder) {
    return this.request(`/joborders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobOrder),
    });
  }

  async deleteJobOrder(id) {
    return this.request(`/joborders/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserProfile(id) {
    return this.request(`/users/${id}`);
  }

async getJobOrdersByUser(userId) {
    return this.request(`/joborders/user/${userId}`);
  }

async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...userData,
        userId: id
      }),
    });
  }
  async updateJobStatus(id, status) {
  return this.request(`/joborders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

  async submitJobReview(jobOrderId, rating, comment, userId) {
    return this.request(`/joborders/${jobOrderId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment, userId }),
    });
  }

  async getCraftsmanReviews(craftsmanId) {
    return this.request(`/craftsmen/${craftsmanId}/reviews`);
  }

  // ── Job Requests ──────────────────────────────────────────────────────────

  async createJobRequest(data) {
    return this.request('/job-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadJobRequestImage(requestId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('accessToken');
    const url = `${API_BASE_URL}/job-requests/${requestId}/upload-image`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload greška');
    return data;
  }

  async getJobRequest(id) {
    return this.request(`/job-requests/${id}`);
  }

  async getJobRequestsByUser(userId) {
    return this.request(`/job-requests/user/${userId}`);
  }

  async getJobRequestsByCraftsman(craftsmanId) {
    return this.request(`/job-requests/craftsman/${craftsmanId}`);
  }

  async acceptJobRequest(id, estimatedHours, estimatedMinutes) {
    return this.request(`/job-requests/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ estimatedHours, estimatedMinutes }),
    });
  }

  async declineJobRequest(id, by) {
    return this.request(`/job-requests/${id}/decline?by=${by}`, {
      method: 'POST',
    });
  }

  async confirmJobRequest(id) {
    return this.request(`/job-requests/${id}/confirm`, {
      method: 'POST',
    });
  }

  async createJobOrderFromRequest(requestId) {
    return this.request(`/job-requests/${requestId}/create-job-order`, {
      method: 'POST',
    });
  }

  // ── Site Surveys (izviđanje terena) ──────────────────────────────────────

  async proposeSurvey(jobRequestId, scheduledDate, scheduledTime, surveyPrice) {
    return this.request(`/site-surveys/propose/${jobRequestId}`, {
      method: 'POST',
      body: JSON.stringify({ scheduledDate, scheduledTime, surveyPrice }),
    });
  }

  async declineSurveyProposal(surveyId) {
    return this.request(`/site-surveys/${surveyId}/decline-proposal`, {
      method: 'POST',
    });
  }

  async activateSurvey(surveyId) {
    return this.request(`/site-surveys/${surveyId}/activate`, {
      method: 'POST',
    });
  }

  async cancelSurvey(surveyId, by) {
    return this.request(`/site-surveys/${surveyId}/cancel?by=${by}`, {
      method: 'POST',
    });
  }

  async getSurveysByUser(userId) {
    return this.request(`/site-surveys/by-user/${userId}`);
  }

  async getSurveysByCraftsman(craftsmanId) {
    return this.request(`/site-surveys/by-craftsman/${craftsmanId}`);
  }

  async getSurveyByJobRequest(jobRequestId) {
    return this.request(`/site-surveys/by-job-request/${jobRequestId}`);
  }

  async proposeSurveyReschedule(surveyId, newDate, newTime, proposedBy) {
    return this.request(`/site-surveys/${surveyId}/propose-reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, newTime, proposedBy }),
    });
  }

  async acceptSurveyReschedule(surveyId) {
    return this.request(`/site-surveys/${surveyId}/accept-reschedule`, {
      method: 'POST',
    });
  }

  async declineSurveyReschedule(surveyId) {
    return this.request(`/site-surveys/${surveyId}/decline-reschedule`, {
      method: 'POST',
    });
  }

  async completeSurvey(surveyId, estimatedMinutes) {
    return this.request(`/site-surveys/${surveyId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ estimatedMinutes }),
    });
  }

  // Plaćanje izviđanja — koristi isti /api/payments/initiate sa surveyId
  async initiateSurveyPayment(surveyId, userId, craftsmanId, amount) {
    return this.request('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ surveyId, userId, craftsmanId, amount }),
    });
  }

  // ── Reschedule ────────────────────────────────────────────────────────────

  async proposeReschedule(jobId, newDate, newTime, proposedBy) {
    return this.request(`/joborders/${jobId}/propose-reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, newTime, proposedBy }),
    });
  }

  async acceptReschedule(jobId) {
    return this.request(`/joborders/${jobId}/accept-reschedule`, {
      method: 'POST',
    });
  }

  async declineReschedule(jobId) {
    return this.request(`/joborders/${jobId}/decline-reschedule`, {
      method: 'POST',
    });
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  async getNotifications(recipientId, recipientType, limit = 50) {
    return this.request(`/notifications?recipientId=${recipientId}&recipientType=${recipientType}&limit=${limit}`);
  }

  async getUnreadCount(recipientId, recipientType) {
    return this.request(`/notifications/unread-count?recipientId=${recipientId}&recipientType=${recipientType}`);
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(recipientId, recipientType) {
    return this.request(`/notifications/read-all?recipientId=${recipientId}&recipientType=${recipientType}`, {
      method: 'PATCH',
    });
  }
  
  async deleteNotification(notificationId) {
  return this.request(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}
}

export default new ApiService();