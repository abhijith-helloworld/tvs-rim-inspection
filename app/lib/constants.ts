export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.240:8002/api";

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/accounts/login/`,
  REFRESH: `${API_BASE_URL}/accounts/token/refresh/`,
  USER_PROFILE: `${API_BASE_URL}/user/profile/`,

  // Add more endpoints as needed
};

export const WHEEL_COLORS = [
  { name: 'Obsidian Black', value: '#1a1a1a', defectRate: '1.2%' },
  { name: 'Pearl White', value: '#f5f5dc', defectRate: '0.8%' },
  { name: 'Bronze Bronze', value: '#2d1b00', defectRate: '2.5%' },
];
