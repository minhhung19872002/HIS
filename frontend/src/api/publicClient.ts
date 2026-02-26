import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

export const publicClient = axios.create({ baseURL: API_URL });
