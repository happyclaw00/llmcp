// content.js - Handle DOM operation commands
console.log("LLMCP Content script loaded on:", window.location.href);

class DOMOperator {
  constructor() {
    this.highlightedElement = null;
    this.lastClickedLocation = null;
    this.lastClickedElement = null;
    
    // Initialize click tracking
    this.initializeClickTracking();
  }

  // Initialize click tracking
  initializeClickTracking() {
    document.addEventListener('click', (event) => {
      // Record click location
      this.lastClickedLocation = {
        // Viewport coordinates
        clientX: event.clientX,
        clientY: event.clientY,
        
        // Page coordinates (including scroll)
        pageX: event.pageX,
        pageY: event.pageY,
        
        // Screen coordinates
        screenX: event.screenX,
        screenY: event.screenY,
        
        // Additional info
        timestamp: new Date().toISOString(),
        
        // Mouse button info
        button: event.button, // 0: left, 1: middle, 2: right
        buttons: event.buttons,
        
        // Modifier keys
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      };

      // Record clicked element
      const clickedElement = event.target;
      const rect = clickedElement.getBoundingClientRect();
      
      this.lastClickedElement = {
        // Element basic info
        tagName: clickedElement.tagName,
        id: clickedElement.id,
        className: clickedElement.className,
        
        // Text content
        textContent: clickedElement.textContent?.substring(0, 200),
        innerText: clickedElement.innerText?.substring(0, 200),
        value: clickedElement.value,
        
        // Attributes
        attributes: this.getElementAttributes(clickedElement),
        
        // Position and size
        boundingRect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          x: rect.x,
          y: rect.y
        },
        
        // Relative click position within element
        relativeClick: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          xPercent: ((event.clientX - rect.left) / rect.width * 100).toFixed(2),
          yPercent: ((event.clientY - rect.top) / rect.height * 100).toFixed(2)
        },
        
        // CSS selector (simplified)
        selector: this.generateSelector(clickedElement),
        
        // Parent info
        parentTagName: clickedElement.parentElement?.tagName,
        parentId: clickedElement.parentElement?.id,
        parentClassName: clickedElement.parentElement?.className,
        
        // Timestamp
        timestamp: new Date().toISOString()
      };

      console.log('Click tracked:', {
        location: this.lastClickedLocation,
        element: this.lastClickedElement
      });
    }, true); // Use capture phase to ensure we catch all clicks
  }

  // Get element attributes
  getElementAttributes(element) {
    const attributes = {};
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attributes[attr.name] = attr.value;
      }
    }
    return attributes;
  }

  // Generate a simple CSS selector for the element
  generateSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    
    // If no id or class, use tag name with nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => 
        child.tagName === element.tagName
      );
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    return element.tagName.toLowerCase();
  }

  // Get last clicked location
  getLastClickedLocation() {
    if (!this.lastClickedLocation) {
      return {
        success: false,
        error: 'No click has been recorded yet',
        message: 'Please click somewhere on the page first'
      };
    }

    return {
      success: true,
      message: 'Last clicked location retrieved successfully',
      location: this.lastClickedLocation
    };
  }

  // Get last clicked element
  getLastClickedElement() {
    if (!this.lastClickedElement) {
      return {
        success: false,
        error: 'No element click has been recorded yet',
        message: 'Please click on an element first'
      };
    }

    return {
      success: true,
      message: 'Last clicked element retrieved successfully',
      element: this.lastClickedElement
    };
  }

  // Find element by CSS selector
  findElement(selector) {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        return { success: false, error: `Element not found: ${selector}` };
      }
      return { success: true, element: element };
    } catch (error) {
      return { success: false, error: `Invalid selector: ${selector} - ${error.message}` };
    }
  }

  // Click element
  clickElement(selector) {
    const result = this.findElement(selector);
    if (!result.success) {
      return result;
    }

    try {
      const element = result.element;
      
      // Highlight element (optional, for debugging)
      this.highlightElement(element);
      
      // Scroll to element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Wait a moment then click
      setTimeout(() => {
        // Create click events
        const events = ['mousedown', 'mouseup', 'click'];
        events.forEach(eventType => {
          const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(event);
        });
      }, 500);

      return {
        success: true,
        message: `Clicked element: ${selector}`,
        elementInfo: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent?.substring(0, 100)
        }
      };
    } catch (error) {
      return { success: false, error: `Failed to click element: ${error.message}` };
    }
  }

  // Input text to element
  inputText(selector, text) {
    const result = this.findElement(selector);
    if (!result.success) {
      return result;
    }

    try {
      const element = result.element;
      
      // Highlight element
      this.highlightElement(element);
      
      // Scroll to element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus element
      element.focus();
      
      // Clear existing content
      if (element.value !== undefined) {
        element.value = '';
      } else {
        element.textContent = '';
      }
      
      // Input text
      if (element.value !== undefined) {
        // Input field type
        element.value = text;
        
        // Trigger input event
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
      } else {
        // Other editable elements
        element.textContent = text;
      }

      return {
        success: true,
        message: `Input text into element: ${selector}`,
        text: text,
        elementInfo: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          value: element.value || element.textContent
        }
      };
    } catch (error) {
      return { success: false, error: `Failed to input text: ${error.message}` };
    }
  }

  // Get element text
  getText(selector) {
    const result = this.findElement(selector);
    if (!result.success) {
      return result;
    }

    try {
      const element = result.element;
      
      // Highlight element
      this.highlightElement(element);
      
      // Get text content
      let text = '';
      if (element.value !== undefined) {
        text = element.value;
      } else {
        text = element.innerText || element.textContent || '';
      }

      return {
        success: true,
        message: `Retrieved text from element: ${selector}`,
        text: text,
        elementInfo: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          innerHTML: element.innerHTML?.substring(0, 200)
        }
      };
    } catch (error) {
      return { success: false, error: `Failed to get text: ${error.message}` };
    }
  }

  // Highlight element (for debugging)
  highlightElement(element) {
    // Remove previous highlight
    if (this.highlightedElement) {
      this.highlightedElement.style.outline = '';
    }

    // Highlight current element
    element.style.outline = '3px solid #ff4444';
    this.highlightedElement = element;

    // Remove highlight after 3 seconds
    setTimeout(() => {
      if (element) {
        element.style.outline = '';
      }
    }, 3000);
  }

  // Send key press to element
  sendKey(selector, key) {
    const result = this.findElement(selector);
    if (!result.success) {
      return result;
    }

    try {
      const element = result.element;
      
      // Highlight element
      this.highlightElement(element);
      
      // Scroll to element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus element
      element.focus();
      
      // Key mapping for special keys
      const keyMap = {
        'enter': 'Enter',
        'tab': 'Tab',
        'escape': 'Escape',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'space': ' ',
        'arrowup': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'arrowleft': 'ArrowLeft',
        'arrowright': 'ArrowRight',
        'home': 'Home',
        'end': 'End',
        'pageup': 'PageUp',
        'pagedown': 'PageDown',
        'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
        'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
        'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12'
      };
      
      // Get the actual key to send
      const keyToSend = keyMap[key.toLowerCase()] || key;
      
      // Create and dispatch keyboard events
      const keydownEvent = new KeyboardEvent('keydown', {
        key: keyToSend,
        code: keyToSend,
        bubbles: true,
        cancelable: true
      });
      
      const keypressEvent = new KeyboardEvent('keypress', {
        key: keyToSend,
        code: keyToSend,
        bubbles: true,
        cancelable: true
      });
      
      const keyupEvent = new KeyboardEvent('keyup', {
        key: keyToSend,
        code: keyToSend,
        bubbles: true,
        cancelable: true
      });
      
      // Dispatch events in sequence
      element.dispatchEvent(keydownEvent);
      element.dispatchEvent(keypressEvent);
      element.dispatchEvent(keyupEvent);

      return {
        success: true,
        message: `Sent key '${key}' to element: ${selector}`,
        key: keyToSend,
        elementInfo: {
          tagName: element.tagName,
          id: element.id,
          className: element.className
        }
      };
    } catch (error) {
      return { success: false, error: `Failed to send key: ${error.message}` };
    }
  }

  // Get page info
  getPageInfo() {
    return {
      success: true,
      pageInfo: {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Create DOM operator instance
const domOperator = new DOMOperator();

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.type === 'dom_operation') {
    let result;
    
    switch (message.action) {
      case 'click_element':
        result = domOperator.clickElement(message.selector);
        break;
      case 'input_text':
        result = domOperator.inputText(message.selector, message.text);
        break;
      case 'get_text':
        result = domOperator.getText(message.selector);
        break;
      case 'send_key':
        result = domOperator.sendKey(message.selector, message.key);
        break;
      case 'get_last_clicked_location':
        result = domOperator.getLastClickedLocation();
        break;
      case 'get_last_clicked_element':
        result = domOperator.getLastClickedElement();
        break;
      case 'screenshot_element':
        // Handle async screenshot
        domOperator.captureElementScreenshot(message.selector, message.bias)
          .then(screenshotResult => {
            console.log("Screenshot operation result:", screenshotResult);
            sendResponse(screenshotResult);
          })
          .catch(error => {
            console.error("Screenshot error:", error);
            sendResponse({
              success: false,
              error: error.message || 'Screenshot failed'
            });
          });
        return true; // Keep message channel open for async response
      case 'get_page_info':
        result = domOperator.getPageInfo();
        break;
      default:
        result = {
          success: false,
          error: `Unknown action: ${message.action}`,
          supportedActions: [
            'click_element', 
            'input_text', 
            'get_text', 
            'send_key', 
            'get_last_clicked_location',
            'get_last_clicked_element',
            'screenshot_element', 
            'get_page_info'
          ]
        };
    }
    
    if (message.action !== 'screenshot_element') {
      console.log("DOM operation result:", result);
      sendResponse(result);
    }
  } else {
    // Handle other message types
    sendResponse({
      success: true,
      message: "Message received by content script",
      data: message
    });
  }
  
  return true; // Keep message channel open
});