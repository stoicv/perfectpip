# Perfect Picture-in-Picture (PerfectPiP)

**The ultimate Picture-in-Picture tool for the web.**  
PerfectPiP goes beyond standard browser PiP by allowing you to float **any** element—videos, chats, streams, or widgets—in an always-on-top window using the modern Document Picture-in-Picture API.

## ✨ Features

*   **Universal PiP**: Works on YouTube, Twitch, and practically any other website.
*   **Smart Selection**: Intelligently detects video players and containers, not just raw video tags.
*   **Custom Controls**: Injected Play/Pause and Return controls for a seamless experience.
*   **Style Syncing**: Carries over the original website's CSS so the floated element looks correct.
*   **DRM Detection**: Warns you if content (like Netflix/Hulu) might not render correctly in Document PiP due to browser protections.

## 🚀 Installation

Since this is currently in development, you can install it as an "Unpacked Extension" in Chrome or Edge.

1.  Clone or download this repository.
2.  Open your browser's extensions page:
    *   **Chrome**: `chrome://extensions`
    *   **Edge**: `edge://extensions`
3.  Enable **Developer mode** (toggle in the top right or left sidebar).
4.  Click **Load unpacked**.
5.  Select the folder containing `manifest.json` (the root of this repo).

## 🎮 Usage

1.  Navigate to a page with a video or element you want to float.
2.  **Click the Extension Icon** in your toolbar OR press `Ctrl+Shift+P` (Command+Shift+P on Mac).
3.  **Hover** over the element you want. The "Float This" highlighter will appear.
4.  **Click** to pop it out into a separate window!

## 🛠️ Development

*   `manifest.json`: Extension configuration (Manifest V3).
*   `background.js`: Handles global hotkeys and context management.
*   `content.js`: The core logic for the element picker, style cloning, and window management.
*   `popup.html/js`: The toolbar popup interface.

## 📝 Roadmap

*   [ ] **Smart Video Detection**: Automatically find and highlight video players without manual selection.
*   [ ] **Keyboard Navigation**: Use arrow keys to fine-tune selection (Parent/Child).
*   [ ] **Multi-PiP**: Support for multiple floating windows.
