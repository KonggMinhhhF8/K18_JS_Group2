import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm";

function getAccessToken() {
    return localStorage.getItem("accessToken");
}

function getRefreshToken() {
    return localStorage.getItem("refreshToken");
}

function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

function parseJwt(token) {
    try {
        const base64Payload = token.split(".")[1];
        return JSON.parse(atob(base64Payload));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    if (!token) return true;

    const decoded = parseJwt(token);
    if (!decoded?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now;
}

async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) return false;

    try {
        const response = await axios.post(
            "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com/auth/refresh-token",
            { refreshToken },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        return true;
    } catch (error) {
        console.log("REFRESH TOKEN ERROR:", error);
        return false;
    }
}

async function requireAuth() {
    const accessToken = getAccessToken();

    if (!accessToken) {
        clearTokens();
        window.location.href = "/app/login.html";
        return;
    }

    if (isTokenExpired(accessToken)) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            clearTokens();
            window.location.href = "/app/login.html";
            return;
        }
    }
}

requireAuth();
