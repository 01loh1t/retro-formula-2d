// Smooth scrolling effect for anchor links that point at a section on the page.
// Used for the Updates and Contact nav links on index.html, game.html and rankings.html.

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", (e) =>{
        const href = anchor.getAttribute("href");

        // A bare "#" is a placeholder link that goes nowhere - the social media icons
        // and the contact links use it. Passing "#" to querySelector throws a
        // SyntaxError because it is not a valid selector, so those are skipped here.
        if(href === "#"){
            e.preventDefault();
            return;
        }

        e.preventDefault();
        const target = document.querySelector(href);
        if(target){
            target.scrollIntoView({behavior: "smooth"});
        }
    });
});