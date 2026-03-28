const BASE_URL = 'https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com';

async function request(endpoint, method = 'GET', payload = null) {
    const url = `${BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (payload) {
        options.body = JSON.stringify(payload);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            // 401 -> Login page
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '../login.html';
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Lỗi hệ thống');
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Error] ${method} ${url}:`, error.message);
        throw error;
    }
}

// Export shared methods
export const api = {
    get: (endpoint) => request(endpoint, 'GET'),
    post: (endpoint, data) => request(endpoint, 'POST', data),
    put: (endpoint, data) => request(endpoint, 'PUT', data),
    patch: (endpoint, data) => request(endpoint, 'PATCH', data),
    delete: (endpoint) => request(endpoint, 'DELETE'),
};