import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile } from '@/types/accessibility';
import { INITIAL_USER_PROFILE } from '@/constants/mockData';

export interface AuthApiResult {
  success: boolean;
  message?: string;
  user?: any;
  profile?: UserProfile;
}

/**
 * Sign up a new user using Supabase Auth.
 */
export async function signUpWithSupabase({
  email,
  password,
  name,
  avatar,
}: {
  email: string;
  password: string;
  name: string;
  avatar?: string;
}): Promise<AuthApiResult> {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase credentials are not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          avatar: avatar?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: 'User registration failed.' };
    }

    const profile: UserProfile = {
      ...INITIAL_USER_PROFILE,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: avatar?.trim() || INITIAL_USER_PROFILE.avatar,
    };

    return { success: true, user: data.user, profile };
  } catch (err: any) {
    return { success: false, message: err.message || 'An unexpected error occurred during sign up.' };
  }
}

/**
 * Sign in an existing user using Supabase Auth.
 */
export async function signInWithSupabase({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthApiResult> {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase credentials are not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.user) {
      return { success: false, message: 'User login failed.' };
    }

    // Fetch user profile from public.profiles table
    const profile = await fetchSupabaseProfile(data.user.id, data.user.email || email);

    return { success: true, user: data.user, profile };
  } catch (err: any) {
    return { success: false, message: err.message || 'An unexpected error occurred during sign in.' };
  }
}

/**
 * Sign out the currently authenticated user from Supabase.
 */
export async function signOutWithSupabase(): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error signing out from Supabase.' };
  }
}

/**
 * Fetch profile details for a given Supabase user ID.
 */
export async function fetchSupabaseProfile(userId: string, defaultEmail: string): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    return INITIAL_USER_PROFILE;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
    return {
      ...INITIAL_USER_PROFILE,
      email: defaultEmail,
      role: 'user',
    };
    }

    return {
      name: data.name || INITIAL_USER_PROFILE.name,
      email: data.email || defaultEmail,
      avatar: data.avatar || INITIAL_USER_PROFILE.avatar,
      role: data.role || 'user',
      hasDisability: data.has_disability ?? INITIAL_USER_PROFILE.hasDisability,
      disabilityType: data.disability_type || INITIAL_USER_PROFILE.disabilityType,
      preferences: data.preferences || INITIAL_USER_PROFILE.preferences,
    };
  } catch {
    return INITIAL_USER_PROFILE;
  }
}

/**
 * Upload a locally picked image (expo-image-picker) to Supabase Storage
 * and return its public URL. Files live under `avatars/<user_id>/...` so the
 * storage RLS policy can scope writes to the owner's folder.
 */
export async function uploadAvatarToSupabase(
  userId: string,
  uri: string,
  fileExt: string
): Promise<{ success: boolean; url?: string; message?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase credentials are not configured.' };
  }

  try {
    const response = await fetch(uri);
    const arraybuffer = await response.arrayBuffer();

    // Always overwrite the same file so the user's avatar folder stays tidy.
    const filePath = `${userId}/avatar.${fileExt || 'jpg'}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arraybuffer, {
        contentType: `image/${fileExt || 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) {
      return { success: false, message: uploadError.message };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return { success: true, url: data.publicUrl };
  } catch (err: any) {
    return { success: false, message: err.message || 'Avatar upload failed.' };
  }
}

/**
 * Update user profile in Supabase profiles table.
 */
export async function updateSupabaseProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.avatar && { avatar: updates.avatar }),
        ...(updates.hasDisability !== undefined && { has_disability: updates.hasDisability }),
        ...(updates.disabilityType !== undefined && { disability_type: updates.disabilityType }),
        ...(updates.preferences && { preferences: updates.preferences }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
