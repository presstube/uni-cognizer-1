import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('🧪 Testing Gemini API Connection...\n');

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

console.log('✅ API key found:', apiKey.substring(0, 10) + '...' + apiKey.slice(-4));
console.log('');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

console.log('📡 Making test request to Gemini...\n');

try {
  const result = await model.generateContent('Say "Hello from Gemini!" in exactly 5 words.');
  const response = result.response;
  const text = response.text();
  
  console.log('✅ SUCCESS! Gemini responded:\n');
  console.log(`   "${text}"\n`);
  console.log('🎉 Your Gemini API key is working correctly!');
  
} catch (error) {
  console.error('❌ ERROR: Failed to connect to Gemini\n');
  console.error('Error details:', error.message);
  
  if (error.message.includes('API key')) {
    console.error('\n💡 Your API key might be invalid or expired.');
    console.error('   Get a new key at: https://aistudio.google.com/app/apikey');
  }
  
  process.exit(1);
}

