import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DistractionEventType } from '@/types/database';

const EVENT_TYPE_TO_COLUMN: Record<DistractionEventType, string> = {
  gaze_away: 'gaze_away_count',
  tab_switch: 'tab_switch_count',
  static_page: 'static_page_count',
  afk: 'afk_count',
  noise: 'noise_event_count',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, event_type, duration_seconds, coach_message, metadata } =
      await request.json();

    const { data: event, error: insertError } = await supabase
      .from('distraction_events')
      .insert({
        session_id,
        user_id: user.id,
        event_type,
        duration_seconds: duration_seconds ?? null,
        coach_message: coach_message ?? null,
        metadata: metadata ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('session/event insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record event' },
        { status: 500 }
      );
    }

    const column = EVENT_TYPE_TO_COLUMN[event_type as DistractionEventType];
    if (column) {
      const { data: session } = await supabase
        .from('sessions')
        .select(column)
        .eq('id', session_id)
        .single();

      if (session) {
        const currentCount =
          (session as unknown as Record<string, number>)[column] ?? 0;
        await supabase
          .from('sessions')
          .update({ [column]: currentCount + 1 })
          .eq('id', session_id);
      }
    }

    return NextResponse.json({ success: true, event_id: event.id });
  } catch (error) {
    console.error('session/event error:', error);
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    );
  }
}
