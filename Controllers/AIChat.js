// chatController.js
const OpenAI = require('openai');
const { PLAN_QUOTAS } = require('../Enums/OurConstant');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const aiChat = async (req, res) => {
  const user = req.user;
  const message = req.query.message || 'Hello!';

  try {
    // Call OpenAI Responses API without streaming
    const response = await openai.responses.create({
      prompt: {
        id: 'pmpt_68d69c2fe0c48190849ed5476334b2390b61bafdc42b0cf6', // your published prompt ID
        version: '9', // optional, use latest if omitted
      },
      input: message,
    });

    // Get final output text
    const outputText = response.output_text;

    // Update quota usage
    user.quotasUsed.aiChat = (user.quotasUsed.aiChat || 0) + 1;
    await user.save();

    res.json({
      success: true,
      message: outputText,
      quotaUsed: user.quotasUsed.aiChat,
    });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// const aiChat = async (req, res) => {
//   const user = req.user;
//   const message = req.query.message || 'Hello!';

//   // SSE headers
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');

//   try {
//     const stream = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [{ role: 'user', content: message }],
//       stream: true,
//     });

//     // Iterate over streaming events
//     for await (const event of stream) {
//       const textChunk = event.choices?.[0]?.delta?.content;
//       if (textChunk) {
//         res.write(`data: ${textChunk}\n\n`);
//       }

//       // Optional: detect end
//       const finishReason = event.choices?.[0]?.finish_reason;
//       if (finishReason === 'stop') {
//         user.quotasUsed.aiChat = (user.quotasUsed.aiChat || 0) + 1;
//         await user.save();

//         res.write(`data: QUOTA:${JSON.stringify({ used: user.quotasUsed.aiChat })}\n\n`);

//         res.write('data: [DONE]\n\n');
//         res.end();
//       }
//     }

//     // Signal end of stream
//     res.write('data: [DONE]\n\n');

//     res.end();
//   } catch (err) {
//     console.error(err);
//     res.write(`data: ERROR: ${err.message}\n\n`);
//     res.end();
//   }
// };

module.exports = { aiChat };
