let mediaRecorder;
let audioChunks = [];

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        // Collect audio chunks as they become available
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // Handle stop event to transcribe audio
        mediaRecorder.onstop = async () => {
            try {
                // Create WAV blob and send to backend
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');
                
                const response = await fetch('https://7726-2001-bc8-1d90-10a8-dc00-ff-fe22-7e17.ngrok-free.app/transcribe', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const transcription = await response.text();
                    // Send transcription to chatbot
                    sendMessage(transcription); // Calls sendMessage with parameter
                } else {
                    console.error('Transcription failed');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                audioChunks = [];
                document.getElementById('startRecord').disabled = false;
                document.getElementById('stopRecord').disabled = true;
            }
        };

        mediaRecorder.start();
        // Disable buttons during recording
        document.getElementById('startRecord').disabled = true;
        document.getElementById('stopRecord').disabled = false;
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop(); // Triggers onstop handler
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('infoModal').style.display = 'block';
    
    // Add event listener for Enter key
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});

async function submitInfo() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    const payload = {
        user: name,
        email: email
    };

    try {
        const response = await fetch('https://app.nocodb.com/api/v2/tables/m78hlm0u8ba88e1/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xc-token': 'zR4sNJ_dj8-EDcWYRPTkZaeSnFTvVI2uLAqLq258'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
        } else {
            const errorData = await response.json();
            alert(`Error submitting information: ${errorData.msg}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Connection error. Please check your internet connection.');
    }
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeIcon = document.querySelector('.theme-toggle i');
    themeIcon.classList.toggle('fa-sun');
    themeIcon.classList.toggle('fa-moon');
}

// Modified sendMessage function to handle language detection
async function sendMessage(userMessage) {
    let message = userMessage || document.getElementById('message-input').value.trim();
    
    if (message === '') return;

    // Detect the language of the input text
    const detectedLanguage = detectLanguage(message);

    if (detectedLanguage !== 'en') {
        // If the language is not English, send it to the backend for translation
        try {
            const response = await fetch('https://7726-2001-bc8-1d90-10a8-dc00-ff-fe22-7e17.ngrok-free.app/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message, to: 'en' })
            });

            if (response.ok) {
                const translatedMessage = await response.json();
                message = translatedMessage.translatedText;
            } else {
                console.error('Translation failed');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input field only if typing, not mic
    if (!userMessage) {
        document.getElementById('message-input').value = '';
    }

    // Existing API call to chatbot
    try {
        addTypingIndicator();
        const response = await fetch('https://926a-2001-bc8-1d90-10a8-dc00-ff-fe22-7e17.ngrok-free.app/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });

        removeTypingIndicator();
        if (response.ok) {
            const data = await response.json();
            addMessage(data.response, 'bot');
        } else {
            addMessage('Error sending message. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Connection error. Please check your internet connection.', 'bot');
    }
}

function addMessage(message, type) {
    const chatBody = document.getElementById('chat-body');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    if (type === 'bot') {
        const icon = document.createElement('i');
        icon.className = 'fas fa-robot bot-icon';
        messageDiv.appendChild(icon);
    }
    
    const messageContent = document.createElement('div');
    messageContent.textContent = message;
    messageDiv.appendChild(messageContent);
    
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function addTypingIndicator() {
    const chatBody = document.getElementById('chat-body');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.innerHTML = '<i class="fas fa-robot bot-icon"></i><div>Typing...</div>';
    typingDiv.id = 'typing-indicator';
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}
// Function to detect language
function detectLanguage(text) {
    // Simple heuristic to detect if the text is in Telugu
    // This can be improved by using a more sophisticated method or library
    const teluguRegex = /[\u0C00-\u0C7F]/;
    return teluguRegex.test(text) ? 'te' : 'en';
}