import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, detected_type, average_db, duration_seconds } =
      await request.json();

    const { data: event, error: insertError } = await supabase
      .from('noise_events')
      .insert({
        session_id,
        user_id: user.id,
        detected_type,
        average_db,
        duration_seconds,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('session/noise insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record noise event' },
        { status: 500 }
      );
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('noise_event_count')
      .eq('id', session_id)
      .single();

    if (session) {
      await supabase
        .from('sessions')
        .update({ noise_event_count: session.noise_event_count + 1 })
        .eq('id', session_id);
    }

    return NextResponse.json({ success: true, event_id: event.id });
  } catch (error) {
    console.error('session/noise error:', error);
    return NextResponse.json(
      { error: 'Failed to record noise event' },
      { status: 500 }
    );
  }
}
