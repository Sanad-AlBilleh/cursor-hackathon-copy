import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const { session_id, coach_persona, task_description, stats } =
      await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 200,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: `You are a focus coach with the personality of a ${coach_persona}. The user just finished a focus session working on: ${task_description}.

Session stats:
- Duration: ${stats.duration_minutes} minutes
- Focus score: ${stats.focus_score}%
- Gaze-away distractions: ${stats.gaze_away_count}
- Tab switches: ${stats.tab_switch_count}
- Static page events: ${stats.static_page_count}
- AFK moments: ${stats.afk_count}
- Noise events: ${stats.noise_event_count}
- Longest focus streak: ${stats.longest_focus_streak_minutes} minutes

Give a personalized 3-5 sentence debrief. Highlight what went well, what to improve, and end with encouragement. Match your persona exactly.`,
        },
        {
          role: 'user',
          content: 'How did my session go?',
        },
      ],
    });

    const debrief =
      completion.choices[0]?.message?.content?.trim() ??
      'Great effort! Keep pushing forward.';

    const supabase = await createClient();

    const { error } = await supabase
      .from('sessions')
      .update({ coach_debrief_text: debrief })
      .eq('id', session_id);

    if (error) {
      console.error('Failed to save debrief:', error);
      return NextResponse.json(
        { error: 'Failed to save debrief' },
        { status: 500 }
      );
    }

    return NextResponse.json({ debrief });
  } catch (error) {
    console.error('coach-debrief error:', error);
    return NextResponse.json(
      { error: 'Failed to generate debrief' },
      { status: 500 }
    );
  }
}
