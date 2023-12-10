// Injecting a CSS file
var link = document.createElement('link');
link.href = chrome.runtime.getURL('styles.css');
link.type = 'text/css';
link.rel = 'stylesheet';
document.getElementsByTagName('head')[0].appendChild(link);


// configures mathjax
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    svg: {
        fontCache: 'global'
    },
};


var chatContainer;
var chatHistory = [];
let transcriptText = '';


/////////////////////////////// 1. BEGIN :UPDATE TRANSCRIPT TEXT ///////////////////////////////
// update the transcript text 
// update transcriptionText if transcript element found
function updateTranscriptText() {
    let transcriptElement = document.querySelector('[data-track-component="interactive_transcript"]');
    if (transcriptElement) {
        transcriptText = transcriptElement.innerText || transcriptElement.textContent;
    } else {
        console.log('Transcript element not found');
    }
}


// Mutation observer callback function
// if element is loaded later using js then this will update the transcript text
function handleMutations(mutations) {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // Check if the "main" element exists
            const mainElement = document.getElementById('main');
            if (mainElement) {
                // Check if an element with data-track-component="interactive_transcript" exists within "main"
                const transcriptElement = mainElement.querySelector('[data-track-component="interactive_transcript"]');
                if (transcriptElement) {
                    // The element with data-track-component="interactive_transcript" exists within "main"
                    updateTranscriptText();
                } else {
                    console.log('Transcript element not found within main');
                }
            } else {
                console.log('Main element not found');
            }
        }
    });
}

// Mutation observer to monitor changes in the "main" element
function setupMutationObserver() {
    const observer = new MutationObserver(handleMutations);

    // Find the "main" element
    const mainElement = document.getElementById('main');

    if (mainElement) {
        // Observe changes in the "main" element
        observer.observe(mainElement, {
            childList: true,
            subtree: true
        });
    } else {
        console.log('Main element not found');
    }
}


// Message listener for receiving transcript updates when the tab is changed or url is changed
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "tabActivated") {
        // The active tab has changed, you can perform actions here
        console.log("Tab has changed");
        // updateTranscriptText();
        setupMutationObserver();
        // Add your code to handle the tab change
    }
});


// Message listener for receiving API responses
// get chat responses from the api call to llm
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.apiResponse) {

        let submitButton = document.getElementById('submitButton'); // Replace with your button's ID or method of selection

        let responseElement = createChatElement(request.apiResponse.output.choices[0].text, 'api');
        chatContainer.appendChild(responseElement);

        // Automatically scroll to the bottom of the chat container
        chatContainer.scrollTop = chatContainer.scrollHeight;

        submitButton.disabled = false; // Re-enable the button

    }
});


// Function to create chat message elements
function createChatElement(text, type) {
    let element = document.createElement('div');
    element.classList.add('chat-element');

    // Determine the type and assign the appropriate class
    if (type === 'question') {
        element.classList.add('question');
    } else {
        element.classList.add('other');
    }
    let messageText = document.createElement('div');
    messageText.innerHTML = type === 'api' ? marked.parse(text) : text;

    if (window.MathJax) {
        MathJax.typesetPromise([messageText]);
    }

    // element.appendChild(avatar);
    element.appendChild(messageText);

    return element;
}

// Function to toggle the sidebar visibility
function toggleSidebar(sidebar) {

    sidebar.style.width = sidebar.style.width === '0px' ? '400px' : '0px';
}



window.onload = function () {
    if (window.location.hostname === 'www.coursera.org') {
        let sidebar = document.createElement('div');
        sidebar.className = 'sidebar';

        // Create title element
        let title = document.createElement('h2');
        title.textContent = "Coursera Sidekick";
        title.className = 'sidebar-title';
        // title.style.cssText = 'color: #28a745; margin-bottom:5px;'; // Green color for the title

        // let subtitle = document.createElement('h5');
        // subtitle.textContent = "Your Personal Academic Assistant";
        // subtitle.style.cssText = 'margin-bottom: 20px;'; // Green color for the title
        // Append title to the sidebar
        sidebar.appendChild(title);
        // sidebar.appendChild(subtitle)

        let collapseButton = document.createElement('button');
        collapseButton.className = 'collapse-button';
        collapseButton.textContent = '>'; // You can use an arrow icon or any symbol you prefer

        collapseButton.onclick = function () {
            this.textContent = this.textContent === '>' ? '<' : '>';
            toggleSidebar(sidebar);
        }

        chatContainer = document.createElement('div');
        chatContainer.className = 'chat-container';

        chatContainer.classList.add('markdown-content'); // Add a class for specific CSS targeting

        // Setup observer for future changes  
        setupMutationObserver();

        // console.log(transcriptText)


        var chatInput = document.createElement('input');
        chatInput.className = 'chat-input';


        var submitButton = document.createElement('button');
        submitButton.id = 'submitButton';
        submitButton.textContent = 'Submit';
        submitButton.className = 'submit-button';
        // Optional: Add hover effect
        submitButton.onmouseover = function () {
            this.style.backgroundColor = '#218838'; /* Slightly darker green on hover */
        };
        submitButton.onmouseout = function () {
            this.style.backgroundColor = '#28a745'; /* Original green color */
        };



        submitButton.onclick = function () {

            var message = chatInput.value.trim();
            if (message) {

                // Create a chat message element for the user's question
                var messageElement = createChatElement(message, 'question');
                chatContainer.appendChild(messageElement);
                this.disabled = true;
                chatContainer.scrollTop = chatContainer.scrollHeight;

                // Send message and chat history to background.js
                chrome.runtime.sendMessage({ question: message, chatHistory: chatHistory, bodyContent: transcriptText });

                chatHistory.push(message);
                chatInput.value = '';


            }
        };


        // Submit on enter
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                submitButton.click();
            }
        });


        // Create a Clear button
        var clearButton = document.createElement('button');
        clearButton.id = 'clearButton';
        clearButton.textContent = 'X';
        clearButton.className = 'clear-button';

        

        var inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';

        inputContainer.appendChild(chatInput);
        inputContainer.appendChild(submitButton);
        // inputContainer.appendChild(clearButton);

        sidebar.appendChild(collapseButton);
        sidebar.appendChild(chatContainer);
        sidebar.appendChild(inputContainer);
        document.body.appendChild(sidebar);

    }
};



