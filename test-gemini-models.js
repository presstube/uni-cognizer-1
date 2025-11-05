import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log('Fetching available Gemini models...\n');
    
    const models = await genAI.listModels();
    
    console.log('Available models:');
    console.log('─'.repeat(60));
    
    for await (const model of models) {
      console.log(`\nModel: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();

