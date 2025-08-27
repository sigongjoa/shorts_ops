export const createTextInsertRequest = (text, locationIndex) => ({
  insertText: {
    text: text,
    location: {
      index: locationIndex,
    },
  },
});

export const createUpdateTextStyleRequest = (startIndex, endIndex, textStyle) => ({
  updateTextStyle: {
    range: {
      startIndex: startIndex,
      endIndex: endIndex,
    },
    textStyle: textStyle,
    fields: Object.keys(textStyle).join(','), // e.g., 'bold,italic,underline'
  },
});

// Example textStyle:
// { bold: true, italic: true, foregroundColor: { color: { rgbColor: { red: 1, green: 0, blue: 0 } } } }

// You can add more helper functions here for other Docs API operations
// e.g., createParagraphStyleRequest, createTableInsertRequest, etc.
