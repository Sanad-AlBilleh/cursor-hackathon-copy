import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const {
      user_name,
      partner_name,
      shame_tone,
      task_description,
      distraction_stats,
    } = await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 150,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: `You write accountability messages from a focus app called Zoned. The message is sent to ${partner_name} about ${user_name}'s focus session.

${user_name} was supposed to be working on: ${task_description}
Distraction stats:
- Total distraction time: ${distraction_stats.total_distraction_minutes} minutes
- Looked away: ${distraction_stats.gaze_away_count} times
- Switched tabs: ${distraction_stats.tab_switch_count} times

Tone: "${shame_tone}"
- "funny": Roast them like a comedian friend. Use humor and light teasing. Example: "Your friend ${user_name} spent more time looking away than a cat at a laser pointer show."
- "strict": Professional and firm. Disappointment, not anger. Example: "${user_name} committed to focused work but was distracted ${distraction_stats.gaze_away_count} times. They need to do better."
- "savage": No mercy. Brutal honesty with dramatic flair. Example: "${user_name} had the focus of a goldfish in a firework factory. Absolute disaster."

Write 2-3 sentences. Address ${partner_name} directly. Make it clear this is an automated accountability message from Zoned.`,
        },
        {
          role: 'user',
          content: 'Generate the accountability message.',
        },
      ],
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ??
      `${user_name} got distracted during their focus session. Help hold them accountable!`;

    return NextResponse.json({ message });
  } catch (error) {
    console.error('shame-message error:', error);
    return NextResponse.json(
      { error: 'Failed to generate shame message' },
      { status: 500 }
    );
  }
}
