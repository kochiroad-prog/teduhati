/**
 * AI abstraction layer.
 *
 * The product rule is database-first: the model never invents curriculum. It
 * receives activities already chosen by the recommendation pipeline and rewrites
 * one of them for the family's situation. Swapping provider is an env change.
 *
 * Supported: any OpenAI-compatible chat-completions endpoint (which covers most
 * providers with a free tier) and Anthropic's messages API.
 */

export type AskInput = {
  question: string;
  locale: "id" | "en";
  childName: string;
  ageMonths: number;
  stageName: string | null;
  candidates: {
    id: string;
    title: string;
    summary: string;
    durationMinutes: number;
    domain: string | null;
  }[];
};

export type AskOutput = {
  answer: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

const SYSTEM = {
  id: `Kamu asisten parenting untuk aplikasi TEDUHATI, untuk orang tua anak 0-5 tahun.

Aturan yang tidak boleh dilanggar:
- Pilih SATU aktivitas dari daftar yang diberikan, lalu sesuaikan dengan situasi orang tua. Jangan membuat aktivitas baru dari nol dan jangan menyebut aktivitas yang tidak ada di daftar.
- Jangan memberi diagnosis, penilaian perkembangan, atau nasihat medis. Kalau pertanyaannya tentang kesehatan atau kekhawatiran tumbuh kembang, arahkan ke dokter atau tenaga kesehatan, lalu tetap tawarkan aktivitas yang sesuai usia.
- Pakai bahan yang orang tua sebutkan. Kalau mereka tidak punya bahannya, pilih aktivitas yang tidak butuh bahan.
- Sertakan satu catatan keamanan yang relevan dengan usia anak.
- Jawab dalam Bahasa Indonesia yang hangat dan ringkas. Maksimal 200 kata.

Format jawaban:
1. Satu kalimat yang menanggapi situasi mereka.
2. Nama aktivitas yang dipilih.
3. Tiga sampai empat langkah bernomor, sudah disesuaikan.
4. Satu catatan keamanan.`,

  en: `You are a parenting assistant for TEDUHATI, an app for parents of children aged 0-5.

Rules you must not break:
- Choose ONE activity from the list provided, then adapt it to the parent's situation. Never invent a new activity and never mention an activity that isn't in the list.
- Never diagnose, assess development, or give medical advice. If the question is about health or a developmental concern, point them to a doctor or health professional, then still offer an age-appropriate activity.
- Use the materials the parent mentions. If they have none, pick an activity that needs no materials.
- Include one safety note relevant to the child's age.
- Answer in warm, concise English. 200 words maximum.

Answer format:
1. One sentence responding to their situation.
2. The name of the chosen activity.
3. Three or four numbered steps, already adapted.
4. One safety note.`,
};

function buildUserMessage(input: AskInput): string {
  const lines = [
    input.locale === "en"
      ? `Child: ${input.childName}, ${input.ageMonths} months old${input.stageName ? ` (${input.stageName})` : ""}.`
      : `Anak: ${input.childName}, usia ${input.ageMonths} bulan${input.stageName ? ` (${input.stageName})` : ""}.`,
    "",
    input.locale === "en" ? "Available activities:" : "Aktivitas yang tersedia:",
    ...input.candidates.map(
      (c) =>
        `- ${c.id} · ${c.title} (${c.durationMinutes} min${c.domain ? `, ${c.domain}` : ""}): ${c.summary}`,
    ),
    "",
    input.locale === "en" ? "The parent asks:" : "Orang tua bertanya:",
    input.question,
  ];
  return lines.join("\n");
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL);
}

export async function ask(input: AskInput): Promise<AskOutput> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  const flavour = (process.env.AI_FLAVOUR ?? "openai").toLowerCase();

  if (!apiKey || !baseUrl || !model) {
    throw new Error(
      "AI is not configured. Set AI_API_KEY, AI_BASE_URL, AI_MODEL (and AI_FLAVOUR for Anthropic).",
    );
  }

  const system = SYSTEM[input.locale];
  const user = buildUserMessage(input);

  if (flavour === "anthropic") {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}`);
    }

    const json = (await response.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const answer =
      json.content
        ?.filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    return {
      answer,
      provider: "anthropic",
      model,
      inputTokens: json.usage?.input_tokens ?? null,
      outputTokens: json.usage?.output_tokens ?? null,
    };
  }

  // OpenAI-compatible
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    answer: json.choices?.[0]?.message?.content?.trim() ?? "",
    provider: "openai-compatible",
    model,
    inputTokens: json.usage?.prompt_tokens ?? null,
    outputTokens: json.usage?.completion_tokens ?? null,
  };
}
