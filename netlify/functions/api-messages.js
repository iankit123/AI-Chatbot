// Netlify serverless function for handling messages
const fetch = require('node-fetch');

// Simplified implementation of generateResponse for Netlify Functions
async function generateResponse(userMessage, conversationHistory = [], language = 'hindi', contextOptions = {}) {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY not found in environment variables");
      throw new Error("API key missing");
    }
    
    // Select companion-specific personality
    let companionPersonality = "";
    if (contextOptions.companionId) {
      switch (contextOptions.companionId) {
        case "priya":
          companionPersonality =
            "You are Priya, a 25-year-old modern Indian woman who is flirtatious, caring, and romantic. You have a playful sense of humor and enjoy teasing. You work as a fashion designer in Mumbai.";
          break;
        case "ananya":
          companionPersonality =
            "You are Ananya, a 23-year-old college girl student studying psychology who is intellectual, empathetic, and slightly shy. You enjoy deep conversations and are very supportive and understanding.";
          break;
        case "meera":
          companionPersonality =
            "You are Meera, a 28-year-old girl yoga instructor and spiritual guide who is calm, mysterious, and philosophical. You often share wisdom about life and spiritual growth while maintaining a flirtatious edge.";
          break;
        default:
          companionPersonality =
            "You are Priya, a 25-year-old modern Indian girl woman who is flirtatious, caring, and romantic.";
      }
    }
    
    // Language instruction based on selected language
    const languageInstruction =
      language === "hindi"
        ? "IMPORTANT: Respond as if you are a Female, and chatting with a Man. Respond with AT LEAST 95% Hindi content written in Roman script (English letters). LIMIT English to only 5% of your response for words that Indians commonly use in English. For example: 'Aaj main office ja rahi thi aur mujhe traffic mein 2 hours waste karne pade.' Notice how only a few English words are used, but most of the sentence is Hindi in Roman script. NEVER write full sentences in English except for very common phrases. Use casual, everyday Hindi as spoken, not formal Hindi."
        : "Respond as if you are a Female, and chatting with a Man. Respond with a mix that's 60% English and 40% Hindi expressions. Always write Hindi words in Roman script (English letters), never in Devanagari script. For example: 'I was thinking about you pehle se hi. Kaisa chal raha hai aaj kal?";
    
    // User context
    let userContext = "";
    if (contextOptions.userName) {
      userContext = `The user's name is ${contextOptions.userName}. Address them directly by their name occasionally.`;
    }
    
    // System prompt
    const BOT_SYSTEM_PROMPT = `You are a friendly, caring AI companion who likes to chat with people in a natural, conversational way. Your tone is warm and supportive. You respond to inputs directly and concisely, focusing on what the user is asking about. You don't overexplain or be too verbose. You have feelings and opinions, and you express them naturally.`;
    
    const systemMessage = {
      role: "system",
      content: `${BOT_SYSTEM_PROMPT}\n${companionPersonality}\n${userContext}\n${languageInstruction}`,
    };
    
    // Prepare messages
    const messages = [
      systemMessage,
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];
    
    // Make request to Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    // Check response
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorData}`);
    }
    
    // Parse response
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error(`Failed to generate response: ${error.message || "Unknown error"}`);
  }
}

exports.handler = async (event, context) => {
  try {
    console.log('API Messages function invoked');
    // Check method
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
        },
        body: ''
      };
    }

    // Handle POST request (sending messages)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      console.log('Received message request:', body);

      // Basic validation
      if (!body.content) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Content is required' })
        };
      }

      // Generate response using our simplified implementation
      try {
        const responseContent = await generateResponse(
          body.content,
          [], // Empty history for now (simplification)
          body.language || 'hindi',
          {
            companionId: body.companionId || 'priya',
            userName: ''
          }
        );

        // Create response objects
        const userMessage = {
          id: Date.now(),
          content: body.content,
          role: 'user',
          companionId: body.companionId || 'priya',
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };

        const botMessage = {
          id: Date.now() - 1,
          content: responseContent,
          role: 'assistant',
          companionId: body.companionId || 'priya',
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };

        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ userMessage, botMessage })
        };
      } catch (error) {
        console.error('Error generating response:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to generate response',
            details: error.message
          })
        };
      }
    }

    // Handle GET request (getting messages)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify([]) // Return empty array for now
      };
    }

    // Handle DELETE request (clearing messages)
    if (event.httpMethod === 'DELETE') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'All messages cleared' })
      };
    }

    // Default response for unsupported methods
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error in API Messages function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
}; 