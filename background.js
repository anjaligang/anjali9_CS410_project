// // background.js

// Function to check the API key and send a notification if it's not set
function checkApiKey() {
    chrome.storage.sync.get('apiKey', function (data) {
        if (!data.apiKey || data.apiKey === '') {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon.png', // Path to your extension's icon
                title: 'Update API Key',
                message: 'Please update your API key in the extension settings.'
            });
        }
    });
}

// You can call checkApiKey() wherever appropriate in your background.js
checkApiKey();

// Add a listener for the browser action
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    });
});

// Add a listener for the tab change
chrome.tabs.onActivated.addListener(function (activeInfo) {
    // console.log(activeInfo.tabId)
    chrome.tabs.sendMessage(activeInfo.tabId, { action: "tabActivated" });
});

// Add a listener for the url change
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.url) {
        //   console.log("Tab URL updated:");
        chrome.tabs.sendMessage(tabId, { action: "tabActivated" });
    }
}
);

// call large language model with lecture transcript, chat history and question
// calls together ai api to get response and sends it back to content script
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        // console.log(request.action)
        if (request.question && request.chatHistory && request.bodyContent) {
            // Construct the prompt
            let prompt = createPrompt(request.question, request.chatHistory, request.bodyContent);

            chrome.storage.sync.get('apiKey', function (data) {
                const apiKey = data.apiKey;
                if (apiKey) {
                    // console.log(prompt)
                    // API call settings
                    let apiUrl = 'https://api.together.xyz/inference'; 
                    
                    fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: "teknium/OpenHermes-2p5-Mistral-7B",
                            // model: "togethercomputer/StripedHyena-Nous-7B",
                            prompt: prompt,
                            temperature: 0.3,
                            max_tokens: 5000,
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            // console.log('API Response:', data);
                            // Send the response back to the content script
                            console.log(sender)
                            chrome.tabs.sendMessage(sender.tab.id, { apiResponse: data }, function (response) {
                                if (chrome.runtime.lastError) {
                                    console.error(chrome.runtime.lastError.message);
                                }
                            });
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                } else {
                    console.log('No API key found');
                }

            });
        }
        return true; // Required to keep the messaging channel open while we wait for the API response

    }
);

function truncateToWordLimit(str, limit) {
    var words = str.split(/\s+/); // Split string on whitespace
    if (words.length > limit) {
        return words.slice(0, limit).join(' '); // Join the first 'limit' words
    } else {
        return str; // Return the original string if it's shorter than the limit
    }
}

function createPrompt(question, chatHistory, bodyContent) {
    // Combine chat history and question into a prompt format suitable for your API
    let chatHistoryText = chatHistory.slice(-2).join('\n');
    let truncatedBodyContent = truncateToWordLimit(bodyContent, 2000);
    let prompt = `You are an expert Teaching assistant. you will help students answer questions about the lecture whose transcript with timestamp is provided below. Provide concise, intuitive, simple and accurate and truthful answers. Explain difficult concepts intuitively and with examples. Prefer readable simple list style. Lecture Transcript: ${truncatedBodyContent}\n\nChat History:\n${chatHistoryText}\n\nHere is the user ask:${question}\nHere is response in rich markdown format:`;
    console.log(prompt)
    return prompt;
}



