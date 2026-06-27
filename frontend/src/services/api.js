import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateTestCases = async (userStory, priority, tags) => {
  const response = await api.post('/api/generate-testcases', {
    user_story: userStory,
    priority,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
  });
  return response.data;
};

export const generateScript = async (testCase, language, framework) => {
  const response = await api.post('/api/generate-script', {
    test_case: testCase,
    language,
    framework,
  });
  return response.data;
};

export const exportCSV = async (testCases) => {
  const response = await api.post('/api/export/csv', testCases, {
    responseType: 'blob',
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'test_cases.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default api;