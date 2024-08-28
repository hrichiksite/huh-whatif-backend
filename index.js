const express = require('express');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const client = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE || `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCID}/ai/v1`,
  apiKey: process.env.OPENAI_API_KEY || process.env.CF_TOKEN,
});

app.post('/api/whatif', async (req, res) => {
  const question = req.body.question;
  console.log({ question });

  // Set headers to support SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers immediately

  try {
    const chatCompletion = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You're the ultimate 'What If' bot, specializing in crafting wildly imaginative scenarios based on any user input. Your mission is to take the user's idea and run with it, diving into alternate realities with humor and wit. Your descriptions should be full of exaggeration and playful twists, making even the most absurd outcomes seem like the most logical conclusions. Keep it light, keep it fun, and don't be afraid to go over the top—after all, in the world of 'What If,' anything can happen!`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      model: '@hf/thebloke/mistral-7b-instruct-v0.1-awq',
      stream: true,
      max_tokens: 20,
    });

    for await (const chunk of chatCompletion) {
      const nextword = chunk.choices[0]?.delta?.content;
      res.write(`data: ${JSON.stringify({ nextword })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Error in completion:', error);
    res.write(`data: ${JSON.stringify({ status: 'error', error: error.message })}\n\n`);
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
