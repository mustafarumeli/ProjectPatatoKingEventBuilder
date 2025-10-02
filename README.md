# 🥔 Event Builder - Patato King

A modern, user-friendly web application for creating interactive game events with choices, results, and triggers. Built with HTML, CSS, JavaScript, and optional Firebase integration.

## ✨ Features

- **Intuitive Event Creation**: Easy-to-use forms for creating complex game events
- **Dynamic Choices**: Add multiple choices with different outcomes
- **Attribute System**: Support for various game attributes (Education, Military, Economy, etc.)
- **Trigger Conditions**: Set conditions for when events should appear
- **JSON Export**: Generate clean JSON output compatible with your game system
- **Local Storage**: Save events locally in your browser
- **Firebase Integration**: Optional cloud storage for events
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Beautiful, modern interface with smooth animations

## 🚀 Quick Start

1. **Clone or Download** this repository
2. **Open `index.html`** in your web browser
3. **Start Creating Events** immediately!

The app works out of the box with local storage. For cloud storage, see the Firebase setup guide below.

## 📋 Event Structure

Events follow this JSON structure:

```json
{
    "id": "unique-guid",
    "title": "Event Title",
    "description": "Event description...",
    "choices": [
        {
            "id": "choice-guid",
            "text": "Choice text",
            "dependentEventIds": ["event-id-1"],
            "dependentChoiceIds": ["choice-id-1"],
            "results": [
                {
                    "attribute": "education",
                    "change": 5
                }
            ]
        }
    ],
    "dependentEventIds": ["required-event-id"],
    "dependentChoiceIds": ["required-choice-id"],
    "trigger": {
        "education": { "min": 10, "max": 50 },
        "military": { "min": 0, "max": 100 },
        "items": ["item-id-1", "item-id-2"]
    }
}
```

## 🎮 How to Use

### Creating an Event

1. **Fill in Basic Info**:
   - Event title
   - Event description
   - Dependencies (optional)

2. **Set Trigger Conditions**:
   - Attribute ranges (Education, Military, Economy, etc.)
   - Required items

3. **Add Choices**:
   - Click "Add Choice" to create decision options
   - Each choice can have multiple results
   - Results modify game attributes

4. **Preview & Save**:
   - Click "Preview JSON" to see the generated structure
   - Click "Save Event" to store it
   - Use "Copy JSON" to copy the output

### Managing Events

- **Load Event**: Restore a previously saved event for editing
- **Export Event**: Download event as JSON file
- **Delete Event**: Remove unwanted events
- **Clear Form**: Reset the form to start fresh

## 🔧 Supported Attributes

The app supports these game attributes:
- Education
- Military
- Economy
- Diplomacy
- Culture
- Religion
- Happiness
- Stability

You can easily add more attributes by modifying the `addResult()` function in `script.js`.

## ☁️ Firebase Integration (Optional)

For cloud storage and sharing events across devices:

1. Follow the [Firebase Setup Guide](firebase-setup.md)
2. Update the Firebase configuration in `script.js`
3. Uncomment the Firebase initialization code

Without Firebase, the app uses browser localStorage (events are saved locally).

## 🎨 Customization

### Adding New Attributes

To add new game attributes:

1. **Update the trigger section** in `index.html`:
```html
<div class="attribute-group">
    <label>New Attribute</label>
    <div class="range-inputs">
        <input type="number" id="newAttributeMin" placeholder="Min" min="0">
        <input type="number" id="newAttributeMax" placeholder="Max" min="0">
    </div>
</div>
```

2. **Update the results dropdown** in `script.js`:
```javascript
<option value="newAttribute">New Attribute</option>
```

3. **Update the trigger generation** in `script.js`:
```javascript
const attributes = ['education', 'military', 'economy', 'diplomacy', 'culture', 'religion', 'newAttribute'];
```

### Styling

Modify `styles.css` to change the appearance:
- Colors: Update the CSS custom properties
- Layout: Modify the grid layouts and spacing
- Animations: Adjust transition and animation properties

## 📱 Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Troubleshooting

### Common Issues

**Events not saving?**
- Check if localStorage is enabled in your browser
- For Firefox private mode, localStorage might be disabled

**Firebase not working?**
- Verify your Firebase configuration
- Check browser console for errors
- Ensure Firestore is enabled in your Firebase project

**JSON not generating?**
- Make sure event title and description are filled
- Check that choices have text content
- Verify that results have both attribute and change values

### Getting Help

1. Check the browser console for error messages
2. Verify all required fields are filled
3. Try clearing the form and starting over
4. Check the Firebase setup guide if using cloud storage

## 🎯 Roadmap

- [ ] Event templates
- [ ] Bulk import/export
- [ ] Event validation
- [ ] Visual event flow editor
- [ ] Multi-language support
- [ ] Event testing mode
- [ ] Advanced trigger conditions
- [ ] Event categories and tags

---

Made with ❤️ for the Patato King project
