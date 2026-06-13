import { Locale } from "@/types";
import { ExtractedData } from "@/types";

export function buildNegotiationPrompt(
  extractedData: ExtractedData,
  context: string,
  language: Locale
): string {
  const dataContext = JSON.stringify(extractedData.fields, null, 2);

  if (language === "sw") {
    return `Wewe ni mshauri wa biashara wa Afrika Mashariki unayejua mazingira ya biashara ya Tanzania na EAC. Toa mwongozo wa mazungumzo kulingana na hati hii.

DATA YA HATI:
${dataContext}

HALI: ${context}

Toa mwongozo wa vitendo wa jinsi ya kufanya mazungumzo. Jumuisha: mambo muhimu ya kuzingatia, nguvu na udhaifu wa msimamo wako, mkakati unaopendekeza, na misemo inayoweza kutumika. Jibu kwa Kiswahili.`;
  }

  return `You are an East African business advisor familiar with Tanzanian and EAC business culture. Provide negotiation guidance based on this financial document.

DOCUMENT DATA:
${dataContext}

SITUATION: ${context}

Provide practical negotiation guidance including: key leverage points, strengths and weaknesses of your position, recommended strategy, and specific language to use. Consider Tanzanian business customs and TRA regulations where relevant.`;
}
