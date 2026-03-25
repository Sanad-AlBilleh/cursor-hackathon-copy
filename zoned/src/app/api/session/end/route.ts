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

    const {
      session_id,
      focus_score,
      focus_seconds,
      distraction_seconds,
      gaze_away_count,
      tab_switch_count,
      static_page_count,
      afk_count,
      noise_event_count,
      longest_focus_streak_seconds,
    } = await request.json();

    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('started_at')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const duration_seconds = Math.round(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_seconds,
        focus_score,
        focus_seconds,
        distraction_seconds,
        gaze_away_count,
        tab_switch_count,
        static_page_count,
        afk_count,
        noise_event_count,
        longest_focus_streak_seconds,
      })
      .eq('id', session_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('session/end update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_streak_days, longest_streak_days, last_session_date')
      .eq('id', user.id)
      .single();

    if (!profileError && profile) {
      let newStreak = profile.current_streak_days;

      if (profile.last_session_date === today) {
        // Already had a session today — no change
      } else if (profile.last_session_date) {
        const lastDate = new Date(profile.last_session_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (profile.last_session_date === yesterdayStr) {
          newStreak = profile.current_streak_days + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(
        newStreak,
        profile.longest_streak_days
      );

      await supabase
        .from('profiles')
        .update({
          current_streak_days: newStreak,
          longest_streak_days: longestStreak,
          last_session_date: today,
        })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('session/end error:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
