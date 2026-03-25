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

    const { task_description } = await request.json();

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        task_description,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('session/start error:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session_id: data.id });
  } catch (error) {
    console.error('session/start error:', error);
    return NextResponse.json(
      { error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
