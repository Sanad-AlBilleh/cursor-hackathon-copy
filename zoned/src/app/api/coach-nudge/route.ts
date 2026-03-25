import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const { distraction_type, coach_persona, task_description, session_stats } =
      await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 60,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: `You are a focus coach with the personality of a ${coach_persona}. The user is working on: ${task_description}. They just got distracted by: ${distraction_type}. Stats so far: ${JSON.stringify(session_stats)}. Respond with ONE short, punchy motivational line (max 15 words). Match your persona exactly. Be direct. No fluff.`,
        },
        {
          role: 'user',
          content: `I just got distracted by ${distraction_type}. Get me back on track.`,
        },
      ],
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ?? 'Get back to work!';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('coach-nudge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nudge' },
      { status: 500 }
    );
  }
}
