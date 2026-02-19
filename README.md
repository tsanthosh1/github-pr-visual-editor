# GitHub PR Visual Editor

A Chrome extension that makes GitHub's PR preview mode editable. Click checkboxes, edit text inline, and submit — all without touching raw markdown.

## Features

✅ **Editable Preview** — The Preview tab becomes fully editable when you're editing a comment  
✅ **Clickable Checkboxes** — Toggle task list items with a single click  
✅ **Inline Text Editing** — Edit paragraphs, headings, and list items directly in the preview  
✅ **Lightweight** — No external dependencies, minimal footprint  

## Installation

### From Source (Developer Mode)

1. **Clone this repository**
   ```bash
   git clone https://github.com/tsanthosh1/github-pr-visual-editor.git
   cd github-pr-visual-editor
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the cloned folder

3. **You're ready!** Navigate to any GitHub Pull Request page.

## Usage

1. **Open a GitHub Pull Request**
2. **Click the ✏️ pencil icon** on any of your comments — this enters edit mode and switches to the editable Preview tab
3. **Edit directly in the preview** — click checkboxes, edit text inline
4. **Click "Update comment"** to save your changes

> The Preview tab shows a ✏️ indicator when it's editable.

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: Minimal (`activeTab` only)
- **Host Permissions**: Only `github.com`
- **Content Script**: Injected on GitHub pages only

## Development

### Project Structure

```
github-pr-visual-editor/
├── manifest.json      # Extension configuration
├── content.js         # Main content script
├── styles.css         # Editor enhancement styles
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
└── icons/             # Extension icons (16, 32, 48, 128px)
```

### Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload your GitHub PR page

## Browser Support

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Other Chromium-based browsers

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests on [GitHub](https://github.com/tsanthosh1/github-pr-visual-editor).

## License

MIT License — feel free to use this in your own projects!

---

