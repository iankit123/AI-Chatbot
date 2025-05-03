import { Handler } from '@netlify/functions';
import { generateResponse } from '../../server/services/llm';

export const handler: Handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS method for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    console.log('[Netlify Function] Request path:', event.path);
    console.log('[Netlify Function] Query parameters:', event.queryStringParameters);
    
    // Get the endpoint from query parameters or from the path
    const endpoint = event.queryStringParameters?.endpoint || 
                     (event.path.includes('/api/') ? event.path.split('/api/')[1] : '');
    
    console.log('[Netlify Function] Resolved endpoint:', endpoint);
    
    // Check if we're handling the messages endpoint
    if (endpoint === 'messages' || event.path.includes('/api/messages')) {
      if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        
        console.log('[Netlify Function] Processing POST /api/messages:', body);
        
        // Use the LLM service directly
        const responseContent = await generateResponse(
          body.content,
          [], // We don't have history in serverless functions, so use empty array
          body.language || 'hindi',
          { 
            companionId: body.companionId,
            userName: body.userName || ''
          }
        );
        
        // Create response with user and bot messages
        const userMessage = {
          id: Date.now(),
          content: body.content,
          role: 'user',
          companionId: body.companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
        
        const botMessage = {
          id: Date.now() - 1,
          content: responseContent,
          role: 'assistant',
          companionId: body.companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ userMessage, botMessage })
        };
      }
      
      // Handle GET request if needed
      if (event.httpMethod === 'GET') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
      
      // Handle DELETE request to clear messages
      if (event.httpMethod === 'DELETE') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'All messages cleared' })
        };
      }
    }

    // Default response for unhandled endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Endpoint not found', path: event.path, endpoint })
    };
  } catch (error) {
    console.error('[Netlify Function] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 