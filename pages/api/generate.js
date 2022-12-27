import { Configuration, OpenAIApi } from "openai";

function escapeString(text) {
  return text.replaceAll("\n","")
}

export default async function (req, res) {
  const configuration = new Configuration({
    apiKey: req.body.apiKey,
  });
  const openai = new OpenAIApi(configuration);

  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    });
    return;
  }

  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: generatePrompt(escapeString(req.body.sentence)),
      temperature: 0.7,
      max_tokens: 300,
    });
    completion.data.prompt = generatePrompt(escapeString(req.body.sentence), req.body.languageSetting);
    res.status(200).json({ result:  completion.data });
  } catch(error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
}

function generatePrompt(sentence, languageSetting) {
  if (languageSetting == "한국어") {
    return `이 다음에 올 50자 이하의 소설 문장을 완성해줘. \`${sentence}\``;
  } else {
    return `Can you suggest the next sentence for this novel? \`${sentence}\``
  }
}
