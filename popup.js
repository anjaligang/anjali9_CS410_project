document.addEventListener('DOMContentLoaded', function() {
    var saveButton = document.getElementById('saveButton');
    var apiKeyInput = document.getElementById('apiKey');

    // Load any saved API key when the popup opens
    chrome.storage.sync.get('apiKey', function(data) {
        apiKeyInput.value = data.apiKey || '';
    });

    // Save the API key when the save button is clicked
    saveButton.addEventListener('click', function() {
        var apiKey = apiKeyInput.value;
        chrome.storage.sync.set({ 'apiKey': apiKey }, function() {
            console.log('API key saved');
            // You can add any notification or logic to indicate successful saving
        });
    });
});
