import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://white-goat-900623.hostingersite.com';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export default api;
