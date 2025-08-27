const updateBackendScript = async (script: { hook: string, immersion: string, body: string, cta: string }): Promise<void> => {
  try {
    const response = await fetch('/api/script', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(script),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to update script on backend:", error);
    throw error; // Propagate the error
  }
};

export const saveScript = async (scriptParts: { hook: string, immersion: string, body: string, cta: string }): Promise<void> => {
    await updateBackendScript(scriptParts);
};

export const loadScript = async (): Promise<{ hook: string, immersion: string, body: string, cta: string }> => {
    try {
        const response = await fetch('/api/script');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to load script from backend:", error);
        throw error; // Propagate the error
    }
};
