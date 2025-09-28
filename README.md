# LLMCP Chrome Extension

A Chrome extension that enables remote DOM control and interaction through WebSocket communication, designed for AI agents, automation tools, and browser testing frameworks.

## Overview

LLMCP (Large Language Model Control Protocol) is a Chrome extension that provides programmatic control over web page elements through a WebSocket server. It allows external applications to interact with web pages by clicking elements, inputting text, retrieving content, and tracking user interactions.

## Features

### Core DOM Operations
- **Element Clicking**: Click any element using CSS selectors
- **Text Input**: Input text into form fields and editable elements
- **Text Extraction**: Retrieve text content from any element
- **Key Simulation**: Send keyboard events (Enter, Tab, Arrow keys, etc.)
- **Page Information**: Get current page URL, title, and metadata

### Click Tracking
- **Real-time Click Monitoring**: Track all user clicks with detailed location data
- **Element Analysis**: Capture clicked element properties, attributes, and positioning
- **Coordinate Tracking**: Record viewport, page, and screen coordinates
- **Click History**: Retrieve information about the last clicked location and element

### Advanced Features
- **Screenshot Capture**: Take screenshots of specific elements with customizable bias
- **Automatic Reconnection**: Robust WebSocket connection with exponential backoff
- **Message Queuing**: Queue operations when server is offline
- **Heartbeat Monitoring**: Maintain connection health with periodic ping/pong

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The LLMCP extension should now appear in your extensions list

## WebSocket Server Setup

The extension connects to a WebSocket server on `ws://localhost:11808`. You need to run a compatible server that can handle the LLMCP protocol messages.

### Message Protocol

The extension communicates using JSON messages with the following structure:

```json
{
  "type": "dom_operation",
  "action": "click_element",
  "selector": "#myButton",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### Supported Message Types

#### DOM Operations
- `click_element`: Click an element by CSS selector
- `input_text`: Input text into an element
- `get_text`: Retrieve text content from an element
- `send_key`: Send keyboard events to an element
- `get_last_clicked_location`: Get coordinates of last user click
- `get_last_clicked_element`: Get details of last clicked element
- `screenshot_element`: Capture element screenshot
- `get_page_info`: Get current page information

#### Server Communication
- `ping`/`pong`: Heartbeat messages
- `status_request`/`status_response`: Connection status
- `tab_updated`: Notification when user navigates
- `tab_activated`: Notification when user switches tabs

## Compatibility with Model Context Debug and Control

LLMCP is designed to be compatible with the **Model Context Debug and Control** (MCP) server debugging tool, which provides both stdio and streamable HTTP connections for MCP server development and testing.

### Integration Benefits

1. **Protocol Bridging**: Use MCP Debug as a bridge between stdio-based MCP servers and the LLMCP WebSocket interface
2. **Development Workflow**: Debug and test MCP server implementations while simultaneously controlling browser interactions
3. **Dual Connection Support**: 
   - Use HTTP streams for real-time MCP server communication
   - Use WebSocket for browser DOM control
   - Coordinate between both protocols for comprehensive testing

### Setup with MCP Debug Tool

1. Run your MCP server with stdio transport
2. Start the MCP Debug tool with HTTP streaming enabled
3. Configure LLMCP server to bridge between MCP Debug HTTP streams and browser WebSocket
4. Use both tools together for end-to-end testing of AI agents that need browser interaction

Example architecture:
```
MCP Server (stdio) ↔ MCP Debug Tool (HTTP) ↔ LLMCP Server (WebSocket) ↔ Chrome Extension
```

## Usage

### Using the Popup Interface

1. Click the LLMCP extension icon in Chrome
2. Enter CSS selectors in the selector field
3. Use the various buttons to test DOM operations
4. Monitor the output log for results and errors

### Programmatic Usage

Send WebSocket messages to `ws://localhost:11808`:

```javascript
// Click a button
{
  "type": "dom_operation",
  "action": "click_element",
  "selector": "#submitButton"
}

// Input text
{
  "type": "dom_operation",
  "action": "input_text",
  "selector": "input[name='username']",
  "text": "myusername"
}

// Get element text
{
  "type": "dom_operation", 
  "action": "get_text",
  "selector": "h1"
}
```

### Click Tracking

The extension automatically tracks all user clicks. Retrieve click information:

```javascript
// Get last click coordinates
{
  "type": "dom_operation",
  "action": "get_last_clicked_location"
}

// Get last clicked element details
{
  "type": "dom_operation",
  "action": "get_last_clicked_element"  
}
```

## Configuration

### Manifest Permissions

The extension requires these permissions:
- `scripting`: Inject content scripts
- `activeTab`: Access current tab
- `tabs`: Query and message tabs
- `ws://localhost:11808/*`: WebSocket communication

### Server Configuration

The default WebSocket server URL is `ws://localhost:11808`. To change this, modify the `WebSocketClient` constructor in `background.js`:

```javascript
constructor(url = 'ws://your-server:port') {
```

## Error Handling

- **Connection Failures**: Automatic reconnection with exponential backoff
- **Invalid Selectors**: Clear error messages for CSS selector issues
- **Element Not Found**: Graceful handling when elements don't exist
- **Tab Restrictions**: Proper error handling for restricted pages

## Development

### File Structure

```
llmcp/
├── manifest.json        # Extension manifest
├── background.js        # WebSocket client and message routing
├── content.js          # DOM operation handlers
├── popup.html          # Extension popup interface
├── popup.js            # Popup functionality
└── README.md           # This file
```

### Adding New Operations

1. Add the operation handler in `content.js` `DOMOperator` class
2. Update the message switch statement in the content script listener
3. Add UI controls in `popup.html` and `popup.js` if needed
4. Update the protocol documentation

## Security Considerations

- Only connects to localhost by default
- Requires explicit user installation and activation
- Limited to active tab operations
- All operations are logged for transparency
- No automatic execution without explicit commands

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check Chrome developer mode is enabled
2. **WebSocket connection failed**: Ensure server is running on localhost:11808
3. **DOM operations failing**: Verify CSS selectors are correct
4. **Permission errors**: Check manifest.json permissions

### Debug Mode

Enable Chrome extension developer mode and check:
- Extension background page console
- Content script console (F12 → Sources → Content Scripts)
- Network tab for WebSocket connection status

## License

MIT

## Contributing

Contributions are welcome! Please ensure all DOM operations are properly tested and documented. When adding new features, update both the protocol documentation and popup interface.