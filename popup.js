document.addEventListener('DOMContentLoaded', function() {
    const serverStatus = document.getElementById('serverStatus');
    const output = document.getElementById('output');
    const selectorInput = document.getElementById('selectorInput');
    const textInput = document.getElementById('textInput');
    const keyInput = document.getElementById('keyInput');
    const clickInfo = document.getElementById('clickInfo');
    const clickDetails = document.getElementById('clickDetails');
    const clearClickInfoBtn = document.getElementById('clearClickInfo');
    
    function updateStatus(message, type = 'info') {
        serverStatus.className = `status ${type}`;
        serverStatus.textContent = message;
    }
    
    function addOutput(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `status ${type}`;
        div.innerHTML = `<small>${new Date().toLocaleTimeString()}</small><br>${message}`;
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }
    
    function sendMessage(message, description) {
        addOutput(`Sending: ${description}`, 'info');
        
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                addOutput(`Error: ${chrome.runtime.lastError.message}`, 'error');
                return;
            }
            
            if (response && response.success) {
                addOutput(`Success: ${JSON.stringify(response.data, null, 2)}`, 'success');
                updateStatus('Server connection normal', 'success');
            } else {
                addOutput(`Failed: ${response ? response.error : 'Unknown error'}`, 'error');
                updateStatus(`Server error: ${response ? response.error : 'Unknown error'}`, 'error');
            }
        });
    }

    function sendDOMOperation(action, description) {
        const selector = selectorInput.value.trim();
        
        // For click tracking operations, selector is not required
        if (!selector && !['get_last_clicked_location', 'get_last_clicked_element'].includes(action)) {
            addOutput('Please enter CSS selector', 'error');
            return;
        }

        const message = {
            type: 'dom_operation',
            action: action,
            selector: selector
        };

        if (action === 'input_text') {
            const text = textInput.value.trim();
            if (!text) {
                addOutput('Please enter text to input', 'error');
                return;
            }
            message.text = text;
        }

        if (action === 'send_key') {
            const key = keyInput.value.trim();
            if (!key) {
                addOutput('Please enter key to send', 'error');
                return;
            }
            message.key = key;
        }

        // Send DOM operation command directly to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        addOutput(`Error: ${chrome.runtime.lastError.message}`, 'error');
                        return;
                    }
                    
                    if (response && response.success) {
                        let displayText = `[OK] ${description} successful`;
                        
                        // Handle click tracking responses
                        if (action === 'get_last_clicked_location' && response.location) {
                            displayClickInfo(response.location, 'location');
                            displayText += `\nLocation: (${response.location.clientX}, ${response.location.clientY})`;
                        } else if (action === 'get_last_clicked_element' && response.element) {
                            displayClickInfo(response.element, 'element');
                            displayText += `\nElement: ${response.element.tagName}`;
                            if (response.element.id) displayText += `#${response.element.id}`;
                            if (response.element.className) displayText += `.${response.element.className}`;
                        }
                        
                        if (response.text) {
                            displayText += `\nText content: ${response.text}`;
                        }
                        if (response.elementInfo) {
                            displayText += `\nElement info: ${JSON.stringify(response.elementInfo, null, 2)}`;
                        }
                        addOutput(displayText, 'success');
                    } else {
                        addOutput(`X ${description} failed: ${response ? response.error : 'Unknown error'}`, 'error');
                    }
                });
            } else {
                addOutput('X No active tab found', 'error');
            }
        });
    }

    function displayClickInfo(data, type) {
        clickInfo.style.display = 'block';
        clearClickInfoBtn.style.display = 'block';
        
        let html = '';
        if (type === 'location') {
            html = `
                <div><strong>Click Location:</strong></div>
                <div>Viewport: (${data.clientX}, ${data.clientY})</div>
                <div>Page: (${data.pageX}, ${data.pageY})</div>
                <div>Screen: (${data.screenX}, ${data.screenY})</div>
                <div>Button: ${getMouseButtonName(data.button)}</div>
                <div>Modifiers: ${getModifierKeys(data)}</div>
                <div>Time: ${new Date(data.timestamp).toLocaleTimeString()}</div>
            `;
        } else if (type === 'element') {
            html = `
                <div><strong>Clicked Element:</strong></div>
                <div>Tag: ${data.tagName}</div>
                <div>ID: ${data.id || 'none'}</div>
                <div>Class: ${data.className || 'none'}</div>
                <div>Selector: ${data.selector}</div>
                <div>Size: ${data.boundingRect.width}x${data.boundingRect.height}</div>
                <div>Relative Click: (${data.relativeClick.x}, ${data.relativeClick.y})</div>
                <div>Click %: (${data.relativeClick.xPercent}%, ${data.relativeClick.yPercent}%)</div>
                <div>Text: ${data.textContent ? data.textContent.substring(0, 50) + '...' : 'none'}</div>
                <div>Time: ${new Date(data.timestamp).toLocaleTimeString()}</div>
            `;
        }
        clickDetails.innerHTML = html;
    }

    function getMouseButtonName(button) {
        const buttonNames = { 0: 'Left', 1: 'Middle', 2: 'Right' };
        return buttonNames[button] || `Button ${button}`;
    }

    function getModifierKeys(data) {
        const modifiers = [];
        if (data.ctrlKey) modifiers.push('Ctrl');
        if (data.shiftKey) modifiers.push('Shift');
        if (data.altKey) modifiers.push('Alt');
        if (data.metaKey) modifiers.push('Meta');
        return modifiers.length > 0 ? modifiers.join('+') : 'None';
    }
    
    // Clear click info
    clearClickInfoBtn.addEventListener('click', () => {
        clickInfo.style.display = 'none';
        clearClickInfoBtn.style.display = 'none';
        clickDetails.innerHTML = '';
    });
    
    // Initial status check
    setTimeout(() => {
        sendMessage({ type: 'status' }, 'Check server status');
    }, 500);
    
    // Click tracking buttons
    document.getElementById('getLastClickLocation').addEventListener('click', () => {
        sendDOMOperation('get_last_clicked_location', 'Get last click location');
    });
    
    document.getElementById('getLastClickElement').addEventListener('click', () => {
        sendDOMOperation('get_last_clicked_element', 'Get last clicked element');
    });
    
    // DOM operation buttons
    document.getElementById('clickElement').addEventListener('click', () => {
        sendDOMOperation('click_element', 'Click element');
    });
    
    document.getElementById('getElementText').addEventListener('click', () => {
        sendDOMOperation('get_text', 'Get element text');
    });
    
    document.getElementById('inputText').addEventListener('click', () => {
        sendDOMOperation('input_text', 'Input text');
    });

    document.getElementById('sendKey').addEventListener('click', () => {
        sendDOMOperation('send_key', 'Send key');
    });
    
    document.getElementById('getPageInfo').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'dom_operation',
                    action: 'get_page_info'
                }, (response) => {
                    if (response && response.success) {
                        addOutput(`Page info:\n${JSON.stringify(response.pageInfo, null, 2)}`, 'info');
                    } else {
                        addOutput('X Failed to get page info', 'error');
                    }
                });
            }
        });
    });
    
    // Test click tracking
    document.getElementById('testClickTracking').addEventListener('click', () => {
        addOutput('Click Tracking Test Started', 'info');
        addOutput('Instructions:', 'info');
        addOutput('1. Click anywhere on the current page', 'info');
        addOutput('2. Come back to this popup', 'info');
        addOutput('3. Click "Get Last Click Location" or "Get Last Click Element"', 'info');
        
        // Auto-test after 2 seconds if user doesn't click
        setTimeout(() => {
            sendDOMOperation('get_last_clicked_location', 'Auto-test: Get last click location');
        }, 2000);
    });
    
    // Quick test buttons
    document.getElementById('testGoogle').addEventListener('click', () => {
        const tests = [
            { selector: 'input[name="q"]', action: 'input_text', text: 'LLMCP test' },
            { selector: 'input[value="Google Search"]', action: 'click_element' }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                selectorInput.value = test.selector;
                if (test.text) textInput.value = test.text;
                sendDOMOperation(test.action, `Google test ${index + 1}`);
            }, index * 1000);
        });
    });
    
    document.getElementById('testGithub').addEventListener('click', () => {
        const tests = [
            { selector: 'input[placeholder*="Search"]', action: 'input_text', text: 'LLMCP' },
            { selector: 'h1', action: 'get_text' }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                selectorInput.value = test.selector;
                if (test.text) textInput.value = test.text;
                sendDOMOperation(test.action, `GitHub test ${index + 1}`);
            }, index * 1000);
        });
    });
    
    document.getElementById('testCommon').addEventListener('click', () => {
        const tests = [
            { selector: 'h1', action: 'get_text' },
            { selector: 'button', action: 'click_element' },
            { selector: 'input[type="text"]', action: 'input_text', text: 'Test input' }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                selectorInput.value = test.selector;
                if (test.text) textInput.value = test.text;
                sendDOMOperation(test.action, `Common element test ${index + 1}`);
            }, index * 1000);
        });
    });

    document.getElementById('testKeys').addEventListener('click', () => {
        const tests = [
            { selector: 'input[type="text"], input[name="q"]', key: 'enter' },
            { selector: 'body', key: 'escape' },
            { selector: 'input', key: 'tab' }
        ];
        
        tests.forEach((test, index) => {
            setTimeout(() => {
                selectorInput.value = test.selector;
                keyInput.value = test.key;
                sendDOMOperation('send_key', `Key test ${index + 1}: ${test.key}`);
            }, index * 1000);
        });
    });
    
    // Server test buttons
    document.getElementById('testStatus').addEventListener('click', () => {
        sendMessage({ type: 'status' }, 'Server status query');
    });
    
    document.getElementById('testPing').addEventListener('click', () => {
        fetch('http://localhost:11808/ping')
            .then(response => response.text())
            .then(data => {
                addOutput(`Ping response: ${data}`, 'success');
            })
            .catch(error => {
                addOutput(`X Ping failed: ${error.message}`, 'error');
            });
    });
    
    document.getElementById('testCommand').addEventListener('click', () => {
        sendMessage({
            type: 'command',
            command: 'test_dom_operation',
            params: {
                selector: selectorInput.value || 'body',
                timestamp: new Date().toISOString()
            }
        }, 'Send DOM operation command');
    });
    
    // Clear output button
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Log';
    clearBtn.style.marginTop = '10px';
    clearBtn.style.backgroundColor = '#dc3545';
    clearBtn.style.color = 'white';
    clearBtn.addEventListener('click', () => {
        output.innerHTML = '';
    });
    document.body.appendChild(clearBtn);
    
    // Enter key support
    selectorInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendDOMOperation('get_text', 'Get element text');
        }
    });
    
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendDOMOperation('input_text', 'Input text');
        }
    });

    keyInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendDOMOperation('send_key', 'Send key');
        }
    });
});