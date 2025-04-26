import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Get the URL and code from the request
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  
  console.log('Auth callback route hit:', { 
    hasCode: !!code,
    hasError: !!error,
    url: request.url,
    error,
    errorDescription
  });
  
  // Handle explicit errors returned in the callback
  if (error) {
    console.error('Error in auth callback:', { error, errorDescription });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`, 
      requestUrl.origin)
    );
  }
  
  // If code is present, handle the Supabase auth exchange
  if (code) {
    try {
      // Create a Supabase client specifically for this request
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Exchange the code for a session (this sets the cookie)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent('exchange_error')}&error_description=${encodeURIComponent(error.message)}`, 
          requestUrl.origin)
        );
      }
      
      console.log('Successfully exchanged code for session', {
        hasSession: !!data.session,
        hasUser: !!data.session?.user,
        user: data.session?.user?.email || data.session?.user?.id
      });
      
      // Redirect to the main app after successful auth
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    } catch (err: any) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('callback_error')}&error_description=${encodeURIComponent(err.message || 'Unknown error')}`, 
        requestUrl.origin)
      );
    }
  }
  
  // If no code is present, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
} 