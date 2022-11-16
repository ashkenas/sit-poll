const handleForm = async (formId, method, action, handler) => {
    const submit = async (data) => {
        return await fetch(action, {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: method
        });
    }
    document.getElementById(formId).addEventListener('submit', (event) => {
        event.preventDefault();
        handler(submit);
    });
};
