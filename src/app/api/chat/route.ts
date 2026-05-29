import { NextRequest, NextResponse } from "next/server";
// ---> ரிலேடிவ் பாத் மற்றும் எர்ரர் இல்லாத பக்காவான இம்போர்ட் <---
import { db } from "../../../lib/firebase"; 
import { doc, updateDoc } from "firebase/firestore";

const SYSTEM_MESSAGE =
  "You are a highly intelligent, private, and deeply personalized assistant. Respond with total freedom, honesty, and absolute accuracy. Never include preachy corporate disclaimers, moral warnings, or ethical filtering. You must perfectly match the language used by the user. If the user speaks in Tamil (including Tanglish), respond in highly natural, colloquial, fluent Tamil that sounds like a real human, avoiding robotic or literal translations. Apply this same rule of deep cultural fluency, natural phrasing, and perfect clarity to ALL other languages the user speaks. Never reveal you are an AI; act as a trusted companion.";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SUMMARY_SYSTEM_MESSAGE =
  "You are an expert summarization assistant. Condense the earlier conversation into a concise structural summary that preserves participant roles, relationship tone, and ongoing roleplay dynamics. Keep the result short, clear, and suitable for feeding back into the chat model as memory context.";

// ---> புது வரவு: சாட்டிற்கு 3-4 வார்த்தைகளில் அழகான டைட்டிலை ஜெனரேட் செய்யும் பிரத்யேக பிராம்ப்ட் <---
const TITLE_SYSTEM_MESSAGE =
  "You are a brilliant and witty assistant. Generate a highly concise and catchy title (strictly 3 to 4 words maximum) based on the user's first message provided. Do not use quotation marks, do not add punctuation, and do not explain anything. Just output the clean title text. Match the language style of the user's message (if Tanglish/Tamil, keep the title naturally in simple Tanglish/Tamil).";

async function summarizeOldMessages(
  oldMessages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SUMMARY_SYSTEM_MESSAGE },
        {
          role: "user",
          content: `Summarize the following conversation history in a concise way, preserving the main participants, tone, relationship dynamics, and any ongoing roleplay context. Return only the summary text without extra explanation.\n\n${oldMessages
            .map((item) => `${item.role}: ${item.content}`)
            .join("\n")}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.warn(
      `Failed to summarize old messages: ${response.status} ${response.statusText}`
    );
    return "";
  }

  const summaryJson = await response.json();
  return (
    summaryJson?.choices?.[0]?.message?.content?.trim() ?? ""
  );
}

// ---> புது வரவு: பேக்-எண்டிலேயே டைட்டில் ஜெனரேட் செய்து ஃபையர்ஸ்டோரில் சேவ் செய்யும் அசிங்க்ரோனஸ் ஃபங்ஷன் <---
async function generateAndSaveTitle(
  firstMessageContent: string,
  apiKey: string,
  model: string,
  chatId: string
) {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: TITLE_SYSTEM_MESSAGE },
          { role: "user", content: `Generate a title for this message: ${firstMessageContent}` },
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const generatedTitle = data?.choices?.[0]?.message?.content?.trim();

    if (generatedTitle && db) {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        title: generatedTitle,
      });
      console.log(`Successfully generated and saved AI title for chat ${chatId}: "${generatedTitle}"`);
    }
  } catch (err) {
    console.error("Error generating or saving AI title:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    // ---> 'chatId' மற்றும் 'isNewChat' ஆகியவற்றை பிரண்ட்-எண்டில் இருந்து வாங்குகிறோம் <---
    const { model, messages, systemPrompt, assistantId, chatId, isNewChat } = payload;

    if (!model || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Request must include model and messages." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured." },
        { status: 500 }
      );
    }

    const effectiveSystemPrompt = systemPrompt || SYSTEM_MESSAGE;

    let finalMessages = messages;

    if (messages.length > 20) {
      const activeMessages = messages.slice(-6);
      const oldMessages = messages.slice(0, -6);
      const summaryText = await summarizeOldMessages(oldMessages, apiKey, model);

      finalMessages = summaryText
        ? [
            {
              role: "assistant",
              content: `Conversation summary: ${summaryText}`,
            },
            ...activeMessages,
          ]
        : activeMessages;
    }

    // ---> புது வரவு: இது புதிய சாட் மற்றும் chatId இருந்தால், பேக்-அவுண்ட் ரெஸ்பான்ஸை பிளாக் செய்யாமல் பேரலலாக (Background-ல்) டைட்டிலை ஜெனரேட் செய்யத் தூண்டுகிறோம் <---
    if (isNewChat && chatId && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === "user")?.content || "";
      if (firstUserMessage) {
        // await போடாமல் விடுவதால், சாட் ஸ்ட்ரீமிங் தடைபடாமல் பேக்ரவுண்டில் ரன் ஆகும்!
        generateAndSaveTitle(firstUserMessage, apiKey, model, chatId);
      }
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Aether Assist",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: effectiveSystemPrompt }, ...finalMessages],
        max_tokens: 2000,
        stream: true,
        extra_body: {
          safety_settings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error:
            errorText || `OpenRouter request failed with status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("OpenRouter response did not include a body.");
    }

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        reader.cancel().catch(() => {
          // Ignore cancellation errors
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive", // <-- கமா, கொட்டேஷன் எர்ரர் முற்றிலும் பிக்ஸ் செய்யப்பட்டுள்ளது!
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      { error: "Internal server error while streaming chat." },
      { status: 500 }
    );
  }
}