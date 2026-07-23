
// Sign up and log in for index.html.
//
// Accounts now live in the database on the server. The browser never sees a password
// other than the one being typed, and never holds the list of players.
//
// The live field validation below is unchanged - it is there to give quick feedback while
// typing. The server checks the same rules again when the form is submitted, because
// checks that run in the browser can be bypassed by anyone who wants to.

// The player currently logged in, or null. Filled in by checkLoginStatus().
let currentUser = null;

// HELPER FUNCTION (used throughout this file)

// shows an error message under a specific form field
function showFieldError(id, message){
    const field = document.getElementById(id);
    field.style.color = "";           // undo any green left over from a success message
    field.textContent = message;
}

// clears the error message under a specific form field
function clearFieldError(id){
    document.getElementById(id).textContent = "";
}

// shows a green success message when registration or login is successfull
function showFieldSuccess(id, message){
    const success = document.getElementById(id);
    success.textContent = message;
    success.style.color = "#00c864";
}

// clears all signup field error messages at once
function clearAllFieldErrors(){
    clearFieldError("fullname-error");
    clearFieldError("age-error");
    clearFieldError("username-error");
    clearFieldError("email-error");
    clearFieldError("password-error");
    clearFieldError("password_reentered-error");
    clearFieldError("signup-success");
}

// Takes the { fieldName: message } object the server sends back on a failed sign up
// and drops each message under the matching input.
function showServerFieldErrors(fields){
    Object.keys(fields || {}).forEach(field => {
        const target = document.getElementById(field + "-error");
        if(target) showFieldError(field + "-error", fields[field]);
    });
}

// Stops a submit button being clicked twice while the request is in flight.
function setFormBusy(formElement, busy){
    const submit = formElement.querySelector('input[type="submit"]');
    if(submit) submit.disabled = busy;
}

//--------------------------------------------------------------------------------------------
// the line above is a section divider for clear viewing

// REGEX PATTERNS (used for validation)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
const passwordRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})");

//--------------------------------------------------------------------------------------------

// Sign up and Log in modal references

const signupModal = document.getElementById("signupModal");
const openSignup = document.getElementById("openSignup");
const closeSignup = document.getElementById("closeSignup");

const loginModal = document.getElementById("loginModal");
const openLogin = document.getElementById("openLogin");
const closeLogin = document.getElementById("closeLogin");

const switchToLogin = document.getElementById("switchToLogin");
const switchToSignup = document.getElementById("switchToSignup");

//--------------------------------------------------------------------------------------------

// SIGNUP MODAL (open, close and outside modal click)

// Opens the sign up modal with a fade in effect
openSignup.addEventListener("click", () => 
    {signupModal.classList.add("active");

     signupModal.style.opacity = "0";//
     signupModal.style.transition = "opacity 0.3s ease";//
     setTimeout(() => signupModal.style.opacity = "1", 10);//
    }
);

// Closes the sign up modal
closeSignup.addEventListener("click", () => 
    {signupModal.classList.remove("active")
     form.reset()
     clearAllFieldErrors()

});

// Closes the sign up modal when clicking outside the form box
signupModal.addEventListener("click", (e) =>{
    if(e.target === signupModal){
        signupModal.classList.remove("active")
        form.reset()
        clearAllFieldErrors()
    };
});

//--------------------------------------------------------------------------------------------

// LOGIN MODAL (open, close and outside modal click)

// Opens the log in modal with a fade in effect
openLogin.addEventListener("click", () => {
    loginModal.classList.add("active");
    clearFieldError("login-error");
    loginModal.style.opacity = "0";
    loginModal.style.transition = "opacity 0.3s ease";
    setTimeout(() => loginModal.style.opacity = "1", 10);
});

// Closes the log in modal
closeLogin.addEventListener("click", () => {
                                loginModal.classList.remove("active");
                                clearFieldError("login-error");
                                clearFieldError("login-success");
                                loginForm.reset()
    
});

// Closes the log in modal when clicking outside the form box
loginModal.addEventListener("click", (e) =>{
    if(e.target === loginModal){
        loginModal.classList.remove("active");
        clearFieldError("login-error");
        clearFieldError("login-success");
        loginForm.reset()
    }
});

//--------------------------------------------------------------------------------------------

// MODAL SWITCHING (switching between the modals directly using the button present)

// switch from the sign up and log in modals
switchToLogin.addEventListener("click",()=> {
    signupModal.classList.remove("active");
    loginModal.classList.add("active");
    clearAllFieldErrors()
    clearFieldError("login-error");
});

// switch from the log in and sign up modals
switchToSignup.addEventListener("click",()=> {
    loginModal.classList.remove("active");
    signupModal.classList.add("active");
    loginForm.reset()
    clearFieldError("login-error");
});

//--------------------------------------------------------------------------------------------

// LIVE FIELD VALIDATION (validates each field when the user leaves it)

// validates full name when the user leaves the field
document.getElementById("fullname").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()
    if(!value){
        showFieldError("fullname-error", "Full name is required");

    }else{
        clearFieldError("fullname-error");
    }}
);

// validates age when the user leaves the field
document.getElementById("age").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()
    if(value<1 || value>100){
        showFieldError("age-error", "Age should be between 1 and 100");

    }else{
        clearFieldError("age-error");
    }}
);

// validates email format when the user leaves the field
document.getElementById("email").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()

    if(!emailRegex.test(value)){
        showFieldError("email-error", "Please enter a valid email address.");

    }else{
        clearFieldError("email-error");
    }}
);

// validates username when the user leaves the field
document.getElementById("username").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()

    if(!usernameRegex.test(value)){
        showFieldError("username-error", "Username must be 3-20 characters, letters, numbers and underscore only.");

    }else{
        clearFieldError("username-error");
    }}
);

// validates password strength when the user leaves the field
document.getElementById("password").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()

    if(!passwordRegex.test(value)){
        showFieldError("password-error", "Password must be at least 8 characters and include uppercase, lowercase and a number.");

    }else{
        clearFieldError("password-error");
    }
    }
);

// checks if passwords match when the user leaves the field
document.getElementById("password_reentered").addEventListener("blur", (e) =>{
    const value = e.target.value.trim()
    const password = document.getElementById("password").value;

    if(value != password){
        showFieldError("password_reentered-error", "Passwords do not match");

    }else{
        clearFieldError("password_reentered-error");
    }
    }
);

//--------------------------------------------------------------------------------------------
 
// REGISTRATION FORM SUBMISSION

const form = document.querySelector(".create-account")

form.addEventListener("submit", async (e) =>{
    // prevents page from refreshing
    e.preventDefault(); 
    
    const name = document.getElementById("fullname").value.trim();
    const age = document.getElementById("age").value;
    const email = document.getElementById("email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const password_reentered = document.getElementById("password_reentered").value;
    
    let valid = true;

    clearAllFieldErrors();

    // Validating fields on submit
    // errors are shown if fields are empty
    if(!name){
        showFieldError("fullname-error", "Full name is required");
        valid = false;  
    } 

    if(!age || age<1 || age>100){
        showFieldError("age-error", "Age should be between 1 and 100");
        valid = false;
    }
    

    if(!emailRegex.test(email)){
        showFieldError("email-error","Please enter a valid email address.");
        valid = false;
    }

    if(!usernameRegex.test(username)){
        showFieldError("username-error","Username must be 3-20 characters, letters, numbers and underscore only.");
        valid = false;
    }

    if(password !== password_reentered){
        showFieldError("password_reentered-error","Passwords do not match");
        valid = false;
    }

    if(!passwordRegex.test(password)){
        showFieldError("password-error","Password must be at least 8 characters and include uppercase, lowercase and a number.")
        valid = false;
    }

    // Stops here if any of the validation failed
    if(!valid) return;

    // The account is created on the server. Whether the username is already taken is
    // decided there too - the browser has no list of players to check against.
    setFormBusy(form, true);

    try{
        const result = await API.post("/api/auth/register", {
            fullname: name,
            age: Number(age),
            email,
            username,
            password
        });

        // Registering also logs the player in, so the page updates straight away.
        currentUser = result.user;

        // Message for successful registration
        showFieldSuccess("signup-success","Account created successfully! Welcome, " + result.user.username)

        // Closes modal after 1.5 seconds after successful registration
        setTimeout(()=>{
            form.reset();
            signupModal.classList.remove("active");    
            clearFieldError("signup-success");    
            checkLoginStatus();
        },1500);

    }catch(error){
        // The server sends back which fields were wrong, so each message lands under
        // the right input exactly like the browser-side checks do.
        if(error.fields && Object.keys(error.fields).length > 0){
            showServerFieldErrors(error.fields);
        }else{
            showFieldError("signup-success", error.message);
        }

    }finally{
        setFormBusy(form, false);
    }
})

//--------------------------------------------------------------------------------------------

// LOGIN FORM SUBMISSION

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) =>{
    e.preventDefault();

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    clearFieldError("login-error");

    // error message shown based on what is missing
    if(!username){
        showFieldError("login-error", "Please enter your username");
        return;
    }

    if(!password){
        showFieldError("login-error", "Please enter your password");
        return;
    }

    setFormBusy(loginForm, true);

    try{
        // The server checks the password against the stored hash and, if it matches,
        // sets a login cookie that every later request carries automatically.
        const result = await API.post("/api/auth/login", { username, password });

        currentUser = result.user;
        clearFieldError("login-error");
        showFieldSuccess("login-success","Login successful!")

        // modal is closed after 1.5 seconds after successful log in
        setTimeout(() =>{
            loginModal.classList.remove("active");
            loginForm.reset();
            checkLoginStatus();
            clearFieldError("login-success");            
        }, 1500)

    }catch(error){
        showFieldError("login-error", error.message);

    }finally{
        setFormBusy(loginForm, false);
    }
});

//--------------------------------------------------------------------------------------------

// LOG IN STATUS (updates the page based on whether the user is logged in)

// Updates the sign up/sign in card based on log in status
// Called on page load and after log in (called in script.js)
// Asks the server who is logged in, since the answer lives in a cookie the page
// cannot read for itself.
async function checkLoginStatus(){

    try{
        const result = await API.get("/api/auth/me");
        currentUser = result.user;
    }catch(error){
        currentUser = null;
    }

    const playNote = document.getElementById("playNote")

    if(currentUser){

        // Hides sign in/ log in buttons and shows welcome message + log out button
        document.getElementById("signButtons").style.display = "none";

        const welcome = document.getElementById("welcomeMessage");
        welcome.style.display= "block";
        welcome.textContent= "Welcome, " + currentUser.username + "!";
        
        playNote.innerHTML = "Want to logout? <a href='#second-row'><button class='small'>Click here</button></a>"

        document.getElementById("logoutBtn").style.display = "block";
    }else{

        // Shows sign in/ log in buttons and hides welcome message + log out button
        document.getElementById("signButtons").style.display= "block";
        document.getElementById("welcomeMessage").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none"; 
        playNote.innerHTML = "Not registered?/Sign In: <a href='#second-row'><button class='small'>Click here</button></a>"
    }
}

//--------------------------------------------------------------------------------------------

// LOG OUT button (clears the login cookie on the server and updates the page)

document.getElementById("logoutBtn").addEventListener("click", async () =>{
    try{
        await API.post("/api/auth/logout");
    }catch(error){
        // Even if the request fails, fall through and refresh the page state.
    }

    // The track and team picked this visit are UI state only, so clearing them on
    // logout just means the next player starts from a clean selection.
    sessionStorage.removeItem("selectedTrack");
    sessionStorage.removeItem("selectedTeam");

    currentUser = null;
    checkLoginStatus();
})
