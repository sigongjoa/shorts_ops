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

export const generateShortContentRequests = (short, startIndex) => {
  const requests = [];
  let currentIndex = startIndex;

  // 1. Insert Page Break (if not the very beginning of the document)
  if (startIndex > 0) {
    requests.push({
      insertPageBreak: {
        location: {
          index: currentIndex,
        },
      },
    });
    currentIndex++; // Page break consumes one index
  }

  // 2. Insert Short ID (hidden or clearly marked for programmatic access)
  const shortIdText = `SHORT_ID: ${short.id}\n`;
  requests.push({
    insertText: {
      text: shortIdText,
      location: {
        index: currentIndex,
      },
    },
  });
  // Optionally, make this text very small or hidden if it's purely for programmatic use
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + shortIdText.length,
      },
      textStyle: {
        fontSize: { magnitude: 1, unit: 'PT' }, // Very small font size
        foregroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } }, // White text on white background
      },
      fields: 'fontSize,foregroundColor',
    },
  });
  currentIndex += shortIdText.length;

  // 3. Insert Short Title (as Heading 1)
  const titleText = `Title: ${short.title}\n`;
  requests.push({
    insertText: {
      text: titleText,
      location: {
        index: currentIndex,
      },
    },
  });
  requests.push({
    updateParagraphStyle: {
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + titleText.length,
      },
      paragraphStyle: {
        namedStyleType: 'HEADING_1',
      },
      fields: 'namedStyleType',
    },
  });
  currentIndex += titleText.length;

  // 4. Insert Script Details
  const scriptContent = `Script:\n  Idea: ${short.script.idea}\n  Draft: ${short.script.draft}\n  Hook: ${short.script.hook}\n  Immersion: ${short.script.immersion}\n  Body: ${short.script.body}\n  CTA: ${short.script.cta}\n`;
  requests.push({
    insertText: {
      text: scriptContent,
      location: {
        index: currentIndex,
      },
    },
  });
  currentIndex += scriptContent.length;

  // 5. Insert Metadata Details
  const metadataContent = `Metadata:\n  Tags: ${short.metadata.tags}\n  CTA: ${short.metadata.cta}\n  Image Ideas: ${short.metadata.imageIdeas}\n  Audio Notes: ${short.metadata.audioNotes}\n`;
  requests.push({
    insertText: {
      text: metadataContent,
      location: {
        index: currentIndex,
      },
    },
  });
  currentIndex += metadataContent.length;

  return requests;
};
