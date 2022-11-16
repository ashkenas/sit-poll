const handleForm = async (formId, method, action, handler) => {
    document.getElementById(formId).addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = handler(event);
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
            alert(responseData.error);
            return;
        }
        if(responseData.redirect)
            window.location = responseData.redirect;
    });
};
