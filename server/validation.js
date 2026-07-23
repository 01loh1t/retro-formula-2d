// Validation rules.
//
// These are the same rules the sign up form checks in the browser. They are repeated here
// because browser validation is only a convenience for the player - anyone can send a
// request straight to the API and skip the form entirely, so the server has to check again.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/;

// Checks a registration payload and returns { valid, errors }.
// errors is keyed by the form field id, so the browser can drop each message straight
// under the right input without any extra mapping.
function validateRegistration({ fullname, age, email, username, password }) {
    const errors = {};

    if (!fullname || !String(fullname).trim()) {
        errors.fullname = "Full name is required";
    } else if (String(fullname).trim().length > 100) {
        errors.fullname = "Full name is too long";
    }

    const ageNumber = Number(age);
    if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 100) {
        errors.age = "Age should be between 1 and 100";
    }

    if (!EMAIL_REGEX.test(String(email || "").trim())) {
        errors.email = "Please enter a valid email address.";
    }

    if (!USERNAME_REGEX.test(String(username || "").trim())) {
        errors.username = "Username must be 3-20 characters, letters, numbers and underscore only.";
    }

    if (!PASSWORD_REGEX.test(String(password || ""))) {
        errors.password = "Password must be at least 8 characters and include uppercase, lowercase and a number.";
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateRegistration, EMAIL_REGEX, USERNAME_REGEX, PASSWORD_REGEX };
