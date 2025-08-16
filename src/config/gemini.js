const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const analyzeFood = async (imageBase64, location) => {
  try {
    const prompt = `
    Analyze this food image and provide detailed calorie information.
    ${location ? `Location context: ${location.city}, ${location.country}` : ""}
   
    Please provide ONLY a JSON response in this exact format:
    {
      "foodName": "specific food name",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number,
      "servingSize": "description",
      "confidence": number (0-100)
    }
   
    Be as accurate as possible with calorie estimation based on visible portion size.
    `;

    // Use the current Gemini model name
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("API Response Error:", data);
      throw new Error(
        data.error?.message ||
          `API request failed with status ${response.status}`
      );
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response generated from the model");
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log("Raw API response:", text); // For debugging

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error("Invalid JSON response from API");
      }
    } else {
      // If no JSON found, try to parse the entire response
      try {
        return JSON.parse(text.trim());
      } catch (parseError) {
        console.error("Could not extract JSON from response:", text);
        throw new Error("Could not parse nutrition data from API response");
      }
    }
  } catch (error) {
    console.error("Gemini API error:", error);

    // Provide more specific error messages
    if (error.message.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API key. Please check your Gemini API key.");
    } else if (error.message.includes("QUOTA_EXCEEDED")) {
      throw new Error("API quota exceeded. Please try again later.");
    } else if (error.message.includes("models/")) {
      throw new Error("Model not found. The API model may have been updated.");
    } else {
      throw new Error(
        error.message || "Failed to analyze food image. Please try again."
      );
    }
  }
};
