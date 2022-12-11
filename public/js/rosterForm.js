const {requireEmail, requireString} = require("../../validation");

// returns 0 if no input is provided
// returns -1 if input format is invalid
// array of emails otherwise (or empty array)
const checkInputFormat = (str, required) => {
  // if no input and not required, not valid
  if(!str.trim() && required) return 0;

  // if no input and not required, return empty array
  if(!str.trim() && !required) return [];

  // if string does not end with comma or '@stevens.edu', not a valid format
  if(str.charAt(str.length - 1) !== ',' && str.endsWith('@stevens.edu')) return -1;

  // if two commas exist in a row, not a valid format
  if(str.indexOf(',,') !== -1) return -1;

  // if there is only one email given (no commas present)
  if(str.indexOf(',') === -1) {
    return [requireEmail(str)];
  }

  // check that all emails are of valid form
  const emails = [];
  while(str.trim().length !== 0) {
    let email = "";

    if(str.indexOf(',') !== -1) {
      email = str.substring(0, str.indexOf(',')).trim();
      email = requireEmail(email);
      emails.push(email);
      str = str.substring(str.indexOf(',') + 1).trim();
    } else {
      email = requireEmail(str.trim());
      emails.push(email);
      str = "";
    }
  }
  return emails;
}

let form = document.getElementById('create-roster-form');
let titleInput = document.getElementById('titleInput');
let titleLabel = document.getElementById('rosterLabel');
let studentEmailInput = document.getElementById('studentEmailInput');
let studentEmailLabel = document.getElementById('studentLabel');
let assistantEmailInput = document.getElementById('assistantEmailInput');
let assistantEmailLabel = document.getElementById('assistantLabel');
let errorDiv = document.getElementById('error');
//let resultsList = document.getElementById('results');
//let formLabel = document.getElementById('inputLabel');
//let isGreen = false;

if (form) {
  form.addEventListener('submit', (event) => {
    console.log('Form submission fired');
    event.preventDefault();
    console.log('Has a form');

    try {
      const title = requireString(titleInput.value.trim(), 'Title');
    } catch (e) {
      titleInput.value = '';
      errorDiv.hidden = false;
      errorDiv.innerHTML = 'You must provide a roster name';
      titleLabel.className = 'error';
      titleInput.focus();
      titleInput.className = 'inputClass';
    }
    

    //check for variable number of emails separated by commas; true denotes required presence
    const studentEmails = checkInputFormat(studentEmailInput.value.trim(), true);
    const assistantEmails = checkInputFormat(assistantEmailInput.value.trim(), false);
    
    if (studentEmails !== -1) {
      
      console.log('has a value of....');
      studentEmailInput.classList.remove('inputClass');
      errorDiv.hidden = true;
      studentEmailLabel.classList.remove('error');

    } else {
      
      studentEmailInput.value = '';
      errorDiv.hidden = false;
      if (ret === 0) {
        errorDiv.innerHTML = 'You must enter at least one email';
      } else {
        errorDiv.innerHTML = 'Invalid format provided as input. Please enter at least one @stevens.edu email.';
      }
      studentEmailLabel.className = 'error';
      studentEmailInput.focus();
      studentEmailInput.className = 'inputClass';

    }

    if (assistantEmails !== -1) {
      
      console.log('has a value of....');
      assistantEmailInput.classList.remove('inputClass');
      errorDiv.hidden = true;
      assistantEmailLabel.classList.remove('error');

    } else {
      
      assistantEmailInput.value = '';
      errorDiv.hidden = false;
      errorDiv.innerHTML = 'Invalid format provided as input. Please enter at least one @stevens.edu email.';
      assistantEmailLabel.className = 'error';
      assistantEmailInput.focus();
      assistantEmailInput.className = 'inputClass';

    }
  });
}
