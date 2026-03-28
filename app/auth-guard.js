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
        const response = await fetch("https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com/auth/refresh-token",{            
         method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        return true;
    } catch {
        return false;
    }
}

async function requireAuth() {
    const accessToken = getAccessToken();

    if (!accessToken) {
        clearTokens();
        window.location.href = "../app/login.html";
        return;
    }

    if (isTokenExpired(accessToken)) {
        const refreshed = await refreshAccessToken();

        if (!refreshed) {
            clearTokens();
            window.location.href = "../app/login.html";
        }
    }
}

requireAuth();
