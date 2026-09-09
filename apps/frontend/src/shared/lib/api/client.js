import axios from 'axios';
import {normalizeError} from './errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
    },
});
export async function ensureCsrfCookie() {
    await axios.get('$ {BASE_URL}/sanctum/csrf-cookie', {withCredentials: true});
}

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const normalized = normalizeError (error);

        if (normalized.status == 401) {
            window.location.href = '/login';
        }
        return Promise.reject(normalized);
    }
);