/**
 * Returns a function that can be used to set
 * and hide error text for an input on the screen.
 * @param {string} id ID of error text element
 * @returns {function} A function that takes in text or nothing.
 */
const errorManager = (id) => {
    const errorElement = document.getElementById(id);
    return (message) => {
        errorElement.innerText = message || '';
        errorElement.style.display = message ? 'block' : 'hidden';
    };
};

/**
 * Handles submitting a form over AJAX.
 * @param {string} formId ID of the form element.
 * @param {string} method Method to submit with.
 * @param {string} action Route to submit to.
 * @param {function} handler Submission handler, should return the validated data to submit.
 */
const handleForm = (formId, method, action, handler) => {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = handler(new FormData(form));
        if (!data) return;
        const response = await fetch(action, {
            body: JSON.stringify(data),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: method
        });
        const responseData = (await response.json());
        if (!response.ok) {
            alert(responseData.error || 'Internal server error.');
            return;
        }
        if(responseData.redirect)
            window.location = responseData.redirect;
    });
};

const commentDate = (d) => {
    const today = (new Date()).toDateString();
    const comp = new Date(d);
    if (today !== comp.toDateString())
        return comp.toLocaleDateString();
    const hour = comp.getHours();
    const strHour = hour % 12 === 0 ? 12 : hour % 12;
    const strMinutes = comp.getMinutes().toString().padStart(2, '0');
    return `${strHour}:${strMinutes} ${hour >= 12 ? 'PM' : 'AM'}`;
};
