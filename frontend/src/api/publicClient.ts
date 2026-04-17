import axios from 'axios';
import { API_URL } from '../config/api';

export const publicClient = axios.create({ baseURL: API_URL });
