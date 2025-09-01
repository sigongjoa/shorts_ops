const TOC_ANCHOR_NAME = 'TOC_ANCHOR';

/**
 * Generates requests to initialize a new document with a Table of Contents structure.
 * @param {string} projectTitle The title of the project.
 * @returns {Array<Object>} An array of Google Docs API requests.
 */
export const initDocumentTemplate = (projectTitle, projectDescription = '') => {
  const requests = [];
  let currentIndex = 1; // Start after the initial body element

  // 1. Insert Project Title
  const titleText = `${projectTitle}\n`;
  requests.push({
    insertText: { text: titleText, location: { index: currentIndex } },
  });
  requests.push({
    updateParagraphStyle: {
      range: { startIndex: currentIndex, endIndex: currentIndex + titleText.length - 1 },
      paragraphStyle: { namedStyleType: 'HEADING_1' },
      fields: 'namedStyleType',
    },
  });
  currentIndex += titleText.length;

  // 2. Insert Project Description (if provided)
  if (projectDescription) {
    const descriptionText = `${projectDescription}\n\n`; // Add extra newline for spacing
    requests.push({
      insertText: { text: descriptionText, location: { index: currentIndex } },
    });
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: currentIndex, endIndex: currentIndex + descriptionText.length - 1 },
        paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
        fields: 'namedStyleType',
      },
    });
    currentIndex += descriptionText.length;
  }

  // 3. Insert Table of Contents Header
  const tocHeaderText = 'Table of Contents\n';
  requests.push({
    insertText: { text: tocHeaderText, location: { index: currentIndex } },
  });
  requests.push({
    updateParagraphStyle: {
      range: { startIndex: currentIndex, endIndex: currentIndex + tocHeaderText.length - 1 },
      paragraphStyle: { namedStyleType: 'HEADING_2' },
      fields: 'namedStyleType',
    },
  });
  currentIndex += tocHeaderText.length;

  // 4. Insert a zero-width space to act as the anchor
  const anchorText = '\u200B'; // Zero-width space
  requests.push({
    insertText: { text: anchorText, location: { index: currentIndex } },
  });

  // 5. Create the named range (bookmark) over the anchor character
  requests.push({
    createNamedRange: {
      name: TOC_ANCHOR_NAME,
      range: {
        startIndex: currentIndex,
        endIndex: currentIndex + anchorText.length, // This will be currentIndex + 1
      },
    },
  });

  return requests;
};

/**
 * Generates requests to create a new page with a short's content in a table,
 * including a bookmark for linking.
 * @param {Object} short The short object.
 * @param {number} insertionIndex The index in the document to start inserting.
 * @returns {Array<Object>} An array of Google Docs API requests.
 */
export const generateShortPageRequests = (short, insertionIndex) => {
  const bookmarkName = `short_bookmark_${short.id}`;
  const shortIdText = `SHORT_ID: ${short.id}`;
  const requests = [];
  let currentIndex = insertionIndex;

  // 1. Insert a page break to start on a new page
  requests.push({ insertPageBreak: { location: { index: Math.max(0, currentIndex - 1) } } });
  currentIndex++;

  // 2. Insert the hidden SHORT_ID and create a bookmark for it
  requests.push({ insertText: { text: `${shortIdText}\n`, location: { index: currentIndex } } });
  requests.push({
    createNamedRange: {
      name: bookmarkName,
      range: { startIndex: currentIndex, endIndex: currentIndex + shortIdText.length },
    },
  });
  requests.push({
    updateTextStyle: {
      range: { startIndex: currentIndex, endIndex: currentIndex + shortIdText.length },
      textStyle: {
        fontSize: { magnitude: 1, unit: 'PT' },
        foregroundColor: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } },
      },
      fields: 'fontSize,foregroundColor',
    },
  });
  currentIndex += shortIdText.length + 1;

  // 3. Insert the Short Title and style it as a heading
  const titleText = `${short.title}\n`;
  requests.push({ insertText: { text: titleText, location: { index: currentIndex } } });
  requests.push({
    updateParagraphStyle: {
      range: { startIndex: currentIndex, endIndex: currentIndex + titleText.length },
      paragraphStyle: { namedStyleType: 'HEADING_2' },
      fields: 'namedStyleType',
    },
  });
  currentIndex += titleText.length;

  // 4. Insert a simple text horizontal rule for visual separation
  const ruleText = '--------------------\n';
  requests.push({ insertText: { text: ruleText, location: { index: currentIndex } } });
  currentIndex += ruleText.length;

  // 5. Insert the rest of the content as a single text block
  const content = `Status: ${short.status}\n\n` +
                  `--- Script ---\n` +
                  `Idea: ${short.script.idea}\n` +
                  `Draft: ${short.script.draft}\n` +
                  `Hook: ${short.script.hook}\n` +
                  `Body: ${short.script.body}\n` +
                  `CTA: ${short.script.cta}\n\n` +
                  `--- Metadata ---\n` +
                  `Tags: ${short.metadata.tags}\n`;

  requests.push({ insertText: { text: content, location: { index: currentIndex } } });

  return requests;
};


/**
 * Generates requests to update the Table of Contents with a new entry.
 * @param {Object} short The short object.
 * @param {Object} document The full Google Doc object.
 * @returns {Array<Object>} An array of Google Docs API requests.
 */
export const generateTocUpdateRequest = (short, document) => {
  // Defensive check for the existence of namedRanges and the specific anchor
  if (!document.namedRanges || !document.namedRanges[TOC_ANCHOR_NAME]) {
    console.error(`'${TOC_ANCHOR_NAME}' not found in the document's named ranges. Table of Contents linking will fail.`);
    return [];
  }

  const tocAnchor = document.namedRanges[TOC_ANCHOR_NAME];
  const anchorRange = tocAnchor.namedRange.ranges[0];
  const insertionIndex = anchorRange.startIndex;
  const bookmarkName = `short_bookmark_${short.id}`;
  const tocText = `${short.title}\n`;

  const requests = [
    // 1. Insert the new TOC entry text
    {
      insertText: {
        text: tocText,
        location: { index: insertionIndex },
      },
    },
    // 2. Apply a hyperlink to the new text
    {
      updateTextStyle: {
        range: {
          startIndex: insertionIndex,
          endIndex: insertionIndex + tocText.length - 1, // -1 for newline
        },
        textStyle: {
          link: {
            bookmarkId: bookmarkName,
          },
        },
        fields: 'link',
      },
    },
    // 3. Delete the old anchor
    {
      deleteNamedRange: {
        name: TOC_ANCHOR_NAME,
      },
    },
    // 4. Recreate the anchor at the new position. It must span at least one character.
    {
        insertText: {
            text: '\u200B', // Zero-width space character to serve as the new anchor point
            location: { index: insertionIndex + tocText.length },
        }
    },
    {
      createNamedRange: {
        name: TOC_ANCHOR_NAME,
        range: {
          startIndex: insertionIndex + tocText.length,
          endIndex: insertionIndex + tocText.length + 1, // Span the zero-width character
        },
      },
    },
  ];

  return requests;
};
