import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm";

const BASE_URL = "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com";

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("accessToken");

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/app/login.html";
        }

        return Promise.reject(error);
    }
);

export const api = {
    get: async (endpoint, config = {}) => {
        const response = await apiClient.get(endpoint, config);
        return response.data;
    },

    post: async (endpoint, data = {}, config = {}) => {
        const response = await apiClient.post(endpoint, data, config);
        return response.data;
    },

    put: async (endpoint, data = {}, config = {}) => {
        const response = await apiClient.put(endpoint, data, config);
        return response.data;
    },

    patch: async (endpoint, data = {}, config = {}) => {
        const response = await apiClient.patch(endpoint, data, config);
        return response.data;
    },

    delete: async (endpoint, config = {}) => {
        const response = await apiClient.delete(endpoint, config);
        return response.data;
    },
};
