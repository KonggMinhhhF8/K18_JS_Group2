import { z } from "https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm";
import axios from "https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm";

const BASE_URL = "https://k305jhbh09.execute-api.ap-southeast-1.amazonaws.com";
const DASHBOARD_PAGE = "../app/index.html";


const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email không được để trống")
        .email("Email không đúng định dạng"),
    password: z
        .string()
        .min(1, "Mật khẩu không được để trống")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const formStatus = document.getElementById("formStatus");
const togglePassword = document.getElementById("togglePassword");

function setTokens(accessToken, refreshToken) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
}

function clearErrors() {
    emailError.textContent = "";
    passwordError.textContent = "";
    formStatus.textContent = "";

    emailInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error");
}

function showFieldError(field, message) {
    if (field === "email") {
        emailError.textContent = message;
        emailInput.classList.add("input-error");
    }

    if (field === "password") {
        passwordError.textContent = message;
        passwordInput.classList.add("input-error");
    }
}

function validateForm(data) {
    clearErrors();

    const result = loginSchema.safeParse(data);

    if (!result.success) {
        result.error.issues.forEach((issue) => {
            const field = issue.path[0];
            showFieldError(field, issue.message);
        });
        return false;
    }

    return true;
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = {
            email: emailInput.value.trim(),
            password: passwordInput.value.trim(),
        };

        const isValid = validateForm(formData);
        if (!isValid) return;


        try {
            formStatus.style.color = "#2c3e50";
            formStatus.textContent = "Đang đăng nhập...";

            const response = await axios.post(
                `${BASE_URL}/auth/signin`,
                formData,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            const { accessToken, refreshToken } = response.data;

            setTokens(accessToken, refreshToken);

            formStatus.style.color = "#27ae60";
            formStatus.textContent =
                "Đăng nhập thành công! Đang chuyển hướng...";

            setTimeout(() => {
                window.location.href = DASHBOARD_PAGE;
            }, 800);
        } catch (error) {
            formStatus.style.color = "#e74c3c";
            formStatus.textContent =
                 "Sai email hoặc mật khẩu";
        }
    });
}

if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        togglePassword.innerHTML = isHidden
            ? '<i class="fas fa-eye-slash"></i>'
            : '<i class="fas fa-eye"></i>';
    });
}

if (emailInput) {
    emailInput.addEventListener("input", () => {
        emailError.textContent = "";
        emailInput.classList.remove("input-error");
        formStatus.textContent = "";
    });
}

if (passwordInput) {
    passwordInput.addEventListener("input", () => {
        passwordError.textContent = "";
        passwordInput.classList.remove("input-error");
        formStatus.textContent = "";
    });
}
