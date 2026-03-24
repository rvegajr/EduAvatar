import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
  }

  async chat(messages: OpenAI.ChatCompletionMessageParam[], options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async transcribe(audioBuffer: Buffer, language = 'en'): Promise<OpenAI.Audio.Transcription> {
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    return this.openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language,
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    });
  }

  async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<Buffer> {
    const response = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: 'opus',
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    });
    return response.data[0].embedding;
  }
}
